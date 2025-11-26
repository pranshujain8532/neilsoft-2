import fetch from 'node-fetch';

async function testBackend() {
    try {
        const response = await fetch('http://localhost:5000/api/plants/with-ml');
        const data = await response.json();

        console.log('Success:', data.success);
        console.log('Total plants:', data.plants.length);

        data.plants.forEach(p => {
            console.log(`Plant: ${p.plant_name}`);
            console.log(`  Has ML Predictions: ${!!p.mlPredictions}`);
            if (p.mlPredictions) {
                console.log(`  Profit: ${p.mlPredictions.profit_prediction?.daily_profit}`);
                console.log(`  Safety Status: ${p.mlPredictions.safety_status?.status}`);
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

testBackend();
