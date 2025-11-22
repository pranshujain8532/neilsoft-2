import { Server, Socket } from 'socket.io';

export const setupPlantUpdates = (io: Server, socket: Socket) => {
    // Subscribe to plant updates
    socket.on('subscribe:plant', (plantId: string) => {
        socket.join(`plant:${plantId}`);
        console.log(`Client ${socket.id} subscribed to plant ${plantId}`);
    });

    // Unsubscribe from plant updates
    socket.on('unsubscribe:plant', (plantId: string) => {
        socket.leave(`plant:${plantId}`);
    });
};

// Emit plant production update (called from background job)
export const emitPlantUpdate = (io: Server, plantId: string, data: any) => {
    io.to(`plant:${plantId}`).emit('plant:update', data);
};
