import { WebSocket } from 'ws';
import { joinRoom, leaveRoom, broadcastToRoom } from '../websocketUtils.js';

/**
 * Handles fleet update subscriptions over a native WebSocket connection.
 * Expected client messages:
 *   { type: 'subscribe:fleet' }
 *   { type: 'unsubscribe:fleet' }
 */
export const setupFleetUpdates = (socket: WebSocket) => {
    socket.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribe:fleet') {
                joinRoom(socket, 'fleet:updates');
                console.log('Client subscribed to fleet updates');
            } else if (msg.type === 'unsubscribe:fleet') {
                leaveRoom(socket, 'fleet:updates');
            }
        } catch (e) {
            console.warn('Invalid fleet update message', e);
        }
    });
};

/**
 * Emit a fleet position update to all subscribed clients.
 */
export const emitFleetUpdate = (vehicleId: string, data: any) => {
    broadcastToRoom('fleet:updates', { event: 'fleet:position', vehicleId, data });
};
