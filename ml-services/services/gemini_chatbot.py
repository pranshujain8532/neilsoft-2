"""
Gemini AI Chatbot Service
Provides intelligent responses using Google's Gemini 2.0 Flash model
"""

import os
import google.generativeai as genai
from typing import List, Dict

class GeminiChatbot:
    def __init__(self):
        """Initialize Gemini chatbot with API key"""
        self.api_key = os.getenv('GEMINI_API_KEY', '')
        self.model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        
        if self.api_key and self.api_key != 'your_gemini_api_key':
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                self.enabled = True
                print(f"✅ Gemini API initialized with model: {self.model_name}")
            except Exception as e:
                print(f"⚠️  Failed to initialize Gemini: {e}")
                self.enabled = False
        else:
            self.enabled = False
            print("⚠️  Gemini API key not configured, using fallback responses")
        
        # System context for hydrogen domain
        self.system_context = """You are an expert AI assistant for a Green Hydrogen Production Platform. 
You help users understand:
- Green hydrogen production from renewable energy (Solar, Wind, Hydro)
- LCOH (Levelized Cost of Hydrogen) calculations
- Plant operations and efficiency
- Hydrogen storage and transportation
- Industrial applications and certifications
- Environmental benefits and carbon reduction

Keep responses concise, technical but accessible, and focused on the renewable hydrogen industry."""

    def get_response(self, message: str, history: List[Dict] = None) -> str:
        """Get response from Gemini or fallback"""
        
        if not self.enabled:
            return self._get_fallback_response(message)
        
        try:
            # Build conversation context
            prompt = f"{self.system_context}\n\nUser: {message}\n\nAssistant:"
            
            # Generate response
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error getting Gemini response: {e}")
            return self._get_fallback_response(message)
    
    def _get_fallback_response(self, message: str) -> str:
        """Provide fallback responses when Gemini is unavailable"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['price', 'cost', 'lcoh']):
            return "Our green hydrogen is competitively priced at $1.75-$2.05 per kg depending on the plant. Gujarat plant offers the best LCOH at $1.75/kg with 22% ROI. Our target is to maintain LCOH below $2/kg through renewable energy optimization."
        
        elif any(word in message_lower for word in ['plant', 'production', 'capacity']):
            return "We operate 3 hydrogen production plants:\n• Gujarat (150MW total): Best profitability, $15k daily profit\n• Maharashtra (120MW): Hydro-wind hybrid, $12k daily profit\n• Tamil Nadu (100MW): Solar-focused, $10k daily profit\n\nAll plants use 100% renewable energy with real-time ML optimization."
        
        elif any(word in message_lower for word in ['purity', 'quality', 'certification']):
            return "We offer three hydrogen grades:\n• Industrial (99.9% purity) - $2.80/kg\n• Premium (99.999% purity) - $4.20/kg\n• Bulk (99.5% purity) - $2.50/kg\n\nAll products are ISO 14687-2 certified with blockchain-verified green certificates."
        
        elif any(word in message_lower for word in ['solar', 'wind', 'hydro', 'renewable']):
            return "Our hydrogen is produced using multi-source renewable energy:\n• Solar: 80MW installed, 18% efficiency\n• Wind: 50MW with 10 turbines\n• Hydro: 20MW baseload\n\nReal-time weather data optimizes production across all sources for maximum efficiency."
        
        elif any(word in message_lower for word in ['ml', 'ai', 'predict', 'forecast']):
            return "Our AI/ML models provide:\n• Energy forecasting (LSTM) - predicts optimal production times\n• Safety monitoring (PINN) - 80%+ anomaly detection\n• Profit prediction - optimizes plant operations\n• Logistics optimization - efficient delivery routing\n\nAll models update in real-time with current weather and plant data."
        
        else:
            return "I'm your Green Hydrogen expert! I can help you with:\n• Product pricing and specifications\n• Plant operations and capacities\n• Renewable energy integration\n• Quality certifications\n• AI/ML optimization\n• Ordering and logistics\n\nWhat would you like to know?"

# Global instance
chatbot = GeminiChatbot()

def get_chatbot_response(message: str, history: List[Dict] = None) -> str:
    """Get response from chatbot"""
    return chatbot.get_response(message, history)
