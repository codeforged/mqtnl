/**
 * MQTNL Creative Addressing Demo
 * Shows the flexibility of MQTNL addressing - use ANY names you want!
 */

const { connectionManager, mqtnlConnection, SimpleSecurityAgent, securityAgent } = require('../index');
const mqtt = require('mqtt');

async function creativeAddressingDemo() {
  console.log('🌟 MQTNL Creative Addressing Demo\n');
  console.log('💡 MQTNL addresses can be ANYTHING - not just IP addresses!\n');

  // Create security
  const simpleSecurity = new SimpleSecurityAgent();
  const security = new securityAgent(
    (data) => simpleSecurity.cipher(data),
    (data) => simpleSecurity.decipher(data)
  );

  // Create connection managers for different "entities"
  const melatiServer = new connectionManager('melati-server', {
    server: 'mqtt://test.mosquitto.org',
    port: 1883,
    mqttLib: mqtt,
    clan: 'garden'
  }, security);

  const ficusClient = new connectionManager('ficus-elastica', {
    server: 'mqtt://test.mosquitto.org', 
    port: 1883,
    mqttLib: mqtt,
    clan: 'garden'
  }, security);

  const orchidService = new connectionManager('beautiful-orchid', {
    server: 'mqtt://test.mosquitto.org',
    port: 1883, 
    mqttLib: mqtt,
    clan: 'garden'
  }, security);

  Promise.all([
    new Promise(resolve => melatiServer.connect(resolve)),
    new Promise(resolve => ficusClient.connect(resolve)),
    new Promise(resolve => orchidService.connect(resolve))
  ]).then(() => {
    console.log('🌸 All garden entities connected!\n');
    startCreativeDemo();
  });

  function startCreativeDemo() {
    // Create connections with creative addresses
    const melatiConn = new mqtnlConnection(melatiServer, 3000);    // Melati web service
    const ficusConn = new mqtnlConnection(ficusClient, null);      // Ficus client
    const orchidConn = new mqtnlConnection(orchidService, 8080);   // Orchid API

    console.log('🏗️  Creative Network Topology:');
    console.log(`   🌸 melati-server listening on port 3000`);
    console.log(`   🌿 ficus-elastica client on port ${ficusConn.port}`);
    console.log(`   🌺 beautiful-orchid API on port 8080\n`);

    // Setup message handlers
    melatiConn.onReceive((data, sender) => {
      console.log(`[🌸 MELATI] Received: "${data.payload}" from ${sender}`);
      melatiConn.reply(`Melati says: Welcome ${data.payload}!`, sender);
    });

    orchidConn.onReceive((data, sender) => {
      console.log(`[🌺 ORCHID] API call: "${data.payload}" from ${sender}`);
      orchidConn.reply(`{success: true, data: "processed ${data.payload}"}`, sender);
    });

    ficusConn.onReceive((data, sender) => {
      console.log(`[🌿 FICUS] Reply received: "${data.payload}" from ${sender}\n`);
    });

    // Demo creative addressing patterns
    let step = 1;
    const demo = setInterval(() => {
      switch(step) {
        case 1:
          console.log('�� [STEP 1] Human-readable service names:');
          ficusConn.write('melati-server', 3000, 'visitor from ficus');
          break;
          
        case 2:
          console.log('📤 [STEP 2] Descriptive addressing:');
          ficusConn.write('beautiful-orchid', 8080, 'GET /api/bloom');
          break;
          
        case 3:
          console.log('📤 [STEP 3] Free-form addressing:');
          ficusConn.write('melati-server', 3000, 'cloud forest greetings');
          break;
          
        case 4:
          console.log('📤 [STEP 4] Any creative name works:');
          ficusConn.write('beautiful-orchid', 8080, 'photosynthesis-data');
          break;
          
        default:
          clearInterval(demo);
          setTimeout(() => {
            console.log('\n🎨 Creative Addressing Benefits:');
            console.log('  ✅ Human-readable service discovery');
            console.log('  ✅ Self-documenting network topology'); 
            console.log('  ✅ No IP address management needed');
            console.log('  ✅ Descriptive system architecture');
            console.log('  ✅ Natural microservice naming');
            console.log('\n💡 Use ANY names: flowers, trees, characters, services, anything!');
            console.log('🚀 MQTNL: Where your network speaks human language!');
            process.exit(0);
          }, 1500);
      }
      step++;
    }, 2500);
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Run demo
creativeAddressingDemo().catch(console.error);
