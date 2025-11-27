import mongoose from 'mongoose';
const vehicleSchema = new mongoose.Schema({
    registration: {
        type: String,
        required: true,
        unique: true,
    },
    driver: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number, // in kg
        required: true,
    },
    currentLoad: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['idle', 'loading', 'in-transit', 'maintenance'],
        default: 'idle',
    },
    location: {
        lat: Number,
        lng: Number,
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
    origin: String,
    destination: String,
    eta: String,
    progress: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});
export default mongoose.model('Vehicle', vehicleSchema);
