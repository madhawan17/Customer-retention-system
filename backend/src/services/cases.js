// backend/src/services/cases.js
const db = require('../db/pool');

function parseTimeline(val) {
  if (Array.isArray(val)) return [...val];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return [];
}

/**
 * Opens a new case. No-ops if a case of the same type already exists
 * for this invoice (enforced by DB UNIQUE constraint on invoice_id + type).
 */
async function openCase({ customerId, invoiceId, type, owner, todayStr }) {
  try {
    const [row] = await db('cases')
      .insert({
        customer_id: customerId,
        invoice_id:  invoiceId,
        type,
        status:      'open',
        owner,
        timeline:    JSON.stringify([{ event: 'opened', at: todayStr, by: owner }]),
        opened_at:   new Date(),
      })
      .returning('*');

    await db('notifications').insert({
      case_id:     row.id,
      customer_id: customerId,
      type:        'case_opened',
      message:     `New ${type.replace('_', ' ')} case opened for customer #${customerId}, invoice #${invoiceId}. Owner: ${owner}`,
      read:        false,
    });

    return row;
  } catch (err) {
    if (err.code === '23505') return null;
    throw err;
  }
}

async function findCase(invoiceId, type) {
  return db('cases')
    .where({ invoice_id: invoiceId, type })
    .whereIn('status', ['open', 'waiting'])
    .first();
}

async function findCaseByInvoice(invoiceId) {
  return db('cases')
    .where({ invoice_id: invoiceId })
    .whereIn('status', ['open', 'waiting'])
    .first();
}

async function escalateCase(caseId, todayStr) {
  const existing = await db('cases').where({ id: caseId }).first();
  if (!existing) return null;
  if (existing.status === 'escalated' || existing.status === 'resolved') return existing;

  const timeline = parseTimeline(existing.timeline);
  timeline.push({ event: 'escalated', at: todayStr, by: 'system' });

  const [updated] = await db('cases')
    .where({ id: caseId })
    .update({
      status:       'escalated',
      escalated_at: new Date(),
      timeline:     JSON.stringify(timeline),
    })
    .returning('*');

  await db('notifications').insert({
    case_id:     caseId,
    customer_id: existing.customer_id,
    type:        'escalation',
    message:     `Case #${caseId} escalated to manager. Customer #${existing.customer_id}, invoice #${existing.invoice_id}. Open since ${existing.opened_at.toISOString().split('T')[0]}.`,
    read:        false,
  });

  return updated;
}

async function resolveByInvoice(invoiceId, todayStr) {
  const openCases = await db('cases')
    .where({ invoice_id: invoiceId })
    .whereIn('status', ['open', 'waiting', 'escalated']);

  for (const c of openCases) {
    const timeline = parseTimeline(c.timeline);
    timeline.push({ event: 'resolved', at: todayStr, by: 'system', reason: 'invoice_paid' });

    await db('cases')
      .where({ id: c.id })
      .update({
        status:      'resolved',
        resolved_at: new Date(),
        timeline:    JSON.stringify(timeline),
      });
  }
}

async function checkAndEscalateStale(todayStr) {
  const twoDaysAgo = new Date(todayStr);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const staleCases = await db('cases')
    .where('status', 'open')
    .where('opened_at', '<=', twoDaysAgo.toISOString());

  let count = 0;
  for (const c of staleCases) {
    await escalateCase(c.id, todayStr);
    count++;
  }
  return count;
}

async function getAllCases() {
  return db('cases as c')
    .join('customers as cu', 'cu.id', 'c.customer_id')
    .leftJoin('invoices as i', 'i.id', 'c.invoice_id')
    .select(
      'c.*',
      'cu.name as customer_name',
      'cu.phone as customer_phone',
      'i.invoice_no',
      'i.amount',
      'i.paid_amount'
    )
    .orderBy('c.opened_at', 'desc');
}

module.exports = {
  openCase,
  findCase,
  findCaseByInvoice,
  escalateCase,
  resolveByInvoice,
  checkAndEscalateStale,
  getAllCases,
};

