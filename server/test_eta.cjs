const axios = require('axios');

async function testAutoAssign() {
    try {
        console.log('Creating test order for Delhi...\n');

        // First create an order
        const orderResponse = await axios.post('http://localhost:5000/api/orders', {
            userId: 'test-user',
            product: {
                name: 'Green Hydrogen',
                quantity: 100,
                pricePerKg: 50
            },
            deliveryAddress: {
                street: '123 Main Street',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110001',
                country: 'India'
            },
            totalPrice: 5000,
            status: 'pending'
        });

        console.log('✅ Order created:', orderResponse.data._id);
        console.log('Order details:', JSON.stringify(orderResponse.data, null, 2));

        // Now auto-assign
        console.log('\n📦 Calling auto-assign...\n');
        const assignResponse = await axios.post('http://localhost:5000/api/transport/auto-assign', {
            orderId: orderResponse.data._id
        });

        console.log('✅ Auto-assign response:');
        console.log('Selected Plant:', assignResponse.data.plant?.name);
        console.log('Vehicle:', assignResponse.data.vehicle?.registration);
        console.log('ETA:', assignResponse.data.vehicle?.eta);
        console.log('Distance:', assignResponse.data.distance);
        console.log('\nFull response:', JSON.stringify(assignResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testAutoAssign();
