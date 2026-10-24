# Gradescope AI Grader - Chrome Extension

AI-powered homework grading assistant that integrates directly into Gradescope's interface.

## Features

- **One-Click Grading**: Grade all 101 students on a question with a single click
- **Seamless Integration**: Adds "AI Grade All" button directly to Gradescope
- **Progress Tracking**: Real-time progress display showing "Graded 45/101 students"
- **Keyboard Shortcuts**: Fast workflow with Ctrl+Shift+G to start grading
- **Pause/Resume**: Pause grading at any time and resume later
- **GPT-4 Vision**: Uses OpenAI's latest model for accurate grading

## Installation

### From Source (Development)

1. **Download/Clone the extension**
   ```bash
   cd chrome-extension/
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Configure Extension**
   - Click the extension icon in Chrome toolbar
   - Enter your OpenAI API key
   - (Optional) Add rubric text and answer key images
   - Click "Save Configuration"

## Usage

### Setup (One-Time)

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Open the extension popup (click icon in toolbar)
3. Enter your API key
4. Optionally add:
   - Rubric text for additional context
   - Answer key images (PNG/JPG)

### Grading Workflow

1. **Navigate to Gradescope**
   - Go to your assignment's grading interface
   - Select the question you want to grade (e.g., "Q1: Statement")

2. **Start AI Grading**
   - You'll see a purple "🤖 AI Grade All" button at the top of the rubric panel
   - Click the button (or press `Ctrl+Shift+G`)

3. **Watch the Magic**
   - The extension will:
     - Grade each student's submission
     - Automatically click the appropriate rubric button
     - Move to the next student
     - Show progress: "Grading 45/101 students (44%)"

4. **Review Results**
   - After completion, review any flagged submissions
   - Move to next question and repeat

### Question-by-Question Workflow

The extension follows Gradescope's standard workflow:

```
Q1: Statement → Grade all 101 students → Done
Q2: Exercise 1 → Grade all 101 students → Done
Q3: Exercise 2 → Grade all 101 students → Done
...continue for all questions...
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│     Gradescope Grading Interface        │
│  ┌───────────────────────────────────┐  │
│  │  🤖 AI Grade All  [injected]     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       Content Script (content.js)       │
│  - Extracts student PDF                 │
│  - Extracts rubric items                │
│  - Controls UI automation               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Background Worker (background.js)    │
│  - Calls OpenAI API                     │
│  - Processes grading logic              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          OpenAI GPT-4 Vision            │
│  - Analyzes student submission          │
│  - Compares to rubric                   │
│  - Returns rubric item to select        │
└─────────────────────────────────────────┘
```

### Grading Process (Per Student)

1. **Extract**: Get student's PDF and current rubric items
2. **Send**: Send to GPT-4 Vision via API
3. **Analyze**: AI determines which rubric item best fits
4. **Apply**: Extension clicks the appropriate rubric button
5. **Next**: Click "Next" button to move to next student
6. **Repeat**: Continue until all students graded

### AI Prompt Structure

The extension sends GPT-4 Vision:
- Current question name
- Available rubric items with point values
- Student's submission (PDF/images)
- Answer key (if provided)
- Rubric context (if provided)

GPT-4 responds with:
```json
{
  "rubricItemIndex": 0,
  "reasoning": "Student correctly answered..."
}
```

## Keyboard Shortcuts

- **Ctrl+Shift+G** - Start/Resume AI grading
- **Ctrl+Shift+P** - Pause grading

## Troubleshooting

### Extension not appearing on Gradescope
- Make sure you're on the grading interface (URL should include `/submissions/`)
- Refresh the page
- Check that the extension is enabled in `chrome://extensions/`

### "API key not configured" error
- Open extension popup
- Enter your OpenAI API key
- Click "Save Configuration"

### Grading stops unexpectedly
- Check your browser console for errors (F12 → Console tab)
- Verify your API key is valid
- Check OpenAI API usage limits

### Wrong rubric items being selected
- Add more context in the rubric text field
- Upload answer key images
- Review GPT-4's reasoning in console logs

### PDF not loading
- Ensure the PDF viewer on Gradescope has loaded
- Wait a few seconds before starting grading
- Check network tab for PDF fetch errors

## Development

### File Structure
```
chrome-extension/
├── manifest.json       # Extension configuration
├── content.js          # Main logic, UI injection
├── background.js       # API calls, service worker
├── popup.html          # Configuration UI
├── popup.js            # Popup logic
├── styles.css          # Injected UI styles
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Testing Locally

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click "Reload" button under the extension
4. Refresh Gradescope page
5. Test the changes

### Debug Mode

Open browser console (F12) to see detailed logs:
- Extension initialization
- Rubric items detected
- API requests/responses
- Grading progress

## Privacy & Security

- **API Key**: Stored locally in Chrome's sync storage, never shared
- **Student Data**: Submissions sent only to OpenAI API
- **No Tracking**: Extension does not collect or transmit usage data
- **Open Source**: All code is available for review

## Cost Estimation

Using GPT-4 Vision (gpt-4o model):
- ~$0.01 per student submission
- 101 students × 7 questions = 707 gradings
- Estimated cost: ~$7.07 per assignment

## Limitations

- Requires OpenAI API key (paid service)
- Works only on Gradescope grading interface
- Requires manual review of AI decisions
- Does not handle multi-page submissions optimally yet

## Future Enhancements

- [ ] Support for custom grading rubrics
- [ ] Batch export of grading decisions
- [ ] Support for partial credit with adjustments
- [ ] Integration with Gradescope's rubric builder
- [ ] Confidence scores for AI decisions
- [ ] Support for handwriting recognition improvements

## Support

For issues or questions:
1. Check the main repository README
2. Review browser console for error messages
3. Verify API key and configuration
4. Test with a small batch first

## License

Same as parent project (see main repository)
