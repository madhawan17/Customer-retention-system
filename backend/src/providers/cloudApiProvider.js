// backend/src/providers/cloudApiProvider.js
// Real WhatsApp Cloud API provider — STUB ONLY.
//
// How to plug in the real Cloud API:
//  1. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env
//  2. Implement sendMessage() to POST to:
//     https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
//     with Authorization: Bearer {TOKEN}
//     and body: { messaging_product: 'whatsapp', to: phoneNumber, type: 'text', text: { body } }
//  3. Implement getStatus() to look up message status from the Cloud API or webhook callbacks
//  4. Replace getMockProvider() import with getCloudApiProvider() in engine.js

const MessageProvider = require('./messageProvider');

class CloudApiProvider extends MessageProvider {
  async sendMessage(customerId, phoneNumber, body, meta = {}) {
    throw new Error('CloudApiProvider is a stub. Use MockProvider for development.');
  }

  async getStatus(messageId) {
    throw new Error('CloudApiProvider is a stub. Use MockProvider for development.');
  }
}

function getCloudApiProvider() {
  return new CloudApiProvider();
}

module.exports = { CloudApiProvider, getCloudApiProvider };

