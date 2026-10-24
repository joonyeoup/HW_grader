/**
 * Gradescope AI Grader - Content Script
 * Injects UI and automates grading workflow
 */

console.log('Gradescope AI Grader: Content script loaded');

// State management
let isGrading = false;
let isPaused = false;
let currentProgress = { current: 0, total: 0, question: '' };

// Main initialization
function init() {
  // Check if we're on a grading page
  if (!isGradingPage()) {
    console.log('Not on grading page');
    return;
  }

  console.log('On Gradescope grading page - injecting UI');

  // Wait for page to fully load
  setTimeout(() => {
    injectAIGraderButton();
    setupKeyboardShortcuts();
  }, 1000);
}

// Check if we're on the grading interface
function isGradingPage() {
  const url = window.location.href;
  return url.includes('/submissions/') && url.includes('/grade') &&
         (document.querySelector('.rubricItem--pointsAndDescription') ||
          document.querySelector('[class*="rubricItem"]') ||
          document.querySelector('.rubricField'));
}

// Inject the "AI Grade All" button
function injectAIGraderButton() {
  // Find the right panel - look for the container with rubric items
  const rubricPanel = document.querySelector('.rubricItem--pointsAndDescription')?.parentElement?.parentElement ||
                      document.querySelector('[class*="rubricItem"]')?.parentElement?.parentElement ||
                      document.querySelector('[class*="sidebar"]') ||
                      document.querySelector('.row')?.querySelector('.col-md-4');

  if (!rubricPanel) {
    console.error('Could not find rubric panel to inject button');
    return;
  }

  console.log('Found rubric panel:', rubricPanel.className);

  // Create button container
  const container = document.createElement('div');
  container.id = 'ai-grader-container';
  container.innerHTML = `
    <div class="ai-grader-panel">
      <button id="ai-grade-button" class="ai-grade-btn">
        <span class="icon">🤖</span>
        <span class="text">AI Grade All</span>
      </button>
      <button id="ai-pause-button" class="ai-pause-btn" style="display: none;">
        <span class="icon">⏸️</span>
        <span class="text">Pause</span>
      </button>
      <div id="ai-grader-progress" class="progress-container" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">Ready</div>
      </div>
      <div id="ai-grader-status" class="status-text"></div>
    </div>
  `;

  // Insert at the top of the rubric panel
  rubricPanel.insertBefore(container, rubricPanel.firstChild);

  // Add event listeners
  document.getElementById('ai-grade-button').addEventListener('click', startAIGrading);
  document.getElementById('ai-pause-button').addEventListener('click', pauseAIGrading);

  console.log('AI Grader button injected');
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+G to start grading
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      startAIGrading();
    }
    // Ctrl+Shift+P to pause
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      pauseAIGrading();
    }
  });
}

// Start AI grading workflow
async function startAIGrading() {
  if (isGrading) {
    updateStatus('Already grading...', 'warning');
    return;
  }

  // Check if extension context is valid
  try {
    await chrome.runtime.sendMessage({ action: 'ping' });
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      updateStatus('❌ Extension was reloaded. Please REFRESH this page (F5) and try again.', 'error');
      alert('⚠️ Extension Update Detected\n\nThe extension was reloaded. Please:\n1. Refresh this page (press F5)\n2. Click "AI Grade All" again');
      return;
    }
  }

  // Check if API key is configured
  let syncConfig, localConfig;
  try {
    // API key and rubric from sync storage
    syncConfig = await chrome.storage.sync.get(['apiKey', 'rubricText']);
    // Answer key images from local storage (large data)
    localConfig = await chrome.storage.local.get(['answerKeyImages']);
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      updateStatus('❌ Extension was reloaded. Please REFRESH this page (F5) and try again.', 'error');
      alert('⚠️ Extension Update Detected\n\nThe extension was reloaded. Please:\n1. Refresh this page (press F5)\n2. Click "AI Grade All" again');
      return;
    }
    throw error;
  }

  // Combine configs
  const config = {
    apiKey: syncConfig.apiKey,
    rubricText: syncConfig.rubricText,
    answerKeyImages: localConfig.answerKeyImages
  };

  console.log('🔑 CONFIG LOADED FROM STORAGE:');
  console.log('  - Has API key?', !!config.apiKey);
  console.log('  - Has rubric text?', !!config.rubricText);
  console.log('  - Has answer key images?', !!config.answerKeyImages);
  console.log('  - Answer key count:', config.answerKeyImages?.length || 0);
  console.log('  - Full config object:', config);
  if (config.answerKeyImages && config.answerKeyImages.length > 0) {
    console.log('  - First image preview:', config.answerKeyImages[0].substring(0, 100) + '...');
  }

  if (!config.apiKey) {
    updateStatus('❌ Please configure API key in extension popup', 'error');
    return;
  }

  if (!config.answerKeyImages || config.answerKeyImages.length === 0) {
    console.error('❌❌❌ CRITICAL: NO ANSWER KEY IMAGES FOUND IN STORAGE! ❌❌❌');
    console.error('The AI will grade WITHOUT comparing to a solution - this will cause INCORRECT grading!');
    console.error('');
    console.error('🔧 TO FIX THIS:');
    console.error('  1. Click the extension icon (top-right corner of Chrome)');
    console.error('  2. Scroll to "Answer Key / Solution" section');
    console.error('  3. Click "Choose Files" and select your answer key images');
    console.error('  4. Click the blue "Save Configuration" button');
    console.error('  5. Refresh this page (F5) and try again');
    console.error('');

    updateStatus('❌ CRITICAL: No answer key uploaded - AI will grade INCORRECTLY!', 'error');

    const proceed = confirm(
      '⚠️ ANSWER KEY NOT FOUND!\n\n' +
      'The extension has no answer key uploaded.\n' +
      'The AI will grade without comparing to the correct solution.\n\n' +
      'This will result in INCORRECT grading!\n\n' +
      'Do you want to:\n' +
      '• Click "Cancel" to stop and upload answer key first (RECOMMENDED)\n' +
      '• Click "OK" to continue anyway (NOT RECOMMENDED)'
    );

    if (!proceed) {
      throw new Error('Grading cancelled - please upload answer key first');
    }

    updateStatus('⚠️ Proceeding WITHOUT answer key - expect incorrect grading!', 'warning');
    await sleep(2000);
  } else {
    console.log('✅✅✅ ANSWER KEY LOADED SUCCESSFULLY! ✅✅✅');
    console.log('  - Number of pages:', config.answerKeyImages.length);
    console.log('  - First page size:', config.answerKeyImages[0].length, 'characters');
    updateStatus(`✅ Using answer key (${config.answerKeyImages.length} pages) for comparison`, 'info');
    await sleep(1000);
  }

  isGrading = true;
  isPaused = false;

  // Show progress UI
  document.getElementById('ai-grader-progress').style.display = 'block';
  document.getElementById('ai-grade-button').style.display = 'none';
  document.getElementById('ai-pause-button').style.display = 'inline-block';

  updateStatus('🚀 Starting AI grading...', 'info');

  try {
    await runGradingLoop(config);
  } catch (error) {
    console.error('Grading error:', error);
    updateStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    isGrading = false;
    document.getElementById('ai-grade-button').style.display = 'inline-block';
    document.getElementById('ai-pause-button').style.display = 'none';
  }
}

// Pause grading
function pauseAIGrading() {
  isPaused = true;
  updateStatus('⏸️ Paused - Click "AI Grade All" to resume', 'warning');
  document.getElementById('ai-grade-button').style.display = 'inline-block';
  document.getElementById('ai-pause-button').style.display = 'none';
}

// Main grading loop
async function runGradingLoop(config) {
  // Extract current question
  const question = getCurrentQuestion();
  if (!question) {
    throw new Error('Could not detect current question');
  }

  updateStatus(`📝 Grading question: ${question}`, 'info');

  // Get rubric items for this question
  const rubricItems = extractRubricItems();
  if (rubricItems.length === 0) {
    throw new Error('No rubric items found');
  }

  console.log('Rubric items:', rubricItems);

  // Determine total number of students
  const totalStudents = await getTotalStudents();
  currentProgress = { current: 0, total: totalStudents, question };

  updateProgress(0, totalStudents);

  // Grade each student
  for (let i = 0; i < totalStudents; i++) {
    if (isPaused) {
      updateStatus('⏸️ Paused', 'warning');
      return;
    }

    currentProgress.current = i + 1;
    updateProgress(i + 1, totalStudents);
    updateStatus(`🤖 Grading student ${i + 1}/${totalStudents}...`, 'info');

    try {
      // Extract student submission
      const submissionData = await extractSubmissionData();

      // Re-extract rubric items for current page (in case page reloaded)
      const currentRubricItems = extractRubricItems();
      if (currentRubricItems.length === 0) {
        throw new Error('No rubric items found on current page');
      }
      console.log(`Found ${currentRubricItems.length} rubric items on current page`);

      // Send to background script for AI grading
      console.log('═══════════════════════════════════════════════════════');
      console.log('📤 SENDING TO AI FOR GRADING:');
      console.log('  - Student:', submissionData.studentName);
      console.log('  - Images in submission:', submissionData.images?.length || 0);
      console.log('  - Question:', question);
      console.log('  - Rubric items available:', currentRubricItems.length);
      console.log('');
      console.log('🔑 ANSWER KEY CHECK (from content.js):');
      console.log('  - config.answerKeyImages exists?', !!config.answerKeyImages);
      console.log('  - config.answerKeyImages is array?', Array.isArray(config.answerKeyImages));
      console.log('  - config.answerKeyImages length:', config.answerKeyImages?.length || 0);
      if (config.answerKeyImages && config.answerKeyImages.length > 0) {
        console.log('  ✅ ANSWER KEY WILL BE SENT TO AI');
        console.log('  - First image size:', config.answerKeyImages[0].length, 'characters');
        console.log('  - First 50 chars:', config.answerKeyImages[0].substring(0, 50));
      } else {
        console.error('  ❌❌❌ NO ANSWER KEY - AI WILL GRADE WITHOUT SOLUTION! ❌❌❌');
        console.error('  ⚠️ You MUST upload answer key via extension popup!');
      }
      console.log('═══════════════════════════════════════════════════════');

      const result = await gradeSubmission(submissionData, currentRubricItems, question, config);

      const rubricIndexes = result.rubricItemIndexes || [result.rubricItemIndex]; // back-compat
      console.log('═══════════════════════════════════════════════════════');
      console.log('📥 AI GRADING RESULT:');
      console.log('  - Selected indexes:', rubricIndexes);
      console.log('  - Selected items:', rubricIndexes.map(idx =>
        currentRubricItems[idx] ? `[${idx}] ${currentRubricItems[idx].label}` : `[${idx}] INVALID`
      ).join(', '));
      console.log('  - AI reasoning:', result.reasoning);
      console.log('═══════════════════════════════════════════════════════');

      if (result.skipped || rubricIndexes.length === 0) {
        // Filler page / no submission with no matching rubric — leave ungraded
        // so the human can review. Don't waste a 5s save-wait.
        console.log(`⏭️ Skipping student ${i + 1} for manual review (${result.reasoning})`);
        updateStatus(`⏭️ Student ${i + 1} skipped for manual review (no submission detected)`, 'warning');
      } else {
        for (const index of rubricIndexes) {
          await selectRubricItem(index, currentRubricItems);
          await sleep(300);
        }
        // Suppress comment on perfect scores — if every selected rubric item
        // is full credit (points >= 0), skip writing anything regardless of
        // what the AI returned.
        const isPerfect = rubricIndexes.every(idx => {
          const raw = currentRubricItems[idx]?.points;
          if (raw === undefined || raw === null) return false;
          const n = parseFloat(String(raw).replace(/[^\d.\-]/g, ''));
          return Number.isFinite(n) && n >= 0;
        });
        if (result.comment && !isPerfect) {
          await writeStudentComment(result.comment);
          await sleep(300);
        } else if (isPerfect) {
          console.log('💬 Perfect score — no comment written');
        }
        console.log('Waiting for Gradescope to auto-save (5 seconds)...');
        await sleep(5000);
      }

      // Move to next student
      if (i < totalStudents - 1) {
        await clickNextButton();
        await waitForNewSubmission(4000);
      }

    } catch (error) {
      console.error(`Error grading student ${i + 1}:`, error);

      // Check if extension was invalidated
      if (error.message && error.message.includes('Extension context invalidated')) {
        updateStatus('❌ Extension was reloaded. Please REFRESH this page (F5) and try again.', 'error');
        alert('⚠️ Extension Update Detected\n\nThe extension was reloaded during grading. Please:\n1. Refresh this page (press F5)\n2. Resume grading from where you left off');
        return; // Stop grading
      }

      updateStatus(`⚠️ Error on student ${i + 1}: ${error.message}`, 'warning');

      // Continue to next student after error — same wait as happy path,
      // otherwise the next student's submission isn't loaded yet
      if (i < totalStudents - 1) {
        await clickNextButton();
        await waitForNewSubmission(4000);
      }
    }
  }

  updateStatus(`✅ Completed grading ${totalStudents} students on ${question}!`, 'success');
  updateProgress(totalStudents, totalStudents);
}

// Extract current question from dropdown
function getCurrentQuestion() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 EXTRACTING CURRENT QUESTION FROM PAGE');
  console.log('═══════════════════════════════════════════════════════');

  // Strategy 1: Look for select dropdown
  const dropdowns = document.querySelectorAll('select');
  console.log('Strategy 1: Found', dropdowns.length, 'select dropdowns');

  for (let i = 0; i < dropdowns.length; i++) {
    const dropdown = dropdowns[i];
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const text = selectedOption?.text || selectedOption?.value || '';
    console.log(`  Dropdown ${i}: "${text}"`);

    // Check if this looks like a question (e.g., "3: Exercise 2" or "1: Statement")
    if (text.match(/^\d+:\s*.+/)) {
      console.log(`  ✅ FOUND QUESTION IN DROPDOWN ${i}: "${text}"`);
      console.log('═══════════════════════════════════════════════════════');
      return text.trim();
    }
  }

  // Strategy 2: Look for role="combobox"
  const comboboxes = document.querySelectorAll('[role="combobox"]');
  console.log('Strategy 2: Found', comboboxes.length, 'combobox elements');

  for (let i = 0; i < comboboxes.length; i++) {
    const combobox = comboboxes[i];
    const text = combobox.textContent.trim();
    console.log(`  Combobox ${i}: "${text}"`);

    if (text.match(/^\d+:\s*.+/)) {
      console.log(`  ✅ FOUND QUESTION IN COMBOBOX ${i}: "${text}"`);
      console.log('═══════════════════════════════════════════════════════');
      return text.trim();
    }
  }

  // Strategy 3: Look for any element with pattern "N: Text"
  console.log('Strategy 3: Searching all elements for pattern "N: Text"');
  const allElements = document.querySelectorAll('*');
  const candidates = [];

  for (const el of allElements) {
    // Only check elements with few or no children (leaf nodes)
    if (el.children.length <= 2) {
      const text = el.textContent.trim();
      // Match pattern like "3: Exercise 2" or "1: Statement"
      if (text.match(/^\d+:\s*.+$/) && text.length < 100) {
        candidates.push({ element: el, text: text });
      }
    }
  }

  console.log(`  Found ${candidates.length} candidate elements:`);
  candidates.forEach((c, i) => {
    console.log(`    [${i}] "${c.text}" (${c.element.tagName}.${c.element.className})`);
  });

  // Prefer candidates that are in visible, prominent locations
  // (e.g., near the top, larger font, inside headings)
  for (const candidate of candidates) {
    const el = candidate.element;
    const computedStyle = window.getComputedStyle(el);
    const fontSize = parseFloat(computedStyle.fontSize);
    const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';

    // Prefer larger font sizes (headings) and visible elements
    if (isVisible && fontSize > 12) {
      console.log(`  ✅ SELECTED CANDIDATE: "${candidate.text}" (font-size: ${fontSize}px)`);
      console.log('═══════════════════════════════════════════════════════');
      return candidate.text;
    }
  }

  // If no good candidates, just return the first one
  if (candidates.length > 0) {
    console.log(`  ⚠️ Using first candidate: "${candidates[0].text}"`);
    console.log('═══════════════════════════════════════════════════════');
    return candidates[0].text;
  }

  console.error('  ❌ NO QUESTION FOUND - RETURNING DEFAULT');
  console.log('═══════════════════════════════════════════════════════');
  return 'Current Question';
}

// Extract rubric items from the page
function extractRubricItems() {
  const items = [];
  const seenContainers = new Set();

  // The wildcard selector also matches inner elements of each rubric item
  // (drag handle, description, points). We dedupe by the toggle button so
  // each real rubric item appears exactly once and we don't log spurious
  // warnings for the inner sub-elements.
  const rubricContainers = document.querySelectorAll('.rubricItem--pointsAndDescription, [class*="rubricItem"]');

  rubricContainers.forEach((container) => {
    const toggleButton = container.querySelector('.rubricItem--key, button.rubricItem--key');
    if (!toggleButton) return; // Sub-element of a rubric item, not a real one
    if (seenContainers.has(toggleButton)) return; // Already recorded via outer container
    seenContainers.add(toggleButton);

    const pointsButton = container.querySelector('.rubricField-points, button[class*="rubricField"]');
    if (!pointsButton) return;
    const points = pointsButton.textContent.trim();

    const descElement = container.querySelector('.rubricField-description, [class*="description"]');
    const label = descElement?.textContent.trim() || 'Unknown';

    items.push({
      index: items.length,
      element: toggleButton,
      container,
      pointsButton,
      points,
      label,
      fullText: container.textContent.trim()
    });
  });

  return items;
}

// Get total number of students
async function getTotalStudents() {
  // Look for "X of Y graded" text (from the screenshot: "0 of 101 graded")
  const gradedText = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.match(/\d+\s+of\s+\d+\s+graded/i)
  );

  if (gradedText) {
    const match = gradedText.textContent.match(/of\s+(\d+)\s+graded/i);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // Fallback: look for any "X of Y" pattern
  const ofPattern = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.match(/\d+\s+of\s+\d+/i) && el.children.length === 0
  );

  if (ofPattern) {
    const match = ofPattern.textContent.match(/of\s+(\d+)/i);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // Default to 1 for quick testing (change to 101 for real grading)
  return 101;
}

// Detect "page X of Y" indicator — Gradescope shows e.g. "Q1 page 1 of 10"
function getPageInfo() {
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    if (el.children.length > 2) continue;
    const text = (el.textContent || '').trim();
    if (text.length > 80) continue;
    const match = text.match(/page\s+(\d+)\s+of\s+(\d+)/i);
    if (match) {
      return { current: parseInt(match[1]), total: parseInt(match[2]) };
    }
  }
  return null;
}

// Dispatch a single key (Gradescope listens for J/K to navigate pages)
function dispatchKeyPress(key, keyCode) {
  let code;
  if (/^[a-zA-Z]$/.test(key)) code = `Key${key.toUpperCase()}`;
  else if (/^\d$/.test(key)) code = `Digit${key}`;
  else code = key;

  const target = document.activeElement && document.activeElement.tagName !== 'INPUT' &&
                 document.activeElement.tagName !== 'TEXTAREA'
    ? document.activeElement
    : document.body;

  for (const eventType of ['keydown', 'keypress', 'keyup']) {
    target.dispatchEvent(new KeyboardEvent(eventType, {
      key, code, keyCode, which: keyCode,
      bubbles: true, cancelable: true, view: window
    }));
  }
}

// Find the largest visible image element — that's the current page
function findCurrentPageImage() {
  const selectors = [
    'img[src*="submission"]',
    'img[src*="page"]',
    'img[src*="blob"]',
    'img.page-image',
    '[class*="pageImage"]',
    'canvas'
  ];
  let bestImg = null;
  let bestSize = 0;
  for (const selector of selectors) {
    const found = document.querySelectorAll(selector);
    for (const img of found) {
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w < 300 || h < 300) continue;
      const size = w * h;
      if (size > bestSize) { bestSize = size; bestImg = img; }
    }
  }
  return bestImg;
}

// Convert an image element to base64 with the standard fallback chain
async function captureImageAsBase64(img) {
  if (!img) return null;
  if (img.tagName === 'CANVAS') {
    try {
      return { type: 'base64', data: img.toDataURL('image/png').split(',')[1] };
    } catch (e) {
      console.warn('Canvas extract failed:', e.message);
      return null;
    }
  }
  if (img.tagName !== 'IMG' || !img.src) return null;

  try {
    const base64 = await fetchAndConvertImage(img.src);
    return { type: 'base64', data: base64 };
  } catch (e1) {
    try {
      const base64 = await imageUrlToBase64ViaPageContext(img.src);
      return { type: 'base64', data: base64 };
    } catch (e2) {
      try {
        const base64 = await imageToBase64(img);
        return { type: 'base64', data: base64 };
      } catch (e3) {
        return {
          type: 'url',
          url: img.src,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        };
      }
    }
  }
}

// Press K (next page) and return the new image element if the page advanced,
// or null if K had no effect (we're at the last page or the submission is
// genuinely single-page). Used to probe for hidden multi-page submissions
// when Gradescope omits the "page X of Y" indicator.
async function tryAdvanceToNextPage(previousSrc, timeoutMs = 2500) {
  dispatchKeyPress('k', 75);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(150);
    const img = findCurrentPageImage();
    if (img && img.src && img.src !== previousSrc) {
      if (img.tagName === 'IMG' && !img.complete) {
        await new Promise(resolve => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 1500);
        });
      }
      return img;
    }
  }
  return null;
}

// Wait until Gradescope finishes loading the next student's submission.
// We check for either a fresh image src or the page indicator showing page 1.
async function waitForNewSubmission(baseTimeoutMs = 4000) {
  const previousImg = findCurrentPageImage();
  const previousSrc = previousImg?.src || null;

  await sleep(800); // Always give Gradescope at least this long to start the swap

  const start = Date.now();
  while (Date.now() - start < baseTimeoutMs) {
    const img = findCurrentPageImage();
    const newSrc = img?.src || null;
    const pageInfo = getPageInfo();

    // New submission loaded if the image src changed AND the page indicator
    // shows we're on page 1 of however many pages this student has
    if (newSrc && newSrc !== previousSrc && (!pageInfo || pageInfo.current === 1)) {
      // Wait for the actual image bytes to be ready
      if (img.tagName === 'IMG' && !img.complete) {
        await new Promise(resolve => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 1500);
        });
      }
      console.log(`✓ New submission loaded (${Date.now() - start}ms after click)`);
      return;
    }
    await sleep(200);
  }
  console.warn(`⚠️ waitForNewSubmission timed out after ${baseTimeoutMs}ms — proceeding anyway`);
}

// Wait for the page image to change after a navigation key press
async function waitForPageImageChange(previousSrc, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const img = findCurrentPageImage();
    if (img && img.src && img.src !== previousSrc) {
      if (img.tagName === 'IMG' && !img.complete) {
        await new Promise(resolve => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 1500);
        });
      }
      return img;
    }
    await sleep(150);
  }
  return findCurrentPageImage();
}

// Helper: scan DOM for the "did not select any pages" filler message
function findNoPagesSelectedMessage() {
  return Array.from(document.querySelectorAll('*')).find(el => {
    const text = el.textContent.toLowerCase();
    return text.includes('did not select any pages for this question') ||
           text.includes("didn't select any pages for this question");
  });
}

// Extract current student's submission data — handles multi-page papers
async function extractSubmissionData() {
  const studentName = document.querySelector('[class*="student"]')?.textContent.trim() || 'Current Student';

  // Wait for the page state to settle. After clicking "Next student",
  // Gradescope can briefly show neither the page indicator NOR the filler
  // message, and the previous student's image may still be in the DOM.
  // We retry up to ~3 seconds for ANY definitive signal: filler message
  // OR a "page X of Y" indicator.
  console.log('🔍 Waiting for submission state (filler message or page indicator)...');
  let noSelectionMessage = null;
  let pageInfo = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    noSelectionMessage = findNoPagesSelectedMessage();
    pageInfo = getPageInfo();
    if (noSelectionMessage || pageInfo) break;
    await sleep(400);
  }

  if (noSelectionMessage) {
    console.log('✅ FILLER PAGE DETECTED: Student did not select any pages for this question');
    return {
      studentName,
      timestamp: new Date().toISOString(),
      images: [],
      noSubmission: true,
      totalPages: 0
    };
  }

  const totalPages = pageInfo?.total || 1;
  console.log(`📄 Detected ${totalPages} page(s) in this submission`);

  const submissionImages = [];

  if (totalPages > 1) {
    // Multi-page submission: walk every page using K (next) / J (prev)
    console.log(`🔄 Multi-page submission — capturing all ${totalPages} pages by navigation`);

    // Rewind to page 1 first
    let safety = totalPages + 5;
    while (safety-- > 0) {
      const info = getPageInfo();
      if (!info || info.current === 1) break;
      const prevImg = findCurrentPageImage();
      const prevSrc = prevImg?.src;
      dispatchKeyPress('j', 74);
      await sleep(400);
      if (prevSrc) await waitForPageImageChange(prevSrc, 2500);
    }
    await sleep(600);

    for (let p = 1; p <= totalPages; p++) {
      console.log(`📸 Capturing page ${p}/${totalPages}...`);
      const img = findCurrentPageImage();
      if (img) {
        const captured = await captureImageAsBase64(img);
        if (captured) {
          submissionImages.push(captured);
          console.log(`  ✅ Page ${p} captured (${captured.type}, ${captured.data?.length || 0} bytes)`);
        } else {
          console.warn(`  ⚠️ Failed to capture page ${p}`);
        }
      } else {
        console.warn(`  ⚠️ No image element found on page ${p}`);
      }

      if (p < totalPages) {
        const currentSrc = img?.src;
        dispatchKeyPress('k', 75);
        await sleep(500);
        if (currentSrc) await waitForPageImageChange(currentSrc, 4000);
        else await sleep(1500);
      }
    }
  } else {
    // Single-page mode (or page indicator was missing). We can't trust
    // totalPages = 1 — Gradescope sometimes hides the indicator even for
    // multi-page submissions. So: capture the visible page, then PROBE
    // by pressing K. If K advances to a new image, we're actually multi-page
    // and just got an unreliable indicator; keep capturing until K stops
    // advancing.
    console.log('🔍 Single-page (or unknown) mode — capture + probe with K');

    // Wait for an image to appear
    let firstImg = findCurrentPageImage();
    for (let attempt = 0; attempt < 4 && !firstImg; attempt++) {
      console.log(`  No image yet (attempt ${attempt + 1}/4), waiting 700ms...`);
      await sleep(700);
      firstImg = findCurrentPageImage();
    }

    if (firstImg) {
      const captured = await captureImageAsBase64(firstImg);
      if (captured) submissionImages.push(captured);

      // Probe for additional pages — handles the case where the
      // "page X of Y" indicator is missing despite a multi-page submission.
      const seenSrcs = new Set([firstImg.src]);
      let currentSrc = firstImg.src;
      let safety = 30;
      while (safety-- > 0) {
        const nextImg = await tryAdvanceToNextPage(currentSrc, 2000);
        if (!nextImg) break;
        if (seenSrcs.has(nextImg.src)) break; // Wrapped around
        seenSrcs.add(nextImg.src);

        const cap = await captureImageAsBase64(nextImg);
        if (cap) submissionImages.push(cap);
        currentSrc = nextImg.src;
      }

      if (submissionImages.length > 1) {
        console.log(`  ✓ Probe found ${submissionImages.length} pages despite missing indicator`);
      }
    }
  }

  // Final safety: if we got 0 images, do a last check for the filler message
  // (it can render late) and, failing that, still mark this as no-submission.
  // We MUST NOT send an empty payload to the AI — the model will hallucinate.
  let finalNoSubmission = false;
  if (submissionImages.length === 0) {
    await sleep(500);
    const lateMessage = findNoPagesSelectedMessage();
    if (lateMessage) {
      console.log('✅ Filler message found on late re-check — treating as no-submission');
      finalNoSubmission = true;
    } else {
      console.warn('⚠️ Zero images extracted and no filler message — defaulting to no-submission to avoid AI hallucination');
      finalNoSubmission = true;
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 IMAGE EXTRACTION SUMMARY:');
  console.log('  - Student:', studentName);
  console.log('  - Total pages reported:', totalPages);
  console.log('  - Images captured:', submissionImages.length);
  console.log('  - Marked as no-submission:', finalNoSubmission);
  console.log('═══════════════════════════════════════════════════════');

  return {
    studentName,
    timestamp: new Date().toISOString(),
    images: submissionImages,
    noSubmission: finalNoSubmission,
    totalPages
  };
}

// Inject the converter script once on page load
let converterScriptInjected = false;

function injectImageConverterScript() {
  if (converterScriptInjected) return;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject-image-converter.js');
  script.onload = function() {
    this.remove();
    console.log('✅ Image converter script injected into page context');
  };
  script.onerror = function() {
    console.error('❌ Failed to inject image converter script');
  };
  (document.head || document.documentElement).appendChild(script);
  converterScriptInjected = true;
}

// Helper: Use injected script to convert image in page context
async function imageUrlToBase64ViaPageContext(imageUrl) {
  // Ensure converter script is injected
  injectImageConverterScript();

  // Wait a bit for script to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  return new Promise((resolve, reject) => {
    const eventId = `convert_${Date.now()}_${Math.random()}`;

    // Listen for response
    const responseHandler = (event) => {
      if (event.detail && event.detail.eventId === eventId) {
        window.removeEventListener('CONVERT_IMAGE_RESPONSE', responseHandler);

        if (event.detail.success) {
          resolve(event.detail.base64);
        } else {
          reject(new Error(event.detail.error || 'Conversion failed'));
        }
      }
    };

    window.addEventListener('CONVERT_IMAGE_RESPONSE', responseHandler);

    // Send conversion request
    window.dispatchEvent(new CustomEvent('CONVERT_IMAGE_REQUEST', {
      detail: { imageUrl, eventId }
    }));

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('CONVERT_IMAGE_RESPONSE', responseHandler);
      reject(new Error('Page context image conversion timeout'));
    }, 10000);
  });
}

// Helper: Fetch image and convert to base64 (from content script context)
async function fetchAndConvertImage(imageUrl) {
  // Fetch the image from content script context (has better CORS access)
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error('Fetched image is empty');
  }

  // Convert blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      if (!base64 || base64.length === 0) {
        reject(new Error('Failed to convert blob to base64'));
      } else {
        resolve(base64);
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

// Helper: Convert image element to base64
async function imageToBase64(img) {
  return new Promise((resolve, reject) => {
    // Ensure image is loaded
    if (!img.complete) {
      img.onload = () => convertToBase64();
      img.onerror = () => reject(new Error('Image failed to load'));
      return;
    }

    convertToBase64();

    function convertToBase64() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        if (canvas.width === 0 || canvas.height === 0) {
          reject(new Error('Image has zero dimensions'));
          return;
        }

        const ctx = canvas.getContext('2d');

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to base64
        const base64 = canvas.toDataURL('image/png').split(',')[1];

        if (!base64 || base64.length === 0) {
          reject(new Error('Failed to convert image to base64'));
          return;
        }

        resolve(base64);
      } catch (error) {
        // This will catch CORS errors
        reject(error);
      }
    }
  });
}

// Helper: Create a new image with CORS credentials and convert to base64
async function imageUrlToBase64WithCORS(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Try with anonymous crossOrigin first
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const base64 = canvas.toDataURL('image/png').split(',')[1];

        if (!base64 || base64.length === 0) {
          reject(new Error('Failed to convert to base64'));
        } else {
          resolve(base64);
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      // Try again with 'use-credentials'
      const img2 = new Image();
      img2.crossOrigin = 'use-credentials';

      img2.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img2.width;
          canvas.height = img2.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img2, 0, 0);

          const base64 = canvas.toDataURL('image/png').split(',')[1];

          if (!base64 || base64.length === 0) {
            reject(new Error('Failed to convert to base64'));
          } else {
            resolve(base64);
          }
        } catch (error) {
          reject(error);
        }
      };

      img2.onerror = () => reject(new Error('Failed to load image with CORS'));
      img2.src = imageUrl;
    };

    img.src = imageUrl;
  });
}

// Send submission to background script for AI grading
async function gradeSubmission(submissionData, rubricItems, question, config) {
  console.log('📤 Sending message to background worker...');
  console.log('  - Submission images:', submissionData.images?.length || 0);
  console.log('  - Answer key images:', config.answerKeyImages?.length || 0);
  console.log('  - Rubric items:', rubricItems.length);

  // Calculate total payload size
  const answerKeySize = config.answerKeyImages?.reduce((sum, img) => sum + img.length, 0) || 0;
  const submissionSize = submissionData.images?.reduce((sum, img) => {
    return sum + (img.data?.length || 0);
  }, 0) || 0;
  const totalSizeMB = (answerKeySize + submissionSize) / (1024 * 1024);
  console.log(`  - Total payload size: ${totalSizeMB.toFixed(2)} MB`);

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({
        action: 'gradeSubmission',
        data: {
          submissionData,
          rubricItems,
          question,
          rubricText: config.rubricText,
          answerKeyImages: config.answerKeyImages
        }
      }, (response) => {
        console.log('📥 Received response from background worker:', response);

        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          console.error('❌ No response received from background worker');
          reject(new Error('No response from background worker - it may have crashed'));
        } else if (response.error) {
          console.error('❌ Background worker returned error:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Grading successful');
          resolve(response);
        }
      });
    } catch (error) {
      console.error('❌ Exception when sending message:', error);
      reject(error);
    }
  });
}

// Select rubric item — uses Gradescope's 1-9,0 keyboard shortcuts for the
// first 10 items, and clicks the toggle button directly for items beyond that.
async function selectRubricItem(index, rubricItems) {
  if (index < 0 || index >= rubricItems.length) {
    throw new Error(`Invalid rubric item index: ${index}`);
  }

  const item = rubricItems[index];
  console.log(`Attempting to select rubric item ${index}:`, item.label, item.points);

  if (index < 10) {
    // Gradescope keys: index 0→"1", 1→"2", ..., 8→"9", 9→"0"
    const digit = (index + 1) % 10;
    const keyToPress = String(digit);
    const keyCode = 48 + digit;

    console.log(`Using keyboard shortcut: pressing "${keyToPress}" (index ${index})`);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyToPress, code: `Digit${keyToPress}`,
      keyCode, which: keyCode, bubbles: true, cancelable: true, view: window
    }));
    await sleep(100);
    document.dispatchEvent(new KeyboardEvent('keyup', {
      key: keyToPress, code: `Digit${keyToPress}`,
      keyCode, which: keyCode, bubbles: true, cancelable: true, view: window
    }));
  } else {
    // No keyboard shortcut available — click the toggle button directly
    console.log(`Index ${index} > 9, clicking rubric toggle button directly`);
    if (!item.element) {
      throw new Error(`No clickable element for rubric item ${index}`);
    }
    item.element.scrollIntoView({ block: 'center' });
    await sleep(150);
    item.element.click();
  }

  await sleep(500);

  if (item.element) {
    const isSelected = item.element.classList.contains('rubricItem--key-applied') ||
                       item.element.getAttribute('aria-pressed') === 'true';
    console.log('Selection confirmed:', isSelected);

    // Retry once with a direct click if the selection didn't register
    if (!isSelected) {
      console.warn('⚠️ Selection did not register — retrying with direct click');
      try {
        item.element.scrollIntoView({ block: 'center' });
        await sleep(150);
        item.element.click();
        await sleep(400);
      } catch (e) {
        console.warn('Direct click retry failed:', e.message);
      }
    }
  }
}

// Find Gradescope's per-question comment textarea. Gradescope's DOM has shifted
// over time, so we try several selectors and finally fall back to the largest
// visible textarea inside the rubric/grading panel. Returns null if none found.
function findCommentTextarea() {
  const candidates = [
    'textarea[aria-label*="comment" i]',
    'textarea[placeholder*="comment" i]',
    'textarea[placeholder*="feedback" i]',
    'textarea[name*="comment" i]',
    '.commentBox textarea',
    '.gradingPanel textarea',
    '.rubricComment textarea',
    'textarea.gradingComment'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) return el;
  }

  // Fallback: pick the largest visible textarea on the page.
  const visible = Array.from(document.querySelectorAll('textarea'))
    .filter(t => t.offsetParent !== null);
  if (!visible.length) return null;
  visible.sort((a, b) =>
    (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight));
  return visible[0];
}

// Type `text` into Gradescope's comment box. Gradescope uses React, so setting
// .value directly does NOT trigger a re-render — we have to call the native
// value setter and dispatch an 'input' event for React to pick up the change.
async function writeStudentComment(text) {
  if (!text || !text.trim()) return false;

  const textarea = findCommentTextarea();
  if (!textarea) {
    console.warn('💬 Comment textarea not found — skipping comment for this student');
    return false;
  }

  textarea.focus();
  await sleep(50);

  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  ).set;
  setter.call(textarea, text);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Some Gradescope panels save on blur; nudge it.
  await sleep(100);
  textarea.dispatchEvent(new Event('blur', { bubbles: true }));
  console.log(`💬 Wrote comment (${text.length} chars):`, text);
  return true;
}

// Click the "Next" button (sequential next submission), NOT "Next Ungraded".
// Gradescope shows four buttons at the bottom: Previous Ungraded / Previous /
// Next / Next Ungraded. We must match "Next" exactly, otherwise a loose
// substring match grabs "Next Ungraded" and bounces back to skipped students.
async function clickNextButton() {
  const allButtons = Array.from(document.querySelectorAll('button'));

  const normalize = (btn) =>
    (btn.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Pass 1: exact "next" (with or without a trailing arrow glyph)
  let nextButton = allButtons.find(btn => {
    const text = normalize(btn);
    return text === 'next' || /^next\s*[▶›→»]?$/.test(text);
  });

  // Pass 2: starts with "next " but explicitly NOT "next ungraded"
  if (!nextButton) {
    nextButton = allButtons.find(btn => {
      const text = normalize(btn);
      return text.startsWith('next') &&
             !text.includes('ungraded') &&
             !text.includes('previous');
    });
  }

  if (!nextButton) {
    throw new Error('Could not find "Next" button (distinct from "Next Ungraded")');
  }

  console.log('Clicking sequential Next button:', nextButton.textContent.trim());
  nextButton.click();
}

// Update progress bar and text
function updateProgress(current, total) {
  const percentage = (current / total) * 100;

  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent = `${current}/${total} students (${Math.round(percentage)}%)`;
  }
}

// Update status message
function updateStatus(message, type = 'info') {
  const statusElement = document.getElementById('ai-grader-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-text status-${type}`;
  }
  console.log(`[${type}] ${message}`);
}

// Helper: sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-initialize on navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true });
