"""
Test script for Gemini AI Chatbot
Demonstrates example conversations and validates responses
"""

import requests
import json

# ML Service endpoint
CHATBOT_URL = "http://localhost:5001/chat"

# Test questions
test_questions = [
    "What is green hydrogen and how is it produced?",
    "What is the current LCOH and how can we reduce it?",
    "Which plant is most profitable right now?",
    "What purity levels do you offer?",
    "How does your ML model work for profit prediction?",
    "Tell me about your safety monitoring system",
    "What are the delivery times for bulk orders?",
    "How do you integrate renewable energy sources?"
]

def test_chatbot(question):
    """Send question to chatbot and get response"""
    try:
        response = requests.post(
            CHATBOT_URL,
            json={"message": question, "history": []},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n{'='*70}")
            print(f"❓ Question: {question}")
            print(f"{'='*70}")
            print(f"🤖 Response: {data.get('response', 'No response')}")
            print(f"📊 Model: {data.get('model', 'Unknown')}")
            print(f"✅ Success: {data.get('success', False)}")
            return data
        else:
            print(f"❌ Error: Status {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def main():
    """Run chatbot tests"""
    print("\n" + "="*70)
    print("🚀 Gemini AI Chatbot Test Suite")
    print("="*70)
    print(f"📡 Endpoint: {CHATBOT_URL}")
    print(f"🧪 Test Questions: {len(test_questions)}")
    print("="*70)
    
    results = []
    for i, question in enumerate(test_questions, 1):
        print(f"\n\n🧪 Test {i}/{len(test_questions)}")
        result = test_chatbot(question)
        results.append({
            "question": question,
            "success": result is not None and result.get('success', False)
        })
        
        # Wait a bit between requests
        import time
        time.sleep(1)
    
    # Summary
    print("\n\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    successful = sum(1 for r in results if r['success'])
    print(f"✅ Successful: {successful}/{len(results)}")
    print(f"❌ Failed: {len(results) - successful}/{len(results)}")
    print(f"📈 Success Rate: {(successful/len(results)*100):.1f}%")
    print("="*70)

if __name__ == "__main__":
    main()
