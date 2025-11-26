import fetch from 'node-fetch';

async function checkWeather() {
    try {
        const response = await fetch('http://localhost:5000/api/plants/with-ml');
        const data = await response.json();
        if (data.plants && data.plants.length > 0) {
            console.log('Sample Plant Keys:', Object.keys(data.plants[0]));
            if (data.plants[0].weather) {
                console.log('Weather Data:', data.plants[0].weather);
            } else {
                console.log('No top-level weather data found.');
                if (data.plants[0].mlPredictions && data.plants[0].mlPredictions.weather) {
                    console.log('ML Weather Data:', data.plants[0].mlPredictions.weather);
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}

checkWeather();
