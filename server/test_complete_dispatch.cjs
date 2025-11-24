// Test actual dispatch with real order data
console.log('Creating a test order and dispatching it...\n');

// Step 1: Create an order
fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        customer: 'test-customer-123',
        product: {
            name: 'Green Hydrogen - Premium',
            purity: '99.999%',
            quantity: 100,
            pricePerKg: 50
        },
        totalAmount: 5000,
        status: 'confirmed',
        deliveryAddress: {
            street: '123 Test St',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            country: 'India'
        },
        certificate: {
            tokenId: 'TEST-TOKEN-' + Date.now(),
            carbonIntensity: 0.5,
            energyMix: { solar: 60, wind: 30, hydro: 10 }
        }
    })
})
    .then(res => res.json())
    .then(order => {
        console.log('✅ Order created:', order._id);
        console.log('\nStep 2: Testing auto-assign...\n');

        // Step 2: Auto-assign
        return fetch('http://localhost:5000/api/transport/auto-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order._id })
        });
    })
    .then(res => {
        console.log('Response status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('\n========= RESULT =========');
        if (data.error) {
            console.log('❌ ERROR:', data.error);
            console.log('Message:', data.message);
        } else {
            console.log('✅ SUCCESS!');
            console.log('Vehicle:', data.vehicle?.registration);
            console.log('Driver:', data.vehicle?.driver);
            console.log('Plant:', data.plant?.name);
            console.log('Distance:', data.distance);
            if (data.safetyLog) {
                console.log('\nSafety Log:');
                data.safetyLog.forEach(log => console.log('  ' + log));
            }
        }
        console.log('==========================\n');
    })
    .catch(error => {
        console.error('❌ Test failed:', error.message);
    });
