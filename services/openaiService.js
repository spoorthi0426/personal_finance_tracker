const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function analyzeMessageWithOpenAI(message, session) {
  if (!isConfigured()) return null;

  const payload = {
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract intent and finance entities from user messages. Return JSON with keys: intent, fields, mobile, selectionNumber, confirm, cancel, faq. ' +
          'Allowed intents: CREATE_EXPENSE, VIEW_EXPENSES, MODIFY_EXPENSE, DELETE_EXPENSE, ANALYTICS, FAQ, MENU, UNKNOWN. ' +
          'Allowed fields keys: full_name, card_type, category, amount, description, date, contact_number, email. ' +
          'Normalize card_type to Debit Card or Credit Card, category to Transport, Shopping, or Food, and date to DD-MM-YYYY. Use null when unsure.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          message,
          sessionStage: session.stage,
          currentAction: session.currentAction,
          draft: session.draft,
          selectedExpenseId: session.selectedExpenseId,
        }),
      },
    ],
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content);
}

module.exports = {
  analyzeMessageWithOpenAI,
};

