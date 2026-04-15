function getFaqAnswer(message) {
  const text = message.toLowerCase();

  if (/(category|categories)/.test(text)) return 'Available categories are Transport, Shopping, and Food.';
  if (/(card|payment|debit|credit)/.test(text)) return 'Supported card types are Debit Card and Credit Card.';
  if (/(date|format|dd-mm-yyyy)/.test(text)) return 'Use the date in DD-MM-YYYY format, for example 15-04-2026.';
  if (/(mobile|phone|contact|number)/.test(text)) return 'Contact number must include a country code followed by exactly 10 digits, for example +919876543210.';
  if (/(email)/.test(text)) return 'Provide a standard email address such as name@example.com.';
  if (/(amount|currency|price)/.test(text)) return 'Amount must be a positive number. Decimals are allowed, like 199.99.';

  return null;
}

module.exports = { getFaqAnswer };

