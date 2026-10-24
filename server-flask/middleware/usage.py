"""
Usage Tracking Middleware
Track API usage per user
"""

from functools import wraps
from flask import request
from datetime import datetime

def get_users():
    from routes.auth import users
    return users

def track_usage(f):
    """Decorator to track usage after request"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Execute the route function
        response = f(*args, **kwargs)

        # Track usage after successful response
        if hasattr(request, 'user'):
            users = get_users()
            user = users.get(request.user['email'])

            if user:
                # Increment request count
                user['usage']['total_requests'] += 1
                user['usage']['last_request'] = datetime.utcnow().isoformat()

                # Track tokens if available
                if hasattr(request, 'tokens_used'):
                    user['usage']['total_tokens'] += request.tokens_used

                print(f"Usage update for {request.user['email']}:")
                print(f"  Total requests: {user['usage']['total_requests']}")
                print(f"  Total tokens: {user['usage']['total_tokens']}")
                print(f"  Limit: {user['limits']['requests_per_day']}")

        return response

    return decorated_function
