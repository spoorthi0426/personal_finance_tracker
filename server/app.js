const express = require('express');
const cors = require('cors');

const expenseRoutes = require('../routes/expenseRoutes');
const chatRoutes = require('../routes/chatRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Finance tracker API is healthy.',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/expenses', expenseRoutes);
app.use('/api/chat', chatRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  console.error(error);
  res.status(status).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

module.exports = app;

