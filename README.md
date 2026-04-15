# AI Personal Finance Tracker with Conversational Agent

A complete full-stack expense tracker with a React chat UI, Express API, MongoDB persistence, and an OpenAI-backed conversation layer with deterministic fallback logic.

## Folder Structure

```text
.
|-- client/
|   |-- public/
|   `-- src/
|       |-- components/
|       |-- services/
|       |-- App.js
|       |-- App.css
|       |-- index.css
|       `-- index.js
|-- controllers/
|   |-- chatController.js
|   `-- expenseController.js
|-- models/
|   `-- Expense.js
|-- routes/
|   |-- chatRoutes.js
|   `-- expenseRoutes.js
|-- server/
|   |-- config/
|   |   `-- database.js
|   `-- app.js
|-- services/
|   |-- conversationAgent.js
|   |-- conversationStore.js
|   |-- faqService.js
|   `-- openaiService.js
|-- utils/
|   |-- date.js
|   `-- validation.js
|-- .env.example
|-- package.json
`-- server.js
```

## Features

- Conversational menu for create, view, modify, delete, and analytics.
- Strict validation for all required expense fields.
- Confirmation before create, update, and delete.
- Fetch expenses and analytics by mobile number.
- Inline FAQ answers without breaking the active flow.
- OpenAI extraction when `OPENAI_API_KEY` is configured, with a local fallback parser so the app still works offline.

## Backend API

- `POST /api/expenses`
- `GET /api/expenses?mobile=+919876543210`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/expenses/analytics/summary?mobile=+919876543210`
- `POST /api/chat/message`
- `POST /api/chat/reset`
- `GET /api/chat/menu`

## Environment Setup

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/ai-finance-tracker
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

## Installation

1. Install MongoDB locally, or make sure your MongoDB Atlas connection string is ready.
2. Install backend dependencies:

```bash
npm install
```

3. Install frontend dependencies:

```bash
npm install --prefix client
```

## Run Locally

1. Start MongoDB.
2. Start the backend API:

```bash
npm run server
```

3. In a second terminal, start the React client:

```bash
npm run client
```

4. Open `http://localhost:3000`.

## Sample Chat Inputs

- `Create Expense`
- `Aarav Sharma, Credit Card, Food, 450, dinner with client, 15-04-2026, +919876543210, aarav@example.com`
- `View Expenses`
- `+919876543210`
- `Modify Expense`
- `2`
- `change amount to 520 and description to dinner with team`
- `Delete Expense`
- `Analytics`

## Verification

- Backend module loading verified with Node.
- Frontend production build verified with React scripts.
- Live API startup still requires a running MongoDB instance and a valid `.env` file.

If `OPENAI_API_KEY` is not set, the app still runs using the built-in fallback extractor and conversational state machine.
