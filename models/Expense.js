const mongoose = require('mongoose');
const { parseExpenseDate } = require('../utils/date');

const expenseSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    card_type: { type: String, enum: ['Debit Card', 'Credit Card'], required: true },
    category: { type: String, enum: ['Transport', 'Shopping', 'Food'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    transaction_date: { type: Date, required: true },
    contact_number: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

expenseSchema.pre('validate', function setTransactionDate(next) {
  if (this.date) {
    const parsed = parseExpenseDate(this.date);
    if (parsed) this.transaction_date = parsed;
  }
  next();
});

expenseSchema.index({ contact_number: 1, transaction_date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);

