// Comprehensive test of auto-assign with a real order
const orderId = '#162602'.replace('#', ''); // Try with just the number first

console.log('Step 1: Check if there are any orders...');
fetch('http://localhost:5000/api/orders')
    .then(res => res.json())
    .then(orders => {
        console.log(`Found ${orders.length} orders`);

        if (orders.length === 0) {
            console.log('ERROR: No orders exist. You need to place an order first!');
            return;
        }

        // Find the order that matches the ID from the screenshot
        const targetOrder = orders.find(o => o._id.includes('162602'));

        if (!targetOrder) {
            console.log('Could not find order matching 162602');
            console.log('Available orders:');
            orders.forEach(o => console.log(`  - ${o._id} (${o.status})`));

            // Use the first confirmed order instead
            const confirmedOrder = orders.find(o => o.status === 'confirmed');
            if (confirmedOrder) {
                console.log(`\nUsing confirmed order: ${confirmedOrder._id}`);
                return testAutoAssign(confirmedOrder._id);
            } else {
                console.log('No confirmed orders found!');
            }
        } else {
            console.log(`\nFound target order: ${targetOrder._id} (${targetOrder.status})`);
            return testAutoAssign(targetOrder._id);
        }
    })
    .catch(error => {
        console.error('Error fetching orders:', error);
    });

function testAutoAssign(orderId) {
    console.log(`\nStep 2: Testing auto-assign with order ID: ${orderId}`);

    return fetch('http://localhost:5000/api/transport/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    })
        .then(res => {
            console.log(`Response status: ${res.status}`);
            return res.text();
        })
        .then(text => {
            console.log('\nResponse body:');
            console.log(text);

            try {
                const data = JSON.parse(text);
                if (data.safetyLog) {
                    console.log('\nSafety Log:');
                    data.safetyLog.forEach(log => console.log(`  ${log}`));
                }
            } catch (e) {
                // Not JSON
            }
        })
        .catch(error => {
            console.error('Error calling auto-assign:', error);
        });
}
