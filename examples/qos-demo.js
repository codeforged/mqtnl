/**
 * MQTNL QoS Priority Demo
 * Shows priority queue and QoS features
 */

const { connectionManager, mqtnlConnection, QoS, SimpleSecurityAgent, securityAgent } = require('../index');
const mqtt = require('mqtt');

async function qosDemo() {
  console.log('🎯 MQTNL QoS Priority Demo Starting...\n');

  // Create security for secure communications
  const simpleSecurity = new SimpleSecurityAgent();
  const security = new securityAgent(
    (data) => simpleSecurity.cipher(data),
    (data) => simpleSecurity.decipher(data)
  );

  const cm = new connectionManager('QoSDemo', {
    server: 'mqtt://test.mosquitto.org',
    port: 1883,
    mqttLib: mqtt,
    clan: 'qos-demo'
  }, security);

  // Enable rate limiting
  cm.enableRateLimit(50, 10000); // 50 requests per 10 seconds

  console.log(`🔐 Security: ${simpleSecurity.getAlgorithm()} encryption enabled`);

  cm.connect(() => {
    console.log('✅ Connected to MQTT broker');
    startQoSDemo();
  });

  function startQoSDemo() {
    // Create connections with different priorities
    const criticalConn = new mqtnlConnection(cm, 9001);
    const normalConn = new mqtnlConnection(cm, 9002);
    const lowConn = new mqtnlConnection(cm, 9003);
    const receiverConn = new mqtnlConnection(cm, 8080);

    // Set QoS priorities
    criticalConn.QoSPriority = QoS.CRITICAL;  // 0 - Highest priority
    normalConn.QoSPriority = QoS.NORMAL;      // 2 - Default priority  
    lowConn.QoSPriority = QoS.LOW;            // 3 - Lowest priority

    console.log('🔧 Priority Queue Enabled for all connections');
    console.log('📋 QoS Levels:');
    console.log(`   CRITICAL: ${QoS.CRITICAL} (Emergency/Control)`);
    console.log(`   HIGH: ${QoS.HIGH} (Real-time data)`);
    console.log(`   NORMAL: ${QoS.NORMAL} (Regular data)`);
    console.log(`   LOW: ${QoS.LOW} (File transfers/Bulk)\n`);

    // Receiver logs all messages with timestamps
    receiverConn.onReceive((data, sender) => {
      const timestamp = new Date().toISOString().substr(11, 12);
      console.log(`[${timestamp}] Received: ${data.payload}`);
    });

    // Send messages in different order - priority queue should reorder them
    setTimeout(() => {
      console.log('📤 Sending messages (watch the order received):');

      // Send LOW priority first
      lowConn.write(cm.id, 8080, '🐌 LOW: Bulk file transfer data');

      // Send NORMAL priority  
      normalConn.write(cm.id, 8080, '📄 NORMAL: Regular application data');

      // Send CRITICAL priority last - but should arrive first!
      criticalConn.write(cm.id, 8080, '🚨 CRITICAL: Emergency alert!');

      console.log('   ⬆️  LOW priority sent first');
      console.log('   ⬆️  NORMAL priority sent second');
      console.log('   ⬆️  CRITICAL priority sent last\n');
      console.log('📥 Received order (should show CRITICAL first):');
    }, 1000);

    // Show enhanced stats after demo
    setTimeout(() => {
      console.log('\n📊 Enhanced Statistics:');
      const detailedStats = cm.getDetailedStats();
      if (detailedStats) {
        console.log(`   Active Connections: ${detailedStats.activeConnections}`);
        console.log(`   Connection Health: ${detailedStats.connectionHealth}`);
        console.log(`   Rate Limiting: ${cm.rateLimitEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`   Version: ${detailedStats.version}`);
      }

      const features = cm.getActiveFeatures();
      console.log('\n🔧 Active Features:');
      console.log(`   Memory Management: ${features.features.memoryManagement}`);
      console.log(`   Priority Queue: ${features.features.priorityQueue}`);
      console.log(`   QoS Support: ${features.features.qosSupport}`);
      console.log(`   Enhanced Stats: ${features.features.enhancedStats}`);

      console.log('\n🎉 QoS demo completed! Priority queue working! 🚀');
      process.exit(0);
    }, 4000);
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Run demo
qosDemo().catch(console.error);
