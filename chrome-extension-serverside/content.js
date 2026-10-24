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

  // Check if API key is configured
  const config = await chrome.storage.sync.get(['apiKey', 'rubricText', 'answerKeyImages']);

  if (!config.apiKey) {
    updateStatus('❌ Please configure API key in extension popup', 'error');
    return;
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
      const result = await gradeSubmission(submissionData, currentRubricItems, question, config);

      // Select the appropriate rubric item
      await selectRubricItem(result.rubricItemIndex, currentRubricItems);

      // Wait MUCH longer for Gradescope to auto-save the selection
      console.log('Waiting for Gradescope to auto-save (5 seconds)...');
      await sleep(5000); // 5 seconds to ensure Gradescope saves

      // Move to next student
      if (i < totalStudents - 1) {
        await clickNextButton();
        await sleep(2000); // Wait for page to load
      }

    } catch (error) {
      console.error(`Error grading student ${i + 1}:`, error);
      updateStatus(`⚠️ Error on student ${i + 1}: ${error.message}`, 'warning');

      // Continue to next student after error
      if (i < totalStudents - 1) {
        await clickNextButton();
        await sleep(1000);
      }
    }
  }

  updateStatus(`✅ Completed grading ${totalStudents} students on ${question}!`, 'success');
  updateProgress(totalStudents, totalStudents);
}

// Extract current question from dropdown
function getCurrentQuestion() {
  // Look for dropdown or question title
  // In the screenshot, it shows "2: Exercise 1" in a dropdown
  const dropdown = document.querySelector('select') ||
                   document.querySelector('[role="combobox"]');

  if (dropdown && dropdown.tagName === 'SELECT') {
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    if (selectedOption) {
      return selectedOption.text || selectedOption.value;
    }
  }

  // Fallback: look for visible question text
  const questionText = Array.from(document.querySelectorAll('*')).find(el => {
    return el.textContent.match(/^\d+:\s+\w+/) && el.children.length === 0;
  });

  return questionText?.textContent || 'Current Question';
}

// Extract rubric items from the page
function extractRubricItems() {
  const items = [];

  // Find all rubric item containers (Gradescope uses rubricItem--pointsAndDescription)
  const rubricContainers = document.querySelectorAll('.rubricItem--pointsAndDescription, [class*="rubricItem"]');

  rubricContainers.forEach((container, index) => {
    // Get points button (just for reading the value)
    const pointsButton = container.querySelector('.rubricField-points, button[class*="rubricField"]');
    if (!pointsButton) return;
    const points = pointsButton.textContent.trim();

    // Get description element for label
    const descElement = container.querySelector('.rubricField-description, [class*="description"]');
    const label = descElement?.textContent.trim() || 'Unknown';

    // Find the ACTUAL toggle button - the numbered button with class "rubricItem--key"
    // This is the button that has aria-pressed="false/true" and toggles selection
    const toggleButton = container.querySelector('.rubricItem--key, button.rubricItem--key');

    if (!toggleButton) {
      console.warn('Could not find toggle button for rubric item', index);
      return;
    }

    items.push({
      index,
      element: toggleButton, // This is the actual toggle button (e.g., button with "1", "2", etc.)
      container: container,
      pointsButton: pointsButton, // Keep reference to points button for reading
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

// Extract current student's submission data
async function extractSubmissionData() {
  const studentName = document.querySelector('[class*="student"]')?.textContent.trim() || 'Current Student';

  // Try to find submission images on the page
  // Gradescope typically displays submissions as images in the viewer
  const submissionImages = [];

  // Look for the PDF viewer or image elements
  const pdfViewer = document.querySelector('iframe[src*="pdf"]') ||
                    document.querySelector('[class*="submissionViewer"]') ||
                    document.querySelector('[class*="submission"]');

  // Find all images that are part of the submission (not UI icons)
  const images = document.querySelectorAll('img[src*="submission"], img[src*="page"], canvas');

  for (const img of images) {
    try {
      // Skip small images (likely UI icons)
      if (img.width < 100 || img.height < 100) continue;

      let imageData;

      if (img.tagName === 'CANVAS') {
        // If it's a canvas (PDF rendered as canvas), extract it
        imageData = img.toDataURL('image/png').split(',')[1];
      } else if (img.src && img.complete) {
        // If it's an image, convert to base64
        imageData = await imageToBase64(img);
      }

      if (imageData) {
        submissionImages.push(imageData);
      }
    } catch (error) {
      console.warn('Could not extract image:', error);
    }
  }

  console.log(`Extracted ${submissionImages.length} submission images`);

  return {
    studentName: studentName,
    timestamp: new Date().toISOString(),
    images: submissionImages
  };
}

// Helper: Convert image element to base64
async function imageToBase64(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(base64);
    } catch (error) {
      reject(error);
    }
  });
}

// Send submission to background script for AI grading
async function gradeSubmission(submissionData, rubricItems, question, config) {
  return new Promise((resolve, reject) => {
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
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// Select rubric item using keyboard shortcut
async function selectRubricItem(index, rubricItems) {
  if (index < 0 || index >= rubricItems.length) {
    throw new Error(`Invalid rubric item index: ${index}`);
  }

  const item = rubricItems[index];

  console.log(`Attempting to select rubric item ${index}:`, item.label, item.points);

  // Gradescope uses keyboard shortcuts: "1" for first item, "2" for second, etc.
  // index 0 → press "1", index 1 → press "2", etc.
  const keyToPress = String(index + 1);
  const keyCode = 49 + index; // "1" is keyCode 49, "2" is 50, etc.

  console.log(`Using keyboard shortcut: pressing "${keyToPress}" key`);

  // Dispatch keydown event on document
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: keyToPress,
    code: `Digit${keyToPress}`,
    keyCode: keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    view: window
  }));

  await sleep(100);

  // Dispatch keyup event
  document.dispatchEvent(new KeyboardEvent('keyup', {
    key: keyToPress,
    code: `Digit${keyToPress}`,
    keyCode: keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    view: window
  }));

  console.log(`✓ Pressed "${keyToPress}" for rubric item ${index}: ${item.label} (${item.points})`);

  // Wait and check if it got selected
  await sleep(500);

  // Check if the button got selected
  if (item.element) {
    console.log('Button state after keypress:', item.element.className, item.element.getAttribute('aria-pressed'));

    const isSelected = item.element.classList.contains('rubricItem--key-applied') ||
                       item.element.getAttribute('aria-pressed') === 'true';

    console.log('Selection confirmed:', isSelected);

    if (!isSelected) {
      console.warn('⚠️ Button may not have been selected - Gradescope did not update classes');
    }
  }
}

// Click the "Next" button to go to next student
async function clickNextButton() {
  // Look for Next button by text content
  const allButtons = Array.from(document.querySelectorAll('button'));
  const nextButton = allButtons.find(btn => {
    const text = btn.textContent.trim().toLowerCase();
    return text.includes('next') || text.includes('→');
  });

  // Also try common next button classes
  const nextByClass = document.querySelector('[class*="next"]') ||
                      document.querySelector('[class*="Next"]');

  const buttonToClick = nextButton || nextByClass;

  if (!buttonToClick) {
    throw new Error('Could not find Next button');
  }

  console.log('Clicking next button:', buttonToClick.textContent.trim());
  buttonToClick.click();
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
