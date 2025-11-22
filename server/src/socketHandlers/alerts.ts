import { Server, Socket } from 'socket.io';

export const setupAlerts = (io: Server, socket: Socket) => {
    socket.on('subscribe:alerts', () => {
        socket.join('alerts');
        console.log(`Client ${socket.id} subscribed to alerts`);
    });

    socket.on('unsubscribe:alerts', () => {
        socket.leave('alerts');
    });
};

export const emitAlert = (io: Server, alert: any) => {
    io.to('alerts').emit('alert:new', alert);
};
