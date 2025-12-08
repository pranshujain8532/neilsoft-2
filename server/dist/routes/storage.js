import express from 'express';
import Container from '../models/Container.js';
const router = express.Router();
// Get all containers
router.get('/containers', async (req, res) => {
    try {
        const containers = await Container.find().populate('plant', 'name location');
        res.json(containers);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get container by ID
router.get('/container/:id', async (req, res) => {
    try {
        const container = await Container.findById(req.params.id).populate('plant');
        if (!container) {
            return res.status(404).json({ message: 'Container not found' });
        }
        res.json(container);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get alerts
router.get('/alerts', async (req, res) => {
    try {
        const containers = await Container.find({ status: { $in: ['warning', 'critical'] } })
            .populate('plant', 'name location');
        res.json(containers);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
