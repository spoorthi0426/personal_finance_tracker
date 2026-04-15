require('dotenv').config();

const app = require('./server/app');
const connectDatabase = require('./server/config/database');

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDatabase(process.env.MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

