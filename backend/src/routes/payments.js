// backend/src/routes/payments.js
const express = require('express');
const router  = express.Router();
const db             = require('../db/pool');
const casesService   = require('../services/cases');
const clockService   = require('../services/clock');

router.post('/', async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;

    if (!invoiceId || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'invoiceId and positive amount are required' });
    }

    const invoice = await db('invoices').where({ id: invoiceId }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already fully paid' });
    }

    const remaining = Number(invoice.amount) - Number(invoice.paid_amount);
    const payment   = Math.min(Number(amount), remaining);
    const newPaid   = Number(invoice.paid_amount) + payment;
    const newStatus = newPaid >= Number(invoice.amount) ? 'paid' : 'partial';

    const [updated] = await db('invoices')
      .where({ id: invoiceId })
      .update({ paid_amount: newPaid, status: newStatus })
      .returning('*');

    if (newStatus === 'paid') {
      const todayStr = await clockService.getDateString();
      await casesService.resolveByInvoice(invoiceId, todayStr);
    }

    res.json({
      invoice: updated,
      paymentRecorded: payment,
      remainingBalance: Number(updated.amount) - Number(updated.paid_amount),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

