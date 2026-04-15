# Copilot Instructions

## Project: Personal Finance Assistant

This is an AI-powered conversational finance assistant built with:
- **Backend**: Node.js + Express
- **Frontend**: React
- **Database**: MongoDB
- **Core Features**: Natural language conversation, expense management, analytics

## Key Principles

1. **Strict Validation**: All expense inputs must be validated against the data model
2. **Conversational Flow**: Users interact through natural language with entity extraction
3. **JSON API Format**: All API responses are structured JSON
4. **Session Management**: Maintains conversation state across messages
5. **Error Recovery**: Never crash; always guide users back to valid flow

## File Organization

- `/utils/validation.js` - Input validation logic
- `/utils/conversation.js` - NLP, intent detection, entity extraction
- `/models/Expense.js` - MongoDB schema
- `/routes/expenseRoutes.js` - CRUD endpoints
- `/routes/conversationRoutes.js` - Chat/conversation endpoints
- `/client/src/App.js` - React main component
- `/client/src/components/ChatInterface.js` - Chat UI

## Running the Application

```bash
# Backend only
npm run dev

# Full stack (two terminals)
# Terminal 1:
npm run dev

# Terminal 2:
cd client && npm start
```

## Testing

Create an expense naturally:
```
"Food expense for 500 rupees yesterday for lunch using credit card"
```

The system automatically extracts: category, amount, date, card_type, and description.

## Key Validation Rules

- **Date**: DD-MM-YYYY format
- **Phone**: +{country code}{10 digits}
- **Categories**: Transport, Shopping, Food
- **Amount**: Positive numbers only
- **Card Types**: Debit Card, Credit Card

See `utils/validation.js` for complete validation logic.
