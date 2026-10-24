# 🏗️ Server-Side Architecture

## Why Server-Side?

When publishing to the Chrome Web Store, your extension code is public. Anyone can:
- Extract your source code
- See your OpenAI API key (if hardcoded)
- Steal your grading prompts
- Clone your extension

**Server-side architecture solves this by:**
- ✅ Keeping your OpenAI API key on YOUR server
- ✅ Protecting your grading logic/prompts
- ✅ Adding user authentication
- ✅ Implementing usage limits
- ✅ Enabling subscriptions/monetization
- ✅ Tracking costs per user

---

## Architecture Comparison

### ❌ Client-Side (Original - Not Recommended for Public Distribution)

```
User's Browser
  ↓
Chrome Extension
  ├─ Has OpenAI API key (VISIBLE in code!)
  ├─ Has grading prompts (VISIBLE!)
  ↓
OpenAI API
```

**Problems:**
- Anyone can extract your API key from extension
- Your API bill explodes with abuse
- No way to limit usage
- Can't charge users
- Code is easily cloned

---

### ✅ Server-Side (New - Recommended for Chrome Web Store)

```
User's Browser
  ↓
Chrome Extension (Client)
  ├─ UI code (public - OK!)
  ├─ Gradescope automation (public - OK!)
  ├─ User's API key (registered via your server)
  ↓
YOUR Backend Server (Private)
  ├─ YOUR OpenAI API key (SECRET!)
  ├─ Grading logic (SECRET!)
  ├─ User authentication
  ├─ Usage tracking
  ├─ Rate limiting
  ↓
OpenAI API
```

**Benefits:**
- ✅ OpenAI key is secure on your server
- ✅ Users get their own API keys (from YOUR server)
- ✅ You control access and limits
- ✅ Can implement subscriptions
- ✅ Monitor and track all usage
- ✅ Source code protection

---

## How It Works

### 1. User Registration Flow

```
User → Extension Popup → "Register" button
  ↓
POST /api/auth/register {email, password}
  ↓
Server creates user account
  ↓
Server generates unique API key: "gs_abc123..."
  ↓
Returns API key to user
  ↓
User saves key in extension
```

### 2. Grading Flow

```
User clicks "AI Grade All" on Gradescope
  ↓
Extension extracts submission images
  ↓
POST /api/grading/grade
  Headers: X-API-Key: gs_abc123...
  Body: {submissionData, rubricItems, ...}
  ↓
Server validates user's API key
  ↓
Server checks usage limits
  ↓
Server calls OpenAI API (with YOUR key)
  ↓
Server tracks usage (tokens, requests)
  ↓
Returns grading result to extension
  ↓
Extension selects rubric item via keyboard
```

### 3. Usage Tracking

```
Every API call:
  ↓
Middleware tracks:
  - Total requests
  - Total tokens used
  - Last request timestamp
  ↓
Checks against limits:
  - Free tier: 100 requests/day
  - Premium: Unlimited
  ↓
If limit exceeded → Error 429
```

---

## File Structure

```
HW_grader/
├── server/                          # Backend server (DEPLOY THIS)
│   ├── server.js                    # Main Express app
│   ├── routes/
│   │   ├── auth.js                 # Registration, login, API keys
│   │   └── grading.js              # OpenAI API calls (YOUR KEY!)
│   ├── middleware/
│   │   ├── auth.js                 # API key validation
│   │   └── usage.js                # Usage tracking
│   ├── .env.example                # Environment variables template
│   └── package.json                # Dependencies
│
├── chrome-extension-serverside/     # Chrome extension (PUBLISH THIS)
│   ├── manifest.json               # Extension config
│   ├── background.js               # Calls YOUR server
│   ├── content.js                  # Gradescope automation
│   ├── popup.html/js               # Configuration UI
│   └── styles.css                  # UI styling
│
└── Documentation/
    ├── SERVER_DEPLOYMENT.md         # How to deploy server
    ├── SERVER_ARCHITECTURE.md       # This file
    └── CHROME_WEB_STORE_GUIDE.md   # Publishing guide
```

---

## Security Features

### 1. API Key Authentication

```javascript
// Every request requires X-API-Key header
Headers: {
  'X-API-Key': 'gs_user_specific_key_here'
}

// Server validates key before processing
if (!validKey) return 401 Unauthorized
```

### 2. Rate Limiting

```javascript
// Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                    // 100 requests max
});
```

### 3. CORS Protection

```javascript
// Only allow requests from your extension
cors({
  origin: 'chrome-extension://YOUR_EXTENSION_ID'
});
```

### 4. Usage Limits

```javascript
// Free tier: 100 requests/day
// Premium: Unlimited
if (user.usage.totalRequests >= user.limits.requestsPerDay) {
  return 429 Too Many Requests
}
```

---

## User Tiers

### Free Tier
- 100 requests per day
- ~10-20 assignments/month
- Perfect for individual TAs
- **Cost to you:** ~$1-2/month per user

### Premium Tier (Optional)
- Unlimited requests
- Priority support
- Advanced features
- **Charge:** $5-10/month
- **Your cost:** $2-5/month
- **Profit:** $3-5/month per user

---

## Monetization Options

### Option 1: Free with Limits
- 100 requests/day free
- Upgrade for more
- Simple and user-friendly

### Option 2: Pay-per-use
- $0.05 per grading request
- Add credits system
- Use Stripe API

### Option 3: Subscription
- $5/month unlimited
- Use Stripe subscriptions
- Recurring revenue

### Option 4: University Licensing
- Sell to universities
- $500-1000/year per institution
- Unlimited usage for all TAs

---

## Cost Breakdown

### Your Costs (per 100 students graded):

**OpenAI API:**
- GPT-4o: ~$0.02-0.05 per submission
- 100 students: $2-5
- 1000 students: $20-50

**Server Hosting:**
- Free tier: $0
- Basic: $5/month
- Production: $15/month

**Total:** ~$2-5 per assignment (100 students)

### User Pricing Examples:

**Free Tier:**
- 100 requests/day
- You pay ~$2/month per active user
- Break even with ads or referrals

**Premium ($5/month):**
- Unlimited usage
- Average user costs you $2-3/month
- Profit: $2-3/month per user

**With 100 users:**
- Revenue: $500/month
- OpenAI costs: $200/month
- Server: $15/month
- **Profit: $285/month**

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Start server
cd server
npm run dev
# Server at http://localhost:3000

# Terminal 2: Load extension
# chrome://extensions/ → Load chrome-extension-serverside/

# Test flow:
# 1. Register via extension popup
# 2. Get API key
# 3. Test grading on Gradescope
```

### Deployment

```bash
# Deploy server
cd server
git push heroku main  # or railway/render

# Update extension with production URL
# Edit background.js line ~78:
serverUrl: 'https://your-server.com'

# Publish extension
# Submit to Chrome Web Store
```

---

## API Endpoints

### Authentication

```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login existing user
GET    /api/auth/verify          Verify API key
GET    /api/auth/usage           Get usage stats
```

### Grading

```
POST   /api/grading/grade        Grade submission (requires auth)
```

### Health

```
GET    /health                   Server health check
```

---

## Future Enhancements

### Phase 1 (Current)
- ✅ User authentication
- ✅ API key system
- ✅ Usage tracking
- ✅ Rate limiting

### Phase 2 (Add later)
- [ ] Database (MongoDB/PostgreSQL)
- [ ] Stripe integration
- [ ] Email notifications
- [ ] Usage dashboard

### Phase 3 (Advanced)
- [ ] Multiple AI models
- [ ] Custom grading rubrics
- [ ] Batch grading API
- [ ] Gradescope integration

### Phase 4 (Scale)
- [ ] Multi-tenant support
- [ ] University admin portal
- [ ] Analytics dashboard
- [ ] API for other tools

---

## Migration from Client-Side

If you have the original client-side version:

### Users:
1. Install new server-side extension
2. Register at your server
3. Get new API key
4. Continue using as before

### You:
1. Deploy server (one-time)
2. Update extension code
3. Publish to Chrome Web Store
4. Monitor usage and costs

**One-time migration, then hands-off!**

---

## FAQs

**Q: Can users still use their own OpenAI keys?**
A: No, in server-side version, they use YOUR API key (protected on server). They get an API key from YOUR server for authentication.

**Q: How do I prevent abuse?**
A: Rate limiting (100 req/15min), usage limits (100/day free), and API key authentication.

**Q: What if my server goes down?**
A: Extension won't work. Use reliable hosting (Render/Heroku) with 99.9% uptime. Add error handling in extension.

**Q: Can I charge users?**
A: Yes! Implement Stripe for subscriptions or pay-per-use.

**Q: How do I update grading prompts?**
A: Just update `server/routes/grading.js` and redeploy. Extension doesn't need updates!

**Q: Is my OpenAI key really safe?**
A: Yes, it's only in `.env` file on your server. Never sent to browser.

---

## Conclusion

Server-side architecture is essential for:
- 🔒 Security (protect API keys)
- 💰 Monetization (charge users)
- 📊 Analytics (track usage)
- 🛡️ Control (rate limits, access control)
- ⚡ Updates (change prompts without republishing extension)

**Ready to deploy?** See [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)

**Ready to publish?** See [CHROME_WEB_STORE_GUIDE.md](./CHROME_WEB_STORE_GUIDE.md)
