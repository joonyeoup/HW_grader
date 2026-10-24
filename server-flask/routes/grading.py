"""
Grading API Routes
Protected endpoints that call OpenAI API
"""

from flask import Blueprint, request, jsonify
import openai
import os
import json
from middleware.auth import require_api_key
from middleware.usage import track_usage

grading_bp = Blueprint('grading', __name__)

@grading_bp.route('/grade', methods=['POST'])
@require_api_key
@track_usage
def grade():
    """Grade a student submission using OpenAI API"""
    try:
        data = request.get_json()
        submission_data = data.get('submissionData', {})
        rubric_items = data.get('rubricItems', [])
        question = data.get('question', '')
        rubric_text = data.get('rubricText', '')
        answer_key_images = data.get('answerKeyImages', [])

        # Get user from request context (set by middleware)
        user = request.user

        print(f"Grading request from user {user['email']}:")
        print(f"  Question: {question}")
        print(f"  Student: {submission_data.get('studentName', 'Unknown')}")
        print(f"  Rubric items: {len(rubric_items)}")
        print(f"  Answer key images: {len(answer_key_images or [])}")
        print(f"  Submission images: {len(submission_data.get('images', []))}")

        # Validate input
        if not rubric_items or len(rubric_items) == 0:
            return jsonify({'error': 'No rubric items provided'}), 400

        # Build grading prompt
        prompt = build_grading_prompt(question, rubric_items, rubric_text)

        # Build messages for OpenAI
        message_content = [{'type': 'text', 'text': prompt}]

        # Add answer key images
        if answer_key_images:
            for img in answer_key_images:
                message_content.append({
                    'type': 'image_url',
                    'image_url': {'url': f'data:image/png;base64,{img}'}
                })

        # Add submission images
        if submission_data.get('images'):
            for img in submission_data['images']:
                message_content.append({
                    'type': 'image_url',
                    'image_url': {'url': f'data:image/png;base64,{img}'}
                })

        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model=os.getenv('OPENAI_MODEL', 'gpt-4o'),
            messages=[
                {
                    'role': 'system',
                    'content': """You are an expert grading assistant. Your job is to grade student homework based on a rubric.

IMPORTANT: Your response must be a JSON object with this exact structure:
{
  "rubricItemIndex": <number>,
  "reasoning": "<explanation>"
}

The rubricItemIndex must be the array index (0-based) of the rubric item that best matches the student's work."""
                },
                {
                    'role': 'user',
                    'content': message_content
                }
            ],
            max_tokens=int(os.getenv('MAX_TOKENS', 1000)),
            temperature=float(os.getenv('TEMPERATURE', 0.3)),
            response_format={'type': 'json_object'}
        )

        content = response.choices[0].message.content

        # Parse JSON response
        try:
            parsed_result = json.loads(content)
        except json.JSONDecodeError:
            print(f"Failed to parse OpenAI response: {content}")
            return jsonify({'error': 'Invalid response from AI'}), 500

        print(f"Grading result: {parsed_result}")

        # Store tokens used for tracking (will be used by middleware)
        request.tokens_used = response.usage.total_tokens

        return jsonify({
            'rubricItemIndex': parsed_result['rubricItemIndex'],
            'reasoning': parsed_result['reasoning'],
            'rawResponse': content,
            'tokensUsed': response.usage.total_tokens
        }), 200

    except openai.error.AuthenticationError:
        print("OpenAI authentication error")
        return jsonify({'error': 'Server OpenAI API key is invalid'}), 500

    except openai.error.RateLimitError:
        print("OpenAI rate limit exceeded")
        return jsonify({'error': 'OpenAI rate limit exceeded. Please try again later.'}), 429

    except Exception as e:
        print(f"Grading error: {e}")
        return jsonify({'error': str(e) or 'Failed to grade submission'}), 500

def build_grading_prompt(question, rubric_items, rubric_text):
    """Build the grading prompt"""
    prompt = f"You are grading a student's homework submission for: {question}\n\n"

    if rubric_text:
        prompt += f"=== RUBRIC CONTEXT ===\n{rubric_text}\n\n"

    prompt += "=== AVAILABLE GRADING OPTIONS ===\n"
    prompt += "Select ONE rubric item by its index (0-based):\n\n"

    for index, item in enumerate(rubric_items):
        prompt += f"Index {index}: \"{item['label']}\" ({item['points']} points)\n"

    prompt += "\n=== YOUR TASK ===\n"
    prompt += "1. Carefully review the student's work in the submission images below\n"
    prompt += "2. If answer key images are provided, compare the student's work against them\n"
    prompt += "3. Evaluate the quality and correctness of the student's submission\n"
    prompt += "4. Select the rubric item (by index) that best matches the student's performance\n"
    prompt += "5. Provide clear reasoning for your decision\n\n"

    prompt += "=== RESPONSE FORMAT ===\n"
    prompt += "Return ONLY a JSON object with this exact structure:\n"
    prompt += "{\n"
    prompt += f"  \"rubricItemIndex\": <number from 0 to {len(rubric_items) - 1}>,\n"
    prompt += "  \"reasoning\": \"<your explanation>\"\n"
    prompt += "}\n\n"

    prompt += "IMPORTANT: \n"
    prompt += "- rubricItemIndex must be a number (0 = first item, 1 = second item, etc.)\n"
    prompt += "- Be fair but rigorous in your grading\n"
    prompt += "- Consider partial credit when appropriate\n\n"

    prompt += "=== STUDENT SUBMISSION ===\n"
    prompt += "The student's work is shown in the images below:\n"

    return prompt
