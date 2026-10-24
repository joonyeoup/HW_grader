/**
 * Gradescope AI Grader - Background Service Worker
 * Handles OpenAI API calls and grading logic
 */

console.log('Gradescope AI Grader: Background script loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    // Health check to verify extension is running
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'gradeSubmission') {
    handleGradingRequest(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Main grading handler
 */
async function handleGradingRequest(data) {
  const { submissionData, rubricItems, question, rubricText, answerKeyImages } = data;

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          GRADING REQUEST RECEIVED (background.js)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('  Question:', question);
  console.log('  Student:', submissionData.studentName);
  console.log('');
  console.log('🔑 ANSWER KEY CHECK (received from content.js):');
  console.log('  - answerKeyImages parameter type:', typeof answerKeyImages);
  console.log('  - Is null?', answerKeyImages === null);
  console.log('  - Is undefined?', answerKeyImages === undefined);
  console.log('  - Is array?', Array.isArray(answerKeyImages));
  console.log('  - Length:', answerKeyImages?.length || 0);
  console.log('');
  if (answerKeyImages && answerKeyImages.length > 0) {
    console.log('  ✅✅✅ ANSWER KEY IMAGES AVAILABLE! ✅✅✅');
    console.log('  - Number of images:', answerKeyImages.length);
    console.log('  - First image size:', answerKeyImages[0].length, 'characters');
    console.log('  - First 100 chars:', answerKeyImages[0].substring(0, 100) + '...');
    console.log('  - Will be sent to OpenAI for comparison');
  } else {
    console.error('  ❌❌❌ NO ANSWER KEY IMAGES! ❌❌❌');
    console.error('  - The AI will grade WITHOUT seeing the correct solution');
    console.error('  - This WILL cause incorrect grading');
  }
  console.log('');

  // Get API key + provider/model from storage
  const config = await chrome.storage.sync.get(['apiKey', 'provider', 'model']);
  if (!config.apiKey) {
    throw new Error('API key not configured');
  }
  const provider = config.provider || 'openai';
  const defaultModelByProvider = {
    gemini: 'gemini-2.5-pro',
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o'
  };
  const model = config.model || defaultModelByProvider[provider] || 'gpt-4o';
  console.log(`🤖 Using provider="${provider}", model="${model}"`);

  // Get submission images from the data (may be URLs or base64)
  const submissionImageData = submissionData.images || [];

  console.log(`📊 Grading data: noSubmission=${submissionData.noSubmission}, imageCount=${submissionImageData.length}`);

  // Convert image URLs to base64 (bypass CORS by fetching from background script)
  const submissionImages = [];
  console.log(`🔄 Processing ${submissionImageData.length} image(s)...`);

  for (let i = 0; i < submissionImageData.length; i++) {
    const imgData = submissionImageData[i];
    console.log(`\n📥 Processing image ${i + 1}/${submissionImageData.length}:`);

    if (imgData.type === 'url') {
      console.log('  Type: URL');
      console.log('  URL:', imgData.url.substring(0, 100) + '...');
      console.log('  🌐 Fetching image from URL (bypassing CORS)...');

      try {
        const base64 = await fetchImageAsBase64(imgData.url);

        if (!base64 || base64.length === 0) {
          console.error('  ❌ ERROR: Fetch returned empty data!');
          continue;
        }

        submissionImages.push(base64);
        console.log(`  ✅ SUCCESS: Fetched ${base64.length} characters`);
        console.log(`  ✅ First 50 chars: ${base64.substring(0, 50)}...`);
      } catch (error) {
        console.error('  ❌ FETCH FAILED:');
        console.error('    Error:', error.message);
        console.error('    Stack:', error.stack);
        // Continue with other images
      }
    } else if (imgData.type === 'base64') {
      console.log('  Type: Pre-converted base64');
      submissionImages.push(imgData.data);
      console.log(`  ✅ Using pre-converted base64 (${imgData.data?.length || 0} chars)`);
    } else if (typeof imgData === 'string') {
      console.log('  Type: Legacy base64 string');
      submissionImages.push(imgData);
      console.log(`  ✅ Using legacy format (${imgData.length} chars)`);
    } else {
      console.error('  ❌ UNKNOWN IMAGE DATA TYPE:', typeof imgData, imgData);
    }
  }

  console.log(`\n📊 FINAL IMAGE COUNT: ${submissionImages.length} / ${submissionImageData.length} successfully processed`);

  if (submissionImages.length === 0 && submissionImageData.length > 0) {
    console.error('⚠️⚠️⚠️ CRITICAL ERROR: ALL IMAGE FETCHES FAILED! ⚠️⚠️⚠️');
    console.error('This will cause the AI to select "No submission" incorrectly!');
  }

  // Auto-select "no submission" if EITHER the filler message was detected
  // OR we ended up with zero images. We must never call the AI with zero
  // images — the model will hallucinate a fake submission.
  const treatAsNoSubmission =
    submissionData.noSubmission === true || submissionImages.length === 0;

  if (treatAsNoSubmission) {
    const reason = submissionData.noSubmission === true
      ? 'Filler page detected ("did not select any pages")'
      : 'Zero submission images extracted — refusing to call AI with empty content';
    console.log(`⚠️ ${reason}`);
    console.log('➡️ Looking for "No submission/selection" rubric item to auto-apply');

    const noSubmissionIndex = rubricItems.findIndex(item =>
      item.label.toLowerCase().includes('no submission') ||
      item.label.toLowerCase().includes('no selection')
    );

    if (noSubmissionIndex !== -1) {
      console.log(`✓ Auto-selecting rubric item ${noSubmissionIndex}: "${rubricItems[noSubmissionIndex].label}"`);
      return {
        rubricItemIndexes: [noSubmissionIndex],
        reasoning: reason,
        comment: '',
        rawResponse: '{}'
      };
    }

    // No "No submission" rubric item exists (common for paper-style rubrics).
    // Don't select anything — leave the student untouched so the human can
    // review manually. The runGradingLoop will treat this as a soft skip.
    console.warn('⚠️ No "No submission" rubric item exists — skipping student so it can be reviewed manually');
    return {
      rubricItemIndexes: [],
      reasoning: reason + '. No matching rubric item; student left ungraded for manual review.',
      comment: '',
      rawResponse: '{}',
      skipped: true
    };
  }

  // Multi-page papers/reports need holistic grading instead of "find this section"
  const isPaperMode = (submissionData.totalPages || 0) > 1 || submissionImages.length > 1;
  console.log(`📚 Paper mode: ${isPaperMode} (totalPages=${submissionData.totalPages}, images=${submissionImages.length})`);

  // Call AI API (OpenAI or Gemini, depending on provider)
  const gradingResult = await callAI(
    provider,
    model,
    config.apiKey,
    question,
    rubricItems,
    rubricText,
    answerKeyImages,
    submissionImages,
    isPaperMode
  );

  return gradingResult;
}

/**
 * Fetch image from URL and convert to base64
 * Background scripts can bypass CORS restrictions with proper permissions
 */
async function fetchImageAsBase64(imageUrl) {
  console.log('    → fetch() starting...');
  console.log('    → URL:', imageUrl.substring(0, 150) + '...');

  try {
    // Use fetch with proper headers for S3 signed URLs
    const response = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors', // Explicitly request CORS
      credentials: 'omit', // Don't send credentials for S3 URLs
      cache: 'no-cache' // Avoid cache issues
    });

    console.log('    → Response received:', response.status, response.statusText);
    console.log('    → Response headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      accessControl: response.headers.get('access-control-allow-origin')
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('    → Converting to blob...');
    const blob = await response.blob();
    console.log('    → Blob size:', blob.size, 'bytes, type:', blob.type);

    if (blob.size === 0) {
      throw new Error('Blob is empty (0 bytes)');
    }

    console.log('    → Converting blob to base64...');
    const base64 = await blobToBase64(blob);
    console.log('    → Base64 length:', base64.length, 'characters');

    return base64;
  } catch (error) {
    console.error('    ❌ fetchImageAsBase64 FAILED:');
    console.error('      URL:', imageUrl.substring(0, 100));
    console.error('      Error type:', error.constructor.name);
    console.error('      Error message:', error.message);
    console.error('      Stack trace:', error.stack);

    // If it's a CORS error, provide specific guidance
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.error('');
      console.error('    ⚠️ This appears to be a CORS error from AWS S3');
      console.error('    💡 The content script should convert images to base64 before sending them here');
      console.error('    💡 Check that image conversion is working in content.js');
    }

    throw error;
  }
}

/**
 * Fetch student's PDF submission
 */
async function fetchSubmissionPDF(pdfUrl) {
  // In mock mode, skip actual fetching
  if (pdfUrl.startsWith('mock://')) {
    console.log('🧪 Mock mode: Skipping PDF fetch');
    return [{
      type: 'mock',
      data: 'mock_data'
    }];
  }

  // Fetch the PDF
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  const blob = await response.blob();

  // Convert PDF to images (this is simplified - in production you'd need a PDF.js integration)
  // For now, we'll convert the PDF blob to base64 and pass to OpenAI
  const base64 = await blobToBase64(blob);

  return [{
    type: 'pdf',
    data: base64
  }];
}

/**
 * Convert blob to base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Detect image media type from base64 magic bytes. Claude and Gemini reject
// requests where media_type disagrees with the actual bytes, so we sniff
// instead of assuming PNG.
function detectImageMediaType(b64) {
  if (!b64 || typeof b64 !== 'string') return 'image/png';
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

/**
 * Call AI provider (OpenAI or Gemini) to grade submission
 */
async function callAI(provider, model, apiKey, question, rubricItems, rubricText, answerKeyImages, submissionImages, isPaperMode = false) {
  // Build the prompt (pass answerKeyImages, image count, and paper mode flag)
  const prompt = buildGradingPrompt(question, rubricItems, rubricText, answerKeyImages, submissionImages.length, isPaperMode);

  // System prompt depends on grading mode
  const systemPrompt = isPaperMode
    ? `You are an expert grading assistant evaluating a multi-page student paper or report.
Your job is to grade the WHOLE submission holistically against the provided rubric.

Your response must be a JSON object with this exact structure:
{
  "correctAnswer": "N/A",
  "sectionFound": "Full Paper",
  "studentAnswer": "<one-sentence summary of the submission>",
  "rubricItemIndexes": [<number>, <number>, ...],
  "reasoning": "<per-rubric-item reasoning citing specific pages/sections>",
  "comment": "<empty string if full credit; otherwise one short sentence, ~15 words max>"
}

rubricItemIndexes is an array of 0-based indexes for EVERY rubric item that applies.
- Include all that apply (multiple deductions and/or credits).
- For papers, evaluate every rubric category independently across the entire submission.
- Cite specific pages/sections in your reasoning.

The "comment" field is shown directly to the student.
- If the student receives full credit / a perfect score (no deductions on this question),
  set "comment" to an empty string "". Do NOT leave any praise or filler.
- Otherwise: ONE short sentence, ~15 words max. Point at the specific mistake.
  No greetings, no sign-offs, no restating the rubric label, no repeating the score.`
    : `You are an expert grading assistant. Your job is to grade student homework based on a rubric.

IMPORTANT: Your response must be a JSON object with this exact structure:
{
  "correctAnswer": "<what the answer key shows as correct, or 'N/A' if no answer key provided>",
  "sectionFound": "<which section/problem you found in the answer key, e.g., 'Problem 2', 'Statement', etc.>",
  "studentAnswer": "<what the student wrote as their final answer>",
  "rubricItemIndexes": [<number>, <number>, ...],
  "reasoning": "<explanation>",
  "comment": "<empty string if full credit; otherwise one short sentence, ~15 words max>"
}

The rubricItemIndexes must be an array of rubric item indexes (0-based) that match the student's work.
- If multiple issues exist, include ALL applicable rubric item indexes
- If only one issue exists, the array should contain just one index
- The indexes will be applied in the order you provide them
- correctAnswer, sectionFound, and studentAnswer fields help with debugging and verification
- sectionFound MUST match the question you are grading - this is critical for accuracy!

The "comment" field is shown directly to the student.
- If the student receives full credit / a perfect score (no deductions on this question),
  set "comment" to an empty string "". Do NOT leave any praise or filler.
- Otherwise: ONE short sentence, ~15 words max. Point at the specific mistake.
  No greetings, no sign-offs, no restating the rubric label, no repeating the score.`;

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log(`║              SENDING REQUEST TO ${provider.toUpperCase().padEnd(28)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('🤖 API Configuration:');
  console.log('  - Provider:', provider);
  console.log('  - Model:', model);
  console.log('  - Temperature: 0.3');
  console.log('  - Paper mode:', isPaperMode);
  console.log('');
  console.log('📝 Grading Context:');
  console.log('  - Question:', question);
  console.log('  - Rubric items count:', rubricItems.length);
  console.log('  - Rubric items:', rubricItems.map((item, i) => `[${i}] ${item.label} (${item.points})`).join(', '));
  console.log('');
  console.log('🖼️ Images Being Sent:');
  console.log('  - Answer key images:', answerKeyImages?.length || 0);
  console.log('  - Student submission images:', submissionImages.length);
  console.log('  - TOTAL images in request:', (answerKeyImages?.length || 0) + submissionImages.length);
  console.log('');

  // Normalize submission images to bare base64 strings (drop {type, data} wrappers)
  const allImages = [
    ...(answerKeyImages || []),
    ...(submissionImages || []).map(img =>
      typeof img === 'string' ? img : (img.data || '')
    )
  ].filter(img => img && img.length > 0);

  // Larger max-tokens budget for paper mode — many rubric items, longer reasoning
  const maxOutputTokens = isPaperMode ? 3000 : 1000;

  // Dispatch to provider
  let content;
  let usage;
  try {
    if (provider === 'gemini') {
      ({ content, usage } = await callGeminiGenerate(apiKey, model, systemPrompt, prompt, allImages, maxOutputTokens));
    } else if (provider === 'anthropic') {
      ({ content, usage } = await callClaudeMessages(apiKey, model, systemPrompt, prompt, allImages, maxOutputTokens));
    } else {
      ({ content, usage } = await callOpenAIChat(apiKey, model, systemPrompt, prompt, allImages, maxOutputTokens));
    }
  } catch (apiError) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error(`║           ${provider.toUpperCase()} API CALL FAILED`.padEnd(64) + '║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('Error message:', apiError.message);
    throw apiError;
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                   AI RESPONSE RECEIVED                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('📥 Raw Response:');
  console.log(content);
  if (usage) {
    console.log('💰 Token Usage:', usage);
  }
  console.log('');

  // Parse JSON response — tolerant of markdown code fences (Claude can emit them)
  let parsedResult;
  try {
    parsedResult = JSON.parse(content);
  } catch (e) {
    // Try to strip a ```json ... ``` wrapper or grab the first {...} block
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = fenceMatch
      ? fenceMatch[1]
      : content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
    try {
      parsedResult = JSON.parse(candidate);
    } catch (e2) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response from AI: ' + e.message);
    }
  }

  console.log('✅ PARSED RESULT:');
  console.log('  - Parsed JSON:', parsedResult);

  // Support both old format (single index) and new format (array of indexes)
  let rubricItemIndexes;
  if (Array.isArray(parsedResult.rubricItemIndexes)) {
    rubricItemIndexes = parsedResult.rubricItemIndexes;
  } else if (typeof parsedResult.rubricItemIndex === 'number') {
    // Backward compatibility: convert single index to array
    rubricItemIndexes = [parsedResult.rubricItemIndex];
  } else {
    throw new Error('Invalid response format: missing rubricItemIndexes or rubricItemIndex');
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    AI GRADING DECISION                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              🔍 ANSWER EXTRACTION DEBUG 🔍                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🎯 TARGET QUESTION BEING GRADED:', question);
  console.log('   (AI should extract answers ONLY for this question!)');
  console.log('');

  // Show which section the AI found
  if (parsedResult.sectionFound) {
    console.log('📍 SECTION AI IDENTIFIED IN ANSWER KEY:', parsedResult.sectionFound);

    if (isPaperMode) {
      // In paper mode the whole submission is the answer; sectionFound is informational only
      console.log('   ℹ️ Paper mode — section verification skipped (whole submission is the answer)');
    } else {
      // Verification: does the section match the target question?
      const targetQuestionLower = question.toLowerCase();
      const sectionFoundLower = parsedResult.sectionFound.toLowerCase();
      const sectionsMatch = targetQuestionLower.includes(sectionFoundLower) ||
                            sectionFoundLower.includes(targetQuestionLower) ||
                            targetQuestionLower === sectionFoundLower;

      if (sectionsMatch) {
        console.log('   ✅ CORRECT - AI found the right section!');
      } else {
        console.error('   ❌❌❌ WRONG SECTION! ❌❌❌');
        console.error('   Expected section for:', question);
        console.error('   But AI looked at:', parsedResult.sectionFound);
        console.error('   THIS IS A CRITICAL ERROR - THE AI IS GRADING THE WRONG PROBLEM!');
      }
    }
    console.log('');
  }

  console.log('📘 ANSWER FROM SOLUTION KEY:');
  console.log('   ╭────────────────────────────────────────────────────────╮');
  console.log('   │', (parsedResult.correctAnswer || 'N/A').padEnd(56), '│');
  console.log('   ╰────────────────────────────────────────────────────────╯');
  console.log('');
  console.log('📝 ANSWER FROM STUDENT SUBMISSION:');
  console.log('   ╭────────────────────────────────────────────────────────╮');
  console.log('   │', (parsedResult.studentAnswer || 'N/A').padEnd(56), '│');
  console.log('   ╰────────────────────────────────────────────────────────╯');
  console.log('');
  console.log('');

  // Visual comparison if both answers are provided
  if (parsedResult.correctAnswer && parsedResult.studentAnswer &&
      parsedResult.correctAnswer !== 'N/A') {
    const correctNormalized = String(parsedResult.correctAnswer).trim().toLowerCase().replace(/\s+/g, '');
    const studentNormalized = String(parsedResult.studentAnswer).trim().toLowerCase().replace(/\s+/g, '');
    const exactMatch = correctNormalized === studentNormalized;

    console.log('  🔍 Comparing Answers:');
    console.log('     Correct (normalized):', correctNormalized);
    console.log('     Student (normalized):', studentNormalized);
    console.log('     Exact string match?', exactMatch);
    console.log('');

    // Check which rubric item was selected
    const correctRubricSelected = rubricItemIndexes.some(idx => {
      const label = rubricItems[idx]?.label.toLowerCase();
      return label.includes('correct') && !label.includes('incorrect');
    });

    if (correctRubricSelected) {
      console.log('  ✅✅✅ AI MARKED AS CORRECT ✅✅✅');
      if (!exactMatch) {
        console.log('  📝 Note: Answers not exact match, but AI deemed them mathematically equivalent');
        console.log('  💡 AI reasoning:', parsedResult.reasoning);
      }
    } else {
      console.error('  ❌❌❌ AI MARKED AS INCORRECT ❌❌❌');
      console.error('  💡 AI reasoning:', parsedResult.reasoning);
      if (exactMatch) {
        console.warn('  ⚠️ WARNING: Answers appear to match exactly but AI marked incorrect!');
      }
    }
    console.log('');
  } else if (parsedResult.correctAnswer === 'N/A') {
    console.warn('  ⚠️ No answer key provided - AI graded without solution comparison');
    console.log('');
  }

  console.log('🎯 Grading Decision:');
  console.log('  - Selected rubric indexes:', rubricItemIndexes);
  console.log('  - Selected rubric items:', rubricItemIndexes.map(idx =>
    `[${idx}] ${rubricItems[idx]?.label} (${rubricItems[idx]?.points})`
  ).join(', '));
  console.log('');
  console.log('💭 AI Reasoning:');
  console.log('  ', parsedResult.reasoning);
  console.log('');

  return {
    rubricItemIndexes: rubricItemIndexes,
    reasoning: parsedResult.reasoning,
    comment: typeof parsedResult.comment === 'string' ? parsedResult.comment.trim() : '',
    rawResponse: content
  };
}

/**
 * Call OpenAI chat completions API.
 * Returns { content: string, usage: object }.
 */
async function callOpenAIChat(apiKey, model, systemPrompt, userPrompt, imagesBase64, maxTokens) {
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        ...imagesBase64.map(b64 => ({
          type: 'image_url',
          image_url: { url: `data:${detectImageMediaType(b64)};base64,${b64}` }
        }))
      ]
    }
  ];

  console.log(`🌐 Calling OpenAI API (model=${model})...`);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    let errMsg;
    try {
      const errBody = await response.json();
      errMsg = errBody.error?.message || JSON.stringify(errBody);
    } catch (e) {
      errMsg = await response.text();
    }
    throw new Error(`OpenAI API error (${response.status}): ${errMsg}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned no content');
  }
  return {
    content,
    usage: result.usage
  };
}

/**
 * Call Google Gemini generateContent API.
 * Returns { content: string, usage: object }.
 *
 * Gemini's request format is different from OpenAI's:
 *   - System prompt goes in `systemInstruction`
 *   - Images use `inline_data` with `mime_type` and base64 `data`
 *   - JSON mode uses `responseMimeType: 'application/json'`
 */
async function callGeminiGenerate(apiKey, model, systemPrompt, userPrompt, imagesBase64, maxTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [{ text: userPrompt }];
  for (const b64 of imagesBase64) {
    parts.push({
      inline_data: {
        mime_type: detectImageMediaType(b64),
        data: b64
      }
    });
  }

  // Gemini 2.5 Pro reserves part of maxOutputTokens for *thinking*. If the
  // model spends the whole budget thinking, finishReason=MAX_TOKENS comes back
  // with no text. We give it a generous total budget and explicitly cap
  // thinking so there's always room left for the JSON response.
  const isGemini25 = /gemini-2\.5/.test(model);
  const totalOutputBudget = Math.max(maxTokens, isGemini25 ? 16384 : 4096);
  const thinkingBudget = isGemini25 ? Math.floor(totalOutputBudget * 0.5) : 0;

  const generationConfig = {
    temperature: 0.3,
    maxOutputTokens: totalOutputBudget,
    responseMimeType: 'application/json'
  };
  if (isGemini25) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

  const body = {
    contents: [{ role: 'user', parts }],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig
  };

  console.log(`  Gemini token budget: total=${totalOutputBudget}, thinking=${thinkingBudget}`);

  console.log(`🌐 Calling Gemini API (model=${model})...`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errMsg;
    try {
      const errBody = await response.json();
      errMsg = errBody.error?.message || JSON.stringify(errBody);
    } catch (e) {
      errMsg = await response.text();
    }
    throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini returned no candidates: ' + JSON.stringify(result));
  }

  // Surface a useful error if Gemini stopped due to safety / token limit
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`⚠️ Gemini finishReason=${candidate.finishReason}`);
  }

  // Gemini returns parts; concatenate any text parts to be safe
  const textParts = (candidate.content?.parts || [])
    .map(p => p.text)
    .filter(t => typeof t === 'string');
  const content = textParts.join('').trim();

  if (!content) {
    const hint = candidate.finishReason === 'MAX_TOKENS'
      ? ' — Gemini spent its entire token budget on thinking and produced no output text. ' +
        'Try gemini-2.5-flash (faster, less thinking) or reduce the prompt size.'
      : '';
    throw new Error(
      `Gemini returned no text content (finishReason=${candidate.finishReason}).${hint} ` +
      `Usage: ${JSON.stringify(result.usageMetadata)}`
    );
  }

  return {
    content,
    usage: result.usageMetadata
  };
}

/**
 * Call Anthropic Messages API.
 * Returns { content: string, usage: object }.
 *
 * Notes:
 * - Uses anthropic-dangerous-direct-browser-access header so the extension's
 *   service worker can hit the API without a backend proxy.
 * - Claude returns content as an array of typed blocks; we concatenate text blocks.
 * - Claude sometimes wraps JSON in markdown fences even when asked not to;
 *   the JSON parser downstream already handles that case.
 */
async function callClaudeMessages(apiKey, model, systemPrompt, userPrompt, imagesBase64, maxTokens) {
  const userContent = [{ type: 'text', text: userPrompt }];
  for (const b64 of imagesBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: detectImageMediaType(b64),
        data: b64
      }
    });
  }

  // Claude doesn't have Gemini's thinking-budget pitfall, but reasoning-heavy
  // grading still needs headroom. 8k is plenty for a structured JSON response.
  const claudeMaxTokens = Math.max(maxTokens, 4096);

  const body = {
    model,
    max_tokens: claudeMaxTokens,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userContent }
    ]
  };

  console.log(`🌐 Calling Claude API (model=${model}, max_tokens=${claudeMaxTokens})...`);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errMsg;
    try {
      const errBody = await response.json();
      errMsg = errBody.error?.message || JSON.stringify(errBody);
    } catch (e) {
      errMsg = await response.text();
    }
    throw new Error(`Claude API error (${response.status}): ${errMsg}`);
  }

  const result = await response.json();
  const textBlocks = (result.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text);
  const content = textBlocks.join('').trim();

  if (!content) {
    throw new Error(
      `Claude returned no text content (stop_reason=${result.stop_reason}). ` +
      `Usage: ${JSON.stringify(result.usage)}`
    );
  }

  return {
    content,
    usage: result.usage
  };
}

/**
 * Build grading prompt
 */
function buildGradingPrompt(question, rubricItems, rubricText, answerKeyImages, submissionImageCount = 0, isPaperMode = false) {
  // ─────────────────────────────────────────────────────────────────────────
  // PAPER / MULTI-PAGE MODE
  // For multi-page research papers, reports, or essays the entire submission
  // IS the answer — no "find the right section" step. Grade holistically
  // against every rubric item and select all that apply.
  // ─────────────────────────────────────────────────────────────────────────
  if (isPaperMode) {
    let p = '';
    p += `You are grading a multi-page submission for: ${question}\n\n`;
    p += `═══════════════════════════════════════════════════════════════\n`;
    p += `MULTI-PAGE / PAPER MODE\n`;
    p += `═══════════════════════════════════════════════════════════════\n`;
    p += `The student's submission spans ${submissionImageCount} page(s) (e.g. a research paper, project report, or essay).\n`;
    p += `Read EVERY page carefully before grading. Do NOT grade based only on the first page.\n`;
    p += `The submission must be evaluated HOLISTICALLY against the rubric — the whole document is the answer.\n\n`;

    if (rubricText) {
      p += `=== RUBRIC / GRADING GUIDELINES ===\n`;
      p += `${rubricText}\n\n`;
    }

    p += `=== AVAILABLE RUBRIC ITEMS (select ALL that apply) ===\n`;
    p += `These are the rubric buttons on Gradescope. Each one applies an adjustment (positive or negative).\n`;
    p += `Select every item whose criterion genuinely matches what you observe in the submission:\n\n`;
    rubricItems.forEach((item, index) => {
      p += `Index ${index}: "${item.label}" (${item.points} points)\n`;
    });

    p += `\n=== HOW TO GRADE — READ THIS CAREFULLY ===\n`;
    p += `Step 1. Read ALL ${submissionImageCount} pages of the submission end-to-end before deciding anything.\n`;
    p += `Step 2. Group the rubric items by category (e.g. items about "Introduction", items about "Experiments").\n`;
    p += `   - In Gradescope deduction-style rubrics, each category usually has one "Correct" option AND\n`;
    p += `     one or more "deduction" options describing common failure modes.\n`;
    p += `   - Within a category, you typically select EITHER the "Correct" option OR one or more deduction\n`;
    p += `     options — not both.\n`;
    p += `Step 3. Walk through each rubric item one at a time and ask:\n`;
    p += `   "Does the submission specifically violate this criterion? Can I cite a page and explain why?"\n`;
    p += `   - If YES → include this index.\n`;
    p += `   - If NO → do not include it.\n`;
    p += `Step 4. For categories where no deduction applies, include the corresponding "Correct" item.\n`;
    p += `\n`;
    p += `🚫 ANTI-PATTERNS TO AVOID (these are the most common grading mistakes):\n`;
    p += `   ❌ Selecting ONLY "Correct" items for everything — full marks regardless of paper quality.\n`;
    p += `      A real graduate paper almost never satisfies every rubric criterion perfectly. Look harder.\n`;
    p += `   ❌ Selecting EVERY deduction — this gives 0 points even though most papers earn partial credit.\n`;
    p += `      Only select a deduction if you can cite specific evidence of the failure.\n`;
    p += `   ❌ Defaulting to the same pattern for every student. Each submission is different.\n`;
    p += `\n`;
    p += `✅ NORMAL OUTCOME: a typical paper earns partial credit — you should usually select a MIX of\n`;
    p += `   "Correct" items (categories where the criterion was met) and "deduction" items (categories\n`;
    p += `   with specific, citable issues). Pure full-credit and pure zero are both rare.\n`;
    p += `\n`;
    p += `Be fair, rigorous, and specific. Cite page numbers. Do not invent issues; do not gloss over real ones.\n\n`;

    if (answerKeyImages && answerKeyImages.length > 0) {
      p += `Reference materials (${answerKeyImages.length} image(s)) are provided next, followed by the ${submissionImageCount}-page student submission.\n`;
      p += `Use the reference as guidance only — for papers/essays the rubric is the source of truth, not exact answer matching.\n\n`;
    } else {
      p += `No reference answer key is provided. Evaluate against the rubric criteria and standards for a graduate-level paper.\n\n`;
    }

    p += `=== RESPONSE FORMAT ===\n`;
    p += `Return ONLY a JSON object with this exact structure:\n`;
    p += `{\n`;
    p += `  "correctAnswer": "N/A",\n`;
    p += `  "sectionFound": "Full Paper",\n`;
    p += `  "studentAnswer": "<one-sentence summary of what the student submitted>",\n`;
    p += `  "rubricItemIndexes": [<number>, <number>, ...],\n`;
    p += `  "reasoning": "<per-rubric-item reasoning. For each selected index, briefly state which criterion is met/violated and cite the page or section.>"\n`;
    p += `}\n\n`;
    p += `RULES:\n`;
    p += `- rubricItemIndexes must be an ARRAY of integers (e.g. [0, 2, 5]).\n`;
    p += `- Each index must be in the range 0..${rubricItems.length - 1}.\n`;
    p += `- Include EVERY applicable rubric item, not just one.\n`;
    p += `- If the work earns full credit on every category, select only the "Correct" / full-credit items.\n`;
    p += `- Never select "No submission" if any student work is visible.\n\n`;

    p += `=== STUDENT SUBMISSION (${submissionImageCount} pages) ===\n`;
    p += `The full submission appears in the images below.\n`;
    return p;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE-QUESTION MODE (original behavior)
  // ─────────────────────────────────────────────────────────────────────────
  let prompt = `You are grading a student's homework submission for: ${question}\n\n`;

  // CRITICAL: Tell AI which specific question to focus on
  prompt += `╔═══════════════════════════════════════════════════════════════╗\n`;
  prompt += `║  🎯 CRITICAL: YOU ARE GRADING THIS SPECIFIC QUESTION ONLY    ║\n`;
  prompt += `╚═══════════════════════════════════════════════════════════════╝\n`;
  prompt += `TARGET QUESTION: "${question}"\n\n`;
  prompt += `⚠️⚠️⚠️ EXTREMELY IMPORTANT - READ THIS CAREFULLY ⚠️⚠️⚠️\n\n`;
  prompt += `The answer key images contain MULTIPLE problems (Problem 0, Problem 1, Problem 2, etc.)\n`;
  prompt += `The student submission images may also contain MULTIPLE problems.\n\n`;
  prompt += `YOU MUST:\n`;
  prompt += `1. SCAN the answer key images to find the section labeled "${question}"\n`;
  prompt += `2. ONLY extract the answer from that specific section\n`;
  prompt += `3. IGNORE all other problem sections (do NOT extract from Problem 0 if you're grading Problem 2!)\n`;
  prompt += `4. SCAN the student submission to find the section for "${question}"\n`;
  prompt += `5. ONLY extract the student's answer from that specific section\n\n`;
  prompt += `EXAMPLE OF WHAT YOU SHOULD DO:\n`;
  prompt += `- If question = "2: Problem 2", look for "Problem 2" or "2:" in the images\n`;
  prompt += `- If question = "1: Statement", look for "Statement" or "1:" in the images\n`;
  prompt += `- Extract answer ONLY from that labeled section\n`;
  prompt += `- Skip over all other problem sections\n\n`;
  prompt += `EXAMPLE OF WHAT NOT TO DO:\n`;
  prompt += `❌ Grading "2: Problem 2" but extracting answer from "Problem 0" or "Statement" section\n`;
  prompt += `❌ Extracting multiple answers from different problem sections\n`;
  prompt += `❌ Assuming the first answer you see is the correct one\n\n`;
  prompt += `VERIFICATION STEP:\n`;
  prompt += `Before extracting the answer, ask yourself:\n`;
  prompt += `"Is this answer from the section labeled '${question}'?"\n`;
  prompt += `If NO → Keep looking for the correct section\n`;
  prompt += `If YES → Extract this answer\n\n`;

  // Add rubric context if provided
  if (rubricText) {
    prompt += `=== RUBRIC CONTEXT ===\n${rubricText}\n\n`;
  }

  // Add rubric items
  prompt += `=== AVAILABLE GRADING OPTIONS ===\n`;
  prompt += `Select one or more rubric items by their indexes (0-based):\n\n`;
  rubricItems.forEach((item, index) => {
    prompt += `Index ${index}: "${item.label}" (${item.points} points)\n`;
  });

  prompt += `\n=== YOUR TASK ===\n`;
  if (answerKeyImages && answerKeyImages.length > 0) {
    prompt += `⚠️⚠️⚠️ CRITICAL INSTRUCTIONS - READ CAREFULLY ⚠️⚠️⚠️\n\n`;
    prompt += `ANSWER KEY PROVIDED: The images below (immediately after this text) show the CORRECT solution.\n`;
    prompt += `The student's submission appears AFTER the answer key images.\n\n`;
    prompt += `YOU MUST FOLLOW THESE RULES:\n`;
    prompt += `1. The answer key shows the CORRECT ANSWER for this question\n`;
    prompt += `2. You MUST compare the student's final answer to the answer key's final answer\n`;
    prompt += `3. Mark as "Correct" if the student's answer is MATHEMATICALLY EQUIVALENT to the answer key\n`;
    prompt += `4. If the student's answer is MATHEMATICALLY DIFFERENT from the answer key, it is WRONG\n`;
    prompt += `5. Accept equivalent forms: simplified, unsimplified, different but equal expressions\n`;
    prompt += `6. Do NOT accept answers that are numerically different, even if the work looks reasonable\n\n`;
    prompt += `MATHEMATICAL EQUIVALENCE - THESE ARE CORRECT:\n`;
    prompt += `- Answer key: "1/5", Student: "2/10" → CORRECT ✅ (same value: 0.2)\n`;
    prompt += `- Answer key: "1/5", Student: "0.2" → CORRECT ✅ (same value)\n`;
    prompt += `- Answer key: "1/5", Student: "1/5" → CORRECT ✅ (exact match)\n`;
    prompt += `- Answer key: "3", Student: "6/2" → CORRECT ✅ (same value: 3)\n`;
    prompt += `- Answer key: "x²", Student: "x*x" → CORRECT ✅ (equivalent expressions)\n\n`;
    prompt += `DIFFERENT VALUES - THESE ARE WRONG:\n`;
    prompt += `- Answer key: "1/5", Student: "14c/15" → WRONG ❌ (different values)\n`;
    prompt += `- Answer key: "1/5", Student: "1/10" → WRONG ❌ (0.2 ≠ 0.1)\n`;
    prompt += `- Answer key: "x = 3", Student: "x = 5" → WRONG ❌ (different values)\n`;
    prompt += `- Answer key: "42", Student: "24" → WRONG ❌ (different values)\n\n`;
    prompt += `GRADING PROCESS:\n`;
    prompt += `1. IDENTIFY the specific question "${question}" in the answer key images\n`;
    prompt += `2. Extract the final answer ONLY for "${question}" from the answer key (ignore other problems!)\n`;
    prompt += `3. IDENTIFY the specific question "${question}" in the student's submission\n`;
    prompt += `4. Extract the final answer ONLY for "${question}" from the student's work (ignore other problems!)\n`;
    prompt += `5. Check if they are mathematically equivalent (simplify both if needed)\n`;
    prompt += `6. If equivalent → Select "Correct" rubric item\n`;
    prompt += `7. If not equivalent → Select appropriate "incorrect" rubric item\n\n`;
    prompt += `⚠️ REMINDER: If the images contain Problem 1, Problem 2, Problem 3, etc., ONLY look at "${question}"!\n\n`;
  } else {
    prompt += `1. Carefully review the student's work in the submission images\n`;
    prompt += `2. No answer key provided - evaluate based on mathematical correctness and completeness\n`;
  }
  prompt += `Final steps:\n`;
  prompt += `- Evaluate the quality and correctness of the student's submission\n`;
  prompt += `- Select ALL rubric items (by index) that apply to the student's work\n`;
  prompt += `  * If multiple issues exist (e.g., plot incorrect AND pdf incorrect), include ALL applicable indexes\n`;
  prompt += `  * If only one issue exists, return an array with just that one index\n`;
  prompt += `  * If the work is fully correct, select only the "Correct" option\n`;
  prompt += `- Provide clear reasoning for your decision\n\n`;

  prompt += `=== RESPONSE FORMAT ===\n`;
  prompt += `Return ONLY a JSON object with this exact structure:\n`;
  prompt += `{\n`;
  if (answerKeyImages && answerKeyImages.length > 0) {
    prompt += `  "correctAnswer": "<extract the final answer from the answer key images>",\n`;
    prompt += `  "sectionFound": "<which section/problem you found the answer in, e.g., 'Problem 2' or 'Statement'>",\n`;
  } else {
    prompt += `  "correctAnswer": "N/A",\n`;
    prompt += `  "sectionFound": "N/A",\n`;
  }
  prompt += `  "studentAnswer": "<extract the student's final answer from their submission>",\n`;
  prompt += `  "rubricItemIndexes": [<number>, <number>, ...],\n`;
  prompt += `  "reasoning": "<your explanation>"\n`;
  prompt += `}\n\n`;

  prompt += `IMPORTANT: \n`;
  prompt += `- rubricItemIndexes must be an ARRAY of numbers (e.g., [0], [1, 3], [0, 2, 4])\n`;
  prompt += `- Each number must be from 0 to ${rubricItems.length - 1}\n`;
  prompt += `- Include ALL applicable rubric items, not just the most severe one\n`;
  prompt += `- correctAnswer and studentAnswer should show the actual mathematical values (simplified if possible)\n`;
  if (answerKeyImages && answerKeyImages.length > 0) {
    prompt += `- sectionFound MUST be the specific section/problem you identified (e.g., "Problem 2" not "Problem 0")\n`;
    prompt += `- VERIFY that sectionFound matches the target question "${question}" before submitting!\n`;
    prompt += `- In your reasoning, explain whether the answers are mathematically equivalent\n`;
    prompt += `- In your reasoning, mention which section you found the answer in (for verification)\n`;
    prompt += `- Examples: "2/10 simplifies to 1/5, matching the answer key" or "14c/15 ≠ 1/5, these are different values"\n`;
  }
  prompt += `- Be fair but rigorous in your grading\n`;
  prompt += `- Consider partial credit when appropriate\n\n`;
  prompt += `⚠️ CRITICAL - About "No submission/selection" rubric items:\n`;
  prompt += `- ONLY select "No submission" if the student provided absolutely NO work at all\n`;
  prompt += `- If you can see ANY student work in the images (even if incorrect), you MUST grade it\n`;
  prompt += `- Do NOT use "No submission" for wrong answers - use the appropriate "wrong" rubric items instead\n`;
  prompt += `- "No submission" means literally zero work submitted, not "wrong work submitted"\n\n`;

  if (answerKeyImages && answerKeyImages.length > 0) {
    prompt += `\n`;
    prompt += `╔═══════════════════════════════════════════════════════════════╗\n`;
    prompt += `║  ⭐ ANSWER KEY (CORRECT SOLUTION) - ${answerKeyImages.length} IMAGE(S) ⭐  ║\n`;
    prompt += `╚═══════════════════════════════════════════════════════════════╝\n`;
    prompt += `\n`;
    prompt += `The next ${answerKeyImages.length} image(s) show the CORRECT, OFFICIAL solution.\n`;
    prompt += `This is what the student's answer MUST match to be marked as "Correct".\n`;
    prompt += `\n`;
    prompt += `📸 Order of images you will see:\n`;
    prompt += `   1. Answer key images (${answerKeyImages.length} image${answerKeyImages.length > 1 ? 's' : ''}) ← THE CORRECT ANSWER\n`;
    prompt += `   2. Student submission images ← COMPARE THIS TO ANSWER KEY\n`;
    prompt += `\n`;
    prompt += `⚠️ REMINDER: Only select "Correct" if the student's answer MATCHES the answer key!\n`;
    prompt += `\n`;
  }

  prompt += `=== STUDENT SUBMISSION ===\n`;
  prompt += `The student's work is shown in the images below:\n`;

  return prompt;
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Gradescope AI Grader installed');
    // Open options page on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});
