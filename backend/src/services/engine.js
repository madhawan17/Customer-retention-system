// backend/src/services/engine.js
const db           = require('../db/pool');
const stagesConfig = require('../../config/stages.json');
const casesService = require('./cases');
const offersService = require('./offers');
const reorderService = require('./reorder');
const { getMockProvider } = require('../providers/mockProvider');

const provider = getMockProvider();

function interpolate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return data[key] !== undefined ? data[key] : `{${key}}`;
  });
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function daysDiff(todayStr, dueDateStr) {
  const t = new Date(todayStr);
  const d = new Date(dueDateStr);
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((t - d) / (1000 * 60 * 60 * 24));
}

async function run(todayStr) {
  const summary = {
    messagesQueued:    0,
    messagesSent:      0,
    casesOpened:       0,
    casesEscalated:    0,
    stagesFired:       [],
    offersChecked:     0,
    reordersChecked:   0,
  };

  const stages = stagesConfig.stages;

  // ── 1. Load all invoices that are not fully paid ─────────
  const invoices = await db('invoices as i')
    .join('customers as c', 'c.id', 'i.customer_id')
    .whereIn('i.status', ['unpaid', 'partial'])
    .select(
      'i.id as invoice_id',
      'i.invoice_no',
      'i.amount',
      'i.paid_amount',
      'i.due_date',
      'i.status',
      'i.customer_id',
      'c.name',
      'c.phone',
      'c.tier',
      'c.salesperson',
      'c.stop_messages',
      'c.credit_days'
    );

  // ── 2. Load already-fired stages (for idempotency check) ─
  const firedStages = await db('invoice_stages').select('invoice_id', 'stage_name');
  const firedSet = new Set(firedStages.map(r => `${r.invoice_id}:${r.stage_name}`));

  // ── 3. Load active promises ───────────────────────────────
  const promises = await db('promise_to_pay')
    .whereRaw('promised_date >= ?', [todayStr])
    .where('fulfilled', false)
    .select('invoice_id', 'promised_date');
  const promiseMap = new Map(
    promises.map(p => [
      p.invoice_id,
      p.promised_date instanceof Date
        ? p.promised_date.toISOString().split('T')[0]
        : String(p.promised_date).split('T')[0],
    ])
  );

  // ── 4. Load open dispute cases ────────────────────────────
  const disputes = await db('cases')
    .where('type', 'dispute')
    .whereIn('status', ['open', 'waiting'])
    .select('invoice_id');
  const disputeSet = new Set(disputes.map(d => d.invoice_id));

  // ── 5. Collect messages to send, grouped by customer ─────
  const customerMessages = new Map();

  for (const invoice of invoices) {
    const { invoice_id, customer_id, stop_messages } = invoice;

    if (stop_messages) continue;
    if (disputeSet.has(invoice_id)) continue;

    if (promiseMap.has(invoice_id)) {
      const promisedDateStr = promiseMap.get(invoice_id);
      if (promisedDateStr >= todayStr) continue;
    }

    const diff    = daysDiff(todayStr, invoice.due_date.toISOString().split('T')[0]);
    const balance = Number(invoice.amount) - Number(invoice.paid_amount);

    let stageToFire = null;
    for (const stage of stages) {
      if (diff >= stage.dayOffset && !firedSet.has(`${invoice_id}:${stage.name}`)) {
        stageToFire = stage;
      }
    }

    if (!stageToFire) continue;

    await db('invoice_stages')
      .insert({ invoice_id, stage_name: stageToFire.name, fired_at: new Date() })
      .onConflict(['invoice_id', 'stage_name'])
      .ignore();

    firedSet.add(`${invoice_id}:${stageToFire.name}`);
    summary.stagesFired.push({ invoice_id, invoice_no: invoice.invoice_no, stage: stageToFire.name });

    const messageData = {
      name:       invoice.name,
      invoice_no: invoice.invoice_no,
      amount:     balance.toLocaleString('en-IN'),
      balance:    balance.toLocaleString('en-IN'),
      due_date:   fmtDate(invoice.due_date),
    };
    const body = interpolate(stageToFire.template, messageData);

    if (stageToFire.openCase) {
      await casesService.openCase({
        customerId: customer_id,
        invoiceId:  invoice_id,
        type:       'firm_followup',
        owner:      invoice.salesperson,
        todayStr,
      });
      summary.casesOpened++;
    }

    if (stageToFire.escalate) {
      const existingCase = await casesService.findCase(invoice_id, 'firm_followup');
      if (existingCase) {
        await casesService.escalateCase(existingCase.id, todayStr);
      } else {
        const newCase = await casesService.openCase({
          customerId: customer_id,
          invoiceId:  invoice_id,
          type:       'firm_followup',
          owner:      invoice.salesperson,
          todayStr,
        });
        if (newCase) await casesService.escalateCase(newCase.id, todayStr);
      }
      summary.casesEscalated++;
    }

    if (!customerMessages.has(customer_id)) {
      customerMessages.set(customer_id, {
        customerId:  customer_id,
        phone:       invoice.phone,
        name:        invoice.name,
        invoiceBodies: [],
        invoiceIds:  [],
      });
    }
    customerMessages.get(customer_id).invoiceBodies.push(body);
    customerMessages.get(customer_id).invoiceIds.push(invoice_id);
    summary.messagesQueued++;
  }

  // ── 6. Send one merged message per customer ───────────────
  for (const [customerId, info] of customerMessages) {
    let finalBody;

    if (info.invoiceBodies.length === 1) {
      finalBody = info.invoiceBodies[0];
    } else {
      finalBody = `Hi ${info.name}, you have ${info.invoiceBodies.length} outstanding invoices:\n\n` +
        info.invoiceBodies.map((b, i) => `${i + 1}. ${b}`).join('\n\n');
    }

    await provider.sendMessage(
      customerId,
      info.phone,
      finalBody,
      { invoiceIds: info.invoiceIds, stage: 'merged' }
    );
    summary.messagesSent++;
  }

  // ── 7. Run offer checks ────────────────────────────────────
  const allCustomers = await db('customers').select('*');
  for (const customer of allCustomers) {
    await offersService.check(customer, todayStr, provider);
    summary.offersChecked++;
  }

  // ── 8. Run reorder checks ──────────────────────────────────
  for (const customer of allCustomers) {
    await reorderService.check(customer, todayStr, provider);
    summary.reordersChecked++;
  }

  // ── 9. Escalate cases that have been open 2+ simulated days ─
  const escalated = await casesService.checkAndEscalateStale(todayStr);
  summary.casesEscalated += escalated;

  return summary;
}

module.exports = { run };

