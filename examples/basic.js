/**
 * MQTNL Basic Example
 * Shows basic socket-like communication over MQTT
 */

const { connectionManager, mqtnlConnection, SimpleSecurityAgent, securityAgent } = require('../index');
const mqtt = require('mqtt');

async function basicExample() {
  console.log('🚀 MQTNL Basic Example Starting...\n');

  // Create simple security agent (reverses strings for demo)
  const simpleSecurity = new SimpleSecurityAgent();
  const security = new securityAgent(
    (data) => simpleSecurity.cipher(data),      // Encrypt: hello -> olleh
    (data) => simpleSecurity.decipher(data)     // Decrypt: olleh -> hello
  );

  // Create connection manager with security
  const cm = new connectionManager('BasicExample', {
    // server: 'mqtt://test.mosquitto.org',  // Public test broker
    server: 'mqtt://192.168.0.105',  // Local test broker
    port: 1883,
    mqttLib: mqtt
  }, security);  // Add security agent here

  console.log(`🔐 Security enabled: ${simpleSecurity.getAlgorithm()} encryption`);

  // Connect to MQTT broker
  cm.connect(() => {
    console.log('✅ Connected to MQTT broker');
    startDemo();
  });

  function startDemo() {
    // Create two connections (like opening sockets)
    const serverConn = new mqtnlConnection(cm, 8080);
    const clientConn = new mqtnlConnection(cm, null); // Auto port

    console.log(`📡 Server listening on port: ${serverConn.port}`);
    console.log(`📱 Client using port: ${clientConn.port}\n`);

    // Server receives messages
    serverConn.onReceive((data, sender) => {
      console.log(`[SERVER] Received: "${data.payload}" from ${sender}`);

      // Echo back
      serverConn.reply(`Echo: ${data.payload}`, sender);
    });

    // Client receives replies  
    clientConn.onReceive((data, sender) => {
      console.log(`[CLIENT] Received reply: "${data.payload}" from ${sender}\n`);
    });

    // Send messages (using flexible addressing - not IP required!)
    let counter = 1;
    const sendInterval = setInterval(() => {
      const message = `Hello MQTNL #${counter}`;
      console.log(`[CLIENT] Sending: "${message}"`);

      // Address can be ANYTHING: names, words, IDs - not just IPs!
      clientConn.write('BasicExample', 8080, message);
      counter++; if (counter > 3) {
        clearInterval(sendInterval);
        setTimeout(() => {
          console.log('📊 Demo completed!\n');
          showStats();
        }, 1000);
      }
    }, 2000);
  }

  function showStats() {
    const stats = cm.getStats();
    if (stats) {
      console.log('📈 Connection Stats:');
      console.log(`   TX Rate: ${stats.txKBps} KB/s`);
      console.log(`   RX Rate: ${stats.rxKBps} KB/s`);
      console.log(`   Total TX: ${stats.totalTx} bytes`);
      console.log(`   Total RX: ${stats.totalRx} bytes`);
    }

    console.log('\n🎉 Basic example completed successfully!');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Run example
basicExample().catch(console.error);
