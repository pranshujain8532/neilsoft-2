import mongoose from 'mongoose';

const containerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    plant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plant',
        required: true,
    },
    capacity: {
        type: Number, // kg
        required: true,
    },
    currentLevel: {
        type: Number, // kg
        default: 0,
    },
    fillLevel: {
        type: Number, // Percentage
        default: 0,
    },
    temperature: {
        type: Number, // Celsius
        default: 25,
    },
    pressure: {
        type: Number, // bar
        default: 0,
    },
    status: {
        type: String,
        enum: ['operational', 'warning', 'critical', 'maintenance'],
        default: 'operational',
    },
    type: {
        type: String,
        enum: ['stationary', 'mobile'],
        default: 'stationary',
    },
    alerts: [{
        timestamp: Date,
        type: String,
        message: String,
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical'],
        },
    }],
}, {
    timestamps: true,
});

export default mongoose.model('Container', containerSchema);
