import express from 'express';
import Vehicle from '../models/Vehicle.js';
import Order from '../models/Order.js';

const router = express.Router();

// Get all vehicles (Fleet)
router.get('/fleet', async (req, res) => {
    try {
        let vehicles = await Vehicle.find().populate('currentOrder');

        // If no vehicles found (empty DB), return mock data for visualization
        if (vehicles.length === 0) {
            return res.json([
                {
                    _id: 'mock-1',
                    registration: 'GJ-01-AB-1234',
                    driver: 'Rajesh Kumar',
                    capacity: 1000,
                    status: 'in-transit',
                    currentLoad: 850,
                    location: { lat: 21.1702, lng: 72.8311 }, // Surat
                    origin: 'Gujarat Solar Plant',
                    destination: 'Mumbai Port',
                    eta: '3h 15m',
                    progress: 65
                },
                {
                    _id: 'mock-2',
                    registration: 'MH-02-CD-5678',
                    driver: 'Suresh Patil',
                    capacity: 1200,
                    status: 'loading',
                    currentLoad: 400,
                    location: { lat: 19.0760, lng: 72.8777 }, // Mumbai
                    origin: 'Mumbai Hub',
                    destination: 'Pune Industrial Zone',
                    eta: 'N/A',
                    progress: 0
                },
                {
                    _id: 'mock-3',
                    registration: 'KA-05-EF-9012',
                    driver: 'Ramesh Gowda',
                    capacity: 1500,
                    status: 'idle',
                    currentLoad: 0,
                    location: { lat: 12.9716, lng: 77.5946 }, // Bangalore
                    origin: 'Bangalore Plant',
                    destination: 'Mysore',
                    eta: 'N/A',
                    progress: 0
                },
                {
                    _id: 'mock-4',
                    registration: 'DL-01-GH-3456',
                    driver: 'Vikram Singh',
                    capacity: 2000,
                    status: 'maintenance',
                    currentLoad: 0,
                    location: { lat: 28.7041, lng: 77.1025 }, // Delhi
                    origin: 'Delhi Depot',
                    destination: 'Gurgaon',
                    eta: 'N/A',
                    progress: 0
                }
            ]);
        }

        res.json(vehicles);
    } catch (error) {
        console.warn('Database error, returning mock fleet:', error);
        // Fallback to mock data if DB fails
        res.json([
            {
                _id: 'mock-1',
                registration: 'GJ-01-AB-1234',
                driver: 'Rajesh Kumar',
                capacity: 1000,
                status: 'in-transit',
                currentLoad: 850,
                location: { lat: 21.1702, lng: 72.8311 }, // Surat
                origin: 'Gujarat Solar Plant',
                destination: 'Mumbai Port',
                eta: '3h 15m',
                progress: 65
            },
            {
                _id: 'mock-2',
                registration: 'MH-02-CD-5678',
                driver: 'Suresh Patil',
                capacity: 1200,
                status: 'loading',
                currentLoad: 400,
                location: { lat: 19.0760, lng: 72.8777 }, // Mumbai
                origin: 'Mumbai Hub',
                destination: 'Pune Industrial Zone',
                eta: 'N/A',
                progress: 0
            },
            {
                _id: 'mock-3',
                registration: 'KA-05-EF-9012',
                driver: 'Ramesh Gowda',
                capacity: 1500,
                status: 'idle',
                currentLoad: 0,
                location: { lat: 12.9716, lng: 77.5946 }, // Bangalore
                origin: 'Bangalore Plant',
                destination: 'Mysore',
                eta: 'N/A',
                progress: 0
            },
            {
                _id: 'mock-4',
                registration: 'DL-01-GH-3456',
                driver: 'Vikram Singh',
                capacity: 2000,
                status: 'maintenance',
                currentLoad: 0,
                location: { lat: 28.7041, lng: 77.1025 }, // Delhi
                origin: 'Delhi Depot',
                destination: 'Gurgaon',
                eta: 'N/A',
                progress: 0
            }
        ]);
    }
});

// Assign vehicle to order
router.post('/assign', async (req, res) => {
    try {
        const { vehicleId, orderId } = req.body;

        if (vehicleId.startsWith('mock-')) {
            return res.json({
                message: 'Mock vehicle assigned successfully',
                vehicle: { _id: vehicleId, status: 'in-transit' },
                order: { _id: orderId, status: 'in-transit' }
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        const order = await Order.findById(orderId);

        if (!vehicle || !order) {
            return res.status(404).json({ message: 'Vehicle or Order not found' });
        }

        // Update Vehicle
        vehicle.status = 'in-transit';
        vehicle.currentOrder = orderId;
        vehicle.currentLoad = order.product?.quantity || 0;
        vehicle.destination = `${order.deliveryAddress?.city}, ${order.deliveryAddress?.state}`;
        vehicle.origin = 'Gujarat Solar Plant'; // Default for now
        vehicle.eta = '4h 30m'; // Mock ETA calculation
        vehicle.progress = 0;
        await vehicle.save();

        // Update Order
        order.status = 'in-transit';
        await order.save();

        res.json({ message: 'Vehicle assigned successfully', vehicle, order });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed initial fleet if empty
router.post('/seed', async (req, res) => {
    try {
        const count = await Vehicle.countDocuments();
        if (count === 0) {
            const mockFleet = [
                {
                    registration: 'GJ-01-AB-1234',
                    driver: 'Rajesh Kumar',
                    capacity: 1000,
                    status: 'idle',
                    location: { lat: 23.0225, lng: 72.5714 },
                    origin: 'Ahmedabad',
                    destination: 'Mumbai'
                },
                {
                    registration: 'MH-02-CD-5678',
                    driver: 'Suresh Patil',
                    capacity: 1200,
                    status: 'idle',
                    location: { lat: 19.0760, lng: 72.8777 },
                    origin: 'Mumbai',
                    destination: 'Pune'
                },
                {
                    registration: 'DL-03-EF-9012',
                    driver: 'Amit Singh',
                    capacity: 800,
                    status: 'maintenance',
                    location: { lat: 28.7041, lng: 77.1025 },
                    origin: 'Delhi',
                    destination: 'Jaipur'
                }
            ];
            await Vehicle.insertMany(mockFleet);
            return res.json({ message: 'Fleet seeded successfully' });
        }
        res.json({ message: 'Fleet already exists' });
    } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
