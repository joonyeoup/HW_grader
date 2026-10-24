# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HW_grader is an automated homework grading system that uses OpenAI's GPT-4 Vision API to grade handwritten or PDF homework submissions. The system compares student work against answer keys and rubrics, providing detailed feedback and scoring.

## Core Architecture

### Main Components

1. **EnhancedMathGrader** (`enhanced_math_grader.py`)
   - Core grading engine with parallel processing capabilities
   - Handles PDF-to-image conversion, API communication, and result aggregation
   - Supports both text-based and image-based rubrics
   - Uses ThreadPoolExecutor for concurrent grading operations

2. **Test Script** (`test_grader.py`)
   - Command-line interface for running grading sessions
   - Validates inputs and manages grading workflow
   - Currently configured for hw5 but outputs to hw6_results (inconsistency to be aware of)

3. **Gradescope Integration** (`gradescope_integration.py`)
   - Automates the full Gradescope workflow: export → grade → import
   - Extracts submissions from Gradescope download ZIP
   - Converts results to Gradescope-compatible CSV format
   - Handles student name/email mapping for proper upload

4. **Chrome Extension** (`chrome-extension/`)
   - Browser extension that integrates directly into Gradescope's UI
   - Adds "AI Grade All" button to the grading interface
   - Automates question-by-question grading workflow
   - Eliminates need to download/upload - grades in real-time on Gradescope
   - See `chrome-extension/README.md` for installation and usage

### File Structure

```
assignments/
  hw{N}/
    hw{N}_rubric.txt          # Text rubric with point allocations
    hw{N}_solution.pdf        # Answer key as PDF
    submissions/              # Student submissions (PDFs)
      student1.pdf
      student2.pdf

results/
  hw{N}_results/
    progress.json             # Serialized grading progress (for resumption)
    grading_report.txt        # Full textual feedback per student
    grades_summary.csv        # Spreadsheet with extracted scores
```

### Key Design Patterns

- **Input Processing Pipeline**: `_process_input()` handles .txt, .pdf, and image files uniformly
- **Resume Support**: Grading can be interrupted and resumed using `progress.json`
- **Parallel Grading**: Configurable worker pool (default 5 workers, test script uses 3)
- **Temporary File Management**: PDF pages converted to PNG and cleaned up after processing

## Development Commands

### Setup
```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running Tests
```bash
# Grade homework (interactive)
python test_grader.py

# Or with Python 3
python3 test_grader.py
```

### Gradescope Integration
```bash
# Full Gradescope workflow (export → grade → import)
python gradescope_integration.py

# This will:
# 1. Process downloaded Gradescope submissions ZIP
# 2. Grade all submissions with AI
# 3. Generate Gradescope-compatible CSV for upload
```

### Configuration
- API key stored in `.env` file as `OPENAI_API_KEY`
- Never commit the `.env` file (contains secrets)

## Grading Workflow

1. PDF submissions are converted to PNG images at 200 DPI
2. Rubric, answer key, and student work are encoded as base64
3. GPT-4 Vision receives:
   - System prompt requesting structured output starting with "Overall Score: XX/100"
   - Rubric (text or images)
   - Answer key images
   - Student submission images
4. Response is parsed for overall score and detailed feedback
5. Results saved to three formats: JSON (progress), TXT (detailed report), CSV (summary)

## Important Implementation Details

### PDF Processing
- Uses `pdf2image.convert_from_path()` with 200 DPI
- Images converted to RGB/L mode for compatibility
- Temporary PNG files created with pattern: `temp_{filename}_page_{N}.png`
- Cleanup handled by `_cleanup_temp_files()` after each submission

### Rubric Format
- Text rubrics (`.txt`) are passed directly to GPT-4 as text
- PDF rubrics are converted to images like answer keys
- Rubric structure: point allocations per question/sub-question

### Score Extraction
- Regex pattern: `r'Overall Score[:\s]+(\d+)/(\d+)'`
- First line of GPT-4 response should contain overall score
- CSV export relies on this pattern

### Error Handling
- Failed submissions marked in results with `success: false`
- Progress saved after each completion (safe for interruption)
- Temporary files cleaned up even on error

## Common Modifications

### Adding New Homework
1. Create `assignments/hw{N}/` directory
2. Add `hw{N}_rubric.txt`, `hw{N}_solution.pdf`, and `submissions/` folder
3. Update paths in `test_grader.py` (lines 24-27, 81)

### Adjusting Parallelism
- Change `max_workers` parameter in `EnhancedMathGrader()` initialization
- Higher values increase API throughput but may hit rate limits

### Custom Grading Prompts
- Modify system message in `_build_grading_prompt()` (lines 292-301)
- Adjust GPT-4 parameters: `temperature`, `max_tokens` (lines 92-96)

## Gradescope Integration Workflow

The `gradescope_integration.py` script provides a complete integration with Gradescope:

### Step 1: Export from Gradescope
1. Go to your assignment on Gradescope
2. Click "Review Grades" → "Download Submissions"
3. Save the ZIP file (typically named `{assignment_name}_submissions.zip`)
4. Place it in the project root directory

### Step 2: Prepare Assignment Files
- Place rubric in `assignments/hw{N}/hw{N}_rubric.txt`
- Place answer key in `assignments/hw{N}/hw{N}_solution.pdf`

### Step 3: Run Integration Script
```bash
python gradescope_integration.py
```
The script will:
- Extract the Gradescope ZIP to temporary directory
- Parse student metadata (names, emails, SIDs)
- Grade all submissions in parallel
- Generate `gradescope_upload.csv` with scores and feedback

### Step 4: Upload to Gradescope
1. Go to assignment → "Review Grades"
2. Click "Upload Grades" in the bottom right
3. Select the generated `gradescope_upload.csv`
4. Map columns: Score → "Total Score", Feedback → comments
5. Confirm and upload

### Gradescope CSV Format
The integration generates a CSV with these columns:
- Student identifiers (Name, Email, SID)
- Score (numeric value)
- Feedback (full grading report text)
- Max Points (total possible points)

### Important Notes
- Gradescope downloads include `submission_metadata.json` per student
- The script preserves student anonymity if Gradescope is in anonymous mode
- Failed gradings are marked with score 0 and error message in feedback
- The output CSV can be reviewed/edited before uploading to Gradescope

## Chrome Extension - In-Browser Grading

The `chrome-extension/` directory contains a Chrome/Edge extension that provides seamless integration with Gradescope's interface.

### Key Differences from Python Scripts

| Feature | Python Scripts | Chrome Extension |
|---------|---------------|------------------|
| **Workflow** | Download → Grade → Upload | Grade directly in Gradescope |
| **Interface** | Command line | Button in browser |
| **Setup** | Python, venv, dependencies | Load unpacked extension |
| **Grading Flow** | Batch all questions at once | Question-by-question (Gradescope's flow) |
| **Best For** | Offline grading, bulk processing | Real-time grading, instant feedback |

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" and select the `chrome-extension/` folder
4. Click the extension icon and configure your OpenAI API key

### Usage

1. Navigate to Gradescope grading interface
2. Select a question from the dropdown (e.g., "Q1: Statement")
3. Click the purple "🤖 AI Grade All" button that appears
4. Extension will:
   - Grade all students on the current question
   - Automatically click rubric buttons
   - Move to next student
   - Show progress: "Grading 45/101 students (44%)"

### Architecture

The extension consists of:
- **content.js**: Injected into Gradescope pages, handles UI and automation
- **background.js**: Service worker that calls OpenAI API
- **popup.html/js**: Configuration interface (API key, rubric, answer key)
- **styles.css**: Styling for injected UI elements

### Keyboard Shortcuts
- `Ctrl+Shift+G`: Start/resume grading
- `Ctrl+Shift+P`: Pause grading

### How It Works

1. Content script detects Gradescope grading page
2. Injects "AI Grade All" button into rubric panel
3. On click:
   - Extracts current question and rubric items
   - For each student:
     - Fetches student's PDF submission
     - Sends to OpenAI via background worker
     - Receives rubric item index to select
     - Clicks the appropriate rubric button
     - Clicks "Next" button
   - Shows real-time progress

### Differences from Gradescope Integration Script

The Chrome extension follows Gradescope's native question-by-question workflow:
- Grade all 101 students on Q1 → Move to Q2 → Grade all 101 students on Q2 → etc.

The Python script (`gradescope_integration.py`) grades all questions for all students at once:
- Download all submissions → Grade everything → Upload results

Choose based on your preference:
- **Extension**: Real-time, gradual progress, can review as you go
- **Script**: Batch processing, run overnight, all questions at once

## Known Issues

- Test script configured for hw5 but outputs to "hw6_results" (line 81 in test_grader.py)
- Temporary PNG files left in root directory if cleanup fails
- Gradescope integration assumes submissions are PDFs (common format)
- Chrome extension requires manual installation (not published to Chrome Web Store)
