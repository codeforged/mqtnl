/**
 * MQTNL - Socket-Style Networking Over MQTT
 * Version 0.68.0
 * 
 * Making MQTT feel like TCP/IP with QoS features
 * Author: Andriansah
 */

const mqttNetworkLib = require('./lib/mqttNetworkLib');
const SimpleSecurityAgent = require('./lib/simpleSecurityAgent');

// Export main classes and utilities
module.exports = {
  // Core Components
  connectionManager: mqttNetworkLib.connectionManager,
  mqtnlConnection: mqttNetworkLib.mqtnlConnection,
  DataTransferManager: mqttNetworkLib.DataTransferManager,
  securityAgent: mqttNetworkLib.securityAgent,
  SimpleSecurityAgent: SimpleSecurityAgent,
  mqttDispatcher: mqttNetworkLib.mqttDispatcher,

  // Bridge Components  
  mqttForwarder: mqttNetworkLib.mqttForwarder,
  beeBridge: mqttNetworkLib.beeBridge,
  firewallManager: mqttNetworkLib.firewallManager,

  // ⚠️ DEPRECATED - Use NOSPacketStackV2 instead
  mqtnlFileTransferProtocol: mqttNetworkLib.mqtnlFileTransferProtocol,
  mqtnlFileReceiveProtocol: mqttNetworkLib.mqtnlFileReceiveProtocol,

  // Enhanced Features
  RateLimiter: mqttNetworkLib.RateLimiter,
  QoS: mqttNetworkLib.QoS,

  // Metadata
  version: mqttNetworkLib.version || "0.68.0"
};

// Convenience factory functions
module.exports.createConnection = function (id, options) {
  const cm = new module.exports.connectionManager(id, options);
  return cm;
};

module.exports.createSocket = function (connectionManager, port) {
  return new module.exports.mqtnlConnection(connectionManager, port);
};

// Show startup banner (can be disabled)
if (typeof process !== 'undefined' && process.env.MQTNL_QUIET !== 'true') {
  console.log(`
🔌 MQTNL v${module.exports.version} - Socket-Style Networking Over MQTT
═════════════════════════════════════════════════════════════════════
✅ Familiar socket API: conn.write(ip, port, data)
🎯 QoS Priority System with real packet scheduling  
🧠 Memory management for production apps
🛡️ Built-in rate limiting and firewall
⚡ Adaptive packet sizing
📊 Monitoring features

📖 Quick Start:
   const { connectionManager, mqtnlConnection, QoS } = require('mqtnl');
   const cm = new connectionManager('myApp', { server: 'mqtt://localhost', mqttLib: require('mqtt') });
   const conn = new mqtnlConnection(cm, 8080);
   conn.QoSPriority = QoS.HIGH;
   conn.write('192.168.1.100', 80, 'Hello World');

🔗 Set MQTNL_QUIET=true to disable this message
═════════════════════════════════════════════════════════════════════
  `);
}
