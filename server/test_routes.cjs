const axios = require('axios');
require('dotenv').config();

async function testMultipleRoutes() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    console.log('Testing Multiple Routes with Google Maps API...\n');

    const tests = [
        {
            name: 'Delhi-NCR Plant to New Delhi',
            origin: '28.7041,77.1025',
            destination: 'New Delhi, Delhi'
        },
        {
            name: 'Karnataka Plant to Bengaluru',
            origin: '12.9716,77.5946',
            destination: 'Bengaluru, Karnataka'
        },
        {
            name: 'Karnataka Plant to Delhi',
            origin: '12.9716,77.5946',
            destination: 'New Delhi, Delhi'
        }
    ];

    for (const test of tests) {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(test.origin)}&destinations=${encodeURIComponent(test.destination)}&key=${apiKey}`;

        try {
            console.log(`\n========== ${test.name} ==========`);
            const response = await axios.get(url);
            const element = response.data.rows[0].elements[0];

            if (element.status === 'OK') {
                console.log('Distance Value:', element.distance.value, 'meters');
                console.log('Distance Text:', element.distance.text);
                console.log('Duration Value:', element.duration.value, 'seconds');
                console.log('Duration Text:', element.duration.text);
                console.log('✅ ETA to display:', element.duration.text);
            } else {
                console.log('❌ Status:', element.status);
            }

        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

testMultipleRoutes();
