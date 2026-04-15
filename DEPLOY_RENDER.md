# Deploy to Render 🚀

Render is ideal for full-stack apps like yours. Deploy both backend and frontend on one platform.

---

## Prerequisites

- GitHub account (push your code)
- Render account (render.com)
- MongoDB Atlas account (free tier available)

---

## Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Personal Finance Assistant"
git remote add origin https://github.com/YOUR_USERNAME/finance-assistant.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up MongoDB Atlas

### Create Free Database
1. Go to **mongodb.com/atlas**
2. Sign up (free account)
3. Create a new project
4. Create a cluster (M0 free tier)
5. In "Security" → "Database Access" → Add user
   - Username: `admin`
   - Password: Generate secure password
6. In "Network Access" → Allow access from anywhere (0.0.0.0/0)

### Get Connection String
1. Click "Connect" on your cluster
2. Select "Drivers" → Node.js
3. Copy connection string: `mongodb+srv://admin:PASSWORD@cluster.mongodb.net/finance-assistant?retryWrites=true&w=majority`
4. Replace `PASSWORD` with your password

---

## Step 3: Deploy on Render

### Option A: Deploy Backend + Frontend Together (Single Web Service)

**Best for:** Simpler setup, both on same domain

1. Go to **render.com** and sign in
2. Click **"New +"** → **"Web Service"**
3. **Connect Repository**
   - Select your GitHub repo
   - Click "Connect"

4. **Configure Deployment**
   - **Name**: `finance-assistant`
   - **Environment**: Node
   - **Region**: Choose closest to you
   - **Branch**: main
   - **Build Command**: `npm install && cd client && npm install && npm run build && cd ..`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if needed)

5. **Add Environment Variables**
   - Click "Add Environment Variable"
   - Add these two variables:
     ```
     PORT=10000
     MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster.mongodb.net/finance-assistant?retryWrites=true&w=majority
     NODE_ENV=production
     ```

6. Click **"Create Web Service"**

### Update server.js for Production

Update your `server.js` to serve React frontend:

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-assistant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✓ MongoDB connected'))
  .catch((err) => console.error('✗ MongoDB connection failed:', err));

// Import Routes
const expenseRoutes = require('./routes/expenseRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

// Use Routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/conversation', conversationRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve React frontend
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## Step 4: Update Build Script

Update `package.json` scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "build": "cd client && npm run build",
  "install-all": "npm install && cd client && npm install"
}
```

---

## Step 5: Deploy!

1. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Add production server setup"
   git push
   ```

2. **Render auto-deploys** when you push to main branch
3. **Wait for deployment** (5-10 minutes):
   - View logs in Render dashboard
   - Look for: `🚀 Server running on port 10000`

4. **Your live app**: `https://finance-assistant.onrender.com`

---

## Option B: Deploy Backend & Frontend Separately

**Best for:** Better scalability, independent updates

### Backend (Web Service)
- Same as Option A steps 1-5
- Start Command: `npm start`
- No need to build React

### Frontend (Static Site)
1. In Render, click **"New +"** → **"Static Site"**
2. Connect GitHub repo
3. **Build Command**: `cd client && npm install && npm run build`
4. **Publish Directory**: `client/build`
5. In Environment Variables, add:
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```
6. Update `client/src/App.js` to use environment variable for API calls

---

## Testing Your Deployment

```bash
# Check if backend is running
curl https://your-app.onrender.com/api/health

# Create test expense via API
curl -X POST https://your-app.onrender.com/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "card_type": "Credit Card",
    "category": "Food",
    "amount": 500,
    "description": "Test expense",
    "date": "15-04-2026",
    "contact_number": "+911234567890",
    "email": "test@example.com"
  }'
```

---

## Troubleshooting on Render

### Build Fails
```
❌ npm install fails
→ Check Node version (need 14+)
→ Clear cache in Render dashboard: Settings → Clear all data → Try again
```

### MongoDB Connection Fails
```
❌ MONGODB_URI not recognized
→ Check MONGODB_URI in Environment Variables
→ Verify MongoDB Atlas network access allows 0.0.0.0/0
→ Check username and password
```

### App Crashes After Deploy
```
❌ Port already in use
→ Render uses PORT env var, should be fine
→ Check logs: View in Render dashboard

❌ Cannot find module
→ Ensure build-command includes: cd client && npm install
```

### Slow Cold Starts
- Free Render tier spins down after 15 min inactivity
- App takes 30-60 sec to wake up on first request
- Upgrade to Paid plan for consistent performance

---

## Environment Variables Needed

In Render dashboard → Environment:

```
PORT=10000
NODE_ENV=production
MONGODB_URI=mongodb+srv://admin:PASSWORD@cluster.mongodb.net/finance-assistant?retryWrites=true&w=majority
```

---

## Monitoring & Logs

1. Go to your Render service dashboard
2. Click **"Logs"** to see real-time output
3. Look for errors or connection issues
4. Use **"Events"** tab to see deployment history

---

## Update & Redeploy

After pushing changes to GitHub:

```bash
git add .
git commit -m "Update features"
git push origin main
```

Render automatically redeploys! (watch in Logs tab)

---

## Cost

- **Free Tier**: 
  - 1 static site + 1 web service
  - Web service spins down after 15 min inactivity
  - 400 build minutes/month

- **Paid Tiers**: 
  - $7/month for persistent web service
  - $10/month for production databases
  - Recommended: **$7 web service + $15 MongoDB Atlas M5**

---

## Next Steps

- ✅ Push to GitHub
- ✅ Create MongoDB Atlas account & cluster
- ✅ Deploy to Render
- ✅ Test the live app
- ✅ Share link!

**Your app will be live at:** `https://finance-assistant.onrender.com` ✨
