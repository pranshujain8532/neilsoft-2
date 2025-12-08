// Check if there are any plants
fetch('http://localhost:5000/api/plants')
    .then(res => res.json())
    .then(plants => {
        console.log(`Found ${plants.length} plants`);
        if (plants.length === 0) {
            console.log('NO PLANTS FOUND - This is likely the issue!');
        } else {
            plants.forEach(p => {
                console.log(`- ${p.name} (${p.status})`);
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
