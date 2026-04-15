const conversationAgent = require('../services/conversationAgent');

async function handleMessage(req, res) {
  const message = String(req.body.message || '').trim();
  const sessionId = String(req.body.sessionId || '').trim() || undefined;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  try {
    const response = await conversationAgent.processMessage(sessionId, message);
    return res.json({ success: true, ...response });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to process chat message.', details: error.message });
  }
}

function resetConversation(req, res) {
  const sessionId = String(req.body.sessionId || '').trim() || undefined;
  const response = conversationAgent.resetSession(sessionId);
  return res.json({ success: true, ...response });
}

function getMenu(req, res) {
  return res.json({ success: true, menu: conversationAgent.getMenuResponse() });
}

module.exports = {
  handleMessage,
  resetConversation,
  getMenu,
};

