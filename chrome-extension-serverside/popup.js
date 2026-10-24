/**
 * Popup Configuration Script (Server-side version)
 */

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Load saved configuration
chrome.storage.sync.get(['apiKey', 'rubricText', 'serverUrl'], (data) => {
  if (data.apiKey) {
    document.getElementById('apiKey').value = data.apiKey;
  }
  if (data.rubricText) {
    document.getElementById('rubricText').value = data.rubricText;
  }
  if (data.serverUrl) {
    document.getElementById('serverUrl').value = data.serverUrl;
  } else {
    // Set default server URL
    document.getElementById('serverUrl').value = 'http://localhost:3000';
  }
});

// Save configuration
document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const rubricText = document.getElementById('rubricText').value.trim();

  if (!apiKey) {
    showStatus('Please enter your API key', 'error');
    return;
  }

  chrome.storage.sync.set({
    apiKey,
    rubricText
  }, () => {
    showStatus('✅ Configuration saved successfully!', 'success');
  });
});

// Save advanced settings
document.getElementById('saveAdvancedBtn').addEventListener('click', () => {
  const serverUrl = document.getElementById('serverUrl').value.trim();

  if (!serverUrl) {
    showStatus('Please enter a server URL', 'error');
    return;
  }

  // Validate URL format
  try {
    new URL(serverUrl);
  } catch (e) {
    showStatus('Invalid server URL format', 'error');
    return;
  }

  chrome.storage.sync.set({
    serverUrl
  }, () => {
    showStatus('✅ Server URL saved successfully!', 'success');
  });
});

// Test connection to server
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const serverUrl = document.getElementById('serverUrl').value.trim() || 'http://localhost:3000';

  if (!apiKey) {
    showStatus('Please enter your API key first', 'error');
    return;
  }

  showStatus('Testing connection...', 'success');

  try {
    const response = await fetch(`${serverUrl}/api/auth/verify`, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      showStatus(`✅ Connected! Email: ${data.email} | Plan: ${data.plan}`, 'success');
    } else {
      const error = await response.json();
      showStatus(`❌ Connection failed: ${error.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Cannot connect to server: ${error.message}`, 'error');
  }
});

// Register new user
document.getElementById('registerBtn').addEventListener('click', async () => {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const serverUrl = document.getElementById('serverUrl').value.trim() || 'http://localhost:3000';

  if (!email || !password) {
    showStatus('Please enter email and password', 'error');
    return;
  }

  showStatus('Registering...', 'success');

  try {
    const response = await fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();

      // Save API key automatically
      document.getElementById('apiKey').value = data.apiKey;
      chrome.storage.sync.set({
        apiKey: data.apiKey
      });

      showStatus(`✅ Registration successful! API Key saved. Plan: ${data.plan}`, 'success');

      // Switch to config tab after 2 seconds
      setTimeout(() => {
        document.querySelector('.tab[data-tab="config"]').click();
      }, 2000);
    } else {
      const error = await response.json();
      showStatus(`❌ Registration failed: ${error.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Cannot connect to server: ${error.message}`, 'error');
  }
});

// Login existing user
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const serverUrl = document.getElementById('serverUrl').value.trim() || 'http://localhost:3000';

  if (!email || !password) {
    showStatus('Please enter email and password', 'error');
    return;
  }

  showStatus('Logging in...', 'success');

  try {
    const response = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();

      // Save API key automatically
      document.getElementById('apiKey').value = data.apiKey;
      chrome.storage.sync.set({
        apiKey: data.apiKey
      });

      showStatus(`✅ Login successful! API Key saved. Plan: ${data.plan}`, 'success');

      // Switch to config tab after 2 seconds
      setTimeout(() => {
        document.querySelector('.tab[data-tab="config"]').click();
      }, 2000);
    } else {
      const error = await response.json();
      showStatus(`❌ Login failed: ${error.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Cannot connect to server: ${error.message}`, 'error');
  }
});

// Setup server link
document.getElementById('setupServerLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({
    url: 'https://github.com/yourusername/gradescope-ai-grader-server'
  });
});

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = type;
  statusDiv.style.display = 'block';

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}
