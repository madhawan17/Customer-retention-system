// backend/src/services/offers.js
const db           = require('../db/pool');
const offersConfig = require('../../config/offers.json');

async function check(customer, todayStr, provider) {
  const earlyOfferConfig = offersConfig.offers.find(o => o.type === 'early_payment_discount');
  const winBackConfig    = offersConfig.offers.find(o => o.type === 'win_back');

  const hasHeavilyOverdue = await _hasOverdueOver(customer.id, todayStr, winBackConfig.blockedIfOverdueDays);
  if (hasHeavilyOverdue) return;

  await _checkEarlyPaymentDiscount(customer, todayStr, earlyOfferConfig, provider);
  await _checkWinBack(customer, todayStr, winBackConfig, provider);
}

async function _hasOverdueOver(customerId, todayStr, days) {
  const thresholdDate = new Date(todayStr);
  thresholdDate.setDate(thresholdDate.getDate() - days);

  const result = await db('invoices')
    .where({ customer_id: customerId })
    .whereIn('status', ['unpaid', 'partial'])
    .where('due_date', '<=', thresholdDate.toISOString().split('T')[0])
    .count('id as cnt')
    .first();

  return parseInt(result.cnt, 10) > 0;
}

async function _checkEarlyPaymentDiscount(customer, todayStr, config, provider) {
  const eligibleInvoices = await db('invoices')
    .where({ customer_id: customer.id })
    .whereIn('status', ['unpaid', 'partial'])
    .whereRaw('DATE(created_at) = ?', [todayStr])
    .select('*');

  for (const invoice of eligibleInvoices) {
    const alreadySent = await db('offers_sent')
      .where({ customer_id: customer.id, offer_type: 'early_payment_discount', invoice_id: invoice.id })
      .first();
    if (alreadySent) continue;

    const balance        = Number(invoice.amount) - Number(invoice.paid_amount);
    const discountAmount = (balance * config.discountPct / 100).toFixed(2);
    const discounted     = (balance - discountAmount).toFixed(2);
    const expiryDate     = new Date(todayStr);
    expiryDate.setDate(expiryDate.getDate() + config.expiryDays);
    const expiryStr = expiryDate.toISOString().split('T')[0];

    const body = offersConfig.offers
      .find(o => o.type === 'early_payment_discount')
      .template
      .replace('{name}', customer.name)
      .replace('{invoice_no}', invoice.invoice_no)
      .replace('{discounted_amount}', Number(discounted).toLocaleString('en-IN'))
      .replace('{amount}', balance.toLocaleString('en-IN'))
      .replace('{expiry_date}', expiryStr);

    await provider.sendMessage(customer.id, customer.phone, body, { stage: 'early_payment_discount' });
    await db('offers_sent').insert({
      customer_id: customer.id,
      invoice_id:  invoice.id,
      offer_type:  'early_payment_discount',
      expiry_date: expiryStr,
    });
  }
}

async function _checkWinBack(customer, todayStr, config, provider) {
  const lastOrder = await db('orders')
    .where({ customer_id: customer.id })
    .orderBy('order_date', 'desc')
    .first();

  if (!lastOrder) return;

  const daysSinceLastOrder = Math.round(
    (new Date(todayStr) - new Date(lastOrder.order_date)) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastOrder < config.inactiveDays) return;

  const recentOffer = await db('offers_sent')
    .where({ customer_id: customer.id, offer_type: 'win_back' })
    .where('expiry_date', '>=', todayStr)
    .first();
  if (recentOffer) return;

  const couponCode = `WINBACK-${customer.id}-${Date.now().toString(36).toUpperCase()}`;
  const expiryDate = new Date(todayStr);
  expiryDate.setDate(expiryDate.getDate() + config.couponValidDays);
  const expiryStr = expiryDate.toISOString().split('T')[0];

  const body = offersConfig.offers
    .find(o => o.type === 'win_back')
    .template
    .replace('{name}', customer.name)
    .replace('{last_order_date}', new Date(lastOrder.order_date).toISOString().split('T')[0])
    .replace('{coupon_code}', couponCode)
    .replace('{expiry_date}', expiryStr);

  await provider.sendMessage(customer.id, customer.phone, body, { stage: 'win_back' });
  await db('offers_sent').insert({
    customer_id: customer.id,
    offer_type:  'win_back',
    expiry_date: expiryStr,
  });
}

module.exports = { check };

