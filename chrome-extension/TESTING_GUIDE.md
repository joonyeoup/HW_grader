# Chrome Extension Testing Guide

## Step 1: Install the Extension

1. **Open Chrome Extensions Page**
   ```
   Type in address bar: chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Look for "Developer mode" toggle in the top-right corner
   - Turn it ON (it will turn blue)

3. **Load the Extension**
   - Click "Load unpacked" button (top-left)
   - Navigate to your project folder
   - Select the `chrome-extension` folder
   - Click "Select Folder" (or "Open" on Mac)

4. **Verify Installation**
   - You should see "Gradescope AI Grader" appear in your extensions list
   - Status should show: "Errors: 0"
   - If you see errors, check the console

## Step 2: Configure the Extension

1. **Click the Extension Icon**
   - Look for the puzzle piece icon in Chrome toolbar (top-right)
   - Click it, then click "Gradescope AI Grader"
   - Or click directly on the extension icon if pinned

2. **Enter Your API Key**
   - Paste your OpenAI API key (starts with `sk-proj-` or `sk-`)
   - The indicator should turn green
   - Click "Save Configuration"

3. **Verify Configuration**
   - You should see "Configuration saved successfully!"
   - The status indicator should show "Configured"

## Step 3: Test on Gradescope

### Option A: Test on Real Gradescope (Recommended)

1. **Navigate to Gradescope**
   - Go to https://www.gradescope.com/
   - Log in to your account
   - Go to any course with an assignment

2. **Enter Grading Interface**
   - Click on an assignment
   - Click "Grade Submissions" (bottom right)
   - Wait for the grading interface to load

3. **Look for the AI Button**
   - You should see a purple box at the top of the right sidebar
   - It should contain: "🤖 AI Grade All" button
   - If you DON'T see it, check Step 4 (Debugging)

4. **Test the Button (Optional - be careful!)**
   - **WARNING**: This will make real API calls and grade real students
   - Start with a test assignment or one with few students
   - Click "🤖 AI Grade All"
   - Watch the progress bar
   - Click "Pause" to stop at any time

### Option B: Test Locally (Debug Mode)

1. **Check Console for Logs**
   - Press F12 to open Developer Tools
   - Go to "Console" tab
   - Navigate to a Gradescope grading page
   - You should see:
     ```
     Gradescope AI Grader: Content script loaded
     On Gradescope grading page - injecting UI
     AI Grader button injected
     ```

2. **Verify Button Injection**
   - Press F12 → "Elements" tab
   - Press Ctrl+F to search in HTML
   - Search for: `ai-grader-container`
   - You should find the injected HTML

## Step 4: Debugging Common Issues

### Issue: Extension Not Loading

**Check:**
```bash
# In your project folder
cd chrome-extension
ls -la

# You should see:
# manifest.json
# content.js
# background.js
# popup.html
# popup.js
# styles.css
```

**Fix:** Make sure all files are in the `chrome-extension/` folder

### Issue: Button Not Appearing

**Possible Causes:**

1. **Not on grading page**
   - URL must include `/submissions/`
   - Must be on the actual grading interface, not submission list

2. **Gradescope UI changed**
   - Open console (F12)
   - Check for errors
   - Look for message: "Could not find rubric panel to inject button"

3. **Extension not running**
   - Go to `chrome://extensions/`
   - Make sure extension is ENABLED (toggle should be blue)
   - Check for errors under the extension

### Issue: "API key not configured"

**Fix:**
1. Click extension icon
2. Re-enter API key
3. Click Save
4. Refresh Gradescope page

### Issue: Console Errors

**Check background script:**
1. Go to `chrome://extensions/`
2. Find "Gradescope AI Grader"
3. Click "service worker" (or "background page")
4. Check for errors in the console

**Check content script:**
1. Open Gradescope grading page
2. Press F12
3. Look for red error messages
4. Copy error and check the line number in content.js

## Step 5: Advanced Testing

### Test API Connection

1. **Open Extension Popup**
   - Click extension icon

2. **Open Popup Console**
   - Right-click on popup
   - Select "Inspect"
   - Go to Console tab

3. **Check Storage**
   ```javascript
   chrome.storage.sync.get(['apiKey'], (data) => {
     console.log('API Key stored:', data.apiKey ? 'Yes' : 'No');
   });
   ```

### Test Content Script Injection

1. **On Gradescope grading page**
2. **Open Console (F12)**
3. **Run this command:**
   ```javascript
   document.getElementById('ai-grader-container')
   ```
4. **Should return:** The HTML element (not null)

### Test Background Script

1. **Go to** `chrome://extensions/`
2. **Click "service worker" link**
3. **Run this in console:**
   ```javascript
   console.log('Background script is running');
   ```

## Step 6: Manual Selector Testing

If the button isn't appearing, you may need to update selectors:

1. **On Gradescope grading page**
2. **Open Console (F12)**
3. **Test rubric panel selector:**
   ```javascript
   // Try each selector to see which works:
   document.querySelector('[class*="sidebar"]')
   document.querySelector('[class*="rubric"]')
   document.querySelector('.row .col-md-4')
   ```
4. **If one works, update content.js line ~36**

## Quick Checklist

- [ ] Extension loaded in `chrome://extensions/`
- [ ] Developer mode enabled
- [ ] Extension shows "Errors: 0"
- [ ] API key configured via popup
- [ ] On Gradescope grading page (`/submissions/` in URL)
- [ ] Console shows "Content script loaded"
- [ ] Console shows "AI Grader button injected"
- [ ] Purple button visible in right sidebar
- [ ] Can click button without errors

## Testing Without Grading

To test without making real API calls:

1. **Comment out API call in background.js:**
   ```javascript
   // Line ~100 in background.js
   // const response = await fetch('https://api.openai.com/v1/chat/completions', {
   //   ...
   // });

   // Return mock data instead:
   return {
     rubricItemIndex: 0,
     reasoning: "Mock response for testing",
     rawResponse: "{}"
   };
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click reload icon under "Gradescope AI Grader"

3. **Test on Gradescope:**
   - Button should work
   - No API calls made
   - Will select first rubric item for all students

## Need Help?

1. **Check console for errors** (F12 → Console)
2. **Check background worker logs** (`chrome://extensions/` → service worker)
3. **Verify URL matches pattern** (must include `/submissions/`)
4. **Try refreshing the page**
5. **Try reloading the extension**

## Success Indicators

✅ Extension icon visible in Chrome toolbar
✅ Configuration popup opens and saves
✅ Console shows "Content script loaded" on Gradescope
✅ Purple "AI Grade All" button appears on grading page
✅ Progress bar appears when button clicked
✅ Status messages update correctly

If all indicators pass, your extension is working! 🎉
