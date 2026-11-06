// backend/src/providers/mockProvider.js
const MessageProvider = require('./messageProvider');
const db = require('../db/pool');

class MockProvider extends MessageProvider {
  async sendMessage(customerId, phoneNumber, body, meta = {}) {
    const { invoiceIds = [], stage = null } = meta;

    const invoiceId = Array.isArray(invoiceIds) && invoiceIds.length > 0
      ? invoiceIds[0]
      : null;

    const [row] = await db('outbox')
      .insert({
        customer_id: customerId,
        invoice_id:  invoiceId,
        stage:       stage,
        body:        body,
        status:      'sent',
        direction:   'outbound',
        sent_at:     new Date(),
      })
      .returning('id');

    return { messageId: row.id };
  }

  async getStatus(messageId) {
    const row = await db('outbox').where({ id: messageId }).first('status');
    if (!row) throw new Error(`Message ${messageId} not found`);
    return row.status;
  }

  async receiveMessage(customerId, body) {
    const [row] = await db('outbox')
      .insert({
        customer_id: customerId,
        invoice_id:  null,
        stage:       'inbound',
        body:        body,
        status:      'read',
        direction:   'inbound',
        sent_at:     new Date(),
      })
      .returning('id');

    return { messageId: row.id };
  }
}

let _instance = null;

function getMockProvider() {
  if (!_instance) _instance = new MockProvider();
  return _instance;
}

module.exports = { MockProvider, getMockProvider };

