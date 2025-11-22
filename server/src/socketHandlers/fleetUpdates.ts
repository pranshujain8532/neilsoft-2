import { Server, Socket } from 'socket.io';

export const setupFleetUpdates = (io: Server, socket: Socket) => {
    socket.on('subscribe:fleet', () => {
        socket.join('fleet:updates');
        console.log(`Client ${socket.id} subscribed to fleet updates`);
    });

    socket.on('unsubscribe:fleet', () => {
        socket.leave('fleet:updates');
    });
};

export const emitFleetUpdate = (io: Server, vehicleId: string, data: any) => {
    io.to('fleet:updates').emit('fleet:position', { vehicleId, ...data });
};
