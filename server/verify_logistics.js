// const fetch = require('node-fetch'); // Use native fetch

async function verifyLogistics() {
    try {
        // 1. Create a dummy order first (using in-memory fallback if needed)
        console.log('Creating dummy order...');
        const orderRes = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: 'customer-1',
                product: { name: 'H2', purity: 99, quantity: 500, pricePerKg: 10 },
                totalAmount: 5000,
                deliveryAddress: { street: '123 Test St', city: 'Pune', state: 'MH', zipCode: '411001', country: 'India' }
            })
        });
        const order = await orderRes.json();
        console.log('Order created:', order._id);

        // 2. Call Auto-Assign
        console.log('\nTesting Smart Dispatch (Auto-Assign)...');
        const assignRes = await fetch('http://localhost:5000/api/transport/auto-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order._id })
        });

        const result = await assignRes.json();

        console.log('\n--- Result ---');
        console.log('Vehicle:', result.vehicle.registration);
        console.log('Driver:', result.vehicle.driver);
        console.log('Origin Plant:', result.plant.name);
        console.log('Distance:', result.distance);
        console.log('\n--- Safety Log ---');
        console.log(result.safetyLog.join('\n'));

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyLogistics();
