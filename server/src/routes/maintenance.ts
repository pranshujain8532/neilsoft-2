import express from 'express';
import { Request, Response } from 'express';
import { emitMaintenanceAlert } from '../socketHandlers/fleetUpdates.js';

const router = express.Router();

// Placeholder maintenance schedule data – in a real system this would come from a DB or ML service
const mockSchedule = [
    {
        vehicleId: 'GJ-01-AB-1234',
        dueDate: '2025-12-10',
        description: 'Engine oil change',
    },
    {
        vehicleId: 'MH-02-CD-5678',
        dueDate: '2025-12-15',
        description: 'Brake inspection',
    },
    {
        vehicleId: 'DL-03-EF-9012',
        dueDate: '2025-12-20',
        description: 'Tire rotation',
    },
];

// GET /maintenance/schedule – returns upcoming maintenance events
router.get('/schedule', (req: Request, res: Response) => {
    res.json({ schedule: mockSchedule });
});

// POST /maintenance/alert – receives real‑time alerts from the predictive‑maintenance service
router.post('/alert', (req: Request, res: Response) => {
    const { vehicleId, wearScore, confidenceInterval } = req.body;
    console.log('⚠️ Maintenance alert received:', { vehicleId, wearScore, confidenceInterval });
    emitMaintenanceAlert(vehicleId, { wearScore, confidenceInterval, timestamp: new Date() });
    res.json({ status: 'alert received' });
});

export default router;
