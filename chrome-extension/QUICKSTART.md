# 🚀 Quick Start - 5 Minutes to Testing

## 1. Create Icons (30 seconds)

```bash
# Open the icon generator
open chrome-extension/icons/create_icons.html
# Or double-click the file in Finder

# Click each button:
# - "icon16.png"
# - "icon48.png"
# - "icon128.png"

# Move downloaded files to chrome-extension/icons/ folder
```

## 2. Load Extension (1 minute)

1. Open Chrome → Type `chrome://extensions/` in address bar
2. Turn ON "Developer mode" (top-right toggle)
3. Click "Load unpacked" (top-left button)
4. Select the `chrome-extension` folder
5. ✅ Extension should appear with no errors

## 3. Configure (1 minute)

1. Click the extension icon (puzzle piece → Gradescope AI Grader)
2. Paste your OpenAI API key
3. Click "Save Configuration"
4. ✅ Should say "Configuration saved successfully!"

## 4. Test on Gradescope (2 minutes)

1. Go to https://www.gradescope.com/
2. Open any assignment → Click "Grade Submissions"
3. **Look for the purple button** at top of right sidebar:

   ```
   ┌────────────────────────┐
   │  🤖 AI Grade All      │
   └────────────────────────┘
   ```

4. ✅ If you see it, **you're done!**

## 5. Debug (if needed)

**Don't see the button?**

Press F12 → Console tab → Look for:
```
Gradescope AI Grader: Content script loaded
On Gradescope grading page - injecting UI
AI Grader button injected
```

**Still not working?**
- Check you're on `/submissions/` URL (actual grading page, not list)
- Refresh the page
- Go to `chrome://extensions/` and click reload icon
- Check extension is ENABLED (toggle is blue)

## Testing Without Real API Calls

To test the UI without grading:

1. Open `chrome-extension/background.js`
2. Find line ~100 (the `fetch` call to OpenAI)
3. Comment it out and add mock response:
   ```javascript
   // const response = await fetch('https://api.openai.com/v1/chat/completions', {
   //   ... commented out
   // });

   // Mock response for testing
   return {
     rubricItemIndex: 0,
     reasoning: "Testing - always selects first rubric item"
   };
   ```
4. Reload extension in `chrome://extensions/`
5. Now clicking "AI Grade All" won't make API calls

## Keyboard Shortcuts

- `Ctrl+Shift+G` - Start grading
- `Ctrl+Shift+P` - Pause grading

## Next Steps

✅ Extension is working!

Now you can:
- Grade a test assignment first
- Review the chrome-extension/README.md for full details
- Check chrome-extension/TESTING_GUIDE.md for advanced debugging

## Common URLs

- Extensions: `chrome://extensions/`
- Extension Console: Click "service worker" link in extensions page
- Page Console: F12 on Gradescope page
