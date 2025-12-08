import { joinRoom, leaveRoom, broadcastToRoom } from '../websocketUtils.js';
/**
 * Handles plant update subscriptions over a native WebSocket connection.
 * Expected client messages are JSON strings with a `type` field:
 *   { type: 'subscribe:plant', plantId: string }
 *   { type: 'unsubscribe:plant', plantId: string }
 */
export const setupPlantUpdates = (socket) => {
    socket.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribe:plant' && typeof msg.plantId === 'string') {
                joinRoom(socket, `plant:${msg.plantId}`);
                console.log(`Client subscribed to plant ${msg.plantId}`);
            }
            else if (msg.type === 'unsubscribe:plant' && typeof msg.plantId === 'string') {
                leaveRoom(socket, `plant:${msg.plantId}`);
            }
        }
        catch (e) {
            console.warn('Invalid plant update message', e);
        }
    });
};
/**
 * Emit a plant production update to all subscribed clients.
 */
export const emitPlantUpdate = (plantId, data) => {
    broadcastToRoom(`plant:${plantId}`, { event: 'plant:update', data });
};
