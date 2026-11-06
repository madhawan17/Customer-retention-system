// backend/src/services/reorder.js
const db = require('../db/pool');

async function check(customer, todayStr, provider) {
  const orders = await db('orders')
    .where({ customer_id: customer.id })
    .orderBy('order_date', 'asc')
    .select('*');

  if (orders.length < 2) return;

  let totalGap = 0;
  for (let i = 1; i < orders.length; i++) {
    const prev = new Date(orders[i - 1].order_date);
    const curr = new Date(orders[i].order_date);
    totalGap += Math.round((curr - prev) / (1000 * 60 * 60 * 24));
  }
  const avgGap = totalGap / (orders.length - 1);

  const lastOrder = orders[orders.length - 1];
  const lastOrderDate = new Date(lastOrder.order_date);
  const triggerDate = new Date(lastOrderDate);
  triggerDate.setDate(triggerDate.getDate() + Math.floor(avgGap * 0.9));

  if (new Date(todayStr) < triggerDate) return;

  const alreadyReminded = await db('outbox')
    .where({ customer_id: customer.id, stage: 'reorder_reminder' })
    .where('sent_at', '>', lastOrderDate.toISOString())
    .first();
  if (alreadyReminded) return;

  const overdueInvoice = await db('invoices')
    .where({ customer_id: customer.id })
    .whereIn('status', ['unpaid', 'partial'])
    .where('due_date', '<', todayStr)
    .first();

  let body;
  if (overdueInvoice) {
    const balance = Number(overdueInvoice.amount) - Number(overdueInvoice.paid_amount);
    body = `Hi ${customer.name}, we noticed you haven't reordered yet. ` +
           `Please clear your outstanding payment for invoice ${overdueInvoice.invoice_no} ` +
           `of Rs ${balance.toLocaleString('en-IN')} first, then we can process your next order!`;
  } else {
    let items = [];
    if (Array.isArray(lastOrder.items)) {
      items = lastOrder.items;
    } else if (typeof lastOrder.items === 'string') {
      try { items = JSON.parse(lastOrder.items); } catch (e) { items = []; }
    }
    const itemList = items.map(it => `${it.sku} x${it.qty}`).join(', ');

    body = `Hi ${customer.name}, it looks like it's time to reorder! ` +
           `Your last order was: ${itemList}. Reply YES to place a similar order.`;
  }

  await provider.sendMessage(
    customer.id,
    customer.phone,
    body,
    { stage: 'reorder_reminder' }
  );
}

async function createDraftOrder(customerId, todayStr) {
  const lastOrder = await db('orders')
    .where({ customer_id: customerId })
    .orderBy('order_date', 'desc')
    .first();

  if (!lastOrder) {
    return { success: false, message: 'No previous orders found to draft from.' };
  }

  const [newOrder] = await db('orders')
    .insert({
      customer_id: customerId,
      order_date:  todayStr,
      items:       lastOrder.items,
    })
    .returning('*');

  return {
    success: true,
    message: 'Draft order created based on your last order.',
    order: newOrder,
  };
}

module.exports = { check, createDraftOrder };

