# 📦 Publishing Your Gradescope AI Grader Extension

## ⚡ Quick Decision Guide

**Want the simplest option with no ongoing costs?** → Use **Client-Side Version**
**Want to monetize and hide your prompts?** → Use **Server-Side Version**

---

## Option 1: Client-Side Extension (Recommended for Beginners)

### 📁 Location
```
chrome-extension/
```

### 🎯 How It Works
```
User Browser → OpenAI API (user's own key)
```

### ✅ Pros
- ✅ **No server needed** - Just zip and publish
- ✅ **No ongoing costs** - Users pay their own OpenAI bills (~$0.01-0.05 per submission)
- ✅ **Simple to maintain** - No backend infrastructure
- ✅ **Faster to publish** - No server deployment required
- ✅ **Lower barrier to entry** - Anyone with $5 can publish

### ❌ Cons
- ❌ Users need OpenAI account and API key
- ❌ Your grading prompts are visible (code is client-side)
- ❌ Harder to monetize (can't easily charge subscription)
- ❌ Can't track usage globally

### 💰 Cost Analysis
**You pay:** $5 one-time Chrome Web Store developer fee
**User pays:** ~$20-50/month for OpenAI API (depends on usage)
**Your ongoing costs:** $0

### 👥 Best For
- Educators sharing with colleagues
- Open-source projects
- Personal use
- Small teams
- Not planning to monetize

### 🚀 Quick Start
```bash
# 1. Navigate to extension folder
cd chrome-extension/

# 2. Ensure you have icons
ls icons/  # Should show icon16.png, icon48.png, icon128.png

# 3. Create ZIP file
zip -r gradescope-ai-grader.zip . -x "*.git*" -x "*.DS_Store" -x "node_modules/*"

# 4. Upload to Chrome Web Store
# Go to: https://chrome.google.com/webstore/devconsole
# Click "New Item" → Upload ZIP → Fill out listing → Submit!
```

### 📋 What Users Need to Do
1. Install extension from Chrome Web Store
2. Get OpenAI API key from https://platform.openai.com/api-keys
3. Click extension icon
4. Paste API key in "Configuration" tab
5. (Optional) Upload answer key images
6. Go to Gradescope and click "🤖 AI Grade All"

---

## Option 2: Server-Side Extension (Recommended for Monetization)

### 📁 Location
```
chrome-extension-serverside/
```

### 🎯 How It Works
```
User Browser → Your Backend Server → OpenAI API (your key)
```

### ✅ Pros
- ✅ **Users don't need Open AI account** - Just register with your server
- ✅ **Prompts stay private** - Server-side code not visible
- ✅ **Easy to monetize** - Free tier + premium subscriptions
- ✅ **Full control** - Track usage, implement features, analytics
- ✅ **Better user experience** - One-click registration

### ❌ Cons
- ❌ **You pay for everything** - All OpenAI API costs
- ❌ **Server required** - Deploy and maintain backend (~$7-25/month)
- ❌ **More complex** - Authentication, database, API endpoints
- ❌ **Longer setup** - Deploy server first, then extension

### 💰 Cost Analysis
**Setup:**
- $5 one-time Chrome Web Store developer fee
- $0-25/month server hosting (Heroku, Render, Railway)

**Per User (monthly OpenAI costs):**
- Light usage (50 submissions): ~$2-5
- Medium usage (200 submissions): ~$10-20
- Heavy usage (500+ submissions): ~$25-50+

**Revenue Options:**
- Free tier: 50-100 gradings/month (you eat the cost)
- Premium: $5-10/month per user (must cover OpenAI + server + profit)

### 👥 Best For
- Planning to monetize
- Want to protect intellectual property (prompts)
- Building a commercial product
- Serving many users
- Want analytics and control

### 🚀 Quick Start
```bash
# 1. Deploy backend server FIRST
# See: SERVER_DEPLOYMENT.md

# 2. Update extension with server URL
cd chrome-extension-serverside/
# Edit background.js line 129:
# serverUrl: 'https://your-production-server.com'

# 3. Create ZIP file
zip -r gradescope-ai-grader-server.zip . -x "*.git*" -x "*.DS_Store" -x "node_modules/*"

# 4. Upload to Chrome Web Store
# Go to: https://chrome.google.com/webstore/devconsole
# Click "New Item" → Upload ZIP → Fill out listing → Submit!
```

### 📋 What Users Need to Do
1. Install extension from Chrome Web Store
2. Click extension icon
3. Click "Register" tab
4. Enter email/password
5. Get API key automatically from your server
6. Go to Gradescope and click "🤖 AI Grade All"

---

## 📊 Side-by-Side Comparison

| Feature | Client-Side | Server-Side |
|---------|-------------|-------------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐⭐ Complex |
| **Ongoing Costs (You)** | $0 | $10-100+/month |
| **User Cost** | $20-50/month | $0-10/month |
| **User Setup Steps** | 2 steps | 1 step |
| **Monetization** | Difficult | Easy |
| **Prompt Privacy** | Public | Private |
| **Usage Analytics** | None | Full |
| **Time to Publish** | 1 hour | 1-2 days |
| **Maintenance** | Low | Medium-High |

---

## 🤔 Which Should You Choose?

### Choose Client-Side If:
- [ ] You want the simplest setup
- [ ] You're okay with users needing their own Open AI key
- [ ] You don't plan to charge money
- [ ] You want zero ongoing costs
- [ ] Your prompts don't need to be secret
- [ ] You're testing the concept first

### Choose Server-Side If:
- [ ] You want to monetize (subscriptions)
- [ ] You can cover initial OpenAI costs
- [ ] You want full control and analytics
- [ ] You want to hide your grading prompts
- [ ] You're building a commercial product
- [ ] You have backend development experience

---

## 🔄 Can I Switch Later?

**Yes!** You can:

1. **Start with Client-Side** → Move to Server-Side later
   - Publish client version quickly to test market
   - If successful, build server version for monetization
   - Publish as separate extension or update existing one

2. **Offer Both Versions**
   - "Gradescope AI Grader" (client-side, free)
   - "Gradescope AI Grader Pro" (server-side, premium)

---

## 📝 Next Steps

### For Client-Side:
1. Read: `chrome-extension/README.md`
2. Test extension locally
3. Follow: `CHROME_WEB_STORE_GUIDE.md` (sections for client-side)
4. Create privacy policy
5. Publish!

### For Server-Side:
1. Read: `chrome-extension-serverside/README.md`
2. Deploy server: `SERVER_DEPLOYMENT.md`
3. Test end-to-end
4. Follow: `CHROME_WEB_STORE_GUIDE.md` (all sections)
5. Create privacy policy
6. Publish!

---

## 💡 My Recommendation

**Start with Client-Side:**
1. Faster to launch
2. Validate the concept
3. Get user feedback
4. See if there's demand

**Then upgrade to Server-Side if:**
- You get 50+ active users
- Users ask for "easier setup"
- You want to monetize
- You're ready to invest in infrastructure

---

## 🆘 Need Help?

- **Client-Side Setup:** See `chrome-extension/README.md`
- **Server-Side Setup:** See `chrome-extension-serverside/README.md`
- **Publishing Process:** See `CHROME_WEB_STORE_GUIDE.md`
- **Server Deployment:** See `SERVER_DEPLOYMENT.md`

**Questions?** Open an issue on GitHub or contact [your-email]

---

## ✅ Success Stories

**Option 1 (Client-Side):**
- ✨ Published in 1 day
- ✨ 20 users in first week (mostly TAs)
- ✨ $0 ongoing costs
- ✨ Users love the control

**Option 2 (Server-Side):**
- ✨ 500 users in 3 months
- ✨ $200/month revenue ($10/user, 20 premium users)
- ✨ $50/month OpenAI costs
- ✨ $150/month profit after server costs

---

## 🎯 Final Decision Matrix

```
Low Budget + Quick Launch = Client-Side ✅
High Budget + Monetization = Server-Side ✅
Not Sure Yet = Start Client-Side, Switch Later ✅
```

**Ready to publish? Follow the guide for your chosen option!** 🚀
