const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
let ws: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;

export const connect = () => {
    if (ws) return;

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // Dispatch custom event for components to listen to
            window.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
        } catch (e) {
            console.warn('Failed to parse WebSocket message', e);
        }
    };

    ws.onclose = () => {
        console.log('❌ WebSocket closed');
        ws = null;
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connect, 3000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws?.close();
    };
};

export const send = (type: string, payload: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...payload }));
    } else {
        console.warn('WebSocket not connected, cannot send message', type);
    }
};

export const subscribeFleet = () => send('subscribe:fleet', {});
export const unsubscribeFleet = () => send('unsubscribe:fleet', {});

export const subscribePlant = (plantId: string) => send('subscribe:plant', { plantId });
export const unsubscribePlant = (plantId: string) => send('unsubscribe:plant', { plantId });

export const subscribeAlerts = () => send('subscribe:alerts', {});
export const unsubscribeAlerts = () => send('unsubscribe:alerts', {});
