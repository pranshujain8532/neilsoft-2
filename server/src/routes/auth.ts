import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Declare global inMemoryUsers
declare global {
    var inMemoryUsers: any[];
}

// Seed default users if empty
if (!global.inMemoryUsers) {
    global.inMemoryUsers = [];
}

const seedUsers = () => {
    if (global.inMemoryUsers.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const customerPassword = bcrypt.hashSync('user123', 10);

        global.inMemoryUsers.push({
            _id: 'admin-1',
            name: 'Admin User',
            email: 'admin@h2.com',
            password: hashedPassword,
            role: 'admin',
            companyName: 'H2 OptiPlant',
            createdAt: new Date(),
        });

        global.inMemoryUsers.push({
            _id: 'customer-1',
            name: 'John Doe',
            email: 'user@example.com',
            password: customerPassword,
            role: 'customer',
            companyName: 'Green Energy Corp',
            createdAt: new Date(),
        });

        console.log('✅ Default users seeded: admin@h2.com / admin123');
    }
};
seedUsers();

// Register
router.post('/signup', async (req: any, res: any) => {
    try {
        const { name, email, password, role, companyName } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Try MongoDB first, fallback to in-memory storage
        try {
            // Check if user exists in MongoDB
            const existingUser = await User.findOne({ email }).maxTimeMS(1000);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Create user in MongoDB
            const user = new User({
                name,
                email,
                password: hashedPassword,
                role: role || 'customer',
                companyName,
            });
            await user.save();

            // Generate token
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            return res.status(201).json({
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (dbError) {
            // MongoDB failed, use in-memory storage
            console.log('Using in-memory storage for signup');

            // Initialize global inMemoryUsers if it doesn't exist
            if (!global.inMemoryUsers) {
                global.inMemoryUsers = [];
            }

            // Check if user exists in memory
            const existingUser = global.inMemoryUsers.find((u: any) => u.email === email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Create user in memory
            const user = {
                _id: Date.now().toString(),
                name,
                email,
                password: hashedPassword,
                role: role || 'customer',
                companyName,
                createdAt: new Date(),
            };

            global.inMemoryUsers.push(user);

            // Generate token
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            return res.status(201).json({
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
});

// Login
router.post('/login', async (req: any, res: any) => {
    try {
        const { email, password } = req.body;

        // Try MongoDB first, fallback to in-memory storage
        let user;
        try {
            user = await User.findOne({ email }).maxTimeMS(1000);
        } catch (dbError) {
            // MongoDB failed, check in-memory storage
            console.log('Using in-memory storage for login');
            if (global.inMemoryUsers) {
                user = global.inMemoryUsers.find((u: any) => u.email === email);
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
});

// Get current user
router.get('/me', async (req: any, res: any) => {
    try {
        // Extract token from header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

        // Try MongoDB first
        try {
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                return res.json(user);
            }
        } catch (dbError) {
            // MongoDB failed, check in-memory
            if (global.inMemoryUsers) {
                const user = global.inMemoryUsers.find((u: any) => u._id === decoded.id);
                if (user) {
                    const { password, ...userWithoutPassword } = user;
                    return res.json(userWithoutPassword);
                }
            }
        }

        res.status(404).json({ message: 'User not found' });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

export default router;
