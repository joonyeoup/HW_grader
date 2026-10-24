# HW Grader — AI-Powered Homework Grading

A practical overview for potential customers and collaborators.

---

## 1. What It Does

HW Grader automates the grading of handwritten and PDF homework using GPT-4 Vision. An instructor provides three things — a **rubric**, an **answer key**, and a folder of **student submissions** — and the system returns:

- A numeric score per student (e.g., `87/100`)
- A question-by-question breakdown with partial credit
- Specific, constructive feedback citing where the student went wrong
- A CSV summary ready for upload to Gradescope or a spreadsheet

It is designed for **math, science, and technical courses** where students show their work, not just final answers.

---

## 2. Who It's For

| Audience | Value |
|---|---|
| Professors & TAs | Grade 100+ submissions in minutes instead of hours |
| Course staff on Gradescope | Drop-in integration — download, grade, upload |
| Online course providers | Scale feedback without scaling headcount |
| Tutoring platforms | Give students instant, detailed feedback on practice work |

---

## 3. Three Ways to Use It

The project ships **three interchangeable interfaces** on top of the same grading engine. Customers can pick whichever fits their workflow.

### A. Command-Line Tool (Python)
For power users who want to batch-grade on their own machine.
- Run `python test_grader.py` or `python gradescope_integration.py`
- Processes a local folder of PDFs
- Produces a grading report, a CSV of scores, and resumable progress files

### B. Chrome Extension
For instructors who already grade inside Gradescope's web interface.
- Installs into Chrome/Edge
- Adds an **"AI Grade All"** button directly in the Gradescope rubric panel
- Grades students one question at a time, clicking the right rubric items automatically
- No downloading, no uploading — grading happens live in the browser

### C. Hosted Server (Node.js / Flask)
For deploying as a managed service so end users don't need their own OpenAI key.
- REST API with authentication, rate limiting, and usage tracking
- Chrome extension (server-side variant) talks to this backend
- Enables a SaaS business model: customers subscribe, the server meters usage

All three paths share the same grading logic, so **output quality is identical** regardless of entry point.

---

## 4. How the Grading Engine Works

The core is `EnhancedMathGrader` in `enhanced_math_grader.py`. One grading call does the following:

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Rubric        │    │  Answer Key    │    │  Student PDF   │
│  (.txt / .pdf) │    │  (.pdf)        │    │  (.pdf)        │
└───────┬────────┘    └───────┬────────┘    └───────┬────────┘
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────────────────────────────────────────────────┐
   │   PDF → PNG conversion at 200 DPI (pdf2image)       │
   │   Images encoded to base64                          │
   └─────────────────────────────┬───────────────────────┘
                                 ▼
   ┌─────────────────────────────────────────────────────┐
   │   GPT-4 Vision (gpt-4o)                             │
   │   System prompt: "You are an expert math grader..." │
   │   User content: rubric + answer key + student work  │
   └─────────────────────────────┬───────────────────────┘
                                 ▼
   ┌─────────────────────────────────────────────────────┐
   │   Response parsed with regex:                       │
   │   "Overall Score: XX/100" + per-question feedback   │
   └─────────────────────────────┬───────────────────────┘
                                 ▼
         ┌──────────────┬────────┴────────┬──────────────┐
         ▼              ▼                 ▼              ▼
     progress.json  report.txt      grades.csv     Gradescope CSV
     (resumable)    (full text)     (summary)      (uploadable)
```

### Key engineering details
- **Parallel grading.** A `ThreadPoolExecutor` grades multiple submissions concurrently (default 5 workers). 100 students can be graded in the time it takes to grade ~20 sequentially.
- **Resumable.** Progress is saved to `progress.json` after every submission. If the process dies mid-batch, it picks up where it left off — no duplicate API calls, no lost work.
- **Flexible inputs.** The rubric can be a plain text file (cheaper, fast) or a PDF (preserves diagrams). Submissions and answer keys can be PDFs or images.
- **Deterministic output format.** The system prompt forces GPT-4 to start every response with `Overall Score: XX/100`, making score extraction a simple regex — no fragile parsing.
- **Temporary file hygiene.** PNGs created during PDF conversion are cleaned up after each submission, even on error.

---

## 5. File & Directory Layout

```
HW_grader/
├── enhanced_math_grader.py       ← Core grading engine
├── test_grader.py                ← Simple CLI for local batch grading
├── gradescope_integration.py     ← Gradescope ZIP → CSV pipeline
├── requirements.txt              ← Python dependencies
│
├── assignments/
│   └── hw5/
│       ├── hw5_rubric.txt        ← Point allocations per question
│       ├── hw5_solution.pdf      ← Answer key
│       └── submissions/          ← Student PDFs
│
├── results/
│   └── hw5_results/
│       ├── progress.json         ← Resumable state
│       ├── grading_report.txt    ← Full feedback per student
│       └── grades_summary.csv    ← Spreadsheet of scores
│
├── chrome-extension/             ← Browser-based grading
│   ├── manifest.json             ← Chrome MV3 config
│   ├── content.js                ← Injects UI into Gradescope
│   ├── background.js             ← Calls OpenAI API
│   ├── popup.html / popup.js     ← Settings panel (API key, rubric)
│   └── styles.css
│
├── server/                       ← Node/Express backend (SaaS option)
│   ├── server.js
│   ├── routes/   (auth, grading)
│   └── middleware/   (auth, usage)
│
└── server-flask/                 ← Python/Flask backend (equivalent)
```

---

## 6. End-to-End Workflows

### Workflow A — Local CLI (Python)
```bash
# 1. Drop rubric + answer key + submissions into assignments/hw5/
# 2. Run:
source venv/bin/activate
python test_grader.py
# 3. Open results/hw5_results/grades_summary.csv
```
Best for: solo instructors, one-off grading, no Gradescope.

### Workflow B — Gradescope Round-Trip
```
Gradescope                CLI Tool                   Gradescope
──────────                ────────                   ──────────
Download Submissions  →   python                 →   Upload Grades
    (ZIP)                 gradescope_integration.py      (CSV)
```
Best for: grading existing Gradescope assignments in bulk.

### Workflow C — Chrome Extension (Live in Gradescope)
1. Install extension and paste OpenAI API key.
2. Open any Gradescope grading page.
3. Click the purple **🤖 AI Grade All** button.
4. Extension grades all students on the current question, clicks the rubric items, advances to the next student.
5. Repeat per question.

Best for: real-time grading, reviewing as you go, no file juggling.

### Workflow D — Hosted SaaS
1. Deploy `server/` (Node) or `server-flask/` (Python) to any cloud.
2. Distribute the server-side Chrome extension (`chrome-extension-serverside/`).
3. Customers sign up, authenticate, and grade — the server handles OpenAI billing and meters usage.

Best for: turning this into a paid product.

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| AI model | OpenAI GPT-4 Vision (`gpt-4o`) |
| PDF handling | `pdf2image` + Poppler, Pillow |
| Concurrency | Python `ThreadPoolExecutor` |
| Browser extension | Chrome Manifest V3, vanilla JS |
| Backend (option 1) | Node.js + Express |
| Backend (option 2) | Python + Flask |
| Storage | Local filesystem (JSON + CSV); server variants are stateless by default |

No database is required for the core workflow — progress and results are plain files, easy to inspect and version.

---

## 8. What Makes It Work Well

- **Vision-based grading.** The model reads the student's handwritten work directly; no OCR preprocessing step that could introduce errors.
- **Rubric-grounded.** Every score is justified against a rubric you provide, so grading stays consistent across students and matches your course's expectations.
- **Partial credit.** The prompt explicitly asks for partial credit on correct methodology, not just correct final answers — important for math and proof-based courses.
- **Two-way Gradescope compatibility.** Both the batch script and the extension match Gradescope's data formats (ZIP export, CSV import, rubric panel interactions), so no custom integration work is needed.
- **Resilient.** Failed submissions are marked but don't stop the batch. Progress survives crashes. Temp files clean themselves up.

---

## 9. Current Limits & Honest Caveats

- **OpenAI API cost.** Each submission is one GPT-4 Vision call; at scale, costs add up. The hosted-server option exists partly to pool and manage this.
- **Handwriting quality matters.** Very messy or scanned-at-low-DPI submissions reduce accuracy. 200 DPI is the default; higher is better but slower.
- **Not a replacement for human review on borderline cases.** The system is consistent and fair, but instructors should spot-check outliers — especially zero scores or perfect scores.
- **Chrome extension is not yet published to the Chrome Web Store.** Installation is currently "Load unpacked" in developer mode. Store publishing is planned.
- **Single-assignment scope.** Each run grades one homework assignment with one rubric. Cross-assignment analytics are out of scope today.

---

## 10. What a Collaboration Could Look Like

Depending on your interest, the natural starting points are:

- **Pilot as a user.** Bring one real assignment (rubric + answer key + ~20 submissions), run it through the CLI or extension, and compare results with your own grading. This typically takes an afternoon.
- **Integrate with your LMS.** The grading engine is decoupled from Gradescope — swapping in Canvas, Blackboard, or a custom LMS is a matter of writing one adapter in the shape of `gradescope_integration.py`.
- **White-label the SaaS.** The `server/` backend plus the server-side extension is ~80% of a product; the remaining work is billing, onboarding, and branding.
- **Extend the subject coverage.** The prompts are tuned for math. CS code grading, essay grading, and lab report grading are all achievable with prompt changes and, in some cases, additional input parsing.

Happy to walk through any of these in more depth — or just run a grading session live against a sample assignment you provide.
