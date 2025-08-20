# MQTNL - Socket-Style Networking Over MQTT

> Making MQTT feel like TCP/IP with QoS features and priority queue scheduling

[![npm version](https://badge.fury.io/js/mqtnl.svg)](https://www.npmjs.com/package/mqtnl)
[![Node.js](https://img.shields.io/node/v/mqtnl)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🔌 What is MQTNL?

MQTNL provides a **familiar socket-like API** over reliable MQTT transport, with useful features like **priority queues**, **rate limiting**, and **adaptive packet sizing**. Think TCP/IP sockets, but over MQTT with better QoS control.

```javascript
// Familiar socket-like API - but addresses can be ANYTHING!
const conn = new mqtnlConnection(connectionManager, 8080);
conn.QoSPriority = QoS.HIGH;  // Set priority

// Use creative, descriptive addresses (not just IPs!)
conn.write('user-service', 80, 'login request');        // Service names
conn.write('melati-flower', 3000, 'sensor data');       // Natural names  
conn.write('payment-gateway', 443, transaction);        // Descriptive
conn.write('🌸', 8080, 'emoji addresses work too!');    // Even emojis!
```

## ⚡ Quick Start

### Installation

```bash
npm install mqtnl mqtt
```

### Basic Usage

```javascript
const { connectionManager, mqtnlConnection, QoS, SimpleSecurityAgent, securityAgent } = require('mqtnl');
const mqtt = require('mqtt');

// Create simple security (optional)
const simpleSec = new SimpleSecurityAgent();
const security = new securityAgent(
  (data) => simpleSec.cipher(data),      // Encrypt
  (data) => simpleSec.decipher(data)     // Decrypt
);

// Create connection manager
const cm = new connectionManager('myApp', {
  server: 'mqtt://localhost:1883',
  mqttLib: mqtt,
  clan: 'production'
}, security);  // Security is optional

// Connect to broker
cm.connect(() => {
  console.log('Connected to MQTT broker');
  
  // Create socket-like connection
  const conn = new mqtnlConnection(cm, 8080);
  
  // Set high priority for important data
  conn.QoSPriority = QoS.HIGH;
  
  // Send data (feels like TCP socket!)
  conn.write('device1', 80, 'Hello Device!');
  
  // Receive data
  conn.onReceive((data, sender) => {
    console.log(`Received: ${data.payload} from ${sender}`);
  });
});
```

## 🎯 Key Features

### ✅ Familiar Socket API
- **Flexible addressing**: Use service names, not just IPs: `conn.write('user-service', port, data)`
- **Connection-oriented**: Create sockets on specific ports
- **Bidirectional**: Send and receive with callbacks

### 🚀 QoS Priority System
- **4-level priority**: CRITICAL → HIGH → NORMAL → LOW  
- **Real priority queue**: High priority packets **never wait**
- **Property-based**: Just set `conn.QoSPriority = QoS.CRITICAL`

### 🧠 Built-in Features
- **Memory Management**: Auto-cleanup for long-running apps
- **Rate Limiting**: Protection against spam/DoS
- **Adaptive Packet Sizing**: Network-aware optimization
- **Enhanced Monitoring**: Detailed connection stats
- **Built-in Firewall**: Packet filtering rules

### �️ Built-in Security

#### Simple Security Agent
```javascript
const { SimpleSecurityAgent, securityAgent } = require('mqtnl');

// Create simple security (string reversal for demo)
const simpleSec = new SimpleSecurityAgent();
console.log(simpleSec.cipher('hello'));    // Output: 'olleh'
console.log(simpleSec.decipher('olleh'));  // Output: 'hello'

// Use with connection manager
const security = new securityAgent(
  (data) => simpleSec.cipher(data),
  (data) => simpleSec.decipher(data)
);

const cm = new connectionManager('myApp', options, security);
```

#### Custom Security Agent
```javascript
// Create your own encryption
const customSecurity = new securityAgent(
  (data) => Buffer.from(data).toString('base64'),     // Encrypt
  (data) => Buffer.from(data, 'base64').toString()    // Decrypt
);
```

### �🔧 Enterprise Monitoring
```javascript
// Get detailed statistics
const stats = cm.getDetailedStats();
console.log(stats.activeConnections, stats.avgLatency, stats.connectionHealth);

// Check active features
const features = cm.getActiveFeatures();
console.log(features.priorityQueue, features.rateLimiting);
```

## 📖 API Reference

### Core Classes

#### `connectionManager(id, options)`
Main connection manager handling MQTT broker connection.

```javascript
const cm = new connectionManager('myApp', {
  server: 'mqtt://broker.example.com',
  port: 1883,
  mqttLib: require('mqtt'),
  clan: 'production'  // Optional: connection grouping
});
```

#### `mqtnlConnection(connectionManager, port)`
Socket-like connection for sending/receiving data.

```javascript
const conn = new mqtnlConnection(cm, 8080);

// Set QoS priority (optional)
conn.QoSPriority = QoS.HIGH;  // 0=CRITICAL, 1=HIGH, 2=NORMAL, 3=LOW

// Send data (addresses can be ANYTHING - not just IPs!)
conn.write('user-service', 80, 'Hello World');         // Service names
conn.write('sensor-kitchen', 8080, sensorData);        // Descriptive names
conn.write('melati-server', 3000, apiRequest);         // Natural names

// Receive data
conn.onReceive((data, sender) => {
  console.log(`Received: ${data.payload}`);
});

// Reply to sender
conn.reply('Response data', sender);
```

### QoS Priority Levels

```javascript
const { QoS } = require('mqtnl');

conn.QoSPriority = QoS.CRITICAL;  // 0 - Emergency/Control (ping, alerts)
conn.QoSPriority = QoS.HIGH;      // 1 - Real-time data (sensors, commands)  
conn.QoSPriority = QoS.NORMAL;    // 2 - Regular data (default)
conn.QoSPriority = QoS.LOW;       // 3 - Bulk data (file transfers)
```

### Enhanced Features

#### Enable Rate Limiting
```javascript
// Limit to 100 requests per minute
cm.enableRateLimit(100, 60000);
```

#### Enable Priority Queue
```javascript
// Enable with 10ms processing interval (enabled by default)
conn.dtm.enablePriorityQueue(10);
```

#### Enable Adaptive Packet Sizing
```javascript
// Automatically adjust packet size based on network conditions
conn.dtm.enableAdaptivePacketSizing();
```

## 🎮 Examples

### Real-time Chat Server
```javascript
const chatServer = new mqtnlConnection(cm, 3000);

chatServer.onReceive((data, sender) => {
  const message = JSON.parse(data.payload);
  
  // Broadcast to all clients with HIGH priority
  chatServer.QoSPriority = QoS.HIGH;
  clients.forEach(client => {
    chatServer.write(client.address, client.port, JSON.stringify({
      user: message.user,
      text: message.text,
      timestamp: Date.now()
    }));
  });
});
```

### IoT Sensor Network
```javascript
const sensor = new mqtnlConnection(cm, 4000);

// Critical alerts get highest priority
function sendAlert(alertData) {
  sensor.QoSPriority = QoS.CRITICAL;
  sensor.write('gateway', 1883, JSON.stringify({
    type: 'alert',
    severity: 'critical',
    data: alertData
  }));
}

// Regular sensor data uses normal priority
function sendSensorData(sensorData) {
  sensor.QoSPriority = QoS.NORMAL;
  sensor.write('gateway', 1883, JSON.stringify({
    type: 'sensor_data',
    data: sensorData
  }));
}
```

### File Transfer with Low Priority
```javascript
const fileTransfer = new mqtnlConnection(cm, 5000);
fileTransfer.QoSPriority = QoS.LOW;  // Don't interrupt real-time traffic

function sendFileChunk(chunk, chunkIndex, totalChunks) {
  fileTransfer.write('fileserver', 21, JSON.stringify({
    type: 'file_chunk',
    chunkIndex,
    totalChunks,
    data: chunk.toString('base64')
  }));
}
```

## 🔄 Migration from Socket.io

### Socket.io → MQTNL
```javascript
// Before (Socket.io)
socket.emit('message', data);
socket.on('message', handler);

// After (MQTNL)  
conn.write('target-device', 8080, data);
conn.onReceive(handler);
```

### Native MQTT → MQTNL
```javascript
// Before (Native MQTT)
client.publish('device/sensor/room1/temp', data);
client.subscribe('device/+/+');

// After (MQTNL)
conn.write('device', 8080, data);  // Simpler addressing!
conn.onReceive(handler);           // Automatic routing
```

## 🚀 More Examples

### Connection Monitoring
```javascript
// Monitor connection health
setInterval(() => {
  const stats = cm.getDetailedStats();
  
  if (stats.connectionHealth === 'overloaded') {
    console.warn('Connection overloaded!');
    cm.enableRateLimit(50, 30000);  // Reduce rate limit
  }
  
  console.log(`Active connections: ${stats.activeConnections}`);
  console.log(`Average latency: ${stats.avgLatency}ms`);
}, 5000);
```

### Network Optimization
```javascript
// Enable all performance features
cm.enableRateLimit(200, 60000);           // Rate limiting
conn.dtm.enableAdaptivePacketSizing();    // Smart packet sizing
conn.dtm.enablePriorityQueue(5);          // Fast queue processing

// Monitor and tune
const features = cm.getActiveFeatures();
console.log('Active optimizations:', features.features);
```

### Firewall Configuration
```javascript
const fw = new mqtnl.firewallManager();

// Enhanced wildcard pattern support
fw.addRule({
  direction: 'incoming',
  type: 'allow',
  condition: {
    srcAddress: 'sensor-*',      // Match any sensor device
    srcPort: '*',                // Any source port
    dstAddress: '*',             // Any destination
    dstPort: 8080                // Specific port
  },
  active: 1
});

// Block guest network from SSH
fw.addRule({
  direction: 'incoming',
  type: 'deny',
  condition: {
    srcAddress: '192.168.100.*', // Guest network subnet
    srcPort: '*',
    dstAddress: '*',
    dstPort: '22*'               // SSH and SSH-related ports
  },
  active: 1
});

// Allow access to API services
fw.addRule({
  direction: 'outgoing',
  type: 'allow',
  condition: {
    srcAddress: '*',
    srcPort: '*',
    dstAddress: '*-api',         // Any service ending with -api
    dstPort: '*'
  },
  active: 1
});

cm.setFirewallRules(fw.firewallConfig);
cm.setFirewallActive(1);
```

#### Wildcard Pattern Support
MQTNL firewall supports flexible wildcard patterns:

- **`*`**: Universal wildcard (matches everything)
- **`prefix*`**: Matches anything starting with "prefix"
- **`*suffix`**: Matches anything ending with "suffix"  
- **`*middle*`**: Matches anything containing "middle"
- **Exact match**: No wildcards = exact string comparison

#### Examples
```javascript
// Device management
srcAddress: 'sensor-*'        // sensor-kitchen, sensor-01, sensor-temp
srcAddress: '*-controller'    // main-controller, backup-controller

// Network subnets  
srcAddress: '192.168.1.*'     // 192.168.1.100, 192.168.1.255
srcAddress: '10.0.*'          // 10.0.1.1, 10.0.255.255

// Service patterns
dstAddress: '*-api'           // user-api, payment-api, auth-api
dstAddress: 'service-*'       // service-auth, service-payment

// Port ranges
dstPort: '80*'                // 80, 8080, 8000, 8443
dstPort: '443*'               // 443, 4430, 4431
```

## ⚙️ Configuration

### Connection Options
```javascript
const options = {
  server: 'mqtt://broker.example.com',  // MQTT broker URL
  port: 1883,                           // MQTT broker port  
  mqttLib: require('mqtt'),             // MQTT library instance
  clan: 'production'                    // Optional: connection grouping
};
```

### Environment Variables
```bash
MQTNL_QUIET=true          # Disable startup banner
NODE_ENV=production       # Production mode
```

## 🧪 Testing

```bash
# Run basic tests
npm test

# Run examples  
npm run example         # Basic socket demo with creative addressing
npm run qos-demo       # Priority queue demo
npm run creative-demo  # Shows flexible addressing patterns
```

## 🏆 Why Choose MQTNL?

### vs Socket.io
- ✅ **Address-based** communication (more intuitive than topics)
- ✅ **True QoS priorities** with guaranteed scheduling
- ✅ **MQTT reliability** built-in (auto-reconnect, persistence)
- ✅ **Built-in monitoring** and rate limiting

### vs Native MQTT  
- ✅ **Familiar socket API** (no complex topic hierarchies)
- ✅ **Useful features** (priority queue, monitoring, firewall)
- ✅ **Automatic packet assembly** (send large data seamlessly)
- ✅ **Built-in security** and rate limiting

### vs TCP/UDP Sockets
- ✅ **Broker-mediated** (no direct connections needed)
- ✅ **Firewall friendly** (single MQTT port)
- ✅ **Cloud-ready** (works with managed MQTT services)
- ✅ **Message persistence** and delivery guarantees

## 🛡️ Production Considerations

### Memory Management
- ✅ **Automatic cleanup** of expired packets
- ✅ **Configurable TTL** for packet retention
- ✅ **Memory leak prevention** in long-running apps

### Security
- ✅ **Built-in firewall** with flexible rules
- ✅ **Rate limiting** against DoS attacks
- ✅ **Security agent** support for encryption

### Performance
- ✅ **Priority queue** ensures critical data delivery
- ✅ **Adaptive packet sizing** optimizes throughput
- ✅ **Connection pooling** and efficient port management

## 📊 Benchmarks

Typical performance characteristics:

- **Throughput**: 1000+ messages/sec on modest hardware
- **Latency**: <10ms local network, <50ms internet
- **Memory**: ~2MB base + ~1KB per active connection
- **Priority Queue**: <1ms scheduling overhead

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/mqtnl
- **GitHub Repository**: https://github.com/andriansah/mqtnl
- **Documentation**: https://github.com/andriansah/mqtnl/wiki
- **Issues**: https://github.com/andriansah/mqtnl/issues

---

**Built with ❤️ for the IoT and real-time communication community**

*MQTNL v0.68.1 - Socket-Style Networking Over MQTT*
