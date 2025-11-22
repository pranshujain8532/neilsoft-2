import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Routes
import authRoutes from './routes/auth.js';
import plantRoutes from './routes/plants.js';
import machineRoutes from './routes/machines.js';
import transportRoutes from './routes/transport.js';
import storageRoutes from './routes/storage.js';
import orderRoutes from './routes/orders.js';
import certificateRoutes from './routes/certificates.js';

// Socket handlers
import { setupPlantUpdates } from './socketHandlers/plantUpdates.js';
import { setupFleetUpdates } from './socketHandlers/fleetUpdates.js';
import { setupAlerts } from './socketHandlers/alerts.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection (optional for development)
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/green-hydrogen');
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.warn('⚠️  MongoDB connection failed - running in development mode without database');
        console.warn('   (Account data will not persist across restarts)');
        // Don't exit - continue running with in-memory storage
    }
};

connectDB();

// In-memory storage for development (when MongoDB is not available)
export const inMemoryDB = {
    users: [] as any[],
    plants: [] as any[],
    machines: [] as any[],
    containers: [] as any[],
    orders: [] as any[],
};

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/certificates', certificateRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io setup
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    setupPlantUpdates(io, socket);
    setupFleetUpdates(io, socket);
    setupAlerts(io, socket);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Socket.IO ready for real-time updates`);
});

export { io };
