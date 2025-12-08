import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['electrolyzer', 'compressor', 'purifier', 'cooling', 'rectifier', 'other'],
        required: true,
    },
    plant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plant',
        required: true,
    },
    status: {
        type: String,
        enum: ['operational', 'warning', 'error', 'maintenance'],
        default: 'operational',
    },
    health: {
        type: Number, // Percentage 0-100
        default: 100,
    },
    specifications: {
        model: String,
        manufacturer: String,
        capacity: Number,
        installationDate: Date,
    },
    sensors: {
        temperature: Number, // Celsius
        pressure: Number, // bar
        current: Number, // Amperes
        voltage: Number, // Volts
        flowRate: Number, // m³/h
    },
    maintenanceHistory: [{
        date: Date,
        type: String,
        description: String,
        cost: Number,
    }],
}, {
    timestamps: true,
});

export default mongoose.model('Machine', machineSchema);
