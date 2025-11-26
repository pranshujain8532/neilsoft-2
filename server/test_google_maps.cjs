const axios = require('axios');
require('dotenv').config();

async function testGoogleMapsAPI() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    console.log('Testing Google Maps Distance Matrix API...\n');

    // Test Delhi-NCR Plant to New Delhi
    const origin = '28.7041,77.1025'; // Delhi-NCR Plant (Gurgaon)
    const destination = 'New Delhi, Delhi';

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const element = response.data.rows[0].elements[0];

        console.log('API Response Status:', response.data.status);
        console.log('Element Status:', element.status);
        console.log('\n📏 Distance:', element.distance);
        console.log('⏱️  Duration:', element.duration);
        console.log('\n📍 Distance Text:', element.distance.text);
        console.log('⏰ Duration Text:', element.duration.text);
        console.log('\n✅ This is what should be shown as ETA:', element.duration.text);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGoogleMapsAPI();
