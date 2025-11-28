import requests
import json

# Test the Smart Dispatch endpoint
test_order = {
    "id": "test-order-123",
    "product_quantity": 100,
    "delivery_address": "Test Address",
    "delivery_location": {
        "lat": 23.0,
        "lng": 72.5
    }
}

try:
    response = requests.post('http://localhost:5001/logistics/optimize-order', json=test_order, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
