# 📦 Distribution Guide - Gradescope AI Grader

## Your API Key is Safe! 🔒

**Important**: Your API key is stored in **Chrome's sync storage**, NOT in the code files. When you share this extension, users will need to enter their own API keys.

## Distribution Options

### Option 1: Share ZIP File (Easiest) ✅

**File created**: `gradescope-ai-grader.zip`

**How to share:**
1. Send `gradescope-ai-grader.zip` to your friends (email, Drive, Dropbox, etc.)
2. They unzip it
3. They load it in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
4. They configure with their own API key

**Pros:**
- Simple and fast
- No Chrome Web Store approval needed
- Works immediately

**Cons:**
- Must be installed as "Developer mode" extension
- Chrome shows warning about developer extensions

---

### Option 2: Package as .CRX File (More Professional)

**Create .crx file:**

```bash
# In Chrome, go to chrome://extensions/
# Click "Pack extension"
# Select the chrome-extension folder
# Click "Pack Extension"
# You'll get: chrome-extension.crx
```

**How to share:**
1. Share the `.crx` file
2. Users drag it to `chrome://extensions/`
3. Click "Add extension"
4. Configure with their API key

**Pros:**
- Single file distribution
- Slightly more professional

**Cons:**
- Still requires "Developer mode" on Chrome
- Chrome may show security warnings

---

### Option 3: Publish to Chrome Web Store (Most Professional) 🌟

**Steps:**

1. **Create a developer account**
   - Go to: https://chrome.google.com/webstore/devconsole
   - One-time fee: $5

2. **Prepare assets**
   - 128x128 icon ✅ (already have)
   - Screenshots (5 recommended)
   - Description
   - Privacy policy (if collecting data)

3. **Upload**
   - ZIP the chrome-extension folder
   - Upload to Chrome Web Store
   - Fill in details
   - Submit for review (takes 1-3 days)

4. **Share the link**
   - Users install with one click
   - Automatic updates
   - No developer mode needed

**Pros:**
- Most professional
- No developer warnings
- Automatic updates
- Easy to share (just send link)

**Cons:**
- $5 fee
- Review process (1-3 days)
- Must comply with Chrome Web Store policies

---

### Option 4: GitHub Release (For Tech-Savvy Users)

**Steps:**

1. Create GitHub repository
2. Push chrome-extension folder
3. Create release with instructions
4. Share GitHub link

**Pros:**
- Version control
- Easy to update
- Professional for open-source projects

**Cons:**
- Users need to know how to clone/download from GitHub
- Still need Developer mode

---

## Recommended Instructions for Friends

Create a file called `INSTALL_INSTRUCTIONS.md`:

```markdown
# Installation Instructions - Gradescope AI Grader

## Prerequisites
- Google Chrome browser
- OpenAI API key (get one at https://platform.openai.com/api-keys)
- Approximately $2-5 per assignment (101 students)

## Installation Steps

1. **Unzip the file**
   - Extract `gradescope-ai-grader.zip`

2. **Load in Chrome**
   - Open Chrome and go to: `chrome://extensions/`
   - Toggle ON "Developer mode" (top-right corner)
   - Click "Load unpacked" (top-left)
   - Select the `chrome-extension` folder
   - You should see "Gradescope AI Grader" appear

3. **Configure**
   - Click the extension icon (puzzle piece in toolbar)
   - Paste your OpenAI API key
   - (Optional) Add answer key images
   - (Optional) Add rubric context
   - Click "Save Configuration"

4. **Test**
   - Go to Gradescope.com
   - Open any assignment → Grade Submissions
   - You should see a purple "🤖 AI Grade All" button
   - Click it to start grading!

## Your API Key
- Each user needs their own OpenAI API key
- Get one at: https://platform.openai.com/api-keys
- Free trial: $5 credit (enough for ~200 students)
- After trial: ~$2-5 per 101 students

## Support
Contact [your email/discord/slack] for help
```

---

## What to Share

### Minimal Package:
```
gradescope-ai-grader.zip
└── chrome-extension/
    ├── manifest.json
    ├── content.js
    ├── background.js
    ├── popup.html
    ├── popup.js
    ├── styles.css
    ├── icons/
    ├── README.md
    └── QUICKSTART.md
```

### Full Package (Recommended):
```
gradescope-ai-grader.zip (created above)
INSTALL_INSTRUCTIONS.md (create this)
```

---

## Privacy & Security

**What data is collected:**
- ✅ API key stored locally in Chrome (not shared)
- ✅ No telemetry or tracking
- ✅ No data sent anywhere except OpenAI API
- ✅ All processing happens client-side

**Remind users:**
- Keep their API key private
- Monitor OpenAI usage at https://platform.openai.com/usage
- Review grades before finalizing (AI can make mistakes)

---

## Updates

If you make changes:

1. **Update version** in `manifest.json`:
   ```json
   "version": "1.0.2"
   ```

2. **Create new ZIP**:
   ```bash
   zip -r gradescope-ai-grader-v1.0.2.zip chrome-extension
   ```

3. **Share with changelog**:
   ```
   v1.0.2 - Fixed bug with rubric selection
   v1.0.1 - Initial release
   ```

---

## Recommended: Add to GitHub

```bash
cd /Users/joonyeoupkim/Desktop/personal_project/HW_grader
git init
git add chrome-extension/
git commit -m "Initial release of Gradescope AI Grader"
git remote add origin https://github.com/yourusername/gradescope-ai-grader.git
git push -u origin main
```

Then create a release:
- Go to GitHub → Releases → Create new release
- Attach `gradescope-ai-grader.zip`
- Write release notes
- Share GitHub URL

---

## Support Questions to Expect

1. **"Where do I get an API key?"**
   - https://platform.openai.com/api-keys

2. **"I don't see the button"**
   - Refresh page, check console for errors
   - Make sure on `/submissions/` page

3. **"It's selecting wrong rubric items"**
   - Add answer key images in popup
   - Add rubric context text
   - Check OpenAI response in console

4. **"How much does it cost?"**
   - ~$0.02-0.05 per student
   - ~$2-5 for 101 students

5. **"Is my API key safe?"**
   - Yes, stored locally in Chrome
   - Not in code files
   - Only sent to OpenAI API
