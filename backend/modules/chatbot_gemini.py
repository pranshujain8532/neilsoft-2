"""
Customer Chatbot using Gemini API
Generative AI assistant for hydrogen product recommendations and customer queries
"""

import os
import random
from typing import Dict, List
from datetime import datetime

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ========================================
# KNOWLEDGE BASE
# ========================================

HYDROGEN_KNOWLEDGE = {
    "what_is_green_hydrogen": """Green hydrogen is hydrogen produced using renewable energy sources (solar, wind, hydro) through electrolysis. 
    Unlike grey or blue hydrogen, green hydrogen has zero carbon emissions during production, making it a truly clean energy carrier.""",
    
    "benefits": """Green hydrogen offers several benefits:
    - Zero carbon emissions during production and use
    - Energy storage solution for renewable energy
    - Can replace fossil fuels in transportation, industry, and heating
    - Helps achieve energy independence
    - Supports grid stability through demand response""",
    
    "safety": """Hydrogen safety measures:
    - Non-toxic and safe when handled properly
    - Lighter than air, disperses quickly if leaked
    - Our containers meet ISO/TR 15916 safety standards
    - Real-time leak detection systems
    - Automated pressure relief mechanisms
    - Regular safety inspections and certifications""",
    
    "purity": """Our hydrogen meets ISO 14687 fuel quality standards:
    - Purity: ≥ 99.97%
    - Oxygen content: < 5 ppm
    - Water content: < 5 ppm
    - Total hydrocarbons: < 2 ppm
    - Suitable for fuel cells and industrial applications""",
    
    "pricing": """Pricing based on quantity and delivery location:
    - 10kg package: $50-60
    - 25kg package: $115-140
    - 50kg package: $220-270
    - 100kg package: $420-520
    - Bulk orders (>500kg): Custom pricing available
    - Includes blockchain certification and quality reports""",
    
    "delivery": """Delivery information:
    - Local delivery (< 100km): 1-2 days
    - Regional delivery (100-300km): 2-4 days
    - Express delivery available
    - All deliveries comply with hazmat regulations
    - Real-time tracking available""",
    
    "applications": """Hydrogen applications:
    - Fuel cell vehicles (cars, trucks, buses)
    - Industrial processes (steel, chemicals, refining)
    - Power generation and backup power
    - Heating systems
    - Energy storage for renewable grids
    - Aviation and maritime transport (emerging)"""
}

# ========================================
# SIMULATED GEMINI API (Fallback)
# ========================================

class SimulatedGeminiAPI:
    """Simulated Gemini API for when real API is not available"""
    
    def __init__(self):
        self.conversation_history = []
    
    def generate_response(self, prompt: str, context: List[Dict] = None) -> str:
        """Generate intelligent response based on prompt"""
        prompt_lower = prompt.lower()
        
        # Knowledge base matching
        if any(keyword in prompt_lower for keyword in ["what is", "define", "explain green hydrogen", "tell me about hydrogen"]):
            return HYDROGEN_KNOWLEDGE["what_is_green_hydrogen"]
        
        elif any(keyword in prompt_lower for keyword in ["benefit", "advantage", "why use", "why choose"]):
            return HYDROGEN_KNOWLEDGE["benefits"]
        
        elif any(keyword in prompt_lower for keyword in ["safe", "safety", "danger", "risk"]):
            return HYDROGEN_KNOWLEDGE["safety"]
        
        elif any(keyword in prompt_lower for keyword in ["pure", "purity", "quality", "grade"]):
            return HYDROGEN_KNOWLEDGE["purity"]
        
        elif any(keyword in prompt_lower for keyword in ["price", "cost", "how much", "pricing"]):
            return HYDROGEN_KNOWLEDGE["pricing"]
        
        elif any(keyword in prompt_lower for keyword in ["deliver", "shipping", "transport", "when will"]):
            return HYDROGEN_KNOWLEDGE["delivery"]
        
        elif any(keyword in prompt_lower for keyword in ["use", "application", "what can", "where"]):
            return HYDROGEN_KNOWLEDGE["applications"]
        
        # Order assistance
        elif any(keyword in prompt_lower for keyword in ["order", "buy", "purchase", "get"]):
            return """I can help you place an order! We offer the following packages:
            • 10kg - Ideal for small fuel cell applications
            • 25kg - Popular for commercial vehicles
            • 50kg - Industrial applications
            • 100kg - Large-scale operations
            
            Would you like me to help you select the right package for your needs? Please tell me about your intended use."""
        
        # Recommendation request
        elif any(keyword in prompt_lower for keyword in ["recommend", "suggest", "which", "best"]):
            return self._generate_recommendation(prompt)
        
        # Comparison
        elif "vs" in prompt_lower or "versus" in prompt_lower or "compare" in prompt_lower:
            return """Green hydrogen vs other hydrogen types:
            • **Green H2**: Produced from renewables, zero emissions
            • **Grey H2**: From natural gas, high emissions
            • **Blue H2**: From natural gas with CO2 capture
            
            Green hydrogen is the only truly sustainable option, supporting your environmental goals."""
        
        # General inquiry
        else:
            return self._generate_general_response(prompt)
    
    def _generate_recommendation(self, prompt: str) -> str:
        """Generate personalized recommendations"""
        prompt_lower = prompt.lower()
        
        if "vehicle" in prompt_lower or "car" in prompt_lower:
            return """For fuel cell vehicles, I recommend:
            • **25kg package** for weekly refueling of 1-2 vehicles
            • **50kg package** if you have a small fleet
            
            Benefits: Zero emissions, longer range than batteries, quick refueling (< 5 minutes)."""
        
        elif "industrial" in prompt_lower or "factory" in prompt_lower:
            return """For industrial applications, I recommend:
            • **100kg or bulk orders** for cost efficiency
            • Regular delivery schedule for uninterrupted operations
            • Priority support and volume discounts available
            
            Our hydrogen can replace natural gas in many processes, reducing your carbon footprint."""
        
        elif "backup" in prompt_lower or "power" in prompt_lower:
            return """For backup power systems:
            • **10kg package** provides 8-12 hours of 5kW power
            • **25kg package** for extended backup (20-30 hours)
            
            Advantages: Reliable, silent, zero emissions, longer storage life than batteries."""
        
        else:
            return """To provide the best recommendation, could you tell me more about:
            1. Your intended use case (transportation, power, industrial)
            2. Expected daily/weekly consumption
            3. Delivery frequency preference
            
            This will help me suggest the optimal package and plan for you."""
    
    def _generate_general_response(self, prompt: str) -> str:
        """Generate general helpful response"""
        responses = [
            "I'm here to help! Could you please provide more details about what you'd like to know regarding our green hydrogen products?",
            "That's a great question! Our green hydrogen is produced using 100% renewable energy. What specific aspect would you like to know more about?",
            "I'd be happy to assist you. Are you interested in learning about our products, pricing, delivery, or placing an order?",
            "Thank you for your interest! I can help you with product information, recommendations, orders, or any questions about green hydrogen. What would you like to know?"
        ]
        return random.choice(responses)

# ========================================
# REAL GEMINI API INTEGRATION
# ========================================

def use_real_gemini_api(prompt: str, conversation_history: List[Dict] = None) -> str:
    """Use real Gemini API if available"""
    try:
        import google.generativeai as genai
        
        if not GEMINI_API_KEY:
            return None
        
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        
        # Build context with conversation history
        full_prompt = f"""You are a helpful AI assistant for H2-OptiPlant, a green hydrogen production and sales company.
        
        Company information:
        - We produce green hydrogen using 100% renewable energy (solar, wind, hydro)
        - We offer packages from 10kg to 100kg+ (bulk orders)
        - Our hydrogen meets ISO 14687 purity standards (≥99.97%)
        - We provide blockchain-certified, carbon-neutral hydrogen
        - Delivery within 1-4 days depending on location
        
        {HYDROGEN_KNOWLEDGE['pricing']}
        
        Customer question: {prompt}
        
        Provide a helpful, concise, and friendly response. If the customer wants to place an order, guide them through the process."""
        
        response = model.generate_content(full_prompt)
        return response.text
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None

# ========================================
# UNIFIED CHATBOT INTERFACE
# ========================================

class HydrogenChatbot:
    """Unified chatbot interface"""
    
    def __init__(self):
        self.use_real_api = bool(GEMINI_API_KEY)
        self.simulated_api = SimulatedGeminiAPI()
        self.conversation_sessions = {}  # Store by session_id
    
    def chat(self, message: str, session_id: str = "default", user_context: Dict = None) -> Dict:
        """Process chat message and return response"""
        # Get or create conversation history
        if session_id not in self.conversation_sessions:
            self.conversation_sessions[session_id] = []
        
        history = self.conversation_sessions[session_id]
        
        # Add user message to history
        history.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Generate response
        if self.use_real_api:
            response_text = use_real_gemini_api(message, history)
            if response_text is None:
                # Fallback to simulated
                response_text = self.simulated_api.generate_response(message, history)
        else:
            response_text = self.simulated_api.generate_response(message, history)
        
        # Add assistant response to history
        history.append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep only last 20 messages
        if len(history) > 20:
            self.conversation_sessions[session_id] = history[-20:]
        
        # Generate quick reply suggestions
        suggestions = self._generate_suggestions(message, response_text)
        
        # Sentiment analysis (simple)
        sentiment = self._analyze_sentiment(message)
        
        return {
            "response": response_text,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "suggestions": suggestions,
            "sentiment": sentiment,
            "api_used": "Gemini Pro" if self.use_real_api else "Simulated"
        }
    
    def _generate_suggestions(self, user_message: str, bot_response: str) -> List[str]:
        """Generate quick reply suggestions"""
        message_lower = user_message.lower()
        
        if "price" in message_lower or "cost" in message_lower:
            return [
                "Can I place an order?",
                "What sizes are available?",
                "Do you offer bulk discounts?"
            ]
        elif "order" in message_lower or "buy" in message_lower:
            return [
                "How is delivery handled?",
                "What payment methods do you accept?",
                "Can I track my order?"
            ]
        elif "safety" in message_lower or "safe" in message_lower:
            return [
                "How is hydrogen stored?",
                "What certifications do you have?",
                "Tell me about purity standards"
            ]
        else:
            return [
                "Tell me about your products",
                "What are the prices?",
                "I'd like to place an order"
            ]
    
    def _analyze_sentiment(self, message: str) -> str:
        """Simple sentiment analysis"""
        positive_words = ["great", "good", "excellent", "thanks", "perfect", "love", "appreciate"]
        negative_words = ["bad", "problem", "issue", "wrong", "expensive", "disappointed"]
        
        message_lower = message.lower()
        
        pos_count = sum(1 for word in positive_words if word in message_lower)
        neg_count = sum(1 for word in negative_words if word in message_lower)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        else:
            return "neutral"
    
    def get_conversation_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for a session"""
        return self.conversation_sessions.get(session_id, [])
    
    def clear_session(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self.conversation_sessions:
            del self.conversation_sessions[session_id]

# ========================================
# GLOBAL CHATBOT INSTANCE
# ========================================

global_chatbot = None

def get_chatbot() -> HydrogenChatbot:
    """Get or create global chatbot instance"""
    global global_chatbot
    if global_chatbot is None:
        global_chatbot = HydrogenChatbot()
        print("✓ Hydrogen Chatbot initialized")
    return global_chatbot

def chat_with_customer(message: str, session_id: str = "default", user_context: Dict = None) -> Dict:
    """Main interface for customer chat"""
    chatbot = get_chatbot()
    return chatbot.chat(message, session_id, user_context)

# Auto-initialize on import
if __name__ != "__main__":
    print("Initializing Customer Chatbot...")
    get_chatbot()
