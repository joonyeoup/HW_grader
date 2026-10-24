# 🌐 Chrome Web Store Publishing Guide

Step-by-step guide to publish your Gradescope AI Grader extension.

---

## Prerequisites

Before publishing:

- ✅ Server deployed and running (see [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md))
- ✅ Extension tested locally
- ✅ Extension updated with production server URL
- ✅ $5 one-time Chrome Web Store developer fee
- ✅ Screenshots and promotional images ready

---

## Step 1: Prepare Extension

### Update Server URL

**Edit `chrome-extension-serverside/background.js` line ~78:**

```javascript
// Change from localhost to your production server
chrome.storage.sync.set({
  serverUrl: 'https://your-production-server.com'  // Your actual URL!
});
```

### Update Manifest Version

**Edit `chrome-extension-serverside/manifest.json`:**

```json
{
  "version": "2.0.0",  // Increment for updates
  "name": "Gradescope AI Grader",
  "description": "AI-powered homework grading assistant for Gradescope"
}
```

### Add Host Permissions

```json
"host_permissions": [
  "https://www.gradescope.com/*",
  "https://gradescope.com/*",
  "https://your-production-server.com/*"  // Add your server!
]
```

---

## Step 2: Create Package

### Zip the Extension

```bash
cd chrome-extension-serverside
zip -r ../gradescope-ai-grader-v2.0.0.zip . -x "*.DS_Store" "*.git*" "node_modules/*"
```

**Verify package:**
```bash
unzip -l gradescope-ai-grader-v2.0.0.zip
# Should contain:
# - manifest.json
# - background.js
# - content.js
# - popup.html
# - popup.js
# - styles.css
# - icons/
```

---

## Step 3: Create Developer Account

1. Go to: https://chrome.google.com/webstore/devconsole
2. Click "Sign in" with Google account
3. Pay $5 one-time developer fee
4. Complete developer account setup

---

## Step 4: Create Store Listing

### Basic Information

**Extension Name:**
```
Gradescope AI Grader
```

**Short Description (132 char max):**
```
Automate homework grading on Gradescope with GPT-4 Vision. Save hours grading assignments with AI-powered rubric selection.
```

**Detailed Description:**

```
🤖 Gradescope AI Grader

Automate your Gradescope grading workflow with the power of GPT-4 Vision. Save hours of manual grading while maintaining consistent, fair evaluation.

✨ KEY FEATURES

• Automatic Grading: Grade 100+ students in minutes
• AI-Powered: Uses GPT-4 Vision to analyze student submissions
• Rubric Selection: Automatically selects appropriate rubric items
• Visual Analysis: Analyzes handwritten work, diagrams, and code
• Customizable: Add answer keys and grading context
• Progress Tracking: Real-time progress bar and status updates
• Keyboard Shortcuts: Ctrl+Shift+G to start grading

🎯 HOW IT WORKS

1. Navigate to your Gradescope assignment grading page
2. Click the "🤖 AI Grade All" button that appears
3. The extension analyzes each student's submission
4. AI selects the appropriate rubric item based on quality
5. Automatically moves to the next student
6. Complete grading in a fraction of the time!

📊 PERFECT FOR

• Teaching Assistants grading hundreds of submissions
• Professors managing large classes
• Educators seeking consistent grading standards
• Anyone spending hours on repetitive grading tasks

🔒 SECURITY & PRIVACY

• Secure server-side architecture
• User authentication and API keys
• Usage tracking and limits
• Your data never leaves Gradescope and our secure servers

💰 PRICING

• Free Tier: 100 gradings per day
• Perfect for individual TAs and small classes
• Premium options available for larger courses

⚙️ SETUP

1. Install the extension
2. Register for a free API key
3. Configure your grading preferences
4. Start grading on Gradescope!

📝 IMPORTANT NOTES

• Requires registration for an API key (free)
• Works only on Gradescope.com
• AI suggestions should always be reviewed for accuracy
• Currently supports multiple-choice and rubric-based grading

🆘 SUPPORT

Having issues? Contact us at [your-email@example.com]

---

This extension uses AI to assist with grading. Always review AI-generated grades before finalizing to ensure accuracy and fairness.

Developed by [Your Name/Organization]
Not affiliated with Gradescope
```

### Category

Select: **Productivity**

### Language

Select: **English**

---

## Step 5: Prepare Visual Assets

### Required Images

1. **Extension Icon** (128x128px)
   - Already in `icons/icon128.png`
   - Should be recognizable, simple design
   - PNG format, transparent background

2. **Small Tile** (440x280px)
   - Create a promotional image
   - Show the extension in action
   - Include text: "Gradescope AI Grader"

3. **Screenshots** (1280x800px or 640x400px)
   - **Screenshot 1:** Gradescope page with "AI Grade All" button visible
   - **Screenshot 2:** Extension popup showing configuration
   - **Screenshot 3:** Progress bar showing active grading
   - **Screenshot 4:** Completed grading status
   - **Screenshot 5:** Before/after comparison

### Creating Screenshots

**MacOS:**
```bash
# Take screenshot
Cmd+Shift+4

# Resize to 1280x800
# Use Preview or online tool
```

**Add Annotations:**
- Highlight the AI button
- Add arrows pointing to key features
- Include brief explanatory text

---

## Step 6: Upload Extension

1. Go to Chrome Web Store Developer Dashboard
2. Click **"New Item"**
3. Upload `gradescope-ai-grader-v2.0.0.zip`
4. Wait for automatic checks to complete

**Common Errors:**
- ❌ Manifest errors → Check manifest.json syntax
- ❌ Missing icons → Ensure icons folder included
- ❌ Permission warnings → Normal for host_permissions

---

## Step 7: Complete Store Listing

### Privacy

**Single Purpose Description:**
```
This extension automates grading on Gradescope by analyzing student submissions with AI and selecting appropriate rubric items.
```

**Permission Justifications:**

- **storage:** Store user API keys and configuration
- **activeTab:** Interact with Gradescope grading pages
- **scripting:** Inject grading automation UI
- **host_permissions (gradescope.com):** Access grading interface
- **host_permissions (your-server.com):** Connect to backend API

**Privacy Practices:**

```
✅ This extension does NOT collect, use, or share user data
✅ User submissions are sent to our server only for grading
✅ API keys stored locally in browser
✅ No analytics or tracking
✅ HTTPS encryption for all data transmission
```

### Pricing

- Free tier with limits
- Optional premium plans

Check: **"This extension contains in-app purchases"** if you plan to charge

---

## Step 8: Submit for Review

### Pre-submission Checklist

- ✅ All fields completed
- ✅ Screenshots uploaded (5 recommended)
- ✅ Privacy policy URL provided (create simple page)
- ✅ Support email added
- ✅ Description clear and accurate
- ✅ Extension tested in preview mode

### Submit

1. Click **"Submit for Review"**
2. Review time: **1-3 business days**
3. You'll receive email when approved/rejected

---

## Step 9: Create Privacy Policy

**Create simple page at your-domain.com/privacy:**

```markdown
# Privacy Policy - Gradescope AI Grader

Last updated: [DATE]

## Data Collection
We collect minimal data necessary to provide grading services:
- User email (for authentication)
- API usage statistics (request count, timestamps)
- No student submission data is permanently stored

## Data Usage
- Authentication and authorization
- Usage tracking and billing
- Service improvement

## Data Sharing
- Student submissions sent to OpenAI API for grading
- No data sold to third parties
- Server logs kept for 30 days

## User Rights
- Request data deletion
- Export your data
- Revoke API access anytime

## Contact
[your-email@example.com]
```

**Add URL to extension listing**

---

## Step 10: Monitor & Respond

### After Approval

1. **Celebrate!** 🎉 Your extension is live
2. Share the link: `https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID`
3. Monitor reviews and ratings
4. Respond to user feedback

### Analytics

Chrome Web Store provides:
- Total users
- Weekly active users
- Ratings and reviews
- Crashes and errors

### Server Monitoring

Track on your server:
- New user registrations
- API requests per day
- OpenAI costs
- Error rates

---

## Step 11: Marketing

### Share Your Extension

**Chrome Web Store Link:**
```
https://chrome.google.com/webstore/detail/[YOUR_EXTENSION_ID]
```

**Where to share:**
- Reddit: r/Professors, r/TAs, r/GradSchool
- Twitter/X: Education tech communities
- LinkedIn: Professional network
- University TA forums
- Gradescope community

**Sample Post:**
```
🤖 I built a Chrome extension that automates Gradescope grading using GPT-4 Vision!

• Grade 100 students in ~10 minutes
• AI analyzes submissions and selects rubric items
• Saved me 10+ hours per assignment

Free to try: [Chrome Web Store Link]
```

---

## Updates & Maintenance

### Updating the Extension

1. Make changes to code
2. Increment version in manifest.json: `"version": "2.0.1"`
3. Zip the updated extension
4. Upload to Chrome Web Store Developer Dashboard
5. Submit for review

**Users get updates automatically!**

### Updating the Server

```bash
# Update server code
cd server
git pull
# or edit files directly

# Redeploy
git push heroku main  # or railway/render

# No extension update needed! 🎉
```

**Benefits of server-side:**
- Update grading prompts without republishing extension
- Fix bugs instantly
- Add features server-side only

---

## Monetization

### Free + Premium Model

**Implement in server:**

```javascript
// server/routes/auth.js
const plans = {
  free: {
    requestsPerDay: 100,
    price: 0
  },
  premium: {
    requestsPerDay: Infinity,
    price: 5.00  // $5/month
  }
};
```

### Stripe Integration

```bash
npm install stripe

# Add to server
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post('/create-checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_xxx',  // Your Stripe price ID
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'https://your-site.com/success',
    cancel_url: 'https://your-site.com/cancel',
  });
  res.json({ url: session.url });
});
```

---

## Troubleshooting

### Extension Rejected

**Common reasons:**
- Privacy policy missing
- Misleading description
- Excessive permissions
- Broken functionality

**Fix and resubmit**

### Low Ratings

- Respond to reviews professionally
- Fix reported bugs quickly
- Add requested features
- Provide clear documentation

### High Server Costs

- Add usage limits
- Implement caching
- Optimize API calls
- Upgrade to premium plans

---

## Success Metrics

### Targets

**First Month:**
- 50-100 installs
- 4+ star rating
- 5+ reviews

**First Year:**
- 500-1000 users
- Break-even or profitable
- Feature-rich and stable

### KPIs to Track

- Daily Active Users (DAU)
- Retention rate
- OpenAI cost per user
- Revenue per user
- Support requests

---

## Legal Considerations

### Terms of Service

Create ToS page covering:
- Acceptable use
- Service limitations
- Liability disclaimers
- Termination rights

### DMCA/Copyright

- You own the code
- Users responsible for submissions
- Fair use of OpenAI API

### University Policies

- Check if Gradescope allows automation
- Verify academic integrity policies
- Add disclaimer: "Review AI grades before finalizing"

---

## Congratulations!

You've successfully:
- ✅ Built a Chrome extension
- ✅ Created a secure backend
- ✅ Published to Chrome Web Store
- ✅ Protected your API keys and code
- ✅ Enabled monetization

**Your extension is now live and helping educators save time! 🎉**

---

## Resources

- Chrome Web Store: https://chrome.google.com/webstore/devconsole
- Chrome Extension Docs: https://developer.chrome.com/docs/extensions
- Stripe Docs: https://stripe.com/docs
- OpenAI Usage: https://platform.openai.com/usage

**Questions?** Contact support or check GitHub issues.
