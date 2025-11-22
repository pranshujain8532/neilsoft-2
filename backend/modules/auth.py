"""
Authentication Module for H2-OptiPlant
Handles JWT tokens, OAuth2, password hashing, and role-based access control
"""

import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os
from functools import wraps
from flask import request, jsonify

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "h2-optiplant-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# User roles
ROLE_ADMIN = "admin"
ROLE_CUSTOMER = "customer"

# ========================================
# PASSWORD HASHING
# ========================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ========================================
# JWT TOKEN MANAGEMENT
# ========================================

def create_access_token(user_id: str, email: str, role: str, name: str = "") -> str:
    """Create a JWT access token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "name": name,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_token(token: str) -> Optional[Dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def create_refresh_token(user_id: str) -> str:
    """Create a refresh token (longer expiration)"""
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

# ========================================
# FLASK DECORATORS FOR ROUTE PROTECTION
# ========================================

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Pass user info to route
        return f(current_user=payload, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != ROLE_ADMIN:
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated

def customer_required(f):
    """Decorator to require customer role"""
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != ROLE_CUSTOMER:
            return jsonify({'error': 'Customer access required'}), 403
        
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated

# ========================================
# OAUTH2 HELPERS
# ========================================

class OAuth2Provider:
    """OAuth2 provider configuration"""
    
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/callback/google")
    
    GITHUB_CLIENT_ID = os.getenv("GITHUB_OAUTH_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_OAUTH_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:5173/auth/callback/github")
    
    @staticmethod
    def get_google_auth_url() -> str:
        """Get Google OAuth2 authorization URL"""
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            "client_id": OAuth2Provider.GOOGLE_CLIENT_ID,
            "redirect_uri": OAuth2Provider.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    @staticmethod
    def get_github_auth_url() -> str:
        """Get GitHub OAuth2 authorization URL"""
        base_url = "https://github.com/login/oauth/authorize"
        params = {
            "client_id": OAuth2Provider.GITHUB_CLIENT_ID,
            "redirect_uri": OAuth2Provider.GITHUB_REDIRECT_URI,
            "scope": "user:email"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"

def exchange_google_code(code: str) -> Optional[Dict]:
    """Exchange Google OAuth code for user info"""
    import requests
    
    # Exchange code for access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": OAuth2Provider.GOOGLE_CLIENT_ID,
        "client_secret": OAuth2Provider.GOOGLE_CLIENT_SECRET,
        "redirect_uri": OAuth2Provider.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    try:
        token_response = requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        access_token = token_response.json().get('access_token')
        
        # Get user info
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        
        return user_response.json()
    except Exception as e:
        print(f"Google OAuth error: {e}")
        return None

def exchange_github_code(code: str) -> Optional[Dict]:
    """Exchange GitHub OAuth code for user info"""
    import requests
    
    # Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    token_data = {
        "code": code,
        "client_id": OAuth2Provider.GITHUB_CLIENT_ID,
        "client_secret": OAuth2Provider.GITHUB_CLIENT_SECRET,
        "redirect_uri": OAuth2Provider.GITHUB_REDIRECT_URI
    }
    headers = {"Accept": "application/json"}
    
    try:
        token_response = requests.post(token_url, data=token_data, headers=headers)
        token_response.raise_for_status()
        access_token = token_response.json().get('access_token')
        
        # Get user info
        user_info_url = "https://api.github.com/user"
        headers = {"Authorization": f"token {access_token}"}
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        
        user_data = user_response.json()
        
        # Get email (might be in separate endpoint)
        email_url = "https://api.github.com/user/emails"
        email_response = requests.get(email_url, headers=headers)
        email_response.raise_for_status()
        emails = email_response.json()
        primary_email = next((e['email'] for e in emails if e['primary']), emails[0]['email'] if emails else None)
        
        user_data['email'] = primary_email
        return user_data
    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        return None

# ========================================
# UTILITY FUNCTIONS
# ========================================

def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    return True, "Password is strong"
