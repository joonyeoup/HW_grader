"""
Gradescope AI Grader - Flask Backend Server
Handles OpenAI API calls and user authentication
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import openai
from datetime import datetime

# Import routes
from routes.auth import auth_bp
from routes.grading import grading_bp

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'chrome-extension://*').split(',')
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per 15 minutes"],
    storage_uri="memory://"
)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(grading_bp, url_prefix='/api/grading')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# Error handlers
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'error': 'Too many requests. Please try again later.'
    }), 429

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'error': 'Internal server error'
    }), 500

# Main entry point
if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    debug = os.getenv('NODE_ENV') != 'production'

    print(f"🚀 Gradescope AI Grader Server (Flask) running on port {port}")
    print(f"📡 Health check: http://localhost:{port}/health")

    app.run(host='0.0.0.0', port=port, debug=debug)
