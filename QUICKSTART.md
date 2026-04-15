# Quick Start Guide 🚀

## Prerequisites
- Node.js installed (v14+)
- MongoDB running locally OR MongoDB Atlas account setup
- Code editor (VS Code recommended)

## Setup in 5 Minutes

### 1. Setup MongoDB (Choose one option)

**Option A: Local MongoDB**
```bash
# Start MongoDB service (Windows)
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create account at mongodb.com
- Create a cluster and get connection string
- Update `.env` with your connection string

### 2. Create & Configure `.env` File

Create `.env` in the root directory:
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finance-assistant
```

For MongoDB Atlas:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finance-assistant?retryWrites=true&w=majority
```

### 3. Start Backend (Terminal 1)

```bash
npm run dev
```

**Success Output:**
```
✓ MongoDB connected
🚀 Server running on port 5000
```

### 4. Start Frontend (Terminal 2)

```bash
cd client
npm start
```

**Success Output:**
```
Compiled successfully!
You can now view finance-assistant-client in the browser at http://localhost:3000
```

## Test the App

Visit `http://localhost:3000` and try:

**Example 1: Create Expense**
```
"Food expense for 500 rupees yesterday"
→ Bot asks for name, card type, etc.
→ Complete the conversation
```

**Example 2: View Expenses**
```
"Show my expenses"
→ Provide mobile number: +911234567890
→ See all logged expenses
```

## Available Commands

```bash
# Backend
npm run dev          # Start with hot reload
npm start            # Production start

# Frontend
cd client
npm start            # Development server
npm run build        # Production build
npm test             # Run tests

# Both
npm run install-all  # Install all dependencies
npm run build        # Full production build
```

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=5001
```

### MongoDB Connection Failed
```bash
# Check .env MONGODB_URI
# If local: Ensure mongod is running
# If Atlas: Verify connection string and network access
```

### CORS Errors
```bash
# Restart both backend and frontend
# Frontend "proxy" in client/package.json should be http://localhost:5000
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

## Data Format Examples

### Creating an Expense
```json
{
  "full_name": "John Doe",
  "card_type": "Credit Card",
  "category": "Food",
  "amount": 500,
  "description": "Lunch at restaurant",
  "date": "15-04-2026",
  "contact_number": "+911234567890",
  "email": "john@example.com"
}
```

### Date Format
- Format: DD-MM-YYYY (e.g., 15-04-2026)
- Can say: "today", "yesterday", "tomorrow"

### Card Types
- Debit Card
- Credit Card

### Categories
- Transport
- Shopping
- Food

## API Testing with Curl

```bash
# Create expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "card_type": "Credit Card",
    "category": "Food",
    "amount": 500,
    "description": "Lunch",
    "date": "15-04-2026",
    "contact_number": "+911234567890",
    "email": "john@example.com"
  }'

# View expenses
curl "http://localhost:5000/api/expenses?mobile=%2B911234567890"

# Get analytics
curl "http://localhost:5000/api/expenses/analytics/summary?mobile=%2B911234567890"
```

## Production Deployment

### Build Frontend
```bash
cd client
npm run build
# Creates optimized build in client/build/
```

### Deploy to Heroku
```bash
heroku login
heroku create your-app-name
heroku config:set MONGODB_URI=your_connection_string
git push heroku main
heroku open
```

## Next Steps

1. ✅ Explore the conversation interface
2. 📊 Test different expense categories
3. 💾 Create sample expenses with different cards
4. 📈 Review analytics dashboard
5. 🎨 Customize styling in `client/src/App.css`

## Need Help?

- See `README.md` for detailed documentation
- Check `utils/validation.js` for validation rules
- Review `utils/conversation.js` for conversation logic
- Check `.github/copilot-instructions.md` for project guidelines

---

**Happy Expense Tracking! 💰**
