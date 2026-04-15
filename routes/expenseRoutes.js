const express = require('express');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

router.get('/analytics/summary', expenseController.getAnalyticsSummary);
router.post('/', expenseController.createExpense);
router.get('/', expenseController.getExpensesByMobile);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;

