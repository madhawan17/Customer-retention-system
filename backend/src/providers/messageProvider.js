// backend/src/providers/messageProvider.js
class MessageProvider {
  async sendMessage(customerId, phoneNumber, body, meta = {}) {
    throw new Error('sendMessage() must be implemented by a concrete provider');
  }

  async getStatus(messageId) {
    throw new Error('getStatus() must be implemented by a concrete provider');
  }
}

module.exports = MessageProvider;

