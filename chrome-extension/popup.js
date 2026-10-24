/**
 * Gradescope AI Grader - Popup Script
 * Handles configuration UI
 */

// Available models per provider
const MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'gpt-4o (recommended)' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini (cheaper)' },
    { value: 'gpt-4-turbo', label: 'gpt-4-turbo' }
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (best reasoning)' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (fast & cheap)' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6 (recommended)' },
    { value: 'claude-opus-4-7', label: 'claude-opus-4-7 (most capable, expensive)' },
    { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5 (fast, cheapest)' }
  ]
};

function populateModelOptions(provider, currentModel) {
  const select = document.getElementById('model');
  select.innerHTML = '';
  for (const m of MODELS[provider] || []) {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    select.appendChild(opt);
  }
  // Restore selection if it's valid for this provider, otherwise pick first
  if (currentModel && MODELS[provider]?.some(m => m.value === currentModel)) {
    select.value = currentModel;
  } else {
    select.value = MODELS[provider][0].value;
  }
}

function updateApiKeyUI(provider) {
  const label = document.getElementById('apiKeyLabel');
  const input = document.getElementById('apiKey');
  const help = document.getElementById('apiKeyHelp');
  if (provider === 'gemini') {
    label.textContent = 'Google AI Studio API Key';
    input.placeholder = 'AIza...';
    help.innerHTML = 'Get a key at <strong>aistudio.google.com/apikey</strong>. Stored locally.';
  } else if (provider === 'anthropic') {
    label.textContent = 'Anthropic API Key';
    input.placeholder = 'sk-ant-...';
    help.innerHTML = 'Get a key at <strong>console.anthropic.com/settings/keys</strong>. Stored locally.';
  } else {
    label.textContent = 'OpenAI API Key';
    input.placeholder = 'sk-proj-...';
    help.innerHTML = 'Get a key at <strong>platform.openai.com/api-keys</strong>. Stored locally.';
  }
}

// Load saved configuration
document.addEventListener('DOMContentLoaded', async () => {
  const syncConfig = await chrome.storage.sync.get([
    'apiKey', 'rubricText', 'provider', 'model'
  ]);
  const localConfig = await chrome.storage.local.get(['answerKeyImages']);

  const provider = syncConfig.provider || 'openai';
  document.getElementById('provider').value = provider;
  populateModelOptions(provider, syncConfig.model);
  updateApiKeyUI(provider);

  if (syncConfig.apiKey) {
    document.getElementById('apiKey').value = syncConfig.apiKey;
    updateApiKeyStatus(true);
  }

  if (syncConfig.rubricText) {
    document.getElementById('rubricText').value = syncConfig.rubricText;
  }

  if (localConfig.answerKeyImages) {
    displayAnswerKeyList(localConfig.answerKeyImages);
  }
});

// React to provider change
document.getElementById('provider').addEventListener('change', async (e) => {
  const provider = e.target.value;
  const syncConfig = await chrome.storage.sync.get(['model']);
  populateModelOptions(provider, syncConfig.model);
  updateApiKeyUI(provider);
  // Clear API key field when switching — different keys for different providers
  document.getElementById('apiKey').value = '';
  updateApiKeyStatus(false);
});

// Save button handler
document.getElementById('saveButton').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const rubricText = document.getElementById('rubricText').value.trim();
  const provider = document.getElementById('provider').value;
  const model = document.getElementById('model').value;

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  // Validate API key format per provider
  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    showStatus('Invalid OpenAI API key — should start with "sk-"', 'error');
    return;
  }
  if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
    showStatus('Invalid Gemini API key — should start with "AIza"', 'error');
    return;
  }
  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    showStatus('Invalid Anthropic API key — should start with "sk-ant-"', 'error');
    return;
  }

  // Get answer key images
  const answerKeyImages = await processAnswerKeyFiles();

  console.log('💾 Saving configuration...');
  console.log('  - Provider:', provider);
  console.log('  - Model:', model);
  console.log('  - API key length:', apiKey?.length || 0);
  console.log('  - Rubric text length:', rubricText?.length || 0);
  console.log('  - Answer key images:', answerKeyImages?.length || 0);

  try {
    // Save API key, rubric, provider, model to sync storage
    await chrome.storage.sync.set({
      apiKey,
      rubricText,
      provider,
      model
    });
    console.log('✅ Sync storage saved (API key, rubric, provider, model)');

    // Save answer key images to local storage (large data, stays on this device)
    // storage.local has 10MB limit vs storage.sync's 8KB limit
    if (answerKeyImages && answerKeyImages.length > 0) {
      const totalSize = answerKeyImages.reduce((sum, img) => sum + img.length, 0);
      console.log('  - Total answer key size:', totalSize, 'characters (~', Math.round(totalSize / 1024), 'KB)');

      // Check if size exceeds 10MB limit
      if (totalSize > 10 * 1024 * 1024) {
        throw new Error(`Answer key images are too large (${Math.round(totalSize / 1024 / 1024)}MB). Maximum is 10MB. Please reduce image resolution or number of pages.`);
      }

      await chrome.storage.local.set({
        answerKeyImages
      });
      console.log('✅ Local storage saved (answer key images)');
    } else {
      // Clear answer key if no files selected
      await chrome.storage.local.set({
        answerKeyImages: null
      });
      console.log('ℹ️ No answer key images to save');
    }

    updateApiKeyStatus(true);
    showStatus('Configuration saved successfully!', 'success');

    // Auto-close popup after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);

  } catch (error) {
    console.error('❌ Save failed:', error);
    showStatus(`Save failed: ${error.message}`, 'error');

    // Don't close popup on error
  }
});

// Process answer key file uploads
async function processAnswerKeyFiles() {
  const fileInput = document.getElementById('answerKeyFiles');
  const files = fileInput.files;

  if (!files || files.length === 0) {
    return null;
  }

  const images = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Only process image files
    if (file.type.startsWith('image/')) {
      const base64 = await fileToBase64(file);
      images.push(base64);
    } else {
      showStatus(`Skipping non-image file: ${file.name}. Please upload images only.`, 'error');
    }
  }

  return images;
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Display answer key files
function displayAnswerKeyList(images) {
  const listElement = document.getElementById('answerKeyList');

  if (!images || images.length === 0) {
    listElement.innerHTML = '';
    return;
  }

  listElement.innerHTML = `<div class="help-text" style="color: #4CAF50; font-weight: 600;">✓ ${images.length} page(s) uploaded and ready</div>`;
}

// Update answer key list when files are selected
document.getElementById('answerKeyFiles').addEventListener('change', async () => {
  const images = await processAnswerKeyFiles();
  displayAnswerKeyList(images);
});

// Update API key status indicator
function updateApiKeyStatus(isConfigured) {
  const indicator = document.getElementById('apiKeyIndicator');
  const status = document.getElementById('apiKeyStatus');

  if (isConfigured) {
    indicator.classList.add('active');
    status.textContent = 'Configured';
  } else {
    indicator.classList.remove('active');
    status.textContent = 'Not configured';
  }
}

// Show status message
function showStatus(message, type) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusElement.className = 'status';
  }, 5000);
}
