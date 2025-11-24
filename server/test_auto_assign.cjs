// Test auto-assign endpoint
const testOrderId = '#437101'; // Use the order ID from the screenshot

console.log('Testing auto-assign with order:', testOrderId);

fetch('http://localhost:5000/api/transport/auto-assign', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: testOrderId })
})
    .then(res => {
        console.log('Response status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('Response data:', JSON.stringify(data, null, 2));
    })
    .catch(error => {
        console.error('Error:', error);
    });
