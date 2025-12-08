const axios = require('axios');

async function checkFleetData() {
    try {
        const response = await axios.get('http://localhost:5000/api/transport/fleet');
        console.log('Total vehicles:', response.data.length);
        console.log('\n========== Fleet Data ==========\n');

        response.data.forEach((vehicle, index) => {
            console.log(`Vehicle ${index + 1}:`);
            console.log('  Registration:', vehicle.registration);
            console.log('  Origin:', vehicle.origin);
            console.log('  Destination:', vehicle.destination);
            console.log('  ETA:', vehicle.eta);
            console.log('  Status:', vehicle.status);
            console.log('---');
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFleetData();
