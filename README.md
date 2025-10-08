What is MQTNL?

MQTNL provides a familiar socket-like API over reliable MQTT transport, with useful features like priority queues, rate limiting, and adaptive packet sizing. Think TCP/IP sockets, but over MQTT with additional application-level QoS for smarter packet prioritization.

// Familiar socket-like API - but addresses can be ANYTHING!
const conn = new mqtnlConnection(connectionManager, 8080);
conn.QoSPriority = QoS.HIGH;  // Set priority

// Use creative, descriptive addresses (not just IPs!)
conn.write('user-service', 80, 'login request');
conn.write('melati-flower', 3000, 'sensor data');
conn.write('payment-gateway', 443, transaction);

Quick Start
Installation

npm install mqtnl mqtt

Basic Usage

const { connectionManager, mqtnlConnection, QoS, SimpleSecurityAgent, securityAgent } = require('mqtnl');
const mqtt = require('mqtt');

// Create simple security (optional)
const simpleSec = new SimpleSecurityAgent();
const security = new securityAgent(
  (data) => simpleSec.cipher(data),
  (data) => simpleSec.decipher(data)
);

// Create connection manager
const cm = new connectionManager('myApp', {
  server: 'mqtt://localhost:1883',
  mqttLib: mqtt,
  clan: 'production'
}, security);

// Connect to broker
cm.connect(() => {
  console.log('Connected to MQTT broker');
  
  const conn = new mqtnlConnection(cm, 8080);
  conn.QoSPriority = QoS.HIGH;
  conn.write('device1', 80, 'Hello Device!');
  
  conn.onReceive((data, sender) => {
    console.log(`Received: ${data.payload} from ${sender}`);
  });
});

Key Features
Familiar Socket API

    Flexible addressing: Use service names, not just IPs

    Connection-oriented: Create sockets on specific ports

    Bidirectional: Send and receive with callbacks

Application-Level QoS Priority

    4-level priority: CRITICAL → HIGH → NORMAL → LOW

    Smart packet scheduling: Important packets processed first

    Works with MQTT QoS: Additional layer on top of MQTT’s delivery guarantees

    Property-based: Just set conn.QoSPriority = QoS.CRITICAL

Built-in Features

    Memory Management: Auto-cleanup for long-running apps

    Rate Limiting: Protection against spam/DoS

    Adaptive Packet Sizing: Network-aware optimization

    Enhanced Monitoring: Detailed connection stats

    Built-in Firewall: Packet filtering rules

Built-in Security
Simple Security Agent

const { SimpleSecurityAgent, securityAgent } = require('mqtnl');

const simpleSec = new SimpleSecurityAgent();
console.log(simpleSec.cipher('hello'));    // Output: 'olleh'
console.log(simpleSec.decipher('olleh'));  // Output: 'hello'

const security = new securityAgent(
  (data) => simpleSec.cipher(data),
  (data) => simpleSec.decipher(data)
);

const cm = new connectionManager('myApp', options, security);

Custom Security Agent

const customSecurity = new securityAgent(
  (data) => Buffer.from(data).toString('base64'),
  (data) => Buffer.from(data, 'base64').toString()
);

Enterprise Monitoring

const stats = cm.getDetailedStats();
console.log(stats.activeConnections, stats.avgLatency, stats.connectionHealth);

const features = cm.getActiveFeatures();
console.log(features.priorityQueue, features.rateLimiting);

API Reference
Core Classes
connectionManager(id, options)

Manages the MQTT broker connection.

const cm = new connectionManager('myApp', {
  server: 'mqtt://broker.example.com',
  port: 1883,
  mqttLib: require('mqtt'),
  clan: 'production'
});

mqtnlConnection(connectionManager, port)

Socket-like connection for sending/receiving data.

const conn = new mqtnlConnection(cm, 8080);
conn.QoSPriority = QoS.HIGH;
conn.write('user-service', 80, 'Hello World');
conn.onReceive((data, sender) => console.log(data.payload));
conn.reply('Response data', sender);

QoS Priority Levels

const { QoS } = require('mqtnl');

conn.QoSPriority = QoS.CRITICAL;
conn.QoSPriority = QoS.HIGH;
conn.QoSPriority = QoS.NORMAL;
conn.QoSPriority = QoS.LOW;

MQTNL priority works alongside MQTT’s native QoS. MQTT QoS handles delivery guarantees, while MQTNL priority handles application-level packet scheduling.
Enhanced Features
Enable Rate Limiting

cm.enableRateLimit(100, 60000);

Enable Priority Queue

conn.dtm.enablePriorityQueue(10);

Enable Adaptive Packet Sizing

conn.dtm.enableAdaptivePacketSizing();

Examples
Real-time Chat Server

const chatServer = new mqtnlConnection(cm, 3000);

chatServer.onReceive((data, sender) => {
  const message = JSON.parse(data.payload);
  chatServer.QoSPriority = QoS.HIGH;
  clients.forEach(client => {
    chatServer.write(client.address, client.port, JSON.stringify({
      user: message.user,
      text: message.text,
      timestamp: Date.now()
    }));
  });
});

IoT Sensor Network

const sensor = new mqtnlConnection(cm, 4000);

function sendAlert(alertData) {
  sensor.QoSPriority = QoS.CRITICAL;
  sensor.write('gateway', 1883, JSON.stringify({
    type: 'alert',
    severity: 'critical',
    data: alertData
  }));
}

function sendSensorData(sensorData) {
  sensor.QoSPriority = QoS.NORMAL;
  sensor.write('gateway', 1883, JSON.stringify({
    type: 'sensor_data',
    data: sensorData
  }));
}

File Transfer with Low Priority

const fileTransfer = new mqtnlConnection(cm, 5000);
fileTransfer.QoSPriority = QoS.LOW;

function sendFileChunk(chunk, chunkIndex, totalChunks) {
  fileTransfer.write('fileserver', 21, JSON.stringify({
    type: 'file_chunk',
    chunkIndex,
    totalChunks,
    data: chunk.toString('base64')
  }));
}

Migration from Socket.io
Socket.io → MQTNL

// Before
socket.emit('message', data);
socket.on('message', handler);

// After
conn.write('target-device', 8080, data);
conn.onReceive(handler);

Native MQTT → MQTNL

// Before
client.publish('device/sensor/room1/temp', data);
client.subscribe('device/+/+');

// After
conn.write('device', 8080, data);
conn.onReceive(handler);

More Examples
Connection Monitoring

setInterval(() => {
  const stats = cm.getDetailedStats();
  if (stats.connectionHealth === 'overloaded') {
    console.warn('Connection overloaded!');
    cm.enableRateLimit(50, 30000);
  }
  console.log(`Active connections: ${stats.activeConnections}`);
  console.log(`Average latency: ${stats.avgLatency}ms`);
}, 5000);

Network Optimization

cm.enableRateLimit(200, 60000);
conn.dtm.enableAdaptivePacketSizing();
conn.dtm.enablePriorityQueue(5);

const features = cm.getActiveFeatures();
console.log('Active optimizations:', features.features);

Firewall Configuration

const fw = new mqtnl.firewallManager();

fw.addRule({
  direction: 'incoming',
  type: 'allow',
  condition: {
    srcAddress: 'sensor-*',
    srcPort: '*',
    dstAddress: '*',
    dstPort: 8080
  },
  active: 1
});

fw.addRule({
  direction: 'incoming',
  type: 'deny',
  condition: {
    srcAddress: '192.168.100.*',
    srcPort: '*',
    dstAddress: '*',
    dstPort: '22*'
  },
  active: 1
});

fw.addRule({
  direction: 'outgoing',
  type: 'allow',
  condition: {
    srcAddress: '*',
    srcPort: '*',
    dstAddress: '*-api',
    dstPort: '*'
  },
  active: 1
});

cm.setFirewallRules(fw.firewallConfig);
cm.setFirewallActive(1);

Wildcard Pattern Support

    * — matches everything

    prefix* — starts with prefix

    *suffix — ends with suffix

    *middle* — contains “middle”

    Exact match — no wildcards

Configuration
Connection Options

const options = {
  server: 'mqtt://broker.example.com',
  port: 1883,
  mqttLib: require('mqtt'),
  clan: 'production'
};

Environment Variables

MQTNL_QUIET=true
NODE_ENV=production

Testing

npm test
npm run example
npm run qos-demo
npm run creative-demo

Why Choose MQTNL?
vs Socket.io

    Address-based communication

    True QoS priorities with guaranteed scheduling

    MQTT reliability (auto-reconnect, persistence)

    Built-in monitoring and rate limiting

vs Native MQTT

    Familiar socket API

    Priority queue, monitoring, and firewall

    Automatic packet assembly

    Built-in security and rate limiting

vs TCP/UDP Sockets

    Broker-mediated (no direct connections)

    Firewall friendly (single MQTT port)

    Cloud-ready

    Message persistence and delivery guarantees

Production Considerations
Memory Management

    Automatic cleanup of expired packets

    Configurable TTL

    Memory leak prevention

Security

    Built-in firewall

    Rate limiting

    Security agent support

Performance

    Priority queue for critical data

    Adaptive packet sizing

    Connection pooling

Benchmarks

Typical performance:

    Throughput: 1000+ messages/sec

    Latency: <10ms (LAN), <50ms (Internet)

    Memory: ~2MB base + ~1KB/connection

    Scheduling overhead: <1ms

Contributing

See Contributing Guide

.
License

MIT License — see LICENSE

file.
Links

    NPM: https://www.npmjs.com/package/mqtnl
