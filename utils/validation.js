const { DATE_REGEX, parseExpenseDate } = require('./date');

const CARD_TYPES = ['Debit Card', 'Credit Card'];
const CATEGORIES = ['Transport', 'Shopping', 'Food'];
const CONTACT_NUMBER_REGEX = /^\+\d{1,3}\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function validateFullName(value) {
  const normalized = normalizeWhitespace(value);
  const parts = normalized.split(' ').filter(Boolean);

  if (!normalized) return { valid: false, error: 'Full name is required.' };
  if (parts.length < 2) return { valid: false, error: 'Full name must include both first and last name.' };
  if (!parts.every((part) => /^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(part))) {
    return { valid: false, error: 'Full name can contain letters, apostrophes, and hyphens only.' };
  }

  return { valid: true, value: normalized };
}

function validateCardType(value) {
  if (!CARD_TYPES.includes(value)) {
    return { valid: false, error: `Card type must be one of: ${CARD_TYPES.join(', ')}.` };
  }
  return { valid: true, value };
}

function validateCategory(value) {
  if (!CATEGORIES.includes(value)) {
    return { valid: false, error: `Category must be one of: ${CATEGORIES.join(', ')}.` };
  }
  return { valid: true, value };
}

function validateAmount(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: 'Amount must be a positive number.' };
  }
  return { valid: true, value: Number(parsed.toFixed(2)) };
}

function validateDescription(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return { valid: false, error: 'Description is required.' };
  return { valid: true, value: normalized };
}

function validateDate(value) {
  const normalized = normalizeWhitespace(value);
  if (!DATE_REGEX.test(normalized)) {
    return { valid: false, error: 'Date must use DD-MM-YYYY format only.' };
  }
  if (!parseExpenseDate(normalized)) {
    return { valid: false, error: 'Date is not a valid calendar date.' };
  }
  return { valid: true, value: normalized };
}

function validateContactNumber(value) {
  const normalized = normalizeWhitespace(value);
  if (!CONTACT_NUMBER_REGEX.test(normalized)) {
    return { valid: false, error: 'Contact number must include a country code and exactly 10 digits.' };
  }
  return { valid: true, value: normalized };
}

function validateEmail(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: 'Email must be a valid email address.' };
  }
  return { valid: true, value: normalized };
}

const FIELD_VALIDATORS = {
  full_name: validateFullName,
  card_type: validateCardType,
  category: validateCategory,
  amount: validateAmount,
  description: validateDescription,
  date: validateDate,
  contact_number: validateContactNumber,
  email: validateEmail,
};

function validateExpensePayload(payload, options = {}) {
  const { partial = false } = options;
  const errors = {};
  const value = {};

  Object.entries(FIELD_VALIDATORS).forEach(([field, validator]) => {
    const hasValue = Object.prototype.hasOwnProperty.call(payload, field);

    if (!hasValue) {
      if (!partial) errors[field] = `${field} is required.`;
      return;
    }

    const result = validator(payload[field]);
    if (!result.valid) {
      errors[field] = result.error;
      return;
    }

    value[field] = result.value;
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

module.exports = {
  CARD_TYPES,
  CATEGORIES,
  FIELD_VALIDATORS,
  validateExpensePayload,
};

