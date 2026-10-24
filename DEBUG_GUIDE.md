# 🐛 Debugging Guide - "No submission" Selection Issue

## Problem
The AI is incorrectly selecting "No submission/selection" even when there's visible student work.

## How to Debug

### Step 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "Gradescope AI Grader"
3. Click the **reload icon** (circular arrow)
4. This loads the new debugging code

### Step 2: Open TWO Console Windows

**Console 1: Content Script (Main Page)**
1. Go to Gradescope grading page
2. Press **F12** to open Developer Tools
3. Click "Console" tab
4. Keep this visible

**Console 2: Background Script (Service Worker)**
1. In `chrome://extensions/`
2. Find "Gradescope AI Grader"
3. Click **"service worker"** link (blue text)
4. This opens a separate console for the background script
5. Keep this visible too

### Step 3: Run Grading on ONE Student
1. Go to Gradescope grading page
2. Click "AI Grade All"
3. Let it grade just the current student
4. Watch BOTH console windows

---

## What to Look For

### In Content Script Console (Main Page):

Look for these sections in order:

#### 1️⃣ Image Extraction
```
═══════════════════════════════════════════════════════
📊 IMAGE EXTRACTION SUMMARY:
  - Student: [name]
  - No submission flag: false
  - Total images found: X
  - Image sizes (first 3): [...]
═══════════════════════════════════════════════════════
```

**KEY QUESTION: How many images found?**
- **If 0**: Image extraction is failing (root cause #1)
- **If >0**: Images are being extracted (good!)

#### 2️⃣ Sending to AI
```
═══════════════════════════════════════════════════════
📤 SENDING TO AI FOR GRADING:
  - Student: [name]
  - Images in submission: X
  - Question: [question]
  - Rubric items available: 4
═══════════════════════════════════════════════════════
```

**KEY QUESTION: Does "Images in submission" match "Total images found"?**

#### 3️⃣ AI Result
```
═══════════════════════════════════════════════════════
📥 AI GRADING RESULT:
  - Selected indexes: [3]
  - Selected items: [3] No submission/selection
  - AI reasoning: [why it chose this]
═══════════════════════════════════════════════════════
```

**KEY QUESTION: What is the AI's reasoning?**

---

### In Background Script Console (Service Worker):

Look for these sections:

#### 4️⃣ Request Details
```
📤 REQUEST DETAILS:
  - Model: gpt-4o
  - Question: [question]
  - Rubric items count: 4
  - Rubric items: [0] Correct (0.0), [1] wrong E[X] (-0.5), ...
  - Answer key images: 0
  - Submission images: X  ← CRITICAL!
  - Total images in request: X
  - Full prompt being sent: [long prompt]
```

**KEY QUESTION: Does "Submission images" show the correct number?**
- **If 0**: Images didn't make it to the API (root cause #2)
- **If >0**: Images ARE being sent to OpenAI

#### 5️⃣ OpenAI Response
```
📥 OPENAI RESPONSE:
  - Raw response: {"rubricItemIndexes":[3],"reasoning":"..."}
  - Token usage: {...}
```

**KEY QUESTION: What does the reasoning say?**

#### 6️⃣ AI Decision
```
🎯 AI DECISION:
  - Selected rubric indexes: [3]
  - Selected rubric items: [3] No submission/selection (-1.0)
  - AI reasoning: [explanation]
```

**Read the reasoning carefully!** This tells you WHY the AI chose "No submission"

---

## Common Scenarios & Solutions

### Scenario A: 0 Images Extracted
**Console shows:** "Total images found: 0"

**Root Cause:** Image extraction is failing (CORS, wrong selectors, or Gradescope changed their HTML)

**Solution:** We need to fix the image extraction code in `content.js`

**Next Steps:**
1. Copy the error messages from console
2. Tell me the exact messages you see
3. We'll add a fallback extraction method

---

### Scenario B: Images Extracted BUT AI Can't See Them
**Content console shows:** "Total images found: 3"
**Background console shows:** "Submission images: 0"

**Root Cause:** Images aren't being passed from content script to background script

**Solution:** Fix the message passing between scripts

---

### Scenario C: AI Receives Images BUT Chooses "No Submission"
**Background console shows:** "Submission images: 3"
**AI reasoning says:** "No work visible" or similar

**Root Cause:** Either:
1. Images are corrupted/blank
2. AI prompt isn't clear enough
3. AI is genuinely confused

**Solution:**
1. Check if image data looks valid (should be long base64 strings)
2. We may need to add a hard rule: "If images > 0, NEVER select 'No submission'"

---

### Scenario D: AI Reasoning Mentions Wrong Rubric Index
**AI reasoning says:** "Student's work is incorrect, selecting rubric item 3"
**But rubric item 3 is actually "No submission"**

**Root Cause:** Rubric items are indexed differently than AI expects

**Solution:** Check the rubric item list in console - maybe they're in wrong order

---

## Quick Test

To quickly test if images are being extracted, look for this in Content Script console:

```javascript
// Search for this line:
Selector "img[src*="submission"]": found X elements
Selector "img[src*="page"]": found X elements
...
```

If ALL selectors show "found 0 elements", then Gradescope's HTML structure has changed.

---

## Report Back

After running the test, tell me:

1. **Images extracted?**
   - "Total images found: ___"

2. **Images sent to API?**
   - "Submission images: ___" (from background console)

3. **AI's reasoning:**
   - Copy the full reasoning text

4. **Rubric items list:**
   - Copy the "Rubric items: [0] ..., [1] ..., [2] ..., [3] ..." line

5. **Any errors?**
   - Red error messages in either console

With this info, I can pinpoint the exact issue!

---

## Emergency Fix: Force Grading

If you need a quick workaround while we debug, you can temporarily disable "No submission" auto-selection:

1. Open `chrome-extension/background.js`
2. Find line ~38: `if (submissionData.noSubmission === true) {`
3. Comment it out:
   ```javascript
   // TEMPORARILY DISABLED FOR TESTING
   /*
   if (submissionData.noSubmission === true) {
     ...
   }
   */
   ```
4. Reload extension

This forces the AI to always grade, even if no images are found. Not a permanent solution but helps for testing.
