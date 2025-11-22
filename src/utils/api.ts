import axios from 'axios';

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
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    signup: (data: any) =>
        api.post('/auth/signup', data),
    logout: () =>
        api.post('/auth/logout'),
};

export const plantAPI = {
    getAll: () => api.get('/plants'),
    getById: (id: string) => api.get(`/plants/${id}`),
    update: (id: string, data: any) => api.put(`/plants/${id}`, data),
    getProduction: (id: string, timeRange: string) =>
        api.get(`/plants/${id}/production?range=${timeRange}`),
};

export const machineAPI = {
    getByPlant: (plantId: string) => api.get(`/machines/plant/${plantId}`),
    updateStatus: (id: string, status: any) =>
        api.put(`/machines/${id}/status`, status),
};

export const transportAPI = {
    getFleet: () => api.get('/transport/fleet'),
    getVehicle: (id: string) => api.get(`/transport/vehicle/${id}`),
    optimizeRoute: (data: any) => api.post('/transport/optimize', data),
};

export const storageAPI = {
    getContainers: () => api.get('/storage/containers'),
    getContainer: (id: string) => api.get(`/storage/container/${id}`),
    getAlerts: () => api.get('/storage/alerts'),
};

export const orderAPI = {
    create: (data: any) => api.post('/orders', data),
    getAll: () => api.get('/orders'),
    getById: (id: string) => api.get(`/orders/${id}`),
    updateStatus: (id: string, status: string) =>
        api.put(`/orders/${id}/status`, { status }),
};

export const certificateAPI = {
    getCertificate: (id: string) => api.get(`/certificates/${id}`),
    verifyCertificate: (tokenId: string) =>
        api.get(`/certificates/verify/${tokenId}`),
};

// ML API endpoints
export const mlAPI = {
    predictProfit: (data: any) => mlApi.post('/predict/profit', data),
    getRecommendation: (data: any) => mlApi.post('/recommend/plant', data),
    checkSafety: (data: any) => mlApi.post('/safety/check', data),
    chat: (message: string, history: any[]) =>
        mlApi.post('/chat', { message, history }),
    optimizeLogistics: (data: any) => mlApi.post('/logistics/optimize', data),
    forecastEnergy: (data: any) => mlApi.post('/forecast/energy', data),
};

export default api;
