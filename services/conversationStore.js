const sessions = new Map();

function createSession(id) {
  return {
    id,
    stage: 'menu',
    currentAction: null,
    draft: {},
    draftUpdates: {},
    selectedExpenseId: null,
    selectedExpenseSnapshot: null,
    lastListedExpenses: [],
    lastMobile: null,
    awaitingConfirmation: null,
  };
}

function getSession(sessionId) {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (!sessions.has(id)) sessions.set(id, createSession(id));
  return sessions.get(id);
}

function resetSession(sessionId) {
  const session = getSession(sessionId);
  const fresh = createSession(session.id);
  sessions.set(session.id, fresh);
  return fresh;
}

module.exports = {
  getSession,
  resetSession,
};

