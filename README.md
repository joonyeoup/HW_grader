# HW Grader

An automated homework grading system that uses OpenAI's GPT-4 Vision API to grade handwritten or PDF homework submissions. It compares student work against an answer key and rubric, then produces a score and detailed, question-by-question feedback — without a human having to read every page by hand.

Built with Gradescope-based courses in mind, it ships three ways to use it depending on your workflow: a Python CLI/library for batch grading, a full Gradescope import/export pipeline, and a Chrome extension that grades directly inside Gradescope's own UI.

## Why

Grading math/STEM homework from scanned handwriting is slow and repetitive: the grader has to apply the same rubric dozens or hundreds of times. HW Grader automates that loop — feed it a rubric, an answer key, and student submissions, and it returns consistent, rubric-grounded scores and feedback you can review before publishing grades.

## How it works

1. PDF submissions are converted to images (200 DPI) page by page.
2. The rubric, answer key, and student submission are sent to GPT-4 Vision together.
3. The model returns a structured response: an overall score (`Overall Score: XX/100`) followed by per-question feedback explaining what was awarded and why.
4. Results are written out as JSON (for resuming interrupted runs), a human-readable text report, and a CSV summary.

Grading runs in parallel (configurable worker pool) so large batches of submissions don't have to be graded one at a time, and progress is checkpointed so an interrupted run can pick back up where it left off.

## Ways to use it

### 1. Python grading engine
The core (`enhanced_math_grader.py`) can be driven directly or via `test_grader.py` for one-off batch grading runs against a folder of submissions.

### 2. Gradescope integration (`gradescope_integration.py`)
Automates the full round trip with Gradescope:
- Export a submissions ZIP from Gradescope
- Grade everything locally against your rubric/answer key
- Generate a Gradescope-compatible CSV
- Upload it back through Gradescope's grade importer

Best for offline, bulk grading — download everything, grade overnight, upload once.

### 3. Chrome extension (`chrome-extension/`)
Adds an "🤖 AI Grade All" button directly into Gradescope's grading interface, following Gradescope's native per-question workflow: grade every student on Q1, move to Q2, and so on — clicking rubric items and advancing automatically, with real-time progress. No download/upload step required.

See `chrome-extension/README.md` for installation and usage details.

## Project structure

```
assignments/
  hw{N}/
    hw{N}_rubric.txt          # Text rubric with point allocations
    hw{N}_solution.pdf        # Answer key as PDF
    submissions/              # Student submissions (PDFs)

results/
  hw{N}_results/
    progress.json             # Serialized grading progress (for resumption)
    grading_report.txt        # Full textual feedback per student
    grades_summary.csv        # Spreadsheet with extracted scores

enhanced_math_grader.py       # Core grading engine
gradescope_integration.py     # Gradescope export/grade/import pipeline
test_grader.py                # CLI entry point for batch grading
chrome-extension/             # In-browser Gradescope grading extension
server/ , server-flask/       # Optional backend services for hosted/shared use
```

## Setup

```bash
# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your OpenAI API key
echo "OPENAI_API_KEY=sk-..." > .env
```

Run a grading session:

```bash
python test_grader.py
```

Or run the full Gradescope workflow:

```bash
python gradescope_integration.py
```

## Notes

- `.env` holds your `OPENAI_API_KEY` and is git-ignored — never commit it.
- Grading is non-deterministic by nature of using an LLM; always spot-check results before publishing grades to students.
- Student submissions and grading output (`assignments/`, `results/`) are git-ignored by default to avoid committing student data.
