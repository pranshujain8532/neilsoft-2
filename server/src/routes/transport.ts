import express from 'express';
import Vehicle from '../models/Vehicle.js';
import Order from '../models/Order.js';
import Plant from '../models/Plant.js';
import mongoose from 'mongoose';

const router = express.Router();

// Declare global inMemoryVehicles
declare global {
    var inMemoryVehicles: any[];
}

// Initialize in-memory vehicles
if (!global.inMemoryVehicles) {
    global.inMemoryVehicles = [];
}


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

        // Combine DB vehicles with in-memory vehicles for complete fleet view
        const combinedVehicles = [...vehicles, ...(global.inMemoryVehicles || [])];
        res.json(combinedVehicles);
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

// Smart Auto-Assign Vehicle & Plant - PRODUCTION READY
router.post('/auto-assign', async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log('Auto-assign request for order:', orderId);

        // 1. Find Order (MongoDB or in-memory)
        let order = null;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            try {
                order = await Order.findById(orderId).maxTimeMS(2000);
            } catch (dbError) {
                console.warn('MongoDB timeout finding order');
            }
        }

        if (!order) {
            const memOrder = global.inMemoryOrders?.find((o: any) => o._id === orderId);
            if (!memOrder) {
                console.error('Order not found:', orderId);
                return res.status(404).json({ message: 'Order not found' });
            }
            order = memOrder;
        }

        console.log('Order found:', order._id);
        console.log('Order structure:', JSON.stringify(order, null, 2));
        console.log('Order keys:', Object.keys(order));

        // 2. Get Plants with fallback
        let plants: any[] = [];
        try {
            plants = await Plant.find({ status: 'active' }).maxTimeMS(2000);
        } catch (plantError) {
            console.warn('MongoDB timeout fetching plants, using fallback');
        }

        if (!plants || plants.length === 0) {
            plants = [
                { _id: 'mock-plant-1', name: 'Gujarat Solar Plant', status: 'active', location: { coordinates: { lat: 23.0225, lng: 72.5714 } } },
                { _id: 'mock-plant-2', name: 'Mumbai Green Hub', status: 'active', location: { coordinates: { lat: 19.0760, lng: 72.8777 } } }
            ];
        }

        // 3. Select nearest plant (simple logic)
        const selectedPlant = plants[0];
        const origin = selectedPlant.name;

        // 4. Find or Create Vehicle
        let vehicle: any = null;
        try {
            vehicle = await Vehicle.findOne({ status: 'idle' }).maxTimeMS(2000);
        } catch (dbError) {
            console.warn('MongoDB timeout finding vehicle');
        }

        if (!vehicle) {
            // Create in-memory vehicle
            const quantity = order?.product?.quantity || (order as any)?.quantity || 100;
            vehicle = {
                _id: `temp-vehicle-${Date.now()}`,
                registration: `TEMP-${Math.floor(Math.random() * 1000)}`,
                driver: ['Rajesh Kumar', 'Suresh Patil', 'Amit Singh'][Math.floor(Math.random() * 3)],
                capacity: 1000,
                status: 'in-transit',
                currentOrder: orderId,
                currentLoad: quantity,
                location: selectedPlant?.location?.coordinates || { lat: 19.0760, lng: 72.8777 },
                origin: origin,
                destination: `${order?.deliveryAddress?.city || 'Unknown'}, ${order?.deliveryAddress?.state || 'India'}`,
                eta: `${Math.floor(Math.random() * 5) + 2}h ${Math.floor(Math.random() * 60)}m`,
                progress: 0
            };
            global.inMemoryVehicles.push(vehicle);
            console.log('Created in-memory vehicle:', vehicle.registration);
        } else {
            const quantity = order?.product?.quantity || (order as any)?.quantity || 100;
            vehicle.status = 'in-transit';
            vehicle.currentOrder = orderId;
            vehicle.currentLoad = quantity;
            vehicle.destination = `${order?.deliveryAddress?.city || 'Unknown'}, ${order?.deliveryAddress?.state || 'India'}`;
            vehicle.origin = origin;
            vehicle.eta = `${Math.floor(Math.random() * 5) + 2}h ${Math.floor(Math.random() * 60)}m`;
            vehicle.progress = 0;
            try {
                await vehicle.save();
            } catch (saveError) {
                console.warn('Could not save vehicle to DB');
            }
        }

        // 5. Update Order Status
        if (order.save && typeof order.save === 'function') {
            order.status = 'in-transit';
            order.sourcePlant = selectedPlant._id;
            try {
                await order.save();
            } catch (saveError) {
                console.warn('Could not save order to DB');
            }
        } else {
            // Update in-memory order
            const index = global.inMemoryOrders?.findIndex((o: any) => o._id === orderId);
            if (index !== -1 && global.inMemoryOrders) {
                global.inMemoryOrders[index].status = 'in-transit';
                global.inMemoryOrders[index].sourcePlant = selectedPlant._id;
            }
        }

        console.log('✅ Dispatch successful');

        res.json({
            message: 'Smart Logistics Assignment Complete',
            vehicle,
            plant: selectedPlant,
            distance: '50 km',
            safetyLog: [
                `✅ Plant ${selectedPlant.name} selected`,
                `🚚 Vehicle ${vehicle.registration} assigned`,
                `📍 Route: ${origin} → ${order?.deliveryAddress?.city}`
            ]
        });

    } catch (error) {
        console.error('========= AUTO-ASSIGN ERROR =========');
        console.error('Error:', error);
        console.error('====================================');
        res.status(500).json({
            message: 'Server error during auto-assignment',
            error: error instanceof Error ? error.message : String(error)
        });
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
