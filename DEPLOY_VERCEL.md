# Deploy to Vercel ✨

Vercel is best for frontend deployment. Options:
1. **Frontend only on Vercel** + Backend on Render (Recommended)
2. **Backend as Serverless Functions** on Vercel + Frontend

---

## Option 1: Recommended - Vercel Frontend + Render Backend

This is the cleanest approach. Deploy frontend and backend separately.

### Step 1: Deploy Backend to Render

Follow **DEPLOY_RENDER.md** first to get your backend URL.

Example backend URL: `https://finance-assistant.onrender.com`

### Step 2: Configure Frontend for Vercel

**Update `client/src/App.js`:**

```javascript
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '🏦 Welcome to Personal Finance Assistant\n\nWhat would you like to do today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Get API URL from environment or use default
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setSessionId(`session_${Date.now()}`);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/conversation/message`, {
        message: input,
        sessionId,
      });

      const botReply = {
        id: messages.length + 2,
        type: 'bot',
        text: response.data.message,
        data: response.data.data,
        action: response.data.action,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botReply]);

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: error.response?.data?.error || 'An error occurred. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <ChatInterface
        messages={messages}
        input={input}
        loading={loading}
        onInputChange={setInput}
        onSendMessage={handleSendMessage}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}

export default App;
```

### Step 3: Deploy Frontend to Vercel

**Via GitHub (Recommended):**

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to vercel.com** and sign in with GitHub

3. **Import Project**:
   - Click "Add New" → "Project"
   - Select your `finance-assistant` repo
   - Click "Import"

4. **Configure Build Settings**:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./`
   - **Build Command**: `cd client && npm run build`
   - **Output Directory**: `client/build`
   - **Install Command**: `cd client && npm install`

5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add: `REACT_APP_API_URL` = `https://finance-assistant.onrender.com`

6. **Deploy!**
   - Click "Deploy"
   - Wait for build (2-3 minutes)
   - Get your live URL: `https://your-project.vercel.app`

### Step 4: Test Integration

Visit your Vercel frontend URL and test messaging. The frontend will connect to your Render backend.

---

## Option 2: Full Stack on Vercel with Serverless Functions

This approach uses Vercel for both frontend and backend via serverless functions.

### Step 1: Project Structure

```
finance-assistant/
├── api/                          # NEW - Vercel serverless functions
│   ├── expenses.js               # POST /expenses, GET /expenses, etc.
│   └── conversation.js           # POST /conversation/message
├── client/                       # Frontend as before
├── vercel.json                   # NEW - Vercel config
├── package.json                  # Move to api folder files
```

### Step 2: Create `vercel.json`

```json
{
  "buildCommand": "npm install && cd client && npm install && npm run build",
  "outputDirectory": "client/build",
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Step 3: Convert Routes to Serverless Functions

**Create `api/expenses.js`:**

```javascript
import mongoose from 'mongoose';
import Expense from '../models/Expense';

// MongoDB Connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

export default async function handler(req, res) {
  await connectDB();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Create expense
    try {
      const expense = new Expense(req.body);
      const saved = await expense.save();
      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } else if (req.method === 'GET') {
    // Get expenses
    try {
      const { mobile } = req.query;
      const expenses = await Expense.find({ contact_number: mobile });
      res.json({ success: true, data: expenses });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
```

**Create `api/conversation.js`:**

```javascript
import { detectIntent, extractEntities, generateResponse } from '../utils/conversation';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Handle conversation
    const { message, sessionId } = req.body;
    const intent = detectIntent(message);
    const entities = extractEntities(message);

    // ... conversation logic ...

    res.json({ 
      success: true, 
      message: 'Response from AI',
      sessionId 
    });
  }
}
```

### Step 4: Update Frontend API Calls

In `client/src/App.js`, update API_URL:

```javascript
const API_URL = process.env.REACT_APP_API_URL || '/api';
```

### Step 5: Deploy to Vercel

```bash
git add .
git commit -m "Add serverless functions for Vercel"
git push origin main
```

1. Go to **vercel.com**
2. Import project
3. Add Environment Variable: `MONGODB_URI=your_mongodb_atlas_url`
4. Deploy!

Your app will be fully on Vercel at: `https://your-project.vercel.app`

---

## Comparison: Render vs. Vercel

| Feature | Render | Vercel |
|---------|--------|--------|
| **Best for** | Full-stack apps | React/Next.js frontend |
| **Backend** | Easy (Web Service) | Serverless functions |
| **Database** | Direct connection | Recommended external |
| **Cost** | $7/month (persistent) | Free tier generous |
| **Cold starts** | Yes on free | Minimal on paid |
| **Scalability** | Good | Excellent |
| **Setup** | Simple | More complex |

### Recommendation
- **Simple & Full-Stack**: Use **Render** (Option 1)
- **Maximum Performance**: Use **Vercel Frontend + Render Backend** (Option 1)
- **Serverless only**: Use **Vercel Serverless** (Option 2)

---

## Quick Deploy Checklist

### For Render (Recommended)
- [ ] MongoDB Atlas cluster created
- [ ] Code pushed to GitHub
- [ ] Created Render account
- [ ] Updated `server.js` to serve React build
- [ ] Set environment variables on Render
- [ ] Deployed and tested

### For Vercel Frontend Only
- [ ] Backend running on Render (or other)
- [ ] Updated `App.js` with `REACT_APP_API_URL`
- [ ] Code pushed to GitHub
- [ ] Created Vercel account
- [ ] Connected GitHub repo to Vercel
- [ ] Set environment variables
- [ ] Deployed and tested

### For Vercel Serverless (Complex)
- [ ] Converted routes to serverless functions
- [ ] Created `vercel.json` config
- [ ] MongoDB Atlas cluster created
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Set `MONGODB_URI` environment variable
- [ ] Tested endpoint calls

---

## Troubleshooting Vercel

### Build Fails
```
❌ Cannot find module
→ Ensure all imports use correct paths
→ Check that dependencies are in package.json
```

### CORS Errors
```
❌ Frontend can't reach backend
→ Update REACT_APP_API_URL in Vercel env vars
→ Add CORS headers to serverless functions
→ Check that backend is actually running
```

### Environment Variables Not Loading
```
❌ process.env.REACT_APP_API_URL undefined
→ Env vars must start with REACT_APP_
→ Redeploy after adding env vars
→ Wait 5 minutes and refresh
```

---

## Next Steps

Choose your deployment approach:

1. **Simplest**: Render (full-stack)
   - Follow: `DEPLOY_RENDER.md`
   
2. **Best Performance**: Vercel Frontend + Render Backend
   - Deploy backend on Render first
   - Deploy frontend on Vercel with API_URL env variable
   
3. **Dev-Friendly**: Vercel Serverless
   - More setup but everything on Vercel
   - Follow Option 2 steps above

---

**Choose one and deploy! Your app will be live in 10 minutes! 🚀**
