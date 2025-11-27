import { WebSocket } from 'ws';

/**
 * Simple in‑memory room management for native WebSocket connections.
 * Each room maps to a Set of WebSocket clients.
 */
export const rooms = new Map<string, Set<WebSocket>>();

export const joinRoom = (socket: WebSocket, room: string) => {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room)!.add(socket);
};

export const leaveRoom = (socket: WebSocket, room: string) => {
    const set = rooms.get(room);
    if (set) {
        set.delete(socket);
        if (set.size === 0) rooms.delete(room);
    }
};

export const broadcastToRoom = (room: string, payload: any) => {
    const message = JSON.stringify(payload);
    const set = rooms.get(room);
    if (set) {
        for (const ws of set) {
            if (ws.readyState === ws.OPEN) ws.send(message);
        }
    }
};
