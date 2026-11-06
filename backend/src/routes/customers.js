// backend/src/routes/customers.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const customers = await db('customers as c')
      .leftJoin('invoices as i', function () {
        this.on('i.customer_id', '=', 'c.id').andOnIn('i.status', ['unpaid', 'partial']);
      })
      .select(
        'c.id',
        'c.name',
        'c.phone',
        'c.tier',
        'c.salesperson',
        'c.credit_days',
        'c.stop_messages',
        db.raw('COALESCE(SUM(i.amount - i.paid_amount), 0) as outstanding_balance'),
        db.raw('COUNT(i.id) as open_invoice_count')
      )
      .groupBy('c.id', 'c.name', 'c.phone', 'c.tier', 'c.salesperson', 'c.credit_days', 'c.stop_messages')
      .orderBy('c.name');

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await db('outbox')
      .where({ customer_id: req.params.id })
      .orderBy('sent_at', 'asc')
      .select('*');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

