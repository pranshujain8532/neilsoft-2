import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { WebSocketServer, WebSocket } from 'ws';

// Routes
import authRoutes from './routes/auth.js';
import plantRoutes from './routes/plants.js';
import machineRoutes from './routes/machines.js';
import transportRoutes from './routes/transport.js';
import storageRoutes from './routes/storage.js';
import orderRoutes from './routes/orders.js';
import certificateRoutes from './routes/certificates.js';

// Socket handlers (native WebSocket)
import { setupPlantUpdates } from './socketHandlers/plantUpdates.js';
import { setupFleetUpdates } from './socketHandlers/fleetUpdates.js';
import { setupAlerts } from './socketHandlers/alerts.js';

dotenv.config();

const app = express();
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
    }
};
connectDB();

// In‑memory storage for development (when MongoDB is not available)
export const inMemoryDB = {
    users: [] as any[],
    plants: [] as any[],
    machines: [] as any[],
    containers: [] as any[],
    orders: [] as any[],
};

// API routes
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

// Create HTTP server and attach WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket: WebSocket) => {
    console.log('✅ Client connected via WebSocket');

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') {
                socket.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
            }
        } catch (error) {
            // Ignore parse errors for non-JSON messages or handle differently
        }
    });

    // Setup handlers – each will attach message listeners to this socket
    setupPlantUpdates(socket);
    setupFleetUpdates(socket);
    setupAlerts(socket);

    socket.on('close', () => {
        console.log('❌ Client disconnected');
    });
});

// Global error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📊 WebSocket server ready for real‑time updates');
});
