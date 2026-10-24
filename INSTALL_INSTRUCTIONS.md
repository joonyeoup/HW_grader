# 🚀 Installation Instructions - Gradescope AI Grader

Automate homework grading on Gradescope using GPT-4 Vision

## Prerequisites

- ✅ Google Chrome browser
- ✅ OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- ✅ ~$2-5 per assignment (for 101 students)

---

## Step 1: Unzip the File

Extract `gradescope-ai-grader.zip` to a folder on your computer.

---

## Step 2: Load Extension in Chrome

1. Open Chrome and type in the address bar: `chrome://extensions/`
2. Toggle **ON** "Developer mode" (top-right corner)
3. Click **"Load unpacked"** (top-left button)
4. Navigate to and select the `chrome-extension` folder
5. The extension should now appear as "Gradescope AI Grader"

---

## Step 3: Configure Your API Key

1. Click the **extension icon** (puzzle piece in Chrome toolbar)
2. Click **"Gradescope AI Grader"**
3. Paste your **OpenAI API key** in the text box
4. **(Optional)** Upload answer key images
5. **(Optional)** Add rubric context text
6. Click **"Save Configuration"**
7. You should see: ✅ "Configuration saved successfully!"

---

## Step 4: Start Grading!

1. Go to **Gradescope.com**
2. Open any assignment → Click **"Grade Submissions"**
3. Look for the **purple button** at the top of the right sidebar:
   ```
   🤖 AI Grade All
   ```
4. Click it and watch it grade all students automatically!

---

## 💰 Cost Estimate

- **Free trial**: $5 credit from OpenAI (enough for ~200 students)
- **After trial**: ~$0.02-0.05 per student
- **101 students**: ~$2-5 total

Monitor usage at: https://platform.openai.com/usage

---

## 🔑 Getting an OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Paste it in the extension popup

**Important**: Keep your API key private! Don't share it with anyone.

---

## ⌨️ Keyboard Shortcuts

- **Ctrl+Shift+G** - Start grading
- **Ctrl+Shift+P** - Pause grading

---

## 🔧 Troubleshooting

### "I don't see the AI Grade All button"
- ✅ Make sure you're on the grading page (URL contains `/submissions/`)
- ✅ Refresh the page (F5)
- ✅ Check console for errors (F12 → Console tab)

### "Wrong rubric items are being selected"
- ✅ Add answer key images in the extension popup
- ✅ Add rubric context/instructions in the extension popup
- ✅ Check console (F12) to see AI's reasoning

### "API key not working"
- ✅ Make sure key starts with `sk-`
- ✅ Check you have credits: https://platform.openai.com/usage
- ✅ Verify key has GPT-4o access

### "Extension not loading"
- ✅ Make sure "Developer mode" is ON in `chrome://extensions/`
- ✅ Try clicking the reload icon on the extension card
- ✅ Make sure all files are in the `chrome-extension` folder

---

## 🎯 How It Works

1. **Extracts** student submission images from Gradescope
2. **Sends** to GPT-4o Vision API with your rubric
3. **Receives** grading decision with reasoning
4. **Selects** the appropriate rubric item using keyboard shortcuts
5. **Moves** to next student automatically

---

## 🔒 Privacy & Security

- ✅ API key stored **locally** in Chrome (not in code files)
- ✅ No telemetry or tracking
- ✅ Data only sent to OpenAI API
- ✅ All processing happens client-side

---

## 📊 Monitoring Progress

While grading, open the Console (F12) to see:
- Student count: "Grading student 45/101..."
- AI reasoning: Why it selected each rubric item
- Errors: If anything goes wrong

---

## 🆘 Need Help?

If you run into issues:
1. Check the console (F12) for error messages
2. Read the detailed docs in `chrome-extension/README.md`
3. Contact the person who shared this with you

---

## ⚠️ Important Reminders

1. **Review grades** before finalizing - AI can make mistakes!
2. **Test with 1-2 students** first before running on all 101
3. **Monitor costs** at https://platform.openai.com/usage
4. **Don't share** your API key with anyone

---

## 🎉 Ready to Go!

You're all set! The extension will save you hours of grading time.

**Pro tip**: Add good answer key images and rubric context in the extension popup for more accurate grading.

Happy grading! 🚀
