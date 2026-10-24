# 🔍 Answer Key Debugging Guide

## The Problem
The AI is grading wrong answers as correct because it's not seeing the answer key images.

## ✅ How to Fix

### Step 1: Upload Answer Key (REQUIRED)
1. **Click the extension icon** (top-right corner of Chrome, near the address bar)
2. Scroll to **"Answer Key / Solution"** section
3. Click **"Choose Files"** and select your answer key images (PNG or JPG)
   - If you have a PDF, convert it to images first (see PDF_TO_IMAGE_GUIDE.md)
4. **IMPORTANT**: Click the blue **"Save Configuration"** button at the bottom
5. Wait for **"Configuration saved successfully!"** message
6. The popup will auto-close after 2 seconds

### Step 2: Refresh Gradescope Page
1. Go back to your Gradescope grading page
2. **Press F5** to refresh the page
3. Wait for the page to fully load

### Step 3: Test Grading
1. Click **"AI Grade All"** button
2. You should see a popup if answer key is not uploaded
3. If answer key is uploaded, grading will proceed

## 📊 How to Check Logs

### TWO Console Windows to Check

#### Console 1: Content Script (Main Console)
- **How to open**: Press `F12` → "Console" tab
- **What to look for**:
  ```
  🔑 ANSWER KEY CHECK (from content.js):
    - config.answerKeyImages length: X  ← Should be > 0!
    ✅ ANSWER KEY WILL BE SENT TO AI
  ```
- **If you see**: `❌❌❌ NO ANSWER KEY` → Go to Step 1 above!

#### Console 2: Background Script (Service Worker)
- **How to open**:
  1. Go to `chrome://extensions/`
  2. Find "Gradescope AI Grader"
  3. Click **"service worker"** (blue link under the extension)
  4. This opens a separate console window
- **What to look for**:
  ```
  ╔═══════════════════════════════════════════════════════════════╗
  ║          GRADING REQUEST RECEIVED (background.js)             ║
  ╚═══════════════════════════════════════════════════════════════╝
  🔑 ANSWER KEY CHECK (received from content.js):
    - Length: X  ← Should be > 0!
    ✅✅✅ ANSWER KEY IMAGES AVAILABLE! ✅✅✅

  [Later in the logs...]

  ╔═══════════════════════════════════════════════════════════════╗
  ║              SENDING REQUEST TO OPENAI API                    ║
  ╚═══════════════════════════════════════════════════════════════╝
  🖼️ Images Being Sent to OpenAI:
    - Answer key images: X  ← Should be > 0!
    - Student submission images: 1
    ✅ Answer key IS included - AI will compare student work to correct solution

  [After OpenAI responds...]

  ╔═══════════════════════════════════════════════════════════════╗
  ║                    AI GRADING DECISION                        ║
  ╚═══════════════════════════════════════════════════════════════╝
  📊 ANSWER COMPARISON:
    ┌─────────────────────────────────────────────────────────────┐
    │ Correct Answer (from answer key):   1/5                    │
    ├─────────────────────────────────────────────────────────────┤
    │ Student Answer (from submission):   14c/15                 │
    └─────────────────────────────────────────────────────────────┘

    ❌❌❌ ANSWERS DO NOT MATCH - Student is WRONG ❌❌❌
    Expected: 1/5
    Got:      14c/15
  ```

## 🚨 Red Flags in Logs

### ❌ Answer Key Not Uploaded
```
❌❌❌ NO ANSWER KEY IMAGES! ❌❌❌
- Length: 0
```
**Fix**: Follow Step 1 above to upload answer key

### ❌ Answer Key Not Sent to OpenAI
```
🖼️ Images Being Sent to OpenAI:
  - Answer key images: 0  ← PROBLEM!
  ❌ Answer key NOT included
```
**Fix**: The answer key didn't make it from storage to the API call. Check Step 1 again.

### ❌ AI Says "N/A" for Correct Answer
```
📊 ANSWER COMPARISON:
  │ Correct Answer (from answer key):   N/A   │  ← PROBLEM!
```
**Fix**: AI didn't receive answer key images. Check background console for earlier errors.

## ✅ Success Indicators

### ✅ Answer Key Uploaded
```
✅✅✅ ANSWER KEY LOADED SUCCESSFULLY! ✅✅✅
  - Number of pages: 3
  - First page size: 523847 characters
```

### ✅ Answer Key Sent to OpenAI
```
✅ Answer key IS included - AI will compare student work to correct solution
  - Answer key image sizes: 1: 523847 chars, 2: 498562 chars, 3: 501293 chars
```

### ✅ AI Extracted Answers Correctly
```
📊 ANSWER COMPARISON:
  │ Correct Answer (from answer key):   1/5                    │
  │ Student Answer (from submission):   14c/15                 │

  ❌❌❌ ANSWERS DO NOT MATCH - Student is WRONG ❌❌❌
```

## 📝 Quick Checklist

- [ ] Answer key images uploaded via extension popup
- [ ] Clicked "Save Configuration" button
- [ ] Refreshed Gradescope page (F5)
- [ ] Content console shows: `✅ ANSWER KEY WILL BE SENT TO AI`
- [ ] Background console shows: `✅✅✅ ANSWER KEY IMAGES AVAILABLE!`
- [ ] Background console shows: `Answer key images: X` (where X > 0)
- [ ] AI response shows actual answers (not "N/A")

## 🔧 Still Having Issues?

1. **Clear extension storage**:
   - Open `chrome-extension://[YOUR_EXTENSION_ID]/debug_storage.html`
   - Click "Check Storage"
   - Verify answer key is shown
   - If not, click "Clear Answer Key" and re-upload

2. **Check file format**:
   - Answer key must be **images** (PNG, JPG)
   - If you have PDF, convert it first (see PDF_TO_IMAGE_GUIDE.md)
   - Files should be under 5MB each

3. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click reload icon on "Gradescope AI Grader"
   - Refresh Gradescope page (F5)
   - Re-upload answer key

4. **Check both consoles**:
   - Main console (F12)
   - Background console (chrome://extensions/ → "service worker")
   - Copy ALL logs and share if asking for help
