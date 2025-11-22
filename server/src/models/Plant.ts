import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: {
        address: String,
        city: String,
        state: String,
        coordinates: {
            lat: Number,
            lng: Number,
        },
    },
    capacity: { type: Number, required: true }, // TPD (Tonnes Per Day)
    currentProduction: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'maintenance', 'offline'], default: 'active' },

    // Multi-energy sources in ONE plant
    energySources: {
        solar: {
            installed: { type: Number, default: 0 }, // MW capacity
            current: { type: Number, default: 0 }, // Current MW output
            efficiency: { type: Number, default: 0.18 }, // 18% default
        },
        wind: {
            installed: { type: Number, default: 0 }, // MW capacity
            current: { type: Number, default: 0 }, // Current MW output
            turbines: { type: Number, default: 0 }, // Number of turbines
        },
        hydro: {
            installed: { type: Number, default: 0 }, // MW capacity
            current: { type: Number, default: 0 }, // Current MW output
            flowRate: { type: Number, default: 0 }, // m³/s
        },
    },

    totalEnergyCapacity: { type: Number, default: 0 }, // Total MW
    currentEnergyMix: {
        solar: { type: Number, default: 0 }, // Percentage of total
        wind: { type: Number, default: 0 },
        hydro: { type: Number, default: 0 },
    },

    lcoh: { type: Number }, // Levelized Cost of Hydrogen ($/kg)

    productionHistory: [{
        timestamp: Date,
        production: Number, // kg produced
        lcoh: Number,
        energyMix: {
            solar: Number, // % contribution
            wind: Number,
            hydro: Number,
        },
        weatherConditions: {
            irradiance: Number, // W/m² for solar
            windSpeed: Number, // m/s
            waterFlow: Number, // m³/s for hydro
            temperature: Number, // °C
        },
    }],

    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

const Plant = mongoose.model('Plant', plantSchema);

export default Plant;
