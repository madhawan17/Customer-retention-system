// backend/tests/engine.test.js
process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const request      = require('supertest');
const app          = require('../src/server');
const db           = require('../src/db/pool');
const seedDatabase = require('../scripts/seed-fn');

async function resetAndSeed(baseDate) {
  await db.raw(`
    TRUNCATE TABLE
      notifications, offers_sent, promise_to_pay,
      invoice_stages, outbox, cases, orders, invoices, customers
    RESTART IDENTITY CASCADE
  `);
  return seedDatabase(db, baseDate);
}

async function advance(days) {
  const res = await request(app).post(`/clock/advance?days=${days}`).expect(200);
  return res.body;
}

beforeAll(async () => {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();
  const fs   = require('fs');
  const path = require('path');
  const sql  = fs.readFileSync(path.join(__dirname, '../src/db/migrations/001_init.sql'), 'utf8');
  await client.query(sql);
  await client.end();
});

afterAll(async () => {
  await db.destroy();
});

// ── E1: Stage idempotency ────────────────────────────────────
test('E1: stage fires exactly once per invoice (idempotency)', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const invoices = await db('invoices').where({ invoice_no: 'INV-003' }).select('id');
  const invoiceId = invoices[0].id;

  await advance(1);
  await advance(1);

  const rows = await db('invoice_stages')
    .where({ stage_name: 'soft_followup', invoice_id: invoiceId })
    .select('*');

  expect(rows).toHaveLength(1);
});

// ── E2: Pre-due stage fires 2 days before due date ───────────
test('E2: pre_due stage fires when clock is 2 days before due date', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const invoices = await db('invoices').where({ invoice_no: 'INV-011' }).select('id');
  const invoiceId = invoices[0].id;

  await advance(1);

  const fired = await db('invoice_stages')
    .where({ invoice_id: invoiceId, stage_name: 'pre_due' })
    .first();

  expect(fired).toBeDefined();
});

// ── E3: Paid invoice skips all stages ────────────────────────
test('E3: fully paid invoice skips all stage engine processing', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const customers = await db('customers').where({ phone: '+919876543207' }).select('id');
  const customerId = customers[0].id;
  const invoices = await db('invoices').where({ invoice_no: 'INV-007' }).select('id');
  const invoiceId = invoices[0].id;

  await advance(5);

  const fired = await db('invoice_stages').where({ invoice_id: invoiceId }).select('*');
  expect(fired).toHaveLength(0);

  const msgs = await db('outbox')
    .where({ customer_id: customerId })
    .whereIn('stage', ['pre_due','due_day','soft_followup','firm_followup','final_notice'])
    .select('*');

  expect(msgs).toHaveLength(0);
});

// ── E4: Promise pause — stage skipped when promise in future ─
test('E4: stages are skipped while a future promise-to-pay is active', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const invoices = await db('invoices').where({ invoice_no: 'INV-003' }).select('id');
  const invoiceId = invoices[0].id;

  const futureDate = new Date(BASE);
  futureDate.setDate(futureDate.getDate() + 10);
  await db('promise_to_pay').insert({
    invoice_id: invoiceId,
    promised_date: futureDate.toISOString().split('T')[0],
    fulfilled: false,
  });

  await advance(7);

  const firedFirm = await db('invoice_stages')
    .where({ invoice_id: invoiceId, stage_name: 'firm_followup' })
    .first();

  expect(firedFirm).toBeUndefined();
});

// ── E5: Case escalation after 2 simulated days ───────────────
test('E5: open case escalates after 2 simulated days', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const customers = await db('customers').where({ phone: '+919876543204' }).select('id');
  const customerId = customers[0].id;
  const invoices = await db('invoices').where({ invoice_no: 'INV-004' }).select('id');
  const invoiceId = invoices[0].id;

  const threeDaysAgo = new Date(BASE);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  await db('cases').insert({
    customer_id: customerId,
    invoice_id:  invoiceId,
    type:        'firm_followup',
    status:      'open',
    owner:       'Ravi',
    timeline:    JSON.stringify([{ event: 'opened', at: threeDaysAgo.toISOString().split('T')[0] }]),
    opened_at:   threeDaysAgo.toISOString(),
  }).onConflict(['invoice_id', 'type']).ignore();

  await advance(1);

  const updatedCase = await db('cases').where({ customer_id: customerId, invoice_id: invoiceId }).first();
  expect(updatedCase.status).toBe('escalated');

  const notification = await db('notifications')
    .where({ customer_id: customerId, type: 'escalation' })
    .first();
  expect(notification).toBeDefined();
});

// ── E6: Early payment offer sent on invoice day ──────────────
test('E6: early payment discount offer sent when invoice is created today', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const customers = await db('customers').where({ phone: '+919876543209' }).select('id');
  const customerId = customers[0].id;

  await advance(1);

  const offer = await db('offers_sent')
    .where({ customer_id: customerId, offer_type: 'early_payment_discount' })
    .first();

  expect(offer === undefined || offer.offer_type === 'early_payment_discount').toBe(true);
});

// ── E7: Clock advance returns new date ───────────────────────
test('E7: POST /clock/advance returns updated current date', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const before = await request(app).get('/clock').expect(200);
  const beforeDate = before.body.currentDate;

  const res = await request(app).post('/clock/advance?days=5').expect(200);
  expect(res.body.currentDate).toBeDefined();

  const expected = new Date(beforeDate);
  expected.setDate(expected.getDate() + 5);
  expect(res.body.currentDate).toBe(expected.toISOString().split('T')[0]);
});

// ── E8: Clock advance with invalid days returns 400 ──────────
test('E8: POST /clock/advance with invalid days returns 400', async () => {
  await request(app).post('/clock/advance?days=0').expect(400);
  await request(app).post('/clock/advance?days=abc').expect(400);
});

// ── E9: Payment reduces balance and updates status ────────────
test('E9: recording a payment reduces balance and updates invoice status', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const invoice = await db('invoices').where({ invoice_no: 'INV-003' }).first();
  expect(invoice.status).toBe('unpaid');

  const payment = Number(invoice.amount) * 0.5;
  const res = await request(app)
    .post('/payments')
    .send({ invoiceId: invoice.id, amount: payment })
    .expect(200);

  expect(res.body.invoice.status).toBe('partial');
  expect(Number(res.body.remainingBalance)).toBeCloseTo(payment, 0);

  await request(app)
    .post('/payments')
    .send({ invoiceId: invoice.id, amount: payment })
    .expect(200);

  const updated = await db('invoices').where({ id: invoice.id }).first();
  expect(updated.status).toBe('paid');
});

// ── E10: STOP webhook sets stop_messages flag ─────────────────
test('E10: STOP webhook reply sets customer stop_messages flag', async () => {
  const BASE = new Date().toISOString().split('T')[0];
  await resetAndSeed(BASE);

  const customers = await db('customers').where({ phone: '+919876543205' }).select('id');
  const customerId = customers[0].id;

  await request(app)
    .post('/webhook/incoming')
    .send({ customerId, text: 'STOP' })
    .expect(200);

  const customer = await db('customers').where({ id: customerId }).first();
  expect(customer.stop_messages).toBe(true);
});

