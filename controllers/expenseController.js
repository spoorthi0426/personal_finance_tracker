const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { getCurrentMonthRange } = require('../utils/date');
const { FIELD_VALIDATORS, validateExpensePayload } = require('../utils/validation');

function mapExpense(expense) {
  return {
    id: expense._id.toString(),
    full_name: expense.full_name,
    card_type: expense.card_type,
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    date: expense.date,
    contact_number: expense.contact_number,
    email: expense.email,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

async function createExpense(req, res) {
  const validation = validateExpensePayload(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'Validation failed.', fieldErrors: validation.errors });
  }

  try {
    const expense = await Expense.create(validation.value);
    return res.status(201).json({ success: true, message: 'Expense created successfully.', data: mapExpense(expense) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create expense.', details: error.message });
  }
}

async function getExpensesByMobile(req, res) {
  const mobile = String(req.query.mobile || '').trim();

  try {
    let query = {};

    if (mobile) {
      const validation = FIELD_VALIDATORS.contact_number(mobile);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      query = { contact_number: validation.value };
    }

    const expenses = await Expense.find(query).sort({ transaction_date: -1, createdAt: -1 }).lean();
    return res.json({ success: true, count: expenses.length, data: expenses.map(mapExpense) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch expenses.', details: error.message });
  }
}

async function updateExpense(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'Expense id is invalid.' });
  }

  try {
    const existing = await Expense.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const mergedPayload = {
      full_name: req.body.full_name ?? existing.full_name,
      card_type: req.body.card_type ?? existing.card_type,
      category: req.body.category ?? existing.category,
      amount: req.body.amount ?? existing.amount,
      description: req.body.description ?? existing.description,
      date: req.body.date ?? existing.date,
      contact_number: req.body.contact_number ?? existing.contact_number,
      email: req.body.email ?? existing.email,
    };

    const validation = validateExpensePayload(mergedPayload);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: 'Validation failed.', fieldErrors: validation.errors });
    }

    Object.assign(existing, validation.value);
    await existing.save();

    return res.json({ success: true, message: 'Expense updated successfully.', data: mapExpense(existing) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update expense.', details: error.message });
  }
}

async function deleteExpense(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'Expense id is invalid.' });
  }

  try {
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete expense.', details: error.message });
  }
}

async function getAnalyticsSummary(req, res) {
  const mobile = String(req.query.mobile || '').trim();
  const validation = FIELD_VALIDATORS.contact_number(mobile);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    const { start, end } = getCurrentMonthRange();
    const [monthlyExpenses, lastTransactions] = await Promise.all([
      Expense.find({ contact_number: validation.value, transaction_date: { $gte: start, $lt: end } }).lean(),
      Expense.find({ contact_number: validation.value }).sort({ transaction_date: -1, createdAt: -1 }).limit(5).lean(),
    ]);

    const totalThisMonth = Number(monthlyExpenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    const spendingByCategory = monthlyExpenses.reduce((accumulator, item) => {
      accumulator[item.category] = Number(((accumulator[item.category] || 0) + item.amount).toFixed(2));
      return accumulator;
    }, {});

    return res.json({
      success: true,
      data: {
        totalThisMonth,
        spendingByCategory,
        transactionCountThisMonth: monthlyExpenses.length,
        lastTransactions: lastTransactions.map(mapExpense),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate analytics.', details: error.message });
  }
}

module.exports = {
  createExpense,
  getExpensesByMobile,
  updateExpense,
  deleteExpense,
  getAnalyticsSummary,
};

