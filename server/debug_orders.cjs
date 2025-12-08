// Check what orders exist
fetch('http://localhost:5000/api/orders')
    .then(res => res.json())
    .then(orders => {
        console.log(`Found ${orders.length} orders:`);
        orders.slice(0, 3).forEach(order => {
            console.log(`ID: ${order._id}, Status: ${order.status}, Product: ${order.product?.name}`);
        });

        // Test with the first confirmed order
        const confirmedOrder = orders.find(o => o.status === 'confirmed');
        if (confirmedOrder) {
            console.log(`\nTesting auto-assign with order: ${confirmedOrder._id}`);
            return fetch('http://localhost:5000/api/transport/auto-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: confirmedOrder._id })
            });
        } else {
            console.log('\nNo confirmed orders found');
        }
    })
    .then(res => res ? res.json() : null)
    .then(data => {
        if (data) {
            console.log('\nAuto-assign result:', JSON.stringify(data, null, 2));
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
