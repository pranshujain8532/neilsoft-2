"""
Gemini AI Chatbot Service
Provides intelligent responses using Google's Gemini 2.0 Flash model.
ENHANCED: Now fetches real-time data from Supabase for orders and plants.
SECURED: Internal financial data (LCOH, Profit) is scrubbed for Customer Support.
"""

import os
import google.generativeai as genai
from typing import List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class GeminiChatbot:
    def __init__(self):
        """Initialize Gemini chatbot with API key and Supabase"""
        self.api_key = os.getenv('GEMINI_API_KEY', '')
        self.model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        
        # Initialize Supabase with SERVICE ROLE KEY to bypass RLS
        supabase_url = os.getenv('SUPABASE_URL')
        # Use service role key to bypass RLS for reading orders
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
        self.supabase: Client = None
        
        if supabase_url and supabase_key:
            try:
                self.supabase = create_client(supabase_url, supabase_key)
                print("[OK] Supabase connected for chatbot (using service role key)")
            except Exception as e:
                print(f"[WARN] Supabase connection failed: {e}")
        
        self.enabled = False
        
        # --- BASE KNOWLEDGE (Static) ---
        self.base_knowledge = """
        PRODUCT GRADES:
        - Industrial Grade (99.9%): Suitable for refining and ammonia production.
        - Bulk Grade (99.5%): Optimized for heating and heavy industrial use.
        - Premium Grade (99.999%): Ultra-pure for fuel cells and electronics.
        
        CERTIFICATIONS & STANDARDS:
        - All production is ISO 14687-2 certified.
        - 100% Green Hydrogen certified (Zero Carbon Emissions).
        
        TECHNOLOGY:
        - We use AI for predictive maintenance to ensure 99.9% uptime.
        - Real-time quality monitoring ensures consistent purity.
        """

        if self.api_key and self.api_key != 'your_gemini_api_key':
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                self.enabled = True
                print(f"[OK] Gemini API initialized with model: {self.model_name}")
            except Exception as e:
                print(f"[WARN] Failed to initialize Gemini: {e}")
        else:
            print("[WARN] Gemini API key not configured, using fallback responses")

    def _fetch_plants_data(self) -> str:
        """Fetch real plant data from Supabase"""
        if not self.supabase:
            return "Plant data unavailable."
        
        try:
            response = self.supabase.table('plants').select('name, capacity_mw, status, location, renewable_percentage').execute()
            plants = response.data
            
            if not plants:
                return "No plant data available."
            
            plant_info = "CURRENT PLANT STATUS (Real-time):\n"
            for p in plants:
                plant_info += f"- {p['name']}: {p.get('capacity_mw', 'N/A')}MW capacity, Status: {p.get('status', 'unknown')}, "
                plant_info += f"Location: {p.get('location', 'N/A')}, Renewable: {p.get('renewable_percentage', 'N/A')}%\n"
            
            return plant_info
        except Exception as e:
            print(f"Error fetching plants: {e}")
            return "Unable to fetch plant data."

    def _fetch_user_orders(self, user_id: str) -> str:
        """Fetch order history for a specific user from Supabase"""
        print(f"[INFO] Fetching orders for user_id: {user_id}")
        
        if not self.supabase:
            print("   [ERROR] Supabase not connected")
            return "Order history unavailable - database not connected."
        
        if not user_id:
            print("   [ERROR] No user_id provided")
            return "Please log in to view your order history."
        
        try:
            # Only select columns that exist in the orders table
            response = self.supabase.table('orders').select(
                'id, status, quantity, total_price, created_at, delivery_address, transport_method'
            ).eq('customer_id', user_id).order('created_at', desc=True).limit(10).execute()
            
            orders = response.data
            
            # If no orders with customer_id, try user_id
            if not orders:
                print("   [WARN] No orders with customer_id, trying user_id...")
                response = self.supabase.table('orders').select(
                    'id, status, quantity, total_price, created_at, delivery_address, transport_method'
                ).eq('user_id', user_id).order('created_at', desc=True).limit(10).execute()
                orders = response.data
            
            if not orders:
                print("   [WARN] No orders found for this user")
                return "You don't have any orders yet. Visit our Shop to place your first order!"
            
            print(f"   [OK] Found {len(orders)} orders")
            order_info = f"Here are your recent orders:\n\n"
            for o in orders:
                order_info += f"• Order #{o['id'][:8]}: {o.get('quantity', 'N/A')}kg Green Hydrogen\n"
                order_info += f"  Status: {o.get('status', 'unknown').upper()}\n"
                order_info += f"  Total: ₹{o.get('total_price', 'N/A')}\n"
                if o.get('transport_method'):
                    order_info += f"  Transport: {o.get('transport_method')}\n"
                if o.get('delivery_address'):
                    order_info += f"  Delivery: {o.get('delivery_address')[:50]}...\n"
                order_info += "\n"
            
            return order_info
        except Exception as e:
            print(f"   [ERROR] Error fetching orders: {e}")
            return f"Unable to fetch order history: {str(e)}"

    def _fetch_all_recent_orders(self) -> str:
        """Fetch recent orders (for admin context)"""
        if not self.supabase:
            return "Order data unavailable."
        
        try:
            response = self.supabase.table('orders').select(
                'id, status, quantity, product_type, created_at'
            ).order('created_at', desc=True).limit(5).execute()
            
            orders = response.data
            
            if not orders:
                return "No recent orders."
            
            order_info = "RECENT PLATFORM ORDERS:\n"
            for o in orders:
                order_info += f"- Order #{o['id'][:8]}: {o.get('quantity', 'N/A')}kg, Status: {o.get('status', 'unknown')}\n"
            
            return order_info
        except Exception as e:
            print(f"Error fetching orders: {e}")
            return "Unable to fetch order data."

    def get_response(self, message: str, history: List[Dict] = None, user_id: str = None) -> str:
        """Get response from Gemini with real-time Supabase data"""
        
        if not self.enabled:
            return self._get_fallback_response(message, user_id)
        
        try:
            # Fetch real-time data from Supabase
            plants_data = self._fetch_plants_data()
            
            # ALWAYS fetch user orders if user_id is provided
            orders_data = ""
            if user_id:
                orders_data = self._fetch_user_orders(user_id)
            else:
                orders_data = self._fetch_all_recent_orders()

            # Build dynamic system context with real data
            system_context = f"""You are a helpful Customer Support AI for a Green Hydrogen Platform. 
            
            Your Goal: Assist customers with product inquiries, plant capabilities, order tracking, and logistics.
            
            STRICT RULES:
            - Do NOT share internal financial data (Profit margins, production costs/LCOH).
            - If asked about specific pricing, advise the user to "Contact our Sales Team for a custom quote based on volume."
            - Use the real-time data below to answer questions accurately.
            - When user asks about their orders, use the ORDER HISTORY data provided - DO NOT ask for order ID.
            - Always be helpful and provide specific information from the data.
            
            STATIC KNOWLEDGE:
            {self.base_knowledge}
            
            REAL-TIME DATA FROM DATABASE:
            {plants_data}
            
            USER'S ORDER HISTORY:
            {orders_data}
            
            Keep responses professional, polite, and concise. Reference actual data when available.
            When discussing orders, mention specific order IDs and statuses from the data above.
            """

            # Format History for Context
            conversation_history = ""
            if history:
                for turn in history[-5:]:
                    role = turn.get('role', 'user')
                    content = turn.get('parts', [turn.get('message', '')])[0] if isinstance(turn.get('parts'), list) else turn.get('message', '')
                    conversation_history += f"{role.capitalize()}: {content}\n"

            # Build Prompt
            prompt = f"{system_context}\n\nPREVIOUS CONVERSATION:\n{conversation_history}\n\nCURRENT REQUEST:\nUser: {message}\nAssistant:"
            
            # Generate response
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"[ERROR] Error getting Gemini response: {e}")
            import traceback
            traceback.print_exc()
            return self._get_fallback_response(message, user_id)
    
    def _get_fallback_response(self, message: str, user_id: str = None) -> str:
        """Provide SAFE fallback responses when Gemini is unavailable"""
        message_lower = message.lower()
        
        # Try to get real data even in fallback mode
        if self.supabase:
            if any(word in message_lower for word in ['plant', 'capacity', 'location']):
                return self._fetch_plants_data()
            
            # Fetch user orders directly if asking about orders
            if any(word in message_lower for word in ['order', 'track', 'status', 'history']):
                if user_id:
                    return self._fetch_user_orders(user_id)
                else:
                    return "Please log in to view your order history, or check the 'My Orders' section in your dashboard."
        
        if any(word in message_lower for word in ['price', 'cost', 'quote']):
            return "Our pricing is volume-based and highly competitive. Please contact our Sales Team at sales@greenhydrogen.com for a custom quote tailored to your needs."
        
        elif any(word in message_lower for word in ['purity', 'quality', 'grade']):
            return "We offer three grades of Green Hydrogen: Industrial (99.9%), Bulk (99.5%), and Premium (99.999%) for fuel cell applications. All products are ISO certified."
        
        elif any(word in message_lower for word in ['lcoh', 'profit', 'margin']):
            return "As a policy, we do not disclose internal financial metrics. However, our optimized renewable integration allows us to offer market-leading rates to our customers."
        
        else:
            return "I can help you with product specifications, plant details, order tracking, and logistics inquiries. How can I assist you today?"

# Global instance
chatbot = GeminiChatbot()

def get_chatbot_response(message: str, history: List[Dict] = None, user_id: str = None) -> str:
    """Get response from chatbot"""
    return chatbot.get_response(message, history, user_id)
