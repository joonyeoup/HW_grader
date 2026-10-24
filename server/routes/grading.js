/**
 * Grading API Routes
 * Protected endpoints that call OpenAI API
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { authenticateToken } = require('../middleware/auth');
const { trackUsage } = require('../middleware/usage');

// Initialize OpenAI with your API key (stored on server)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/grading/grade
 * Grade a student submission
 *
 * Protected: Requires authentication token
 */
router.post('/grade', authenticateToken, trackUsage, async (req, res) => {
  try {
    const { submissionData, rubricItems, question, rubricText, answerKeyImages } = req.body;

    console.log(`Grading request from user ${req.user.email}:`, {
      question,
      student: submissionData.studentName,
      rubricItemCount: rubricItems.length,
      hasAnswerKey: !!answerKeyImages?.length,
      submissionImageCount: submissionData.images?.length || 0
    });

    // Validate input
    if (!rubricItems || rubricItems.length === 0) {
      return res.status(400).json({ error: 'No rubric items provided' });
    }

    // Build the grading prompt
    const prompt = buildGradingPrompt(question, rubricItems, rubricText);

    // Build messages array for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are an expert grading assistant. Your job is to grade student homework based on a rubric.

IMPORTANT: Your response must be a JSON object with this exact structure:
{
  "rubricItemIndex": <number>,
  "reasoning": "<explanation>"
}

The rubricItemIndex must be the array index (0-based) of the rubric item that best matches the student's work.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          // Add answer key images if provided
          ...(answerKeyImages || []).map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${img}`
            }
          })),
          // Add student submission images
          ...(submissionData.images || []).map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${img}`
            }
          }))
        ]
      }
    ];

    // Call OpenAI API (server-side - API key is protected!)
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      max_tokens: parseInt(process.env.MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.TEMPERATURE) || 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;

    // Parse JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    console.log('Grading result:', parsedResult);

    // Return result to client
    res.json({
      rubricItemIndex: parsedResult.rubricItemIndex,
      reasoning: parsedResult.reasoning,
      rawResponse: content,
      tokensUsed: response.usage.total_tokens
    });

  } catch (error) {
    console.error('Grading error:', error);

    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'Server OpenAI API key is invalid' });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'OpenAI rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({
      error: error.message || 'Failed to grade submission'
    });
  }
});

/**
 * Build grading prompt (same as before, but now server-side)
 */
function buildGradingPrompt(question, rubricItems, rubricText) {
  let prompt = `You are grading a student's homework submission for: ${question}\n\n`;

  if (rubricText) {
    prompt += `=== RUBRIC CONTEXT ===\n${rubricText}\n\n`;
  }

  prompt += `=== AVAILABLE GRADING OPTIONS ===\n`;
  prompt += `Select ONE rubric item by its index (0-based):\n\n`;
  rubricItems.forEach((item, index) => {
    prompt += `Index ${index}: "${item.label}" (${item.points} points)\n`;
  });

  prompt += `\n=== YOUR TASK ===\n`;
  prompt += `1. Carefully review the student's work in the submission images below\n`;
  prompt += `2. If answer key images are provided, compare the student's work against them\n`;
  prompt += `3. Evaluate the quality and correctness of the student's submission\n`;
  prompt += `4. Select the rubric item (by index) that best matches the student's performance\n`;
  prompt += `5. Provide clear reasoning for your decision\n\n`;

  prompt += `=== RESPONSE FORMAT ===\n`;
  prompt += `Return ONLY a JSON object with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "rubricItemIndex": <number from 0 to ${rubricItems.length - 1}>,\n`;
  prompt += `  "reasoning": "<your explanation>"\n`;
  prompt += `}\n\n`;

  prompt += `IMPORTANT: \n`;
  prompt += `- rubricItemIndex must be a number (0 = first item, 1 = second item, etc.)\n`;
  prompt += `- Be fair but rigorous in your grading\n`;
  prompt += `- Consider partial credit when appropriate\n\n`;

  prompt += `=== STUDENT SUBMISSION ===\n`;
  prompt += `The student's work is shown in the images below:\n`;

  return prompt;
}

module.exports = router;
