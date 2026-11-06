// backend/src/routes/webhook.js
const express       = require('express');
const router        = express.Router();
const db            = require('../db/pool');
const casesService  = require('../services/cases');
const reorderService = require('../services/reorder');
const clockService  = require('../services/clock');
const { getMockProvider } = require('../providers/mockProvider');

const provider = getMockProvider();

router.post('/incoming', async (req, res) => {
  try {
    const { customerId, text } = req.body;
    if (!customerId || !text) {
      return res.status(400).json({ error: 'customerId and text are required' });
    }

    const customer = await db('customers').where({ id: customerId }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const todayStr = await clockService.getDateString();
    const upper    = text.trim().toUpperCase();

    await provider.receiveMessage(customerId, text.trim());

    let responseMessage = null;

    if (upper === 'PAID') {
      const invoice = await db('invoices')
        .where({ customer_id: customerId })
        .whereIn('status', ['unpaid', 'partial'])
        .where('due_date', '<=', todayStr)
        .orderBy('due_date', 'asc')
        .first();

      if (!invoice) {
        responseMessage = `Thank you ${customer.name}! No outstanding invoices found.`;
      } else {
        const balance = Number(invoice.amount) - Number(invoice.paid_amount);
        await db('invoices').where({ id: invoice.id }).update({ paid_amount: invoice.amount, status: 'paid' });
        await casesService.resolveByInvoice(invoice.id, todayStr);
        responseMessage = `Payment recorded for invoice ${invoice.invoice_no} of Rs ${balance.toLocaleString('en-IN')}. Thank you!`;
      }
    } else if (upper.startsWith('PROMISE')) {
      const parts = text.trim().split(/\s+/);
      const dateStr = parts[1];

      if (!dateStr || isNaN(Date.parse(dateStr))) {
        return res.status(400).json({ error: 'PROMISE requires a date in YYYY-MM-DD format, e.g. PROMISE 2025-12-31' });
      }

      const invoice = await db('invoices')
        .where({ customer_id: customerId })
        .whereIn('status', ['unpaid', 'partial'])
        .where('due_date', '<=', todayStr)
        .orderBy('due_date', 'asc')
        .first();

      if (invoice) {
        await db('promise_to_pay')
          .insert({ invoice_id: invoice.id, promised_date: dateStr, fulfilled: false })
          .onConflict('invoice_id')
          .merge(['promised_date', 'fulfilled']);

        await casesService.openCase({
          customerId,
          invoiceId: invoice.id,
          type:      'promise_to_pay',
          owner:     customer.salesperson,
          todayStr,
        });
      }

      responseMessage = `Thank you ${customer.name}. We've noted your promise to pay by ${dateStr}. We'll follow up if payment is not received by then.`;
    } else if (upper === 'DISPUTE') {
      const invoice = await db('invoices')
        .where({ customer_id: customerId })
        .whereIn('status', ['unpaid', 'partial'])
        .where('due_date', '<=', todayStr)
        .orderBy('due_date', 'asc')
        .first();

      if (invoice) {
        await casesService.openCase({
          customerId,
          invoiceId: invoice.id,
          type:      'dispute',
          owner:     customer.salesperson,
          todayStr,
        });
      }

      await db('notifications').insert({
        case_id:     null,
        customer_id: customerId,
        type:        'dispute',
        message:     `Customer ${customer.name} has raised a DISPUTE. Collections paused. Please contact them directly.`,
        read:        false,
      });

      responseMessage = `We've logged your dispute, ${customer.name}. Our team will reach out to you shortly. No further payment reminders will be sent in the meantime.`;
    } else if (upper === 'STOP') {
      await db('customers').where({ id: customerId }).update({ stop_messages: true });

      await db('notifications').insert({
        case_id:     null,
        customer_id: customerId,
        type:        'stop',
        message:     `Customer ${customer.name} replied STOP. All automated messages paused. Please contact them directly.`,
        read:        false,
      });

      responseMessage = `You've been unsubscribed from payment reminders, ${customer.name}. Your salesperson ${customer.salesperson} will be in touch.`;
    } else if (upper === 'YES') {
      const result = await reorderService.createDraftOrder(customerId, todayStr);
      responseMessage = result.message;
    } else {
      responseMessage = `Hi ${customer.name}, we didn't understand your reply. Valid commands: PAID, PROMISE <date>, DISPUTE, STOP, YES.`;
    }

    if (responseMessage) {
      await provider.sendMessage(customerId, customer.phone, responseMessage, { stage: 'webhook_response' });
    }

    res.json({ received: true, response: responseMessage });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

