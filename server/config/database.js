const mongoose = require('mongoose');

async function connectDatabase(connectionString) {
  const uri = connectionString || 'mongodb://127.0.0.1:27017/ai-finance-tracker';

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully');
}

module.exports = connectDatabase;

