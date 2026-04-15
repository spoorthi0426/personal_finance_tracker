const Expense = require('../models/Expense');
const { getSession, resetSession: storeResetSession } = require('./conversationStore');
const { getFaqAnswer } = require('./faqService');
const { analyzeMessageWithOpenAI } = require('./openaiService');
const { FIELD_VALIDATORS, CARD_TYPES, CATEGORIES, validateExpensePayload } = require('../utils/validation');

const REQUIRED_FIELDS = [
  'full_name',
  'card_type',
  'category',
  'amount',
  'description',
  'date',
  'contact_number',
  'email',
];

const FIELD_LABELS = {
  full_name: 'Full Name',
  card_type: 'Card Type',
  category: 'Category',
  amount: 'Amount',
  description: 'Description',
  date: 'Date',
  contact_number: 'Contact Number',
  email: 'Email',
};

function getMenuResponse() {
  return {
    text: [
      'Choose what you want to do:',
      '1. Create Expense',
      '2. View Expenses',
      '3. Modify Expense',
      '4. Delete Expense',
      '5. Analytics',
      'You can also ask quick questions like "what date format should I use?" without leaving the current flow.',
    ].join('\n'),
    menuOptions: ['Create Expense', 'View Expenses', 'Modify Expense', 'Delete Expense', 'Analytics', 'Help'],
  };
}

function withMenu(text, extra = {}) {
  return {
    text,
    menuOptions: getMenuResponse().menuOptions,
    ...extra,
  };
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function summarizeDraft(draft) {
  return [
    `Full name: ${draft.full_name}`,
    `Card type: ${draft.card_type}`,
    `Category: ${draft.category}`,
    `Amount: ${formatCurrency(draft.amount)}`,
    `Description: ${draft.description}`,
    `Date: ${draft.date}`,
    `Contact number: ${draft.contact_number}`,
    `Email: ${draft.email}`,
  ].join('\n');
}

function getFieldPrompt(field) {
  const prompts = {
    full_name: 'Please share the full name exactly as first name and last name.',
    card_type: `Which card type was used? Choose ${CARD_TYPES.join(' or ')}.`,
    category: `Which category should I use? Choose ${CATEGORIES.join(', ')}.`,
    amount: 'What is the amount?',
    description: 'What is the expense description?',
    date: 'What is the date in DD-MM-YYYY format?',
    contact_number: 'What is the contact number with country code and 10 digits?',
    email: 'What is the email address?',
  };

  return prompts[field];
}

function buildSequentialPrompt(draft, nextField) {
  const completedCount = Object.keys(draft).length;
  const totalCount = REQUIRED_FIELDS.length;
  const completedLines = REQUIRED_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(draft, field)
  ).map((field) => `${FIELD_LABELS[field]}: ${draft[field]}`);

  const summary = completedLines.length
    ? `Captured so far:\n${completedLines.join('\n')}\n\n`
    : '';

  return `${summary}Step ${completedCount + 1} of ${totalCount}\n${getFieldPrompt(nextField)}`;
}

function detectIntent(message) {
  const text = message.toLowerCase();
  if (/(^|\b)(menu|start over|main menu|home|help)(\b|$)/.test(text)) return 'MENU';
  if (/(^|\b)(create|add|log|record|save)(\b|$)/.test(text)) return 'CREATE_EXPENSE';
  if (/(^|\b)(view|show|list|see)(\b|$)/.test(text)) return 'VIEW_EXPENSES';
  if (/(^|\b)(modify|edit|update|change)(\b|$)/.test(text)) return 'MODIFY_EXPENSE';
  if (/(^|\b)(delete|remove)(\b|$)/.test(text)) return 'DELETE_EXPENSE';
  if (/(^|\b)(analytics|summary|report|spending|breakdown)(\b|$)/.test(text)) return 'ANALYTICS';
  if (/\?/.test(text) || /(format|category|categories|card|email|mobile|phone|contact)/.test(text)) return 'FAQ';
  return 'UNKNOWN';
}

function toTitleCase(value) {
  return value.toLowerCase().split(' ').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getMissingFields(draft) {
  return REQUIRED_FIELDS.filter((field) => !Object.prototype.hasOwnProperty.call(draft, field));
}

function applyValidatedFields(target, fields) {
  const errors = {};

  Object.entries(fields).forEach(([field, value]) => {
    if (!FIELD_VALIDATORS[field]) return;
    const result = FIELD_VALIDATORS[field](value);
    if (!result.valid) {
      errors[field] = result.error;
      return;
    }
    target[field] = result.value;
  });

  return errors;
}

function resetWorkingState(session) {
  session.stage = 'menu';
  session.currentAction = null;
  session.draft = {};
  session.draftUpdates = {};
  session.selectedExpenseId = null;
  session.selectedExpenseSnapshot = null;
  session.lastListedExpenses = [];
  session.awaitingConfirmation = null;
}

function expenseToPayload(expense) {
  return {
    id: expense._id?.toString?.() || expense.id,
    full_name: expense.full_name,
    card_type: expense.card_type,
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    date: expense.date,
    contact_number: expense.contact_number,
    email: expense.email,
  };
}

function listExpensesPayload(expenses) {
  return expenses.map((expense, index) => ({
    ...expenseToPayload(expense),
    label: `${index + 1}. ${expense.date} | ${expense.category} | ${formatCurrency(expense.amount)} | ${expense.description}`,
  }));
}

function parseCommaSeparatedExpenseInput(text) {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 8) {
    return {};
  }

  const maybeDateIndex = parts.findIndex((part) => /^\d{2}-\d{2}-\d{4}$/.test(part));
  const maybeEmailIndex = parts.findIndex((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(part));
  const maybePhoneIndex = parts.findIndex((part) => /^\+\d{1,3}\d{10}$/.test(part));

  if (maybeDateIndex === -1 || maybeEmailIndex === -1 || maybePhoneIndex === -1) {
    return {};
  }

  const cardType = parts.find((part) => /^(debit card|credit card)$/i.test(part));
  const category = parts.find((part) => /^(transport|shopping|food)$/i.test(part));
  const amount = parts.find((part) => /^\d+(?:\.\d{1,2})?$/.test(part));

  if (!cardType || !category || !amount) {
    return {};
  }

  const cardIndex = parts.findIndex((part) => part === cardType);
  const categoryIndex = parts.findIndex((part) => part === category);
  const amountIndex = parts.findIndex((part) => part === amount);

  if (cardIndex < 1 || categoryIndex < 2 || amountIndex < 3) {
    return {};
  }

  const name = parts.slice(0, cardIndex).join(' ').trim();
  const description = parts.slice(amountIndex + 1, maybeDateIndex).join(', ').trim();

  return {
    full_name: name,
    card_type: /debit/i.test(cardType) ? 'Debit Card' : 'Credit Card',
    category: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
    amount: Number(amount),
    description,
    date: parts[maybeDateIndex],
    contact_number: parts[maybePhoneIndex],
    email: parts[maybeEmailIndex].toLowerCase(),
  };
}

function extractFieldsFallback(message, session) {
  const text = message.trim();
  const lower = text.toLowerCase();
  const fields = parseCommaSeparatedExpenseInput(text);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) fields.email = emailMatch[0].toLowerCase();

  const mobileMatch = text.match(/\+\d{1,3}\d{10}/);
  if (mobileMatch) fields.contact_number = mobileMatch[0];

  const dateMatch = text.match(/\b\d{2}-\d{2}-\d{4}\b/);
  if (dateMatch) fields.date = dateMatch[0];

  if (/(debit\s*card|debit)/i.test(text)) fields.card_type = 'Debit Card';
  else if (/(credit\s*card|credit)/i.test(text)) fields.card_type = 'Credit Card';

  if (/\btransport\b/i.test(text)) fields.category = 'Transport';
  else if (/\bshopping\b/i.test(text)) fields.category = 'Shopping';
  else if (/\bfood\b/i.test(text)) fields.category = 'Food';

  const amountPatterns = [
    /\bamount(?:\s+is|\s+to)?\s+(\d+(?:\.\d{1,2})?)\b/i,
    /\b(?:rs|inr|usd|\$)\s*(\d+(?:\.\d{1,2})?)\b/i,
    /\b(\d+(?:\.\d{1,2})?)\b/,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.amount = Number(match[1]);
      break;
    }
  }

  const namePattern = /\b(?:full name|name is|i am|this is)\s+([A-Za-z]+(?:[ '-][A-Za-z]+)+)\b/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch && !fields.full_name) {
    fields.full_name = toTitleCase(nameMatch[1]);
  } else if (
    !fields.full_name &&
    session.stage === 'collect_create' &&
    !session.draft.full_name &&
    /^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(text) &&
    !/(create|expense|view|modify|delete|analytics|help)/i.test(text)
  ) {
    fields.full_name = toTitleCase(text);
  }

  const descriptionPatterns = [
    /\bdescription(?:\s+is|:)\s+(.+)$/i,
    /\bfor\s+(.+)$/i,
  ];
  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match && !fields.description) {
      fields.description = match[1].trim().replace(/[.]+$/, '');
      break;
    }
  }

  if (session.stage === 'collect_create' && !fields.description && getMissingFields(session.draft)[0] === 'description') {
    fields.description = text;
  }

  if (session.stage === 'collect_update_fields' && !fields.description) {
    const descUpdateMatch = text.match(/\b(?:description|desc)\s+(?:to|is)\s+(.+)$/i);
    if (descUpdateMatch) fields.description = descUpdateMatch[1].trim();
  }

  const selectionMatch = text.match(/\b(\d+)\b/);

  return {
    intent: detectIntent(text),
    fields,
    mobile: fields.contact_number || mobileMatch?.[0] || null,
    selectionNumber: selectionMatch ? Number(selectionMatch[1]) : null,
    confirm: /^(yes|y|confirm|save|proceed|delete it|update it)$/i.test(lower) || /\bconfirm\b/i.test(lower),
    cancel: /\b(cancel|stop|nevermind|never mind|menu|start over)\b/i.test(lower),
    faq: getFaqAnswer(text),
  };
}

async function analyzeMessage(message, session) {
  const fallback = extractFieldsFallback(message, session);
  try {
    const aiResult = await analyzeMessageWithOpenAI(message, session);
    if (!aiResult) return fallback;

    return {
      intent: aiResult.intent || fallback.intent,
      fields: { ...fallback.fields, ...(aiResult.fields || {}) },
      mobile: aiResult.mobile || fallback.mobile,
      selectionNumber: aiResult.selectionNumber || fallback.selectionNumber,
      confirm: Boolean(aiResult.confirm) || fallback.confirm,
      cancel: Boolean(aiResult.cancel) || fallback.cancel,
      faq: aiResult.faq || fallback.faq,
    };
  } catch (error) {
    return fallback;
  }
}

async function lookupExpensesByMobile(mobile) {
  return Expense.find({ contact_number: mobile }).sort({ transaction_date: -1, createdAt: -1 }).lean();
}

async function handleCreate(session, analysis) {
  if (analysis.faq && Object.keys(analysis.fields).length === 0 && !analysis.confirm) {
    return { text: `${analysis.faq}\n\n${getFieldPrompt(getMissingFields(session.draft)[0] || 'full_name')}` };
  }

  const errors = applyValidatedFields(session.draft, analysis.fields);
  const missingFields = getMissingFields(session.draft);

  if (Object.keys(errors).length > 0) {
    return { text: `${Object.values(errors).join('\n')}\n\n${getFieldPrompt(Object.keys(errors)[0])}`, fieldErrors: errors };
  }

  if (session.awaitingConfirmation === 'create' && analysis.confirm) {
    const validation = validateExpensePayload(session.draft);
    if (!validation.isValid) {
      session.awaitingConfirmation = null;
      return { text: `I still need a few corrections.\n${Object.values(validation.errors).join('\n')}`, fieldErrors: validation.errors };
    }

    const expense = await Expense.create(validation.value);
    resetWorkingState(session);
    return withMenu('Expense saved successfully.', {
      confirmationType: 'create',
      savedExpense: expenseToPayload(expense),
    });
  }

  if (session.awaitingConfirmation === 'create' && (analysis.cancel || Object.keys(analysis.fields).length > 0)) {
    session.awaitingConfirmation = null;
  }

  if (missingFields.length === 0) {
    session.awaitingConfirmation = 'create';
    return { text: `Please confirm this expense before I save it:\n\n${summarizeDraft(session.draft)}`, confirmation: { type: 'create', expense: session.draft } };
  }

  return {
    text: buildSequentialPrompt(session.draft, missingFields[0]),
    expenseDraft: session.draft,
    missingFields,
  };
}

async function handleView(session, analysis) {
  if (analysis.faq && !analysis.mobile) {
    return { text: `${analysis.faq}\n\nTo view expenses, share the mobile number with country code.` };
  }

  const mobile = analysis.mobile || session.lastMobile;
  const validation = mobile ? FIELD_VALIDATORS.contact_number(mobile) : null;
  if (!validation || !validation.valid) {
    return { text: 'Please share the mobile number in the format +<country_code><10_digits>.' };
  }

  session.lastMobile = validation.value;
  const expenses = await lookupExpensesByMobile(validation.value);
  resetWorkingState(session);
  session.lastMobile = validation.value;

  if (expenses.length === 0) {
    return withMenu(`No expenses were found for ${validation.value}.`);
  }

  return withMenu(`Found ${expenses.length} expense(s) for ${validation.value}.`, {
    expenses: listExpensesPayload(expenses),
  });
}

async function handleAnalytics(session, analysis) {
  const mobile = analysis.mobile || session.lastMobile;
  const validation = mobile ? FIELD_VALIDATORS.contact_number(mobile) : null;
  if (!validation || !validation.valid) {
    return { text: 'Please share the mobile number to generate analytics.' };
  }

  session.lastMobile = validation.value;
  const expenses = await lookupExpensesByMobile(validation.value);
  if (expenses.length === 0) {
    resetWorkingState(session);
    session.lastMobile = validation.value;
    return withMenu(`No expenses were found for ${validation.value}, so there is no analytics report yet.`);
  }

  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const thisMonthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.transaction_date);
    return date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });

  const totalThisMonth = Number(thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const spendingByCategory = thisMonthExpenses.reduce((accumulator, expense) => {
    accumulator[expense.category] = Number(((accumulator[expense.category] || 0) + expense.amount).toFixed(2));
    return accumulator;
  }, {});

  resetWorkingState(session);
  session.lastMobile = validation.value;

  return withMenu(`Analytics ready for ${validation.value}.`, {
    analytics: {
      totalThisMonth,
      spendingByCategory,
      lastTransactions: listExpensesPayload(expenses.slice(0, 5)),
    },
  });
}

async function handleModify(session, analysis) {
  if (session.stage === 'awaiting_update_mobile') {
    const mobile = analysis.mobile || session.lastMobile;
    const validation = mobile ? FIELD_VALIDATORS.contact_number(mobile) : null;
    if (!validation || !validation.valid) return { text: 'Please provide the mobile number for the expenses you want to modify.' };

    const expenses = await lookupExpensesByMobile(validation.value);
    session.lastMobile = validation.value;
    if (expenses.length === 0) {
      resetWorkingState(session);
      session.lastMobile = validation.value;
      return withMenu(`No expenses were found for ${validation.value}.`);
    }

    session.lastListedExpenses = expenses;
    session.stage = 'awaiting_update_selection';
    return { text: 'Select the expense number you want to modify.', expenses: listExpensesPayload(expenses) };
  }

  if (session.stage === 'awaiting_update_selection') {
    const expense = analysis.selectionNumber ? session.lastListedExpenses[analysis.selectionNumber - 1] : null;
    if (!expense) return { text: 'Reply with the expense number you want to modify.' };

    session.selectedExpenseId = expense._id.toString();
    session.selectedExpenseSnapshot = expense;
    session.draftUpdates = {};
    session.stage = 'collect_update_fields';

    return {
      text: `Selected expense:\n${summarizeDraft(expenseToPayload(expense))}\n\nTell me the field changes, for example "change amount to 450 and category to Food".`,
      selectedExpense: expenseToPayload(expense),
    };
  }

  if (session.stage === 'collect_update_fields') {
    if (analysis.faq && Object.keys(analysis.fields).length === 0 && !analysis.confirm) {
      return { text: `${analysis.faq}\n\nTell me the updates you want to apply to the selected expense.` };
    }

    if (session.awaitingConfirmation === 'update' && analysis.confirm) {
      const expense = await Expense.findById(session.selectedExpenseId);
      if (!expense) {
        resetWorkingState(session);
        return withMenu('The selected expense no longer exists.');
      }

      Object.assign(expense, session.draftUpdates);
      await expense.save();
      const updated = expenseToPayload(expense);
      resetWorkingState(session);
      return withMenu('Expense updated successfully.', {
        confirmationType: 'update',
        savedExpense: updated,
      });
    }

    if (session.awaitingConfirmation === 'update' && (analysis.cancel || Object.keys(analysis.fields).length > 0)) {
      session.awaitingConfirmation = null;
    }

    if (Object.keys(analysis.fields).length === 0) {
      return { text: 'Tell me which fields to change on the selected expense.' };
    }

    const merged = {
      ...expenseToPayload(session.selectedExpenseSnapshot),
      ...session.draftUpdates,
      ...analysis.fields,
    };
    delete merged.id;

    const validation = validateExpensePayload(merged);
    if (!validation.isValid) {
      return { text: `I cannot apply that update yet.\n${Object.values(validation.errors).join('\n')}`, fieldErrors: validation.errors };
    }

    session.draftUpdates = {};
    Object.keys(analysis.fields).forEach((field) => {
      session.draftUpdates[field] = validation.value[field];
    });
    session.awaitingConfirmation = 'update';

    return { text: `Please confirm these updates:\n\n${summarizeDraft(validation.value)}`, confirmation: { type: 'update', expense: validation.value, changedFields: session.draftUpdates } };
  }

  session.currentAction = 'modify';
  session.stage = 'awaiting_update_mobile';
  return { text: 'Please provide the mobile number for the expenses you want to modify.' };
}

async function handleDelete(session, analysis) {
  if (session.stage === 'awaiting_delete_mobile') {
    const mobile = analysis.mobile || session.lastMobile;
    const validation = mobile ? FIELD_VALIDATORS.contact_number(mobile) : null;
    if (!validation || !validation.valid) return { text: 'Please provide the mobile number for the expenses you want to delete.' };

    const expenses = await lookupExpensesByMobile(validation.value);
    session.lastMobile = validation.value;
    if (expenses.length === 0) {
      resetWorkingState(session);
      session.lastMobile = validation.value;
      return withMenu(`No expenses were found for ${validation.value}.`);
    }

    session.lastListedExpenses = expenses;
    session.stage = 'awaiting_delete_selection';
    return { text: 'Select the expense number you want to delete.', expenses: listExpensesPayload(expenses) };
  }

  if (session.stage === 'awaiting_delete_selection') {
    const expense = analysis.selectionNumber ? session.lastListedExpenses[analysis.selectionNumber - 1] : null;
    if (!expense) return { text: 'Reply with the expense number you want to delete.' };

    session.selectedExpenseId = expense._id.toString();
    session.selectedExpenseSnapshot = expense;
    session.awaitingConfirmation = 'delete';
    session.stage = 'confirm_delete';
    return { text: `Please confirm deletion of this expense:\n\n${expense.date} | ${expense.category} | ${formatCurrency(expense.amount)} | ${expense.description}`, confirmation: { type: 'delete', expense: expenseToPayload(expense) } };
  }

  if (session.stage === 'confirm_delete') {
    if (analysis.confirm) {
      await Expense.findByIdAndDelete(session.selectedExpenseId);
      resetWorkingState(session);
      return withMenu('Expense deleted successfully.', { confirmationType: 'delete' });
    }
    if (analysis.cancel) {
      resetWorkingState(session);
      return withMenu('Deletion cancelled.');
    }
    return { text: 'Please reply with confirm to delete the selected expense, or cancel to keep it.' };
  }

  session.currentAction = 'delete';
  session.stage = 'awaiting_delete_mobile';
  return { text: 'Please provide the mobile number for the expenses you want to delete.' };
}

async function processMessage(sessionId, message) {
  const session = getSession(sessionId);
  const analysis = await analyzeMessage(message, session);

  if (analysis.cancel && session.stage !== 'confirm_delete') {
    resetWorkingState(session);
    return { sessionId: session.id, reply: withMenu('Current action cancelled.') };
  }

  if (analysis.intent === 'MENU') {
    resetWorkingState(session);
    return { sessionId: session.id, reply: getMenuResponse() };
  }

  if (!session.currentAction) {
    if (analysis.intent === 'CREATE_EXPENSE') {
      session.currentAction = 'create';
      session.stage = 'collect_create';
    } else if (analysis.intent === 'VIEW_EXPENSES') {
      session.currentAction = 'view';
      session.stage = 'view';
    } else if (analysis.intent === 'MODIFY_EXPENSE') {
      session.currentAction = 'modify';
      session.stage = 'awaiting_update_mobile';
    } else if (analysis.intent === 'DELETE_EXPENSE') {
      session.currentAction = 'delete';
      session.stage = 'awaiting_delete_mobile';
    } else if (analysis.intent === 'ANALYTICS') {
      session.currentAction = 'analytics';
      session.stage = 'analytics';
    } else if (Object.keys(analysis.fields).length > 0) {
      session.currentAction = 'create';
      session.stage = 'collect_create';
    } else if (analysis.faq) {
      return { sessionId: session.id, reply: { text: `${analysis.faq}\n\n${getMenuResponse().text}`, menuOptions: getMenuResponse().menuOptions } };
    } else {
      return { sessionId: session.id, reply: getMenuResponse() };
    }
  }

  let reply = getMenuResponse();

  if (session.currentAction === 'create') reply = await handleCreate(session, analysis);
  if (session.currentAction === 'view') reply = await handleView(session, analysis);
  if (session.currentAction === 'modify') reply = await handleModify(session, analysis);
  if (session.currentAction === 'delete') reply = await handleDelete(session, analysis);
  if (session.currentAction === 'analytics') reply = await handleAnalytics(session, analysis);

  return { sessionId: session.id, reply };
}

function resetSession(sessionId) {
  const session = storeResetSession(sessionId);
  return { sessionId: session.id, reply: withMenu('Conversation reset.') };
}

module.exports = {
  processMessage,
  resetSession,
  getMenuResponse,
};

