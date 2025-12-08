import axios from 'axios';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface ETAResponse {
    distance: string;
    duration: string;
    duration_in_traffic?: string;
}

export const calculateETA = async (origin: string, destination: string): Promise<ETAResponse> => {
    // if (!GOOGLE_MAPS_API_KEY) {
    //     console.warn('Google Maps API key missing, returning mock ETA');
    //     return { distance: '120 km', duration: '2h 30m', duration_in_traffic: '2h 45m' };
    // }

    try {
        // Note: Client-side calls to Google Maps Directions API might be blocked by CORS.
        // Ideally this should be proxied through the backend.
        // For this demo, we'll assume a backend proxy or CORS allowed.
        // Falling back to backend proxy if direct call fails is a good strategy.

        const response = await axios.get(`/api/transport/eta`, {
            params: { origin, destination }
        });
        return response.data;
    } catch (error) {
        console.error('Error calculating ETA:', error);
        return { distance: 'Unknown', duration: 'Unknown' };
    }
};

export const simulateRoute = async (waypoints: string[]): Promise<ETAResponse> => {
    // Simulation logic would go here, calling the same API with waypoints
    return calculateETA(waypoints[0], waypoints[waypoints.length - 1]);
};
