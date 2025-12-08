const WebSocket = require('ws');

const WS_URL = 'ws://localhost:5000/ws';
const ITERATIONS = 10;
let latencies = [];

console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ Connected');
    ping();
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'pong') {
        const end = Date.now();
        const latency = end - msg.timestamp;
        latencies.push(latency);
        console.log(`Ping ${latencies.length}: ${latency}ms`);

        if (latencies.length < ITERATIONS) {
            setTimeout(ping, 100);
        } else {
            finish();
        }
    }
});

ws.on('error', (err) => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
});

function ping() {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
}

function finish() {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);

    console.log('\n--- Results ---');
    console.log(`Average Latency: ${avg.toFixed(2)}ms`);
    console.log(`Min Latency: ${min}ms`);
    console.log(`Max Latency: ${max}ms`);

    ws.close();

    if (avg <= 100) {
        console.log('✅ PASS: Latency is under 100ms');
        process.exit(0);
    } else {
        console.error('❌ FAIL: Latency is over 100ms');
        process.exit(1);
    }
}
