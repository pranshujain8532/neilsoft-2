import mongoose from 'mongoose';
import Plant from '../models/Plant.js';
import dotenv from 'dotenv';

dotenv.config();

const plantsData = [
    {
        name: 'Gujarat Solar Plant',
        location: {
            address: 'GIDC Industrial Estate',
            city: 'Ahmedabad',
            state: 'Gujarat',
            coordinates: { lat: 23.0225, lng: 72.5714 }
        },
        capacity: 50,
        currentProduction: 42,
        status: 'active',
        energySources: {
            solar: { installed: 25, current: 22, efficiency: 0.18 },
            wind: { installed: 10, current: 8, turbines: 5 },
            hydro: { installed: 0, current: 0, flowRate: 0 }
        },
        totalEnergyCapacity: 35,
        currentEnergyMix: { solar: 73, wind: 27, hydro: 0 },
        lcoh: 1.8
    },
    {
        name: 'Mumbai Green Hub',
        location: {
            address: 'Navi Mumbai SEZ',
            city: 'Mumbai',
            state: 'Maharashtra',
            coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        capacity: 40,
        currentProduction: 35,
        status: 'active',
        energySources: {
            solar: { installed: 20, current: 18, efficiency: 0.19 },
            wind: { installed: 15, current: 12, turbines: 8 },
            hydro: { installed: 0, current: 0, flowRate: 0 }
        },
        totalEnergyCapacity: 35,
        currentEnergyMix: { solar: 60, wind: 40, hydro: 0 },
        lcoh: 2.1
    },
    {
        name: 'Karnataka Green Hub',
        location: {
            address: 'Electronics City',
            city: 'Bengaluru',
            state: 'Karnataka',
            coordinates: { lat: 12.9716, lng: 77.5946 }
        },
        capacity: 45,
        currentProduction: 40,
        status: 'active',
        energySources: {
            solar: { installed: 22, current: 20, efficiency: 0.18 },
            wind: { installed: 0, current: 0, turbines: 0 },
            hydro: { installed: 8, current: 7, flowRate: 25 }
        },
        totalEnergyCapacity: 30,
        currentEnergyMix: { solar: 74, wind: 0, hydro: 26 },
        lcoh: 1.95
    },
    {
        name: 'Tamil Nadu Solar Plant',
        location: {
            address: 'SIPCOT Industrial Park',
            city: 'Chennai',
            state: 'Tamil Nadu',
            coordinates: { lat: 13.0827, lng: 80.2707 }
        },
        capacity: 38,
        currentProduction: 33,
        status: 'active',
        energySources: {
            solar: { installed: 30, current: 27, efficiency: 0.20 },
            wind: { installed: 0, current: 0, turbines: 0 },
            hydro: { installed: 0, current: 0, flowRate: 0 }
        },
        totalEnergyCapacity: 30,
        currentEnergyMix: { solar: 100, wind: 0, hydro: 0 },
        lcoh: 1.85
    },
    {
        name: 'Delhi-NCR Plant',
        location: {
            address: 'IMT Manesar',
            city: 'Gurgaon',
            state: 'Haryana',
            coordinates: { lat: 28.7041, lng: 77.1025 }
        },
        capacity: 35,
        currentProduction: 28,
        status: 'active',
        energySources: {
            solar: { installed: 18, current: 15, efficiency: 0.17 },
            wind: { installed: 8, current: 6, turbines: 4 },
            hydro: { installed: 0, current: 0, flowRate: 0 }
        },
        totalEnergyCapacity: 26,
        currentEnergyMix: { solar: 71, wind: 29, hydro: 0 },
        lcoh: 2.2
    },
    {
        name: 'Rajasthan Desert Plant',
        location: {
            address: 'Jodhpur Solar Park',
            city: 'Jodhpur',
            state: 'Rajasthan',
            coordinates: { lat: 26.2389, lng: 73.0243 }
        },
        capacity: 55,
        currentProduction: 50,
        status: 'active',
        energySources: {
            solar: { installed: 35, current: 32, efficiency: 0.21 },
            wind: { installed: 0, current: 0, turbines: 0 },
            hydro: { installed: 0, current: 0, flowRate: 0 }
        },
        totalEnergyCapacity: 35,
        currentEnergyMix: { solar: 100, wind: 0, hydro: 0 },
        lcoh: 1.75
    }
];

async function seedPlants() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/green-hydrogen');
        console.log('✅ Connected to MongoDB');
        await Plant.deleteMany({});
        console.log('🗑️  Cleared existing plants');
        const plants = await Plant.insertMany(plantsData);
        console.log(`✅ Successfully seeded ${plants.length} plants`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding plants:', error);
        process.exit(1);
    }
}

seedPlants();
