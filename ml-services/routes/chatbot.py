from flask import Blueprint, request, jsonify
from services.gemini_chatbot import get_chatbot_response

chatbot_bp = Blueprint('chatbot', __name__)

@chatbot_bp.route('', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        history = data.get('history', [])
        user_id = data.get('user_id', None)
        
        print(f"📨 Chat request: message='{message[:30]}...', user_id={user_id}")
        
        if not message:
            return jsonify({
                'response': 'Please ask me a question about green hydrogen, our plants, or your orders!',
                'success': True
            })
        
        response = get_chatbot_response(message, history, user_id)
        
        return jsonify({
            'response': response,
            'success': True,
            'model': 'Gemini AI + Supabase'
        })
        
    except Exception as e:
        print(f"Chatbot Route Error: {e}")
        return jsonify({
            'response': 'I apologize, but I encountered an error. Please try asking your question again.',
            'success': False,
            'error': str(e)
        }), 500
