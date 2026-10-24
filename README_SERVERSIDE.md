# 🚀 Gradescope AI Grader - Server-Side Distribution

Complete solution for distributing your Gradescope AI Grader extension on the Chrome Web Store while protecting your source code and API keys.

---

## 📁 Project Structure

```
HW_grader/
│
├── server/                              # 🔐 Backend Server (Deploy This)
│   ├── server.js                        # Express app
│   ├── routes/
│   │   ├── auth.js                     # User authentication & API keys
│   │   └── grading.js                  # OpenAI API calls (YOUR KEY!)
│   ├── middleware/
│   │   ├── auth.js                     # API key validation
│   │   └── usage.js                    # Usage tracking
│   ├── package.json                    # Dependencies
│   └── .env.example                    # Environment variables template
│
├── chrome-extension-serverside/         # 📦 Extension (Publish This)
│   ├── manifest.json                   # Extension config
│   ├── background.js                   # Calls YOUR server
│   ├── content.js                      # Gradescope automation
│   ├── popup.html/js                   # User configuration
│   ├── styles.css                      # UI styling
│   └── icons/                          # Extension icons
│
├── chrome-extension/                    # 📂 Original client-side version
│   └── ... (for local use only)
│
└── Documentation/
    ├── SERVER_ARCHITECTURE.md           # Architecture overview
    ├── SERVER_DEPLOYMENT.md             # How to deploy server
    ├── CHROME_WEB_STORE_GUIDE.md       # Publishing guide
    └── README_SERVERSIDE.md            # This file
```

---

## 🎯 Quick Start Guide

### For the First Time

**Step 1: Deploy the Backend Server** ⏱️ 15 minutes
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
npm start

# Deploy to hosting platform (Heroku/Render/Railway)
# See SERVER_DEPLOYMENT.md for details
```

**Step 2: Update Extension with Server URL** ⏱️ 2 minutes
```javascript
// Edit chrome-extension-serverside/background.js line ~78
serverUrl: 'https://your-deployed-server.com'
```

**Step 3: Test Locally** ⏱️ 5 minutes
```bash
# Load extension in Chrome
chrome://extensions/ → Developer mode ON → Load unpacked

# Test registration
Extension popup → Register tab → Create account → Get API key

# Test grading
Go to Gradescope → Grade page → Click "AI Grade All"
```

**Step 4: Publish to Chrome Web Store** ⏱️ 30 minutes + review time
```bash
# Zip extension
cd chrome-extension-serverside
zip -r ../extension-v2.0.0.zip .

# Upload to Chrome Web Store
# See CHROME_WEB_STORE_GUIDE.md for full details
```

**Total Time:** ~1 hour setup + 1-3 days review

---

## 🔄 How It Works

### Client-Side vs Server-Side

#### ❌ Client-Side (Original - NOT for public distribution)
```
User → Extension (has OpenAI key) → OpenAI API
```
**Problem:** Anyone can extract your OpenAI API key from the extension code!

#### ✅ Server-Side (New - Safe for Chrome Web Store)
```
User → Extension (has user API key) → YOUR Server (has OpenAI key) → OpenAI API
```
**Solution:** Your OpenAI key stays secure on your server!

---

## 🏗️ Architecture Benefits

### What's Protected (Server-Side)
- ✅ Your OpenAI API key (on YOUR server)
- ✅ Grading prompts and logic
- ✅ Usage limits and quotas
- ✅ Monetization logic
- ✅ User database

### What's Public (Extension)
- UI components
- Gradescope DOM manipulation
- API calls to YOUR server (requires auth!)

### Security Features
- 🔐 User authentication via API keys
- 🛡️ Rate limiting (100 requests/15 min)
- 📊 Usage tracking per user
- 🚦 Tier-based access control (free/premium)
- 🔒 CORS protection

---

## 💰 Monetization Options

### Option 1: Freemium Model
```javascript
Free Tier:
- 100 requests/day
- Basic features
- Community support

Premium Tier ($5/month):
- Unlimited requests
- Priority support
- Advanced features
```

**Revenue Potential (100 users):**
- Income: $500/month
- OpenAI costs: ~$200/month
- Server hosting: $15/month
- **Profit: $285/month** 💰

### Option 2: Pay-Per-Use
```javascript
$0.05 per grading request
Credit-based system
Automatic refills
```

### Option 3: University Licensing
```javascript
$500-1000/year per institution
Unlimited usage for all TAs
Admin dashboard
```

---

## 📊 Cost Breakdown

### Your Costs (per 100 students graded)

**OpenAI API:**
- GPT-4o: $0.02-0.05 per submission
- 100 students: $2-5
- 1000 students: $20-50

**Server Hosting:**
- Free tier: $0 (Render/Railway)
- Basic: $5/month
- Production: $15/month

**Total per Assignment:**
- 100 students: ~$2-5
- Cost per user/month: ~$2-3

### Pricing Strategy

**Charge users $5/month:**
- Average usage: $2-3/month in costs
- Profit margin: $2-3 per user
- 100 users = $200-300 profit/month

---

## 🚀 Deployment Platforms

### Recommended: Render (Free tier, always-on)
```bash
1. Push to GitHub
2. Connect Render to repo
3. Add environment variables
4. Deploy!
URL: https://your-app.onrender.com
```

### Alternative: Heroku
```bash
heroku create
heroku config:set OPENAI_API_KEY=sk-xxx
git push heroku main
URL: https://your-app.herokuapp.com
```

### Alternative: Railway
```bash
railway init
railway up
railway domain
URL: https://your-app.up.railway.app
```

See **[SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)** for detailed guides.

---

## 📱 Chrome Web Store Publishing

### Requirements
- $5 one-time developer fee
- Screenshots (5 recommended)
- Privacy policy
- Detailed description
- Support email

### Timeline
- Submission: 30 minutes
- Review: 1-3 business days
- Total: ~1-3 days to go live

See **[CHROME_WEB_STORE_GUIDE.md](./CHROME_WEB_STORE_GUIDE.md)** for step-by-step guide.

---

## 🔐 Security Best Practices

### Server
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS (automatic on most platforms)
- ✅ Set strong JWT_SECRET
- ✅ Limit CORS to your extension ID
- ✅ Implement rate limiting
- ✅ Monitor API usage

### Extension
- ✅ Store API keys in Chrome storage only
- ✅ Never hardcode secrets
- ✅ Validate all user inputs
- ✅ Handle errors gracefully
- ✅ Clear error messages

### Privacy
- ✅ Don't store student submissions permanently
- ✅ Log only necessary data
- ✅ Comply with FERPA/GDPR if applicable
- ✅ Provide privacy policy
- ✅ Allow users to delete data

---

## 🎓 User Flow

1. **Discovery:** User finds extension on Chrome Web Store
2. **Installation:** One-click install
3. **Registration:**
   - Click extension icon
   - Register with email/password
   - Get API key automatically
4. **Configuration:** (Optional)
   - Add answer key images
   - Add rubric context
5. **Grading:**
   - Go to Gradescope grading page
   - Click "🤖 AI Grade All" button
   - Watch progress bar
   - Review grades before finalizing
6. **Upgrade:** (Optional)
   - Hit daily limit
   - Upgrade to premium for unlimited

---

## 📈 Success Metrics

### Month 1
- 🎯 50-100 installs
- ⭐ 4+ star rating
- 📝 5+ reviews
- 💵 Break-even on costs

### Month 6
- 🎯 500-1000 users
- ⭐ 4.5+ stars
- 💵 $200-500/month revenue
- 📊 90% retention rate

### Year 1
- 🎯 2000-5000 users
- 💵 $1000-2000/month revenue
- 🏆 Featured on Chrome Web Store
- 🌟 University partnerships

---

## 🛠️ Development Workflow

### Local Development
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Load extension
chrome://extensions/ → Load unpacked

# Test end-to-end:
1. Register user
2. Grade on Gradescope
3. Check server logs
4. Verify OpenAI API calls
```

### Updating

**Server updates (instant):**
```bash
cd server
# Make changes
git push heroku main  # Deploy
# No extension update needed! 🎉
```

**Extension updates (requires review):**
```bash
cd chrome-extension-serverside
# Make changes
# Increment version in manifest.json
zip -r extension-v2.0.1.zip .
# Upload to Chrome Web Store
# Wait 1-3 days for review
```

**Pro Tip:** Keep most logic on server so you can update without extension republish!

---

## 🆘 Troubleshooting

### Server Issues

**"Cannot connect to server"**
```bash
# Check server is running
curl https://your-server.com/health

# Check environment variables
heroku config  # or railway variables

# Check logs
heroku logs --tail
```

**"OpenAI API error"**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check OpenAI credits
# Visit: https://platform.openai.com/usage

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Extension Issues

**"Invalid API key"**
- User needs to register via popup
- Check server /api/auth/verify endpoint
- Verify API key format: gs_[64 chars]

**"Button not appearing"**
- Check content script loaded (F12 → Console)
- Verify on Gradescope grading page URL
- Reload extension + page

**"Daily limit exceeded"**
- Free tier maxed out (100 requests/day)
- Upgrade to premium
- Or wait 24 hours

---

## 📚 Documentation Index

1. **[SERVER_ARCHITECTURE.md](./SERVER_ARCHITECTURE.md)**
   - How server-side architecture works
   - Security benefits
   - API design
   - User authentication flow

2. **[SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)**
   - Deploy to Heroku
   - Deploy to Render
   - Deploy to Railway
   - Environment variables
   - Database setup

3. **[CHROME_WEB_STORE_GUIDE.md](./CHROME_WEB_STORE_GUIDE.md)**
   - Publishing steps
   - Store listing
   - Screenshots
   - Privacy policy
   - Review process

4. **[chrome-extension-serverside/README.md](./chrome-extension-serverside/README.md)**
   - Extension code overview
   - Local development
   - Configuration
   - Debugging

---

## ✅ Checklist

Before going live:

**Server:**
- [ ] Deployed to hosting platform
- [ ] Environment variables set
- [ ] Health endpoint working
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting active

**Extension:**
- [ ] Server URL updated
- [ ] Icons finalized
- [ ] Screenshots taken
- [ ] Description written
- [ ] Privacy policy created
- [ ] Tested end-to-end

**Chrome Web Store:**
- [ ] Developer account created ($5 paid)
- [ ] Extension uploaded
- [ ] Store listing complete
- [ ] Submitted for review
- [ ] Monitoring setup

**Post-Launch:**
- [ ] Monitor server logs
- [ ] Track OpenAI costs
- [ ] Respond to reviews
- [ ] Fix bugs promptly
- [ ] Market extension

---

## 🎉 Congratulations!

You now have:

✅ **Secure server-side architecture**
- Your OpenAI key is protected
- Users can't extract or abuse it

✅ **Professional Chrome extension**
- Ready for Chrome Web Store
- User authentication
- Usage tracking

✅ **Monetization ready**
- Free + premium tiers
- Usage limits
- Payment integration possible

✅ **Scalable solution**
- Update prompts without republishing
- Add features server-side
- Monitor all usage

---

## 🚀 Next Steps

1. **Deploy Server** → [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)
2. **Test Locally** → Follow Quick Start above
3. **Publish Extension** → [CHROME_WEB_STORE_GUIDE.md](./CHROME_WEB_STORE_GUIDE.md)
4. **Market & Grow** → Reddit, Twitter, LinkedIn
5. **Add Features** → Subscriptions, analytics, etc.

---

## 💬 Questions?

**Architecture questions:** See [SERVER_ARCHITECTURE.md](./SERVER_ARCHITECTURE.md)

**Deployment help:** See [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)

**Publishing help:** See [CHROME_WEB_STORE_GUIDE.md](./CHROME_WEB_STORE_GUIDE.md)

**Still stuck?** Open a GitHub issue or contact support

---

**Happy grading! May your extension help thousands of educators save time. 🎓✨**
