/**
 * Gradescope AI Grader - Background Service Worker (Server-Side Version)
 * Calls YOUR backend server instead of OpenAI directly
 */

console.log('Gradescope AI Grader: Background script loaded (Server-side version)');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'gradeSubmission') {
    handleGradingRequest(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Main grading handler - calls YOUR server
 */
async function handleGradingRequest(data) {
  const { submissionData, rubricItems, question, rubricText, answerKeyImages } = data;

  console.log('Grading request:', { question, student: submissionData.studentName });

  // Get API key and server URL from storage
  const config = await chrome.storage.sync.get(['apiKey', 'serverUrl']);

  if (!config.apiKey) {
    throw new Error('API key not configured. Please register at your server.');
  }

  if (!config.serverUrl) {
    throw new Error('Server URL not configured. Contact extension developer.');
  }

  // Get submission images from the data
  const submissionImages = submissionData.images || [];

  if (submissionImages.length === 0) {
    console.warn('No submission images found - AI will grade based on rubric only');
  } else {
    console.log(`Processing ${submissionImages.length} submission images`);
  }

  // Call YOUR backend server (not OpenAI directly)
  const gradingResult = await callBackendServer(
    config.serverUrl,
    config.apiKey,
    {
      submissionData: {
        ...submissionData,
        images: submissionImages
      },
      rubricItems,
      question,
      rubricText,
      answerKeyImages
    }
  );

  return gradingResult;
}

/**
 * Call your backend server for grading
 */
async function callBackendServer(serverUrl, apiKey, data) {
  console.log(`🌐 Calling backend server: ${serverUrl}/api/grading/grade`);

  try {
    const response = await fetch(`${serverUrl}/api/grading/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey // Your user's API key for authentication
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your credentials or register at the server.');
      }

      if (response.status === 429) {
        throw new Error('Daily request limit exceeded. Please upgrade your plan or try again tomorrow.');
      }

      throw new Error(error.error || `Server error: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Grading result received:', {
      rubricItemIndex: result.rubricItemIndex,
      reasoning: result.reasoning,
      tokensUsed: result.tokensUsed
    });

    return {
      rubricItemIndex: result.rubricItemIndex,
      reasoning: result.reasoning,
      rawResponse: result.rawResponse
    };

  } catch (error) {
    console.error('❌ Backend server error:', error);

    // Provide helpful error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection and server URL.');
    }

    throw error;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Gradescope AI Grader installed (Server-side version)');

    // Set default server URL
    chrome.storage.sync.set({
      serverUrl: 'http://localhost:3000' // Change this to your deployed server URL
    });

    // Open options page on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});
