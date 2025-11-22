import express from 'express';
import Machine from '../models/Machine.ts';

const router = express.Router();

// Get machines by plant
router.get('/plant/:plantId', async (req, res) => {
    try {
        const machines = await Machine.find({ plant: req.params.plantId });
        res.json(machines);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get machine by ID
router.get('/:id', async (req, res) => {
    try {
        const machine = await Machine.findById(req.params.id).populate('plant');
        if (!machine) {
            return res.status(404).json({ message: 'Machine not found' });
        }
        res.json(machine);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update machine status
router.put('/:id/status', async (req, res) => {
    try {
        const machine = await Machine.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status, sensors: req.body.sensors },
            { new: true }
        );
        res.json(machine);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
