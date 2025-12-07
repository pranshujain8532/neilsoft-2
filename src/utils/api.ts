import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001';

// Create axios instances
export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const mlApi = axios.create({
    baseURL: ML_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API endpoints


export const authAPI = {
    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        // Fetch user profile to get role
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        const user = { ...data.user, role: profile?.role || 'customer' };
        return { data: { user, token: data.session?.access_token } };
    },
    signup: async (data: any) => {
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        role: data.role || 'customer',
                        companyName: data.companyName,
                    },
                },
            });

            if (error) {
                console.error('Supabase signup error:', error);
                throw error;
            }

            console.log('Signup successful:', authData);
            return { data: { user: authData.user, token: authData.session?.access_token } };
        } catch (error) {
            console.error('Signup failed:', error);
            throw error;
        }
    },
    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },
};

export const plantAPI = {
    getAll: async () => {
        const { data, error } = await supabase.from('plants').select('*');
        if (error) throw error;
        return { data };
    },
    getById: async (id: string) => {
        const { data, error } = await supabase.from('plants').select('*').eq('id', id).single();
        if (error) throw error;
        return { data };
    },
    update: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('plants').update(updates).eq('id', id).select();
        if (error) throw error;
        return { data };
    },
    getProduction: async (id: string, timeRange: string) => {
        // For now, return mock data or implement a separate table for production history
        // This is a placeholder as the original API had a specific endpoint
        console.log('getProduction not fully implemented in Supabase migration yet', id, timeRange);
        return { data: [] };
    },
};



export const machineAPI = {
    getByPlant: async (plantId: string) => {
        const { data, error } = await supabase.from('machines').select('*').eq('plant_id', plantId);
        if (error) throw error;
        return { data };
    },
    updateStatus: async (id: string, status: any) => {
        const { data, error } = await supabase.from('machines').update({ status }).eq('id', id).select();
        if (error) throw error;
        return { data };
    },
};

export const transportAPI = {
    getFleet: async () => {
        const { data, error } = await supabase.from('vehicles').select('*');
        if (error) throw error;
        return { data };
    },
    getVehicle: async (id: string) => {
        const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
        if (error) throw error;
        return { data };
    },
    optimizeRoute: async (data: any) => {
        // Placeholder for route optimization
        console.log('optimizeRoute not implemented in Supabase migration', data);
        return { data: { route: [] } };
    },
    assignVehicle: async (data: { vehicleId: string, orderId: string }) => {
        const { data: vehicle, error } = await supabase.from('vehicles')
            .update({ current_order: data.orderId, status: 'in-transit' })
            .eq('id', data.vehicleId)
            .select();
        if (error) throw error;
        return { data: vehicle };
    },
    autoAssign: async (data: { orderId: string }) => {
        // Simple logic: find first idle vehicle
        const { data: vehicles, error } = await supabase.from('vehicles').select('*').eq('status', 'idle').limit(1);
        if (error) throw error;
        if (vehicles && vehicles.length > 0) {
            const vehicle = vehicles[0];
            await supabase.from('vehicles').update({ current_order: data.orderId, status: 'in-transit' }).eq('id', vehicle.id);
            return { data: { vehicle } };
        }
        throw new Error('No idle vehicles available');
    },
    smartDispatch: async (order: any) => {
        // Call ML backend to optimize plant and vehicle selection
        const response = await mlApi.post('/logistics/optimize-order', order);
        if (response.data.success) {
            const { plant, vehicle, transport_method, explanation } = response.data.recommendation;

            // For pipeline transport, vehicle is not required
            if (transport_method !== 'pipeline' && !vehicle) {
                throw new Error('No idle vehicles available for truck transport');
            }

            // Only update vehicle if it's truck transport and we have a vehicle
            if (vehicle && transport_method !== 'pipeline') {
                await supabase.from('vehicles').update({
                    current_order: order.id,
                    status: 'in-transit',
                    current_route: `${plant.name || plant.plant_name} to ${order.delivery_address || 'Customer'}`
                }).eq('id', vehicle.id);
            }

            return { data: { vehicle, plant, transport_method, explanation } };
        }
        throw new Error(response.data.message || 'Optimization failed');
    },
};

export const storageAPI = {
    getContainers: async () => {
        const { data, error } = await supabase.from('containers').select('*');
        if (error) throw error;
        return { data };
    },
    getContainer: async (id: string) => {
        const { data, error } = await supabase.from('containers').select('*').eq('id', id).single();
        if (error) throw error;
        return { data };
    },
    getAlerts: async (status?: string) => {
        let query = supabase.from('storage_alerts').select('*').order('detected_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error) throw error;
        return { data };
    },
    acknowledgeAlert: async (id: string, userId?: string) => {
        const { data, error } = await supabase
            .from('storage_alerts')
            .update({
                status: 'acknowledged',
                acknowledged_at: new Date().toISOString(),
                acknowledged_by: userId
            })
            .eq('id', id);
        if (error) throw error;
        return { data };
    },
    resolveAlert: async (id: string, userId?: string, notes?: string) => {
        const { data, error } = await supabase
            .from('storage_alerts')
            .update({
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: userId,
                resolution_notes: notes
            })
            .eq('id', id);
        if (error) throw error;
        return { data };
    },
    getSensorReadings: async (containerId: string, limit: number = 100) => {
        const { data, error } = await supabase
            .from('storage_sensor_readings')
            .select('*')
            .eq('container_id', containerId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data };
    },
    getTransactions: async (containerId: string, limit: number = 50) => {
        const { data, error } = await supabase
            .from('storage_transactions')
            .select('*')
            .eq('container_id', containerId)
            .order('transaction_date', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data };
    },
    createTransaction: async (transaction: {
        container_id: string;
        transaction_type: 'inflow' | 'outflow';
        volume_kg: number;
        source_destination?: string;
        hydrogen_purity_percent?: number;
        order_id?: string;
        notes?: string;
    }) => {
        const { data, error } = await supabase
            .from('storage_transactions')
            .insert(transaction)
            .select()
            .single();
        if (error) throw error;
        return { data };
    },
};

export const orderAPI = {
    create: async (data: any) => {
        const { data: order, error } = await supabase.from('orders').insert(data).select().single();
        if (error) throw error;
        return { data: order };
    },
    getAll: async () => {
        const { data, error } = await supabase.from('orders').select('*');
        if (error) throw error;
        return { data };
    },
    getById: async (id: string) => {
        const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
        if (error) throw error;
        return { data };
    },
    updateStatus: async (id: string, status: string) => {
        const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select();
        if (error) throw error;
        return { data };
    },
};


export const certificateAPI = {
    getCertificate: async (id: string) => {
        console.log('getCertificate not implemented', id);
        return { data: {} };
    },
    verifyCertificate: async (tokenId: string) => {
        console.log('verifyCertificate not implemented', tokenId);
        return { data: { valid: true } };
    },
};

export const laborAPI = {
    getByPlant: async (plantId: string) => {
        const { data, error } = await supabase.from('labor').select('*').eq('plant_id', plantId);
        if (error) throw error;
        return { data };
    },
    getAll: async () => {
        const { data, error } = await supabase.from('labor').select('*');
        if (error) throw error;
        return { data };
    },
};

export const productionHistoryAPI = {
    getByPlant: async (plantId: string, limit = 30) => {
        const { data, error } = await supabase
            .from('production_history')
            .select('*')
            .eq('plant_id', plantId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data };
    },
};

export const profitabilityAPI = {
    getByPlant: async (plantId: string) => {
        const { data, error } = await supabase
            .from('plant_profitability')
            .select('*')
            .eq('plant_id', plantId)
            .order('year', { ascending: false });
        if (error) throw error;
        return { data };
    },
};

export const mlPredictionsAPI = {
    savePrediction: async (prediction: any) => {
        const { data, error } = await supabase.from('ml_predictions').insert(prediction).select().single();
        if (error) throw error;
        return { data };
    },
    getByPlant: async (plantId: string) => {
        const { data, error } = await supabase
            .from('ml_predictions')
            .select('*')
            .eq('plant_id', plantId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data };
    },
};

// ML API endpoints (Keep as is or mock if ML service is also removed, but user said "database")
// Assuming ML service is separate, we keep it pointing to ML_API_URL or refactor if needed.
// For now, I'll leave ML API as is, assuming it's an external service.
export const mlAPI = {
    predictProfit: (data: any) => mlApi.post('/predict/profit', data),
    getRecommendation: (data: any) => mlApi.post('/recommend/plant', data),
    checkSafety: (data: any) => mlApi.post('/safety/check', data),
    chat: (message: string, history: any[]) =>
        mlApi.post('/chat', { message, history }),
    optimizeLogistics: (data: any) => mlApi.post('/logistics/optimize', data),
    forecastEnergy: (data: any) => mlApi.post('/forecast/energy', data),
};

// Storage ML API - connects to ML backend for storage predictions
export const storageMLAPI = {
    // Get status of all storage ML models
    getStatus: () => mlApi.get('/storage/status'),

    // Get all latest ML predictions
    getPredictions: () => mlApi.get('/storage/predictions'),

    // Run anomaly detection on a container
    detectAnomaly: (containerId: string) =>
        mlApi.post('/storage/anomaly/detect', { container_id: containerId }),

    // Predict container health
    predictHealth: (containerId: string) =>
        mlApi.post('/storage/health/predict', { container_id: containerId }),

    // Get demand forecast
    getDemandForecast: (containerId?: string) =>
        mlApi.get('/storage/demand/forecast', { params: { container_id: containerId } }),

    // Get inventory optimization recommendation
    getInventoryRecommendation: (containerData?: any) =>
        containerData
            ? mlApi.post('/storage/inventory/optimize', containerData)
            : mlApi.get('/storage/inventory/optimize'),

    // Get comprehensive ML analysis for a container
    getContainerAnalysis: (containerId: string) =>
        mlApi.get(`/storage/containers/${containerId}/analysis`),

    // Generate AI-enhanced alert with recommendations
    generateAIAlert: (containerId: string, alertType?: string) =>
        mlApi.post('/storage/alerts/ai', { container_id: containerId, alert_type: alertType }),

    // Train all storage ML models (admin only)
    trainModels: () => mlApi.post('/storage/train'),

    // Start storage ML background service
    startService: () => mlApi.post('/storage/service/start'),

    // Stop storage ML background service
    stopService: () => mlApi.post('/storage/service/stop'),
};

export default api;

