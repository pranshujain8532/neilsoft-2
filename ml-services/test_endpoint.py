import requests
import json

url = "http://localhost:5001/logistics/optimize-order"
data = {
    "id": "test-order",
    "quantity": 100,
    "delivery_address": "Mumbai"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
