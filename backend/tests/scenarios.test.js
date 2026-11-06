// backend/tests/scenarios.test.js
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
  const res = await request(app)
    .post(`/clock/advance?days=${days}`)
    .expect(200);
  return res.body;
}

async function getMessages(customerId) {
  const res = await request(app)
    .get(`/customers/${customerId}/messages`)
    .expect(200);
  return res.body;
}

async function sendReply(customerId, text) {
  return request(app)
    .post('/webhook/incoming')
    .send({ customerId, text })
    .expect(200);
}

beforeAll(async () => {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();
  const fs   = require('fs');
  const path = require('path');
  const sql  = fs.readFileSync(
    path.join(__dirname, '../src/db/migrations/001_init.sql'),
    'utf8'
  );
  await client.query(sql);
  await client.end();
});

afterAll(async () => {
  await db.destroy();
});

describe('Scenario 1: Customer pays before due date', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    const result = await resetAndSeed(BASE);
    customerId = result.customers[6];
  });

  test('no follow-up messages sent for a fully-paid invoice', async () => {
    await advance(10);

    const messages = await getMessages(customerId);
    const stageMessages = messages.filter(
      m => m.direction === 'outbound' && m.stage !== 'win_back' && m.stage !== 'reorder_reminder'
    );
    expect(stageMessages).toHaveLength(0);
  });
});

describe('Scenario 2: Partial payment shows reduced balance', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    await resetAndSeed(BASE);

    const customers = await db('customers').where({ phone: '+919876543206' }).select('id');
    customerId = customers[0].id;
  });

  test('reminder message contains reduced balance after partial payment', async () => {
    await advance(1);

    const messages = await getMessages(customerId);
    const stageMessages = messages.filter(m => m.direction === 'outbound' && m.stage);

    expect(stageMessages.length).toBeGreaterThan(0);

    const lastMsg = stageMessages[stageMessages.length - 1];
    expect(lastMsg.body).toMatch(/12,000|12000/);
    expect(lastMsg.body).not.toMatch(/20,000|20000/);
  });
});

describe('Scenario 3: PROMISE reply pauses reminders', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    await resetAndSeed(BASE);

    const customers = await db('customers').where({ phone: '+919876543203' }).select('id');
    customerId = customers[0].id;
  });

  test('no stage messages sent while promise is active', async () => {
    await advance(1);

    const promiseDate = new Date();
    promiseDate.setDate(promiseDate.getDate() + 10);
    const promiseDateStr = promiseDate.toISOString().split('T')[0];

    await sendReply(customerId, `PROMISE ${promiseDateStr}`);

    await advance(3);

    const msgsAfter = await getMessages(customerId);
    const stageCount = msgsAfter.filter(
      m => m.direction === 'outbound' && ['firm_followup', 'final_notice'].includes(m.stage)
    ).length;

    expect(stageCount).toBe(0);
  });
});

describe('Scenario 4: DISPUTE reply pauses collections and opens case', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    await resetAndSeed(BASE);

    const customers = await db('customers').where({ phone: '+919876543204' }).select('id');
    customerId = customers[0].id;
  });

  test('dispute case is opened and no further stage messages sent', async () => {
    await advance(1);

    await sendReply(customerId, 'DISPUTE');

    await advance(10);

    const msgs = await getMessages(customerId);
    const stageMsgsAfterDispute = msgs.filter(
      m => m.direction === 'outbound' && m.stage === 'final_notice'
    );

    expect(stageMsgsAfterDispute).toHaveLength(0);

    const cases = await db('cases')
      .where({ customer_id: customerId, type: 'dispute' })
      .select('*');
    expect(cases.length).toBeGreaterThan(0);
    expect(['open', 'waiting', 'escalated']).toContain(cases[0].status);
  });
});

describe('Scenario 5: STOP reply halts all messages', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    await resetAndSeed(BASE);

    const customers = await db('customers').where({ phone: '+919876543205' }).select('id');
    customerId = customers[0].id;
  });

  test('no messages sent after STOP reply, salesperson notified', async () => {
    await sendReply(customerId, 'STOP');

    const customer = await db('customers').where({ id: customerId }).first();
    expect(customer.stop_messages).toBe(true);

    await advance(20);

    const msgs = await getMessages(customerId);
    const stageMsgs = msgs.filter(
      m => m.direction === 'outbound' && !['webhook_response', 'win_back', 'reorder_reminder'].includes(m.stage)
    );
    expect(stageMsgs).toHaveLength(0);

    const notifications = await db('notifications')
      .where({ customer_id: customerId, type: 'stop' })
      .select('*');
    expect(notifications.length).toBeGreaterThan(0);
  });
});

describe('Scenario 6: 3 overdue invoices merged into one message', () => {
  let customerId;

  beforeEach(async () => {
    const BASE = new Date().toISOString().split('T')[0];
    await resetAndSeed(BASE);

    const customers = await db('customers').where({ phone: '+919876543208' }).select('id');
    customerId = customers[0].id;
  });

  test('exactly one outbound stage message per engine run for a customer with 3 overdue invoices', async () => {
    await advance(1);

    const msgs = await getMessages(customerId);
    const stageMsgs = msgs.filter(
      m => m.direction === 'outbound' &&
      m.stage !== null &&
      !['win_back', 'reorder_reminder', 'webhook_response', 'early_payment_discount'].includes(m.stage)
    );

    expect(stageMsgs).toHaveLength(1);
    expect(stageMsgs[0].body).toMatch(/INV-008|INV-009|INV-010/);
  });
});

