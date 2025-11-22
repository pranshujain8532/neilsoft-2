import express from 'express';
import Plant from '../models/Plant.js';

const router = express.Router();

// Get all plants
router.get('/', async (req, res) => {
    try {
        const plants = await Plant.find().populate('managers', 'name email');
        res.json(plants);
    } catch (error) {
        console.error('Error fetching plants:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get plant by ID
router.get('/:id', async (req, res) => {
    try {
        const plant = await Plant.findById(req.params.id).populate('managers');
        if (!plant) {
            return res.status(404).json({ message: 'Plant not found' });
        }
        res.json(plant);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create plant
router.post('/', async (req, res) => {
    try {
        const plant = new Plant(req.body);
        await plant.save();
        res.status(201).json(plant);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update plant
router.put('/:id', async (req, res) => {
    try {
        const plant = await Plant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plant) {
            return res.status(404).json({ message: 'Plant not found' });
        }
        res.json(plant);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get production data
router.get('/:id/production', async (req, res) => {
    try {
        const plant = await Plant.findById(req.params.id);
        if (!plant) {
            return res.status(404).json({ message: 'Plant not found' });
        }
        res.json(plant.productionHistory);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
