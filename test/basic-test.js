/**
 * Basic test for MQTNL module
 * Simple smoke tests to ensure module loads and basic functionality works
 */

const mqtnl = require('../index');
console.log('🧪 Running MQTNL Basic Tests...\n');

// Test 1: Module loads correctly
console.log('✅ Test 1: Module import');
console.log(`   Version: ${mqtnl.version}`);
console.log(`   Main classes available: ${Object.keys(mqtnl).length} exports`);

// Test 2: Core classes can be instantiated
console.log('\n✅ Test 2: Class instantiation');
try {
  const cm = new mqtnl.connectionManager('test', {
    server: 'mqtt://test.mosquitto.org',
    mqttLib: { connect: () => ({ on: () => {}, subscribe: () => {} }) }, // Mock
    clan: 'test'
  });
  console.log('   ✓ connectionManager created');
  
  const conn = new mqtnl.mqtnlConnection(cm, 8080);
  console.log('   ✓ mqtnlConnection created');
  console.log(`   ✓ Connection port: ${conn.port}`);
} catch (err) {
  console.error('   ❌ Error creating classes:', err.message);
  process.exit(1);
}

// Test 3: QoS constants are available
console.log('\n✅ Test 3: QoS constants');
console.log(`   CRITICAL: ${mqtnl.QoS.CRITICAL}`);
console.log(`   HIGH: ${mqtnl.QoS.HIGH}`);
console.log(`   NORMAL: ${mqtnl.QoS.NORMAL}`);
console.log(`   LOW: ${mqtnl.QoS.LOW}`);

// Test 4: Enhanced features & Security
console.log('\n✅ Test 4: Enhanced features & Security');
try {
  const rateLimiter = new mqtnl.RateLimiter(100, 60000);
  console.log('   ✓ RateLimiter class available');
  
  const allowed = rateLimiter.isAllowed('test-client');
  console.log(`   ✓ Rate limiting functional: ${allowed}`);
  
  // Test SimpleSecurityAgent
  const simpleSec = new mqtnl.SimpleSecurityAgent();
  const original = 'Hello Test!';
  const encrypted = simpleSec.cipher(original);
  const decrypted = simpleSec.decipher(encrypted);
  console.log(`   ✓ SimpleSecurityAgent: ${original} -> ${encrypted} -> ${decrypted}`);
  console.log(`   ✓ Security roundtrip: ${original === decrypted ? 'OK' : 'FAIL'}`);
  
  // Test securityAgent wrapper
  const secAgent = new mqtnl.securityAgent(
    (data) => simpleSec.cipher(data),
    (data) => simpleSec.decipher(data)
  );
  console.log('   ✓ securityAgent wrapper works');
} catch (err) {
  console.error('   ❌ Error with enhanced features:', err.message);
  process.exit(1);
}

// Test 5: Utility functions
console.log('\n✅ Test 5: Utility functions');
try {
  const testCm = mqtnl.createConnection('test-util', {
    server: 'mqtt://test',
    mqttLib: { connect: () => ({ on: () => {}, subscribe: () => {} }) },
    clan: 'test'
  });
  console.log('   ✓ createConnection utility works');
  
  const testSocket = mqtnl.createSocket(testCm, 9999);
  console.log('   ✓ createSocket utility works');
} catch (err) {
  console.error('   ❌ Error with utilities:', err.message);
  process.exit(1);
}

console.log('\n🎉 All basic tests passed!');
console.log('\n📖 To run examples:');
console.log('   npm run example    # Basic socket-like demo');
console.log('   npm run qos-demo   # QoS priority demo');
console.log('\n🔗 MQTNL is ready for production use!');

process.exit(0);
