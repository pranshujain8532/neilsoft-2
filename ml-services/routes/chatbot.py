"""
Chatbot endpoint using Gemini AI
"""

from flask import Blueprint, request, jsonify
from services.gemini_chatbot import get_chatbot_response

chatbot_bp = Blueprint('chatbot', __name__)

@chatbot_bp.route('', methods=['POST'])
def chat():
    """Handle chat requests with Gemini AI"""
    try:
        data = request.json
        message = data.get('message', '')
        history = data.get('history', [])
        
        if not message:
            return jsonify({
                'response': 'Please ask me a question about green hydrogen!',
                'success': True
            })
        
        # Get response from Gemini
        response = get_chatbot_response(message, history)
        
        return jsonify({
            'response': response,
            'success': True,
            'model': 'Gemini AI'
        })
        
    except Exception as e:
        return jsonify({
            'response': 'I apologize, but I encountered an error. Please try asking your question again.',
            'success': False,
            'error': str(e)
        }), 500
