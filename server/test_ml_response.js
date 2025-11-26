import fetch from 'node-fetch';

async function testML() {
    try {
        const response = await fetch('http://localhost:5001/api/plants/predictions');
        const data = await response.json();
        console.log('Plant names:', JSON.stringify(data.plants.map(p => p.plant_name), null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testML();
