"""
Authentication Middleware
Verify API keys and attach user to request
"""

from functools import wraps
from flask import request, jsonify

# Import users from routes.auth (in production, use database)
def get_users():
    from routes.auth import users
    return users

def require_api_key(f):
    """Decorator to require API key authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')

        if not api_key:
            return jsonify({'error': 'API key is required'}), 401

        # Find user by API key
        users = get_users()
        user = None
        user_email = None

        for email, user_data in users.items():
            if user_data['api_key'] == api_key:
                user = user_data
                user_email = email
                break

        if not user:
            return jsonify({'error': 'Invalid API key'}), 401

        # Check usage limits
        if user['usage']['total_requests'] >= user['limits']['requests_per_day']:
            return jsonify({
                'error': 'Daily request limit exceeded',
                'limit': user['limits']['requests_per_day'],
                'plan': user['plan'],
                'message': 'Upgrade to premium for unlimited requests'
            }), 429

        # Attach user to request context
        request.user = {
            'email': user_email,
            **user
        }

        return f(*args, **kwargs)

    return decorated_function
