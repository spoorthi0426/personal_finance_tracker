/**
 * Conversation logic for natural language processing
 * Handles intent detection and entity extraction
 */

const {
  CARD_TYPES,
  CATEGORIES,
  validateFullName,
  validateCardType,
  validateCategory,
  validateAmount,
  validateDescription,
  validateDate,
  validateContactNumber,
  validateEmail,
} = require('./validation');

/**
 * Extract intent from user message
 */
function detectIntent(message) {
  const lower = message.toLowerCase();

  if (/\b(create|add|new|log|save|record)\b/.test(lower)) {
    return 'CREATE_EXPENSE';
  }
  if (/\b(view|show|list|get|display|check)\b/.test(lower)) {
    return 'VIEW_EXPENSES';
  }
  if (/\b(edit|update|change|modify)\b/.test(lower)) {
    return 'MODIFY_EXPENSE';
  }
  if (/\b(delete|remove|remove|clear)\b/.test(lower)) {
    return 'DELETE_EXPENSE';
  }
  if (/\b(analytics|summary|report|spending|breakdown)\b/.test(lower)) {
    return 'ANALYTICS';
  }
  if (/\b(help|what|how|faq|question)\b/.test(lower)) {
    return 'FAQ';
  }

  return 'UNCLEAR';
}

/**
 * Extract entities from user message
 */
function extractEntities(message) {
  const entities = {};

  // Extract amount
  const amountMatch = message.match(/(?:₹|£|$|rupee|dollar)?\s*(\d+(?:\.\d{2})?)/i);
  if (amountMatch) {
    const validation = validateAmount(amountMatch[1]);
    if (validation.valid) {
      entities.amount = validation.value;
    }
  }

  // Extract card type
  for (const card of CARD_TYPES) {
    if (new RegExp(card, 'i').test(message)) {
      entities.card_type = card;
      break;
    }
  }

  // Extract category
  for (const cat of CATEGORIES) {
    if (new RegExp(cat, 'i').test(message)) {
      entities.category = cat;
      break;
    }
  }

  // Extract date keywords
  if (/\b(today|yesterday|tomorrow)\b/i.test(message)) {
    const date = new Date();
    if (/yesterday/i.test(message)) {
      date.setDate(date.getDate() - 1);
    } else if (/tomorrow/i.test(message)) {
      date.setDate(date.getDate() + 1);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    entities.date = `${day}-${month}-${year}`;
  }

  // Extract email
  const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (emailMatch) {
    const validation = validateEmail(emailMatch[0]);
    if (validation.valid) {
      entities.email = validation.value;
    }
  }

  // Extract contact number
  const contactMatch = message.match(/\+\d{1,3}\d{10}/);
  if (contactMatch) {
    const validation = validateContactNumber(contactMatch[0]);
    if (validation.valid) {
      entities.contact_number = validation.value;
    }
  }

  // Extract description (multi-word phrases)
  const descMatch = message.match(/(?:for|to|about|on)\s+([a-zA-Z\s]+?)(?:\s+(?:using|with|on|yesterday|today|tomorrow)|\d+|$)/i);
  if (descMatch) {
    const desc = descMatch[1].trim();
    const validation = validateDescription(desc);
    if (validation.valid) {
      entities.description = validation.value;
    }
  }

  return entities;
}

/**
 * Generate conversational response based on state
 */
function generateResponse(state) {
  const { action, filled, missing, error, data } = state;

  if (error) {
    return error;
  }

  switch (action) {
    case 'CREATE_EXPENSE':
      if (missing.length > 0) {
        const field = missing[0];
        return generateFieldPrompt(field);
      }
      return generateConfirmation(data);

    case 'VIEW_EXPENSES':
      return 'Please provide your mobile number to view expenses.';

    case 'MODIFY_EXPENSE':
      return 'Please provide your mobile number to see your expenses.';

    case 'DELETE_EXPENSE':
      return 'Please provide your mobile number to select an expense to delete.';

    case 'ANALYTICS':
      return 'Generating your spending analytics...';

    case 'UNCLEAR':
      return getMainMenu();

    default:
      return getMainMenu();
  }
}

/**
 * Generate field-specific prompt
 */
function generateFieldPrompt(field) {
  const prompts = {
    full_name: 'What is your full name? (First and Last name)',
    card_type: `Which card did you use? (${CARD_TYPES.join(' / ')})`,
    category: `What category is this? (${CATEGORIES.join(' / ')})`,
    amount: 'What is the expense amount?',
    description: 'What was this expense for?',
    date: 'When did this happen? (DD-MM-YYYY format, or say "today")',
    contact_number: 'What is your contact number? (Include country code, e.g., +91XXXXXXXXXX)',
    email: 'What is your email address?',
  };

  return prompts[field] || 'Please provide the missing information.';
}

/**
 * Generate confirmation summary
 */
function generateConfirmation(data) {
  return `
📋 **Expense Summary**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${data.full_name}
Amount: ₹${data.amount}
Category: ${data.category}
Card: ${data.card_type}
Description: ${data.description}
Date: ${data.date}
Contact: ${data.contact_number}
Email: ${data.email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Does this look correct? (Say "yes" to confirm or "edit" to change)
  `;
}

/**
 * Get main menu
 */
function getMainMenu() {
  return `
🏦 **Personal Finance Assistant**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What would you like to do?

1️⃣  **Create Expense** - Log a new expense
2️⃣  **View Expenses** - See your expenses
3️⃣  **Modify Expense** - Update an expense
4️⃣  **Delete Expense** - Remove an expense
5️⃣  **Analytics** - View spending summary
6️⃣  **Help** - Need assistance?

Just tell me what you want to do!
  `;
}

/**
 * Extract mobile number from message
 */
function extractMobileNumber(message) {
  const match = message.match(/\+\d{1,3}\d{10}/);
  return match ? match[0] : null;
}

module.exports = {
  detectIntent,
  extractEntities,
  generateResponse,
  generateFieldPrompt,
  generateConfirmation,
  getMainMenu,
  extractMobileNumber,
};
