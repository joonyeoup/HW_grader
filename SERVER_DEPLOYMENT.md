# 🚀 Server Deployment Guide - Gradescope AI Grader

This guide shows how to deploy your backend server to keep your OpenAI API key and grading logic private.

## Architecture Overview

```
Chrome Extension (Client - Public on Chrome Web Store)
    ↓ (User's API Key)
Your Backend Server (Private - Your OpenAI Key)
    ↓ (Your OpenAI Key)
OpenAI API
```

**What's Protected:**
- ✅ Your OpenAI API key
- ✅ Grading logic and prompts
- ✅ Usage limits and subscriptions
- ✅ User authentication

**What's Public:**
- Extension UI code
- Gradescope DOM manipulation
- API calls to your server (but API key required!)

---

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Deployment platform account (see options below)

---

## Local Development Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required settings in `.env`:**
```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=chrome-extension://*
JWT_SECRET=generate-a-random-secret-here
```

### 3. Start Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### 4. Test Server

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2025-01-11T..."}
```

---

## Deployment Options

### Option 1: Heroku (Easiest - Free Tier Available)

**Steps:**

```bash
# 1. Install Heroku CLI
brew install heroku/brew/heroku

# 2. Login
heroku login

# 3. Create app
cd server
heroku create gradescope-ai-grader

# 4. Set environment variables
heroku config:set OPENAI_API_KEY=sk-your-key-here
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
heroku config:set JWT_SECRET=$(openssl rand -hex 32)

# 5. Deploy
git init
git add .
git commit -m "Initial deployment"
git push heroku main

# 6. Your server is live!
# URL: https://gradescope-ai-grader.herokuapp.com
```

**Pros:**
- Free tier available
- Easy deployment
- Auto SSL/HTTPS

**Cons:**
- Free tier sleeps after 30 min inactivity
- Limited free hours per month

---

### Option 2: Render (Modern & Free)

**Steps:**

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (push server folder to GitHub first)
4. Configure:
   - Name: `gradescope-ai-grader`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID`
   - `JWT_SECRET` (generate random string)
6. Click "Create Web Service"

**Your server URL:** `https://gradescope-ai-grader.onrender.com`

**Pros:**
- Always-on free tier
- Auto-deploy from GitHub
- Free SSL

**Cons:**
- Free tier has slower cold starts

---

### Option 3: Railway (Simple & Fast)

**Steps:**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
cd server
railway init
railway up

# 4. Add environment variables via dashboard
railway open
# Add: OPENAI_API_KEY, NODE_ENV, etc.

# 5. Get your URL
railway domain
```

**Your server URL:** `https://gradescope-ai-grader-production.up.railway.app`

---

### Option 4: DigitalOcean App Platform

**Steps:**

1. Push server code to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Click "Create App" → Connect GitHub repo
4. Select your repository and `server` folder
5. Configure:
   - Type: Web Service
   - Build Command: `npm install`
   - Run Command: `npm start`
   - HTTP Port: 3000
6. Add environment variables
7. Deploy

**Cost:** $5/month (no free tier)

---

### Option 5: AWS EC2 (Full Control)

**For advanced users - requires more setup**

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. SSH into instance
ssh ubuntu@your-ec2-ip

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Clone your repo
git clone https://github.com/yourusername/gradescope-grader-server.git
cd gradescope-grader-server/server

# 5. Install dependencies
npm install

# 6. Setup .env file
nano .env
# Add your environment variables

# 7. Install PM2 for process management
sudo npm install -g pm2

# 8. Start server
pm2 start server.js --name gradescope-grader
pm2 save
pm2 startup

# 9. Setup nginx reverse proxy
sudo apt install nginx
# Configure nginx to proxy port 80 → 3000

# 10. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Update Extension with Server URL

### After Deployment:

1. **Update `chrome-extension-serverside/background.js`:**

```javascript
// Line ~78 - Change default server URL
chrome.storage.sync.set({
  serverUrl: 'https://your-deployed-server.com' // Your actual URL
});
```

2. **Update manifest.json host_permissions:**

```json
"host_permissions": [
  "https://www.gradescope.com/*",
  "https://your-deployed-server.com/*"
]
```

3. **Rebuild and publish extension**

---

## Security Checklist

Before going live:

- ✅ Change `JWT_SECRET` to a strong random value
- ✅ Update `ALLOWED_ORIGINS` to your extension ID: `chrome-extension://YOUR_ACTUAL_EXTENSION_ID`
- ✅ Enable HTTPS (most platforms do this automatically)
- ✅ Set `NODE_ENV=production`
- ✅ Don't commit `.env` file to GitHub (it's in `.gitignore`)
- ✅ Test authentication endpoints
- ✅ Monitor OpenAI API usage

---

## Monitoring & Maintenance

### Check Server Health

```bash
curl https://your-server.com/health
```

### Monitor Logs

**Heroku:**
```bash
heroku logs --tail
```

**Render/Railway:**
- Check dashboard for logs

**EC2:**
```bash
pm2 logs gradescope-grader
```

### Monitor OpenAI Costs

- Go to: https://platform.openai.com/usage
- Set up billing alerts
- Monitor token usage

### Database (Optional)

For production, replace in-memory user store with database:

**MongoDB (recommended):**
```bash
# Install mongoose (already in package.json)
npm install mongoose

# Update server.js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

# Use Railway/Render database add-ons
```

**PostgreSQL:**
```bash
npm install pg
# Configure connection in server.js
```

---

## Scaling Considerations

### Free Tier Limits:
- Heroku: 550 free hours/month
- Render: Always-on but slower cold starts
- Railway: 500 hours/month

### Upgrade When:
- \> 100 active users
- \> 10,000 requests/month
- Need faster response times
- Need database for user management

### Cost Estimate (100 users):
- Server hosting: $5-15/month
- OpenAI API: $10-50/month (depending on usage)
- Database: $0-5/month

---

## Adding Features

### Subscription/Payment:

```bash
npm install stripe
```

Add payment routes:
```javascript
// routes/payment.js
router.post('/create-checkout', async (req, res) => {
  // Stripe checkout logic
});
```

### Usage Limits:

Already implemented in `middleware/usage.js`

Customize limits in `routes/auth.js`:
```javascript
limits: {
  requestsPerDay: 100 // Adjust this
}
```

### Database:

See `models/` folder for Mongoose schemas (to be implemented)

---

## Troubleshooting

### "Cannot connect to server"
- Check server is running: `curl https://your-server.com/health`
- Check CORS settings in server.js
- Verify extension has host_permissions

### "Invalid API key"
- User needs to register via extension popup
- Check server logs for auth errors

### "OpenAI API error"
- Verify OPENAI_API_KEY in server environment
- Check OpenAI account has credits
- Check rate limits

### "Too many requests"
- User hit daily limit
- Check usage in middleware/usage.js
- Offer premium plan

---

## Next Steps

1. ✅ Deploy server to hosting platform
2. ✅ Update extension with server URL
3. ✅ Test registration and grading flow
4. ✅ Publish extension to Chrome Web Store
5. ✅ Monitor usage and costs
6. (Optional) Add Stripe for premium plans
7. (Optional) Add MongoDB for persistent storage

---

## Support

If you run into issues:
- Check server logs
- Test with `curl` commands
- Verify environment variables
- Check firewall/security groups

**Your server is now ready to handle grading requests while keeping your OpenAI key secure! 🎉**
