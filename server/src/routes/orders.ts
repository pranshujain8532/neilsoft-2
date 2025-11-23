import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// Declare global inMemoryOrders
declare global {
    var inMemoryOrders: any[];
}

// Initialize in-memory orders
if (!global.inMemoryOrders) {
    global.inMemoryOrders = [];
}

// Create order
router.post('/', async (req, res) => {
    try {
        // Try MongoDB
        try {
            const order = new Order(req.body);
            await order.save();
            return res.status(201).json(order);
        } catch (dbError) {
            console.warn('Database error, using in-memory storage for order:', dbError);

            // Fallback to in-memory
            const order = {
                _id: 'order-' + Date.now(),
                ...req.body,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'pending' // Ensure status is set
            };
            global.inMemoryOrders.push(order);
            return res.status(201).json(order);
        }
    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
});

// Get all orders (with filters)
router.get('/', async (req, res) => {
    try {
        const { customerId, status } = req.query;

        try {
            const query: any = {};
            if (customerId) query.customer = customerId;
            if (status) query.status = status;

            const orders = await Order.find(query).populate('customer', 'name email').populate('sourcePlant', 'name location').maxTimeMS(2000);
            return res.json(orders);
        } catch (dbError) {
            console.warn('Database error, returning in-memory orders');

            // Filter in-memory orders
            let orders = global.inMemoryOrders;
            if (customerId) {
                orders = orders.filter((o: any) => o.customer === customerId || o.customer?._id === customerId);
            }
            if (status) {
                orders = orders.filter((o: any) => o.status === status);
            }

            // Mock populate for customer if possible
            orders = orders.map((o: any) => {
                if (global.inMemoryUsers) {
                    const customer = global.inMemoryUsers.find((u: any) => u._id === o.customer || u._id === o.customer?._id);
                    if (customer) {
                        return { ...o, customer: { _id: customer._id, name: customer.name, email: customer.email } };
                    }
                }
                return o;
            });

            return res.json(orders);
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        try {
            const order = await Order.findById(req.params.id)
                .populate('customer')
                .populate('sourcePlant')
                .maxTimeMS(2000);
            if (order) return res.json(order);
        } catch (dbError) {
            // Check in-memory
            const order = global.inMemoryOrders.find((o: any) => o._id === req.params.id);
            if (order) {
                // Mock populate
                if (global.inMemoryUsers) {
                    const customer = global.inMemoryUsers.find((u: any) => u._id === order.customer || u._id === order.customer?._id);
                    if (customer) {
                        return res.json({ ...order, customer });
                    }
                }
                return res.json(order);
            }
        }
        res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order status
router.put('/:id/status', async (req, res) => {
    try {
        try {
            const order = await Order.findByIdAndUpdate(
                req.params.id,
                { status: req.body.status },
                { new: true }
            ).maxTimeMS(2000);
            if (order) return res.json(order);
        } catch (dbError) {
            // Update in-memory
            const index = global.inMemoryOrders.findIndex((o: any) => o._id === req.params.id);
            if (index !== -1) {
                global.inMemoryOrders[index].status = req.body.status;
                global.inMemoryOrders[index].updatedAt = new Date();
                return res.json(global.inMemoryOrders[index]);
            }
        }
        res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
