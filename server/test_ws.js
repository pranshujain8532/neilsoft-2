import { WebSocketServer } from 'ws';
console.log('WS imported successfully');
const wss = new WebSocketServer({ noServer: true });
console.log('WSS created');
