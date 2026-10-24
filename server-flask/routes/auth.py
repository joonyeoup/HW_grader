"""
Authentication Routes
Handle user registration, login, and API keys
"""

from flask import Blueprint, request, jsonify
import secrets
import bcrypt
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# Simple in-memory user store (replace with database in production)
users = {}

def generate_api_key():
    """Generate a unique API key"""
    return 'gs_' + secrets.token_hex(32)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user and generate API key"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Check if user already exists
        if email in users:
            return jsonify({'error': 'User already exists'}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Generate API key
        api_key = generate_api_key()

        # Create user
        users[email] = {
            'email': email,
            'password': hashed_password,
            'api_key': api_key,
            'created_at': datetime.utcnow().isoformat(),
            'usage': {
                'total_requests': 0,
                'total_tokens': 0,
                'last_request': None
            },
            'plan': 'free',
            'limits': {
                'requests_per_day': 100
            }
        }

        print(f"New user registered: {email}")

        return jsonify({
            'message': 'Registration successful',
            'api_key': api_key,
            'email': email,
            'plan': users[email]['plan']
        }), 201

    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login and retrieve API key"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Find user
        user = users.get(email)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        print(f"User logged in: {email}")

        return jsonify({
            'message': 'Login successful',
            'api_key': user['api_key'],
            'email': user['email'],
            'plan': user['plan'],
            'usage': user['usage']
        }), 200

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/verify', methods=['GET'])
def verify():
    """Verify API key is valid"""
    api_key = request.headers.get('X-API-Key')

    if not api_key:
        return jsonify({'error': 'API key is required'}), 401

    # Find user by API key
    user = None
    for email, user_data in users.items():
        if user_data['api_key'] == api_key:
            user = {'email': email, **user_data}
            break

    if not user:
        return jsonify({'error': 'Invalid API key'}), 401

    return jsonify({
        'valid': True,
        'email': user['email'],
        'plan': user['plan'],
        'usage': user['usage']
    }), 200

@auth_bp.route('/usage', methods=['GET'])
def get_usage():
    """Get current usage stats"""
    api_key = request.headers.get('X-API-Key')

    if not api_key:
        return jsonify({'error': 'API key is required'}), 401

    # Find user by API key
    user = None
    user_email = None
    for email, user_data in users.items():
        if user_data['api_key'] == api_key:
            user = user_data
            user_email = email
            break

    if not user:
        return jsonify({'error': 'Invalid API key'}), 401

    return jsonify({
        'email': user_email,
        'plan': user['plan'],
        'usage': user['usage'],
        'limits': user['limits']
    }), 200
