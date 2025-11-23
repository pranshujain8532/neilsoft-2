import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String (for in-memory)
        required: true,
        ref: 'User',
    },
    product: {
        name: String,
        purity: String,
        quantity: Number, // kg
        pricePerKg: Number,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    sourcePlant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plant',
    },
    plantApproved: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-production', 'ready', 'in-transit', 'delivered', 'cancelled'],
        default: 'pending',
    },
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
    },
    estimatedDelivery: Date,
    certificate: {
        tokenId: String,
        blockchainTxHash: String,
        carbonIntensity: Number, // kgCO2eq/kg
        energyMix: {
            solar: Number,
            wind: Number,
            hydro: Number,
        },
    },
}, {
    timestamps: true,
});

export default mongoose.model('Order', orderSchema);
