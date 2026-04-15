const express = require('express');
const router = express.Router();
const {
  detectIntent,
  extractEntities,
  generateResponse,
  generateFieldPrompt,
  generateConfirmation,
  getMainMenu,
  extractMobileNumber,
} = require('../utils/conversation');
const { validateExpense } = require('../utils/validation');
const Expense = require('../models/Expense');

// In-memory session storage (in production, use Redis or database)
const sessions = {};

/**
 * POST /api/conversation/message
 * Process user message and return conversational response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const sid = sessionId || `session_${Date.now()}`;
    if (!sessions[sid]) {
      sessions[sid] = {
        state: 'MENU',
        action: null,
        filled: {},
        missing: ['full_name', 'card_type', 'category', 'amount', 'description', 'date', 'contact_number', 'email'],
      };
    }

    const session = sessions[sid];
    const intent = detectIntent(message);
    const entities = extractEntities(message);

    // Update session based on intent
    if (intent === 'CREATE_EXPENSE' && session.state !== 'CREATE_EXPENSE') {
      session.state = 'CREATE_EXPENSE';
      session.action = 'CREATE_EXPENSE';
      session.filled = {};
      session.missing = ['full_name', 'card_type', 'category', 'amount', 'description', 'date', 'contact_number', 'email'];
    }

    // Handle CREATE_EXPENSE flow
    if (session.state === 'CREATE_EXPENSE') {
      // Extract and validate entities
      Object.keys(entities).forEach((key) => {
        if (session.missing.includes(key)) {
          session.filled[key] = entities[key];
          session.missing = session.missing.filter((m) => m !== key);
        }
      });

      // Check for confirmation
      if (/\b(yes|confirm|correct|ok|okay|good)\b/i.test(message)) {
        // All fields filled?
        if (session.missing.length === 0) {
          const validation = validateExpense(session.filled);

          if (!validation.valid) {
            return res.json({
              sessionId: sid,
              state: session.state,
              success: false,
              message: validation.errors.join('\n'),
              action: 'create_expense',
            });
          }

          // Save expense to database
          try {
            const expense = new Expense(validation.data);
            await expense.save();

            session.state = 'MENU';
            session.action = null;
            session.filled = {};
            session.missing = ['full_name', 'card_type', 'category', 'amount', 'description', 'date', 'contact_number', 'email'];

            return res.json({
              sessionId: sid,
              state: session.state,
              success: true,
              message: '✅ Expense saved successfully!',
              data: expense,
              action: 'create_expense',
              nextPrompt: getMainMenu(),
            });
          } catch (error) {
            return res.json({
              sessionId: sid,
              state: session.state,
              success: false,
              message: 'Something went wrong while saving. Please try again.',
              error: error.message,
            });
          }
        }
      }

      // Check for edit/correction
      if (/\b(edit|change|fix|wrong|incorrect|back)\b/i.test(message)) {
        const field = session.missing[0];
        return res.json({
          sessionId: sid,
          state: session.state,
          success: true,
          message: `Let me help you fix that. What is the correct ${field}?`,
          field,
          action: 'create_expense',
        });
      }

      // Continue collection if fields are missing
      if (session.missing.length > 0) {
        const nextField = session.missing[0];
        const prompt = generateFieldPrompt(nextField);

        return res.json({
          sessionId: sid,
          state: session.state,
          success: true,
          message: prompt,
          filledFields: Object.keys(session.filled),
          missingFields: session.missing,
          action: 'create_expense',
        });
      }

      // Show confirmation if all fields filled
      if (Object.keys(session.filled).length === 8) {
        const confirmation = generateConfirmation(session.filled);
        return res.json({
          sessionId: sid,
          state: session.state,
          success: true,
          message: confirmation,
          filledFields: Object.keys(session.filled),
          ready: true,
          action: 'create_expense',
        });
      }
    }

    // Handle VIEW_EXPENSES
    if (intent === 'VIEW_EXPENSES') {
      const mobile = extractMobileNumber(message);

      if (!mobile) {
        return res.json({
          sessionId: sid,
          state: 'VIEW_EXPENSES',
          success: false,
          message: 'Please provide your mobile number (e.g., +91XXXXXXXXXX)',
          action: 'view_expenses',
        });
      }

      try {
        const expenses = await Expense.find({ contact_number: mobile }).sort({ date: -1 });

        if (expenses.length === 0) {
          return res.json({
            sessionId: sid,
            state: 'MENU',
            success: true,
            message: 'You have no expenses yet. Start logging your spending!',
            action: 'view_expenses',
            nextPrompt: getMainMenu(),
          });
        }

        session.state = 'MENU';
        return res.json({
          sessionId: sid,
          state: session.state,
          success: true,
          message: `Found ${expenses.length} expense(s)`,
          data: expenses,
          action: 'view_expenses',
          nextPrompt: getMainMenu(),
        });
      } catch (error) {
        return res.json({
          sessionId: sid,
          state: 'MENU',
          success: false,
          message: 'Failed to retrieve expenses. Please try again.',
          action: 'view_expenses',
        });
      }
    }

    // Handle FAQ
    if (intent === 'FAQ') {
      const faqResponse = handleFAQ(message);
      return res.json({
        sessionId: sid,
        state: session.state,
        success: true,
        message: faqResponse,
        action: 'faq',
      });
    }

    // Default: show menu
    session.state = 'MENU';
    return res.json({
      sessionId: sid,
      state: session.state,
      success: true,
      message: getMainMenu(),
      action: 'menu',
    });
  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Conversation processing failed',
      details: error.message,
    });
  }
});

/**
 * Handle FAQ queries
 */
function handleFAQ(message) {
  const lower = message.toLowerCase();

  if (/category|categories/.test(lower)) {
    return `📁 **Allowed Categories:**
- Transport (bus, taxi, flights, etc.)
- Shopping (clothes, books, gadgets, etc.)
- Food (restaurants, groceries, cafe, etc.)`;
  }

  if (/date|format/.test(lower)) {
    return `📅 **Date Format:**
Use DD-MM-YYYY format (e.g., 15-04-2026)
You can also say "today", "yesterday", or "tomorrow"`;
  }

  if (/card|payment/.test(lower)) {
    return `💳 **Supported Cards:**
- Debit Card
- Credit Card`;
  }

  if (/mobile|number|phone/.test(lower)) {
    return `📱 **Contact Number Format:**
Include country code + 10 digits
Example: +91XXXXXXXXXX (for India)`;
  }

  return `ℹ️  **Available Topics:**
- Categories
- Date format
- Card types
- Mobile number format
- Other questions?`;
}

/**
 * GET /api/conversation/menu
 * Show main menu
 */
router.get('/menu', (req, res) => {
  res.json({
    success: true,
    menu: getMainMenu(),
  });
});

module.exports = router;
