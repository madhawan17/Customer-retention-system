// backend/src/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');

const clockRoute        = require('./routes/clock');
const customersRoute    = require('./routes/customers');
const paymentsRoute     = require('./routes/payments');
const webhookRoute      = require('./routes/webhook');
const casesRoute        = require('./routes/cases');
const notificationsRoute = require('./routes/notifications');
const db                = require('./db/pool');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.NEXT_PUBLIC_API_URL ? '*' : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json());

app.use('/clock',         clockRoute);
app.use('/customers',     customersRoute);
app.use('/payments',      paymentsRoute);
app.use('/webhook',       webhookRoute);
app.use('/cases',         casesRoute);
app.use('/notifications', notificationsRoute);

const seedDatabase = require('../scripts/seed-fn');

app.post('/seed/reset', async (req, res) => {
  try {
    const BASE = req.body?.baseDate || new Date().toISOString().split('T')[0];

    await db.raw(`
      TRUNCATE TABLE
        notifications,
        offers_sent,
        promise_to_pay,
        invoice_stages,
        outbox,
        cases,
        orders,
        invoices,
        customers
      RESTART IDENTITY CASCADE
    `);

    await seedDatabase(db, BASE);

    res.json({ success: true, message: 'Database reset to seed state', baseDate: BASE });
  } catch (err) {
    console.error('Seed reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Retention backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;

