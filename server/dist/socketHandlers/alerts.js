import { joinRoom, leaveRoom, broadcastToRoom } from '../websocketUtils.js';
/**
 * Handles alert subscriptions over a native WebSocket connection.
 * Expected client messages:
 *   { type: 'subscribe:alerts' }
 *   { type: 'unsubscribe:alerts' }
 */
export const setupAlerts = (socket) => {
    socket.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribe:alerts') {
                joinRoom(socket, 'alerts');
                console.log('Client subscribed to alerts');
            }
            else if (msg.type === 'unsubscribe:alerts') {
                leaveRoom(socket, 'alerts');
            }
        }
        catch (e) {
            console.warn('Invalid alert subscription message', e);
        }
    });
};
/**
 * Emit a new alert to all subscribed clients.
 */
export const emitAlert = (alert) => {
    broadcastToRoom('alerts', { event: 'alert:new', alert });
};
