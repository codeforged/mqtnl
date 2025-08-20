# Changelog

All notable changes to MQTNL will be documented in this file.

## [0.68.0] - 2025-08-20

### Added
- **Enhanced Firewall Wildcard Patterns**: Complete pattern matching support
  - Prefix wildcards: `sensor-*`, `device-*`, `192.168.1.*`
  - Suffix wildcards: `*-api`, `*-service`, `*-gateway`
  - Port range wildcards: `22*`, `80*`, `443*`
  - Universal wildcards: `*` (matches everything)
  - Exact string matching (no wildcards)
- **Improved Firewall Examples** in README with real-world scenarios
- **Advanced Pattern Matching**: Regex-based implementation for flexible rules

### Enhanced
- **Firewall Security**: More granular control over IoT device networks
- **Network Segmentation**: Better support for subnet-based rules
- **Service Isolation**: Pattern-based service access control
- **Documentation**: Comprehensive wildcard pattern examples

### Technical
- Added `matchPattern()` method to connectionManager class
- Enhanced `isConnectionAllowed()` with pattern matching logic
- Backward compatible: existing exact-match rules continue to work
- Performance optimized: efficient regex compilation and caching

## [0.67.0] - 2025-08-20

### 🚀 Major Features Added
- **Priority Queue System**: True packet prioritization with 4-level QoS (CRITICAL, HIGH, NORMAL, LOW)
- **Property-based QoS**: Simple `conn.QoSPriority = QoS.HIGH` instead of method proliferation
- **Memory Management**: Auto-cleanup for expired packets in long-running applications
- **Rate Limiting**: Optional protection against spam and DoS attacks
- **Adaptive Packet Sizing**: Network-aware performance optimization
- **Enhanced Statistics**: Detailed monitoring with connection health assessment

### ✨ New Components
- `RateLimiter` class for request throttling
- `QoS` constants for priority levels
- Enhanced `getDetailedStats()` method
- `getActiveFeatures()` for feature monitoring
- `disableAllEnhancements()` emergency fallback

### 🔧 Improvements
- **100% Backward Compatible**: All existing code works unchanged
- **Production Hardened**: Memory leaks prevention and error handling
- **Performance Optimized**: Priority queue processes highest priority first
- **Monitoring Ready**: Built-in health assessment and feature detection

### 🎯 QoS Priority Queue
- **CRITICAL (0)**: Ping, control packets, emergency alerts
- **HIGH (1)**: Real-time data, sensor readings, commands
- **NORMAL (2)**: Regular application data (default)
- **LOW (3)**: File transfers, bulk data, background tasks

### 📊 Enhanced Statistics
- Packet loss tracking
- Retransmission counting
- Connection health assessment
- Average latency monitoring
- Active feature detection

### 🛡️ Security & Reliability
- Rate limiting with configurable windows
- Memory cleanup with TTL management
- Error-resistant queue processing
- Graceful degradation options

### ⚙️ Configuration Options
```javascript
// Enable rate limiting
cm.enableRateLimit(100, 60000);  // 100 req/min

// Enable adaptive sizing
dtm.enableAdaptivePacketSizing();

// Enable priority queue (default enabled)
dtm.enablePriorityQueue(10);  // 10ms interval

// Set connection priority
conn.QoSPriority = QoS.CRITICAL;
```

### 🔄 Deprecated
- `mqtnlFileTransferProtocol` - Use NOSPacketStackV2 instead
- `mqtnlFileReceiveProtocol` - Use NOSPacketStackV2 instead
- `beeBridge` - Experimental transport, use MQTT for production

### �� Migration Notes
- No breaking changes - existing code continues to work
- New features are opt-in and disabled by default
- Priority queue is enabled by default for new connections
- File transfer protocols show deprecation warnings

### 🧪 Testing
- Comprehensive smoke tests added
- QoS priority demo example
- Basic usage examples
- Error handling validation

### 📚 Documentation
- Complete API reference
- Usage examples for all features  
- Performance benchmarks
- Migration guides from Socket.io and native MQTT

## [0.66.x] - Previous Versions

### Historical Features
- Basic socket-like API over MQTT
- Connection management and port allocation
- Packet fragmentation and reassembly
- Basic firewall support
- MQTT message dispatching
- Security agent integration
- Ping and broadcast functionality
- Basic statistics tracking

---

## Version History Summary

- **v0.67.0**: Enterprise QoS with priority queue system
- **v0.66.x**: Core MQTT networking functionality
- **v0.6x.x**: Early development and proof of concept

## Upcoming Features (Roadmap)

### v0.68.0 (Planned)
- WebSocket transport bridge
- Enhanced encryption options
- Clustering support for high availability
- GraphQL-style query routing

### v0.69.0 (Planned)  
- REST API gateway functionality
- Built-in load balancing
- Advanced monitoring dashboard
- TypeScript definitions

### v1.0.0 (Future)
- Stable API freeze
- Enterprise certification
- Performance optimizations
- Extended documentation

---

*For detailed technical changes, see individual commit messages in the repository.*
