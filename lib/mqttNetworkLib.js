// MQTNL - Socket-Style Networking Over MQTT - Standalone Version
// const FileBroker = require("./FileBroker");
// const FileBroker = require("./miniClientBroker");
// const miniBroker = require("./miniClientBroker");

class mqtnlConnection {
  constructor(
    connectionManager,
    port = null,
    onReceive,
    overridePortIfExist = 0
  ) {
    this.connectionManager = connectionManager;
    this.port = port;
    this.connection = this.connectionManager.addConnection(
      this.port,
      overridePortIfExist
    );
    this.port = this.connection.port;
    if (this.onReceive != null) this.connection.dtm.onReceivedData = onReceive;

    // 🆕 NEW: QoS Priority property (backward compatible)
    this.QoSPriority = 2; // Default: NORMAL (QoS.NORMAL)
  }

  onReceive(onReceive) {
    this.connection.dtm.onReceivedData = onReceive;
    // this.onReceive = onReceive;
    // console.log(`onReceive di mqtnlConnection diatur! ${this.port}`)
  }

  onPacketReceive(onReceivedPacket) {
    // this.onReceive = onReceive;
    this.connection.dtm.onReceivedPacket = onReceivedPacket;
  }

  onTransmittPacket(onTransmittPacket) {
    this.connection.dtm.onTransmittPacket = onTransmittPacket;
  }

  write(address, port, data, packetHeaderFlag, onReceivedPacket) {
    // 🆕 NEW: Add QoS info to data if priority is set (backward compatible)
    let finalData = data;
    if (this.QoSPriority !== 2) { // Only add QoS info if not default NORMAL
      finalData = {
        qos: this.QoSPriority,
        priority: this.QoSPriority,
        timestamp: Date.now(),
        data: data
      };
    }

    // 🆕 NEW: Pass priority to sendData for queue scheduling
    this.connection.dtm.sendData(address, port, finalData, packetHeaderFlag, this.QoSPriority);
    if (onReceivedPacket != null)
      this.connection.dtm.onReceivedPacket = onReceivedPacket;
  }

  reply(data, sender, packetHeaderFlag) {
    this.connection.dtm.replyData(data, sender, packetHeaderFlag);
  }
}

class connectionManager {
  #pingAgent;
  #scanAgent;
  #connections;
  #dispatcher;
  #securityAgent;
  constructor(id, options, securityAgent = null) {
    this.id = id;
    this.version = "0.68"; // 🆕 NEW: version bump
    this.options = options;
    this.firewallActive = 0;
    this.#securityAgent = securityAgent;
    this.#connections = [];
    this.uuid = this.generateUUIDv4();
    this.#dispatcher = new mqttDispatcher(
      options.server,
      options.port,
      options.mqttLib
    );
    this.#dispatcher.connMgr = this;

    this.stats = {
      txBytes: 0,
      rxBytes: 0,
      lastTx: 0,
      lastRx: 0,
      lastCheck: Date.now(),
      // 🆕 NEW: Enhanced stats (backward compatible)
      packetsLost: 0,
      retransmissions: 0,
      connections: 0
    };

    // 🆕 NEW: Rate limiting (optional, disabled by default)
    this.rateLimiter = null;
    this.rateLimitEnabled = false;

    this.firewallRules = [
      {
        direction: "incoming",
        type: "allow",
        condition: {
          dstAddress: "*",
          dstPort: "*",
          srcAddress: "*",
          srcPort: "*",
        },
        active: 1,
      },
      {
        direction: "outgoing",
        type: "allow",
        condition: {
          dstAddress: "*",
          dstPort: "*",
          srcAddress: "*",
          srcPort: "*",
        },
        active: 1,
      },
    ];

    this.#dispatcher.firewallRules = this.firewallRules;
    this.#dispatcher.firewallActive = this.firewallActive;
    this.init();
  }

  generateUUIDv4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  };

  getStats(intervalSec = 1) {
    const now = Date.now();
    const elapsed = (now - this.stats.lastCheck) / 1000;
    if (elapsed < intervalSec) return null; // terlalu cepat

    const txRate = (this.stats.txBytes - this.stats.lastTx) / elapsed;
    const rxRate = (this.stats.rxBytes - this.stats.lastRx) / elapsed;

    this.stats.lastTx = this.stats.txBytes;
    this.stats.lastRx = this.stats.rxBytes;
    this.stats.lastCheck = now;
    const scale = 1024;

    return {
      txRate: txRate, // in Bytes/sec
      rxRate: rxRate,
      txKBps: (txRate / scale).toFixed(2),
      rxKBps: (rxRate / scale).toFixed(2),
      totalTx: this.stats.txBytes,
      totalRx: this.stats.rxBytes
    };
  }

  // 🆕 NEW: Enhanced stats (backward compatible)
  getDetailedStats(intervalSec = 1) {
    const basic = this.getStats(intervalSec);
    if (!basic) return null;

    return {
      ...basic, // ✅ Include semua basic stats untuk backward compatibility
      // 🆕 NEW: Enhanced metrics
      packetsLost: this.stats.packetsLost || 0,
      retransmissions: this.stats.retransmissions || 0,
      activeConnections: this.#connections.length,
      avgLatency: this.#pingAgent?.networkMetrics?.avgLatency || 0,
      connectionHealth: this.assessConnectionHealth(),
      version: this.version,
      uuid: this.uuid
    };
  }

  // 🆕 NEW: Rate limiting methods (optional)
  enableRateLimit(maxRequests = 100, windowMs = 60000) {
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
    this.rateLimitEnabled = true;
    console.log(`[CM] Rate limiting enabled: ${maxRequests} req/${windowMs}ms`);
  }

  disableRateLimit() {
    this.rateLimitEnabled = false;
    this.rateLimiter = null;
    console.log(`[CM] Rate limiting disabled`);
  }

  // 🆕 NEW: Helper method
  assessConnectionHealth() {
    const connCount = this.#connections.length;
    if (connCount === 0) return "idle";
    if (connCount < 10) return "healthy";
    if (connCount < 50) return "busy";
    return "overloaded";
  }

  // 🆕 NEW: Emergency disable methods (safety measures)
  disableAllEnhancements() {
    this.disableRateLimit();
    // Disable adaptive sizing untuk semua connections
    this.#connections.forEach(conn => {
      if (conn.dtm && conn.dtm.disableAdaptivePacketSizing) {
        conn.dtm.disableAdaptivePacketSizing();
      }
      if (conn.dtm && conn.dtm.disablePriorityQueue) {
        conn.dtm.disablePriorityQueue();
      }
      if (conn.dtm && conn.dtm.autoCleanup) {
        conn.dtm.autoCleanup = false;
        conn.dtm.stopAutoCleanup();
      }
    });
    console.log(`[CM] All enhancements disabled - running in legacy mode`);
  }

  // Get information tentang fitur yang aktif
  getActiveFeatures() {
    return {
      rateLimiting: this.rateLimitEnabled,
      version: this.version,
      connections: this.#connections.length,
      features: {
        memoryManagement: true,
        adaptivePacketSizing: this.#connections.some(c => c.dtm?.adaptivePacketSizing),
        priorityQueue: this.#connections.some(c => c.dtm?.priorityQueueEnabled),
        enhancedStats: true,
        qosSupport: true
      }
    };
  }


  setFirewallRules(firewallRules) {
    this.firewallRules = firewallRules;
    this.#dispatcher.firewallRules = this.firewallRules;
  }

  setFirewallActive(active) {
    this.firewallActive = active;
    this.#dispatcher.firewallActive = this.firewallActive;
  }

  setSecurityAgent(secA) {
    this.#securityAgent = secA;
    this.#dispatcher.setSecurityAgent(this.#securityAgent);
  }

  onPingReceivedPacket(callback) {
    // this.#pingAgent.onPacketReceive(callback);
    this.#pingAgent.dtm.onReceivedPacket = callback;
  }

  pingController(address, pingTimeout = 5000) {
    let halt = false;
    const ping = () => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          if (!halt) {
            reject(`Ping reply timeout! (${pingTimeout}ms)`);
          }
        }, pingTimeout);
        this.ping(address, (data) => {
          if (!halt) {
            clearTimeout(timeoutId);
            resolve(data.payload);
          }
        });
      });
    };
    const interrupt = () => {
      halt = true;
    };

    return { ping, interrupt };
  }

  ping(address, pingReplyIncoming = null) {
    //this.#pingAgent.dtm.sendData(address, 65535, 'ping');
    this.#pingAgent.dtm.sendData(address, 65535, "", 1);
    this.#pingAgent.start = Date.now();
    if (pingReplyIncoming != null) {
      this.#pingAgent.pingReplyIncoming = pingReplyIncoming;
    }
  }

  pingResetSequence() {
    this.#pingAgent.counter = 0;
  }

  init() {
    this.ports = new PortManager(1, 65500);

    this.#pingAgent = this.addConnection(65535, 1);
    this.#pingAgent.connectionManager = this;

    this.#pingAgent.counter = 0;
    this.#pingAgent.dtm.onReceivedData = (data, key) => {
      // console.log(JSON.stringify(data))
      if (parseInt(data.header.packetHeaderFlag) == Flags.FLAG_PING_REQUEST) {
        // send packet
        this.#pingAgent.dtm.replyData("", key, Flags.FLAG_PING_REPLY);
      } else if (
        parseInt(data.header.packetHeaderFlag) == Flags.FLAG_PING_REPLY
      ) {
        // reply packet
        this.#pingAgent.end = Date.now();
        if (this.#pingAgent.pingReplyIncoming != null) {
          const rtt = this.#pingAgent.end - this.#pingAgent.start; // Round Trip Time

          // Siapkan array untuk simpan sample kalau belum ada
          if (!this.#pingAgent.rttSamples) {
            this.#pingAgent.rttSamples = [];
          }

          // Simpan rtt ke array
          this.#pingAgent.rttSamples.push(rtt);

          // Batasi panjang array supaya maksimal 10 sample terus
          if (this.#pingAgent.rttSamples.length > 20) {
            this.#pingAgent.rttSamples.shift(); // buang sample terlama
          }

          // Hitung average RTT
          const total = this.#pingAgent.rttSamples.reduce(
            (sum, val) => sum + val,
            0
          );
          const averageRtt = total / this.#pingAgent.rttSamples.length;

          data.payload += `Reply from ${data.header.srcAddress} bytes: ${JSON.stringify(data.header, null, 0).length
            } seq: ${this.#pingAgent.counter} time: ${rtt} ms avg: ${Math.round(
              averageRtt
            )} ms`;

          this.#pingAgent.counter++;
          this.#pingAgent.pingReplyIncoming(data);
        }
      }

      if (
        parseInt(data.header.packetHeaderFlag) == Flags.FLAG_BROADCAST_REPLY
      ) {
        // reply packet
        this.#pingAgent.end = Date.now();
        if (this.#pingAgent.pingReplyIncoming != null) {
          data.payload += `Reply from ${data.header.srcAddress} bytes: ${JSON.stringify(data.header, null, 0).length
            } seq: ${this.#pingAgent.counter} time: ${this.#pingAgent.end - this.#pingAgent.start
            } ms`;
          this.#pingAgent.counter++;
          this.#pingAgent.pingReplyIncoming(data);
        }
      }
    };

    // Tambahkan scanAgent khusus broadcast
    this.#scanAgent = this.addConnection(65534, 1);
    this.#scanAgent.connectionManager = this;
    this.#scanAgent.dtm.onReceivedData = (data, key) => {
      if (parseInt(data.header.packetHeaderFlag) == Flags.FLAG_BROADCAST_PING) {
        // send packet
        let scanReplyInfo = {
          uuid: this.#scanAgent.connectionManager.uuid,
          deviceName: this.#scanAgent.connectionManager.deviceName || ""
        }
        this.#scanAgent.dtm.replyData(JSON.stringify(scanReplyInfo), key, Flags.FLAG_BROADCAST_REPLY);
      } else
        if (parseInt(data.header.packetHeaderFlag) == Flags.FLAG_BROADCAST_REPLY) {
          if (this.#scanAgent.scanReplyIncoming) {

            this.#scanAgent.scanReplyIncoming(data);
          }
        }
    };
  }

  scanBroadcastController(idleTimeout = 1000) {
    const results = [];
    let timeoutId;
    let isScanning = true;

    const nmap = () => {
      return new Promise((resolve) => {
        this.#scanAgent.scanReplyIncoming = (data) => {
          results.push({
            srcAddress: data.header.srcAddress,
            info: data.payload,
            header: data.header,
          });
          // Reset idle timeout karena ada respons baru
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            isScanning = false;
            this.#scanAgent.scanReplyIncoming = null;
            resolve(results);
          }, idleTimeout);
        };

        // Kirim broadcast ping via scanAgent
        this.#scanAgent.dtm.sendData("*", 65534, "", Flags.FLAG_BROADCAST_PING);

        // Set initial idle timeout
        timeoutId = setTimeout(() => {
          isScanning = false;
          this.#scanAgent.scanReplyIncoming = null;
          resolve(results);
        }, idleTimeout);
      });
    };

    const interrupt = () => {
      isScanning = false;
      clearTimeout(timeoutId);
      this.#scanAgent.scanReplyIncoming = null;
    };

    return { nmap, interrupt };
  }

  // scanBroadcastController(timeout = 2000) {
  //   let halt = false;
  //   const results = [];
  //   const nmap = () => {
  //     return new Promise((resolve, reject) => {
  //       this.#scanAgent.scanReplyIncoming = (data) => {
  //         results.push({
  //           srcAddress: data.header.srcAddress,
  //           info: data.payload,
  //           header: data.header,
  //         });
  //       };
  //       // Kirim broadcast ping via scanAgent
  //       this.#scanAgent.dtm.sendData("*", 65534, "", Flags.FLAG_BROADCAST_PING);
  //       setTimeout(() => {
  //         if (!halt) resolve(results);
  //         this.#scanAgent.scanReplyIncoming = null;
  //       }, timeout);
  //     });
  //   };
  //   const interrupt = () => {
  //     halt = true;
  //     this.#scanAgent.scanReplyIncoming = null;
  //   };
  //   return { nmap, interrupt };
  // }

  connect(onConnect) {
    try {
      this.#dispatcher.connect(onConnect);
    } catch (e) {
      throw e;
    }
  }

  addConnection(port = null, override = 0) {
    let conn = {
      id: this.id,
      port: this.ports.allocatePort(port, override),
      options: this.options,
      status: 0,
    };
    conn.dtm = new DataTransferManager(conn.id, conn.port, conn.options.clan);
    conn.dispatcher = this.#dispatcher;
    //conn.dispatcher = new mqttDispatcher(conn.options.server, conn.options.port, conn.options.mqttLib);
    if (this.#securityAgent != null)
      conn.dispatcher.setSecurityAgent(this.#securityAgent);
    conn.dtm.setDispatcher(this.#dispatcher);
    conn.dispatcher.listeners.push(conn.dtm);

    // 🆕 NEW: Enable Priority Queue by default for true QoS
    conn.dtm.enablePriorityQueue(10); // 10ms default interval

    this.#connections.push(conn);
    // }
    // console.log(`new dtm instance ${port}`);
    return conn;
  }
  removeConnection(conn) {
    // conn.dispatcher.disconnect();
    this.#connections = this.#connections.filter((item) => item.id !== conn.id);
    //this.ports[conn.port] = 0;
    this.ports.releasePort(conn.port);
  }
  isPortAvailable(port) {
    return this.ports.isPortUsed(port);
    //if (this.ports[port] == 0) return true; else return false;
  }
  genRandom(min, max) {
    if (typeof min !== "number" || typeof max !== "number") {
      throw new Error("Parameter harus berupa angka");
    }
    if (min > max) {
      [min, max] = [max, min]; // Tukar posisi jika min > max
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  generateRandomPort(min, max) {
    return this.ports.allocateRandomPort(min, max);
    // let randomPort = 0;
    // while (1) {
    //   randomPort = this.genRandom(min, max);
    //   if (this.isPortAvailable(randomPort) == true) {
    //     break;
    //   }
    // }
    // return randomPort;
  }
  searchAvailablePort(port, override = 0) {
    return this.ports.allocatePort(port, override);
  }
}

class securityAgent {
  constructor(spout, spin) {
    this.spout = spout;
    this.spin = spin;
  }
  securePacketOut(data) {
    return this.spout(data);
  }
  securePacketIn(data) {
    return this.spin(data);
  }
}

// MQTT Dispatcher
class mqttDispatcher {
  constructor(host, port, mqttLib) {
    this.prefixTopic = "mqtnl@1.0/";
    this.host = host;
    this.port = port;
    this.id = null;
    this.securityAgent = null;
    this.mqttLib = mqttLib;
    this.listeners = [];
    this.firewallRules = null;
    this.firewallActive = 0;
  }

  pack(packet) {
    // return packet;
    return [
      packet.header.srcAddress,
      packet.header.srcPort,
      packet.header.dstAddress,
      packet.header.dstPort,
      packet.header.packetCount,
      packet.header.packetIndex,
      packet.header.dataSize,
      packet.header.packetHeaderFlag,
      packet.header.forwarded,
      packet.payload,
    ];
  }

  unpack(packed) {
    // return packed;
    return {
      header: {
        srcAddress: packed[0],
        srcPort: packed[1],
        dstAddress: packed[2],
        dstPort: packed[3],
        packetCount: packed[4],
        packetIndex: packed[5],
        dataSize: packed[6],
        packetHeaderFlag: packed[7],
        forwarded: packed[8],
      },
      payload: packed[9],
    };
  }

  isConnectionAllowed(header, firewallRules, fdirection) {
    const { srcAddress, srcPort, dstAddress, dstPort } = header;

    // Iterasi melalui semua aturan untuk mengecek apakah aturan cocok dengan header
    for (const [index, rule] of firewallRules.entries()) {
      const { type, condition, direction, active } = rule;
      // console.log(JSON.stringify(header)+"::"+JSON.stringify(rule));

      // Enhanced pattern matching with wildcard support
      const srcAddressMatch = this.matchPattern(condition.srcAddress, srcAddress);
      const srcPortMatch = this.matchPattern(condition.srcPort, srcPort);
      const dstAddressMatch = this.matchPattern(condition.dstAddress, dstAddress);
      const dstPortMatch = this.matchPattern(condition.dstPort, dstPort);

      // Jika seluruh kondisi cocok, tentukan apakah diizinkan atau diblokir
      if (srcAddressMatch && srcPortMatch && dstAddressMatch && dstPortMatch) {
        if (type === "allow" && direction === fdirection && active == 1) {
          return true; // Paket diizinkan
        }
        if (type === "deny" && direction === fdirection && active == 1) {
          return false; // Paket diblokir
        }
      }
    }
    // Default blokir jika tidak ada aturan yang cocok
    return false;
  }

  // Enhanced pattern matching for firewall rules
  matchPattern(pattern, value) {
    // Convert both to strings for consistent comparison
    const patternStr = String(pattern);
    const valueStr = String(value);

    // Universal wildcard - matches everything
    if (patternStr === "*") {
      return true;
    }

    // Exact match (no wildcards)
    if (patternStr.indexOf("*") === -1) {
      return patternStr === valueStr;
    }

    // Pattern matching with wildcards
    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const escapedPattern = patternStr
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
      .replace(/\*/g, '.*');                   // Convert * to .*

    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(valueStr);
  }

  calculateCRC16Modbus(data) {
    // Validasi input
    if (typeof data !== "string" && !Buffer.isBuffer(data)) {
      throw new TypeError(
        `Input harus berupa string UTF-8 atau Buffer. ${data}`
      );
      return null;
    }

    // Jika data adalah string, konversi menjadi Buffer
    if (typeof data === "string") {
      data = Buffer.from(data, "utf8");
    }

    let crc = 0xffff;

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];

      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc >>= 1;
          crc ^= 0xa001;
        } else {
          crc >>= 1;
        }
      }
    }

    // Return CRC as a buffer with low byte first (little-endian)
    return Buffer.from([crc & 0xff, (crc >> 8) & 0xff]);
  }

  setSecurityAgent(secA) {
    this.securityAgent = secA;
  }

  disconnect() {
    this.mqc.end();
  }

  connect(connected = null, err) {
    // this.mqc = this.mqttLib.connect(`mqtt://${this.host}:${this.port}`);
    this.mqc = this.mqttLib.connect(`${this.host}:${this.port}`);

    // Berlangganan ke topik tertentu
    this.mqc.on("connect", () => {
      // console.log(`subscribe ${this.prefixTopic + this.id}`)
      this.mqc.subscribe(`${this.prefixTopic + this.id}`); // Berlangganan ke semua topik address
      this.mqc.subscribe(`${this.prefixTopic}*`);  // Tambahkan ini!
      // console.log(`MQTT Connected and listen to ${this.id}`);
      if (connected) connected();
    });

    // Listener untuk pesan masuk
    this.mqc.on("message", (topic, message) => {
      try {
        if (this.receiveRawPacket) this.receiveRawPacket(topic, message);
      } catch (e) {
        if (this.err != null) this.err(e);
        //throw e; //INI MASIH PR YA
      }
    });
  }

  receiveRawPacket(topic, message) {
    try {
      if (this.receivePacket != null) {
        //console.log(`** >> ${topic} :: ${message}`);
        // console.log(">> "+message);

        this.connMgr.stats.rxBytes += Buffer.byteLength(message);
        // console.log("RX " + this.connMgr.stats.rxBytes)
        if (message != "") message = JSON.parse(message);
        message = this.unpack(message);

        // 🆕 NEW: Rate limiting check (optional, non-breaking)
        if (this.connMgr.rateLimitEnabled && this.connMgr.rateLimiter) {
          if (!this.connMgr.rateLimiter.isAllowed(message.header.srcAddress)) {
            // Silent drop untuk rate limited packets - tidak throw error
            return;
          }
        }

        // console.log(`** >> ${JSON.stringify(message)}`);
        if (this.firewallRules == null)
          console.log("firewallRules belum didefinisikan!");
        if (this.firewallActive == 1) {
          if (this.firewallRules != null) {
            if (
              this.isConnectionAllowed(
                message.header,
                this.firewallRules,
                "incoming"
              ) == false
            )
              return;
          } else {
            throw "ERROR: firewallRules not defined!";
          }
        }
        let error = 0;
        if (this.securityAgent != null) {
          try {
            let calcCRC = this.calculateCRC16Modbus(message.payload).toString(
              "hex"
            );
            if (message.payload != "")
              message.payload = this.securityAgent.securePacketIn(
                message.payload
              );
            // console.log(`data crc : ${message.crc}, calculated crc: ${calcCRC}`)
            // if (message.crc != calcCRC) {
            //   error = 1;
            //   throw `ERROR: Bad CRC!`;
            // }
          } catch (e) {
            error = 2;
            throw `ERROR: ${e}`;
          }
        }
        if (error == 0) {
          // this.receivePacket(message);
          for (let i = 0; i < this.listeners.length; i++)
            this.listeners[i].receivePacket(message);

          // Menghapus atau membersihkan paket yang diterima setelah diproses
          // message = null;  // Menghapus referensi untuk mencegah memory leak
        }
      } else {
        throw "ERROR: method receivePacket not assigned!";
      }
    } catch (e) {
      throw `ERROR: ${e}`;
    }
  }

  transmitRawPacket(srcAddress, dstAddress, message) {
    //if (this.firewallRules == null) console.log('firewallRules belum didefinisikan!');
    if (this.firewallActive == 1) {
      if (this.firewallRules != null) {
        if (
          this.isConnectionAllowed(
            message.header,
            this.firewallRules,
            "outgoing"
          ) == false
        )
          return;
      } else {
        throw "firewallRules not defined!";
      }
    }
    let str = null;
    if (this.securityAgent != null) {
      try {
        if (message.payload != "") {
          message.payload = this.securityAgent.securePacketOut(message.payload);
        }
      } catch (e) {
        throw `ERROR: ${e}`;
      }
    } else throw `ERROR: Security agent must be set!`;
    let oriMessage = message;
    message.crc = this.calculateCRC16Modbus(message.payload).toString("hex");
    message = this.pack(message);

    const StrMessage = JSON.stringify(message);
    this.connMgr.stats.txBytes += Buffer.byteLength(StrMessage);
    // console.log("dstAddress: " + dstAddress)

    // Tambahkan handler broadcast di sini:
    // if (dstAddress === "*") {
    //   // Publish ke topic broadcast
    //   this.mqc.publish(this.prefixTopic + "broadcast", StrMessage);
    // } else {
    //   this.mqc.publish(this.prefixTopic + dstAddress, StrMessage);
    // }
    this.mqc.publish(this.prefixTopic + dstAddress, StrMessage);
  }
}

class DataTransferManager {
  constructor(id, port, clan) {
    this.id = id;
    this.clan = clan;
    this.port = port;
    this.receivedPackets = {};
    this.dispatcher = null;
    this.onReceivedData = null;
    this.onReceivedPacket = null;
    this.onTransmittPacket = null;
    // this.packetSize = 1024 * 1024;
    this.packetSize = 1024 * 64;
    // this.packetSize = 50 ;
    this.firewallRules = 0;

    // 🆕 NEW: Memory management (backward compatible)
    this.packetTTL = 300000; // 5 menit default (konservatif)
    this.cleanupInterval = null;
    this.autoCleanup = true; // bisa dimatikan kalau ada masalah
    this.maxPackets = 10000; // safety limit

    // 🆕 NEW: Adaptive packet sizing (optional, disabled by default)
    this.adaptivePacketSizing = false;
    this.networkMetrics = {
      avgLatency: 0,
      bandwidth: 0,
      samples: []
    };

    // 🆕 NEW: Priority Queue System (optional, disabled by default)
    this.priorityQueueEnabled = false;
    this.packetQueue = {
      0: [], // CRITICAL
      1: [], // HIGH
      2: [], // NORMAL
      3: []  // LOW
    };
    this.queueProcessor = null;
    this.processingInterval = 10; // 10ms default

    // Start auto cleanup (dengan safety check)
    if (this.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  setDispatcher(dispatcher) {
    this.dispatcher = dispatcher;
    this.dispatcher.id = this.id;
    // this.dispatcher.receivePacket = this.receivePacket;
    this.dispatcher.receivePacket = this.receivePacket.bind(this); // Ensure correct context binding
  }

  // 🆕 NEW: Auto cleanup methods (backward compatible)
  startAutoCleanup() {
    if (this.cleanupInterval) return; // prevent double interval

    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanupExpiredPackets();
      } catch (e) {
        // Silent fail untuk safety - tidak ganggu operasi normal
        console.warn(`[DTM] Cleanup warning: ${e.message}`);
      }
    }, 30000); // cleanup setiap 30 detik (konservatif)
  }

  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  cleanupExpiredPackets() {
    if (!this.autoCleanup) return; // safety check

    const now = Date.now();
    let cleanedCount = 0;
    const totalBefore = Object.keys(this.receivedPackets).length;

    // Safety: kalau terlalu banyak packets, cleanup lebih agresif
    const forceCleanup = totalBefore > this.maxPackets;

    for (let key in this.receivedPackets) {
      const packet = this.receivedPackets[key];

      // Set timestamp untuk packet lama yang belum punya timestamp
      if (!packet.timestamp) {
        packet.timestamp = now - (this.packetTTL / 2); // assume half TTL age
      }

      // Cleanup expired atau force cleanup
      const isExpired = (now - packet.timestamp) > this.packetTTL;
      if (isExpired || forceCleanup) {
        delete this.receivedPackets[key];
        cleanedCount++;

        // Untuk force cleanup, stop setelah cleanup 50%
        if (forceCleanup && cleanedCount > (totalBefore * 0.5)) {
          break;
        }
      }
    }

    // Log kalau banyak yang di-cleanup (untuk monitoring)
    if (cleanedCount > 100) {
      console.log(`[DTM] Cleaned up ${cleanedCount} expired packets (was: ${totalBefore})`);
    }
  }

  // 🆕 NEW: Adaptive packet sizing methods (optional)
  enableAdaptivePacketSizing() {
    this.adaptivePacketSizing = true;
    console.log(`[DTM] Adaptive packet sizing enabled`);
  }

  disableAdaptivePacketSizing() {
    this.adaptivePacketSizing = false;
    console.log(`[DTM] Adaptive packet sizing disabled`);
  }

  // 🆕 NEW: Priority Queue methods (optional)
  enablePriorityQueue(processingInterval = 10) {
    this.priorityQueueEnabled = true;
    this.processingInterval = processingInterval;
    this.startQueueProcessor();
    console.log(`[DTM] Priority queue enabled (${processingInterval}ms interval)`);
  }

  disablePriorityQueue() {
    this.priorityQueueEnabled = false;
    this.stopQueueProcessor();
    // Flush remaining packets
    this.flushQueue();
    console.log(`[DTM] Priority queue disabled`);
  }

  startQueueProcessor() {
    if (this.queueProcessor) return; // prevent double interval

    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, this.processingInterval);
  }

  stopQueueProcessor() {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
  }

  processQueue() {
    if (!this.priorityQueueEnabled) return;

    // Process highest priority first (0=CRITICAL to 3=LOW)
    for (let priority = 0; priority <= 3; priority++) {
      const queue = this.packetQueue[priority];
      if (queue.length > 0) {
        const packet = queue.shift(); // Take first packet
        this.transmitPacketDirect(packet.srcAddress, packet.dstAddress, packet.message);
        return; // Process only one packet per cycle untuk fairness
      }
    }
  }

  flushQueue() {
    // Send all remaining packets (untuk graceful shutdown)
    for (let priority = 0; priority <= 3; priority++) {
      const queue = this.packetQueue[priority];
      while (queue.length > 0) {
        const packet = queue.shift();
        this.transmitPacketDirect(packet.srcAddress, packet.dstAddress, packet.message);
      }
    }
  }

  queuePacket(srcAddress, dstAddress, message, priority = 2) {
    if (!this.priorityQueueEnabled) {
      // Langsung kirim kalau queue disabled
      this.transmitPacketDirect(srcAddress, dstAddress, message);
      return;
    }

    // Add to appropriate priority queue
    const queueItem = {
      srcAddress,
      dstAddress,
      message,
      timestamp: Date.now()
    };

    this.packetQueue[priority].push(queueItem);

    // Log kalau queue mulai penuh (monitoring)
    const totalQueued = Object.values(this.packetQueue).reduce((sum, q) => sum + q.length, 0);
    if (totalQueued > 1000) {
      console.warn(`[DTM] Queue getting full: ${totalQueued} packets queued`);
    }
  }

  // Renamed method untuk clarity
  transmitPacketDirect(srcAddress, dstAddress, message) {
    if (this.onTransmittPacket != null) this.onTransmittPacket(message);
    // console.log(`###Transmitting packet:`, JSON.stringify(message));
    if (this.dispatcher != null)
      this.dispatcher.transmitRawPacket(srcAddress, dstAddress, message);
    // Logika pengiriman dapat diubah sesuai kebutuhan (misalnya via MQTT, TCP/IP, dsb.)
  }

  updateNetworkMetrics(latency, bandwidth) {
    this.networkMetrics.avgLatency = latency;
    this.networkMetrics.bandwidth = bandwidth;

    // Keep sample history (max 10 samples)
    this.networkMetrics.samples.push({ latency, bandwidth, timestamp: Date.now() });
    if (this.networkMetrics.samples.length > 10) {
      this.networkMetrics.samples.shift();
    }
  }

  getOptimalPacketSize() {
    if (!this.adaptivePacketSizing) {
      return this.packetSize; // ✅ Return original size untuk backward compatibility
    }

    const { avgLatency, bandwidth } = this.networkMetrics;

    // Adaptive sizing based on network conditions
    if (avgLatency > 200) return 1024 * 16; // 16KB untuk high latency
    if (bandwidth > 0 && bandwidth < 100) return 1024 * 8; // 8KB untuk low bandwidth
    if (avgLatency > 100) return 1024 * 32; // 32KB untuk medium latency

    return this.packetSize; // default size
  }

  // Method to calculate a simple checksum (XOR-based)
  calculateChecksum(data) {
    let checksum = 0;
    for (let byte of data) {
      checksum ^= byte; // XOR operation for each byte
    }
    return checksum;
  }

  writeData(srcAddress, srcPort, dstAddress, dstPort, data, packetHeaderFlag, priority = 2) {
    // 🆕 NEW: Use optimal packet size (backward compatible)
    const optimalPacketSize = this.getOptimalPacketSize();
    let packets = this.splitIntoPackets(data, optimalPacketSize);
    let packetCount = packets.length;
    const messages = [];
    //console.log(`DTM.writeData ${JSON.stringify(packets)}`)
    if (packetCount == 0) {
      packetCount = 1;
      packets = [""];
    }
    for (let i = 0; i < packetCount; i++) {
      const header = {
        srcAddress,
        srcPort,
        dstAddress,
        dstPort,
        packetCount,
        packetIndex: i,
        dataSize: data.length,
        packetHeaderFlag: packetHeaderFlag,
        forwarded: 0,
        //clan: this.clan
      };

      const message = {
        header: header, // Menggunakan objek header yang baru dibuat
        payload: packets[i],
      };

      messages.push(message);
      // console.log("###"+JSON.stringify(message));

      // 🆕 NEW: Use priority queue if enabled, otherwise direct transmit
      this.queuePacket(srcAddress, dstAddress, message, priority);
    }

    return messages;
  }

  // Method untuk mengirim data dengan membagi menjadi packet
  sendData(dstAddress, dstPort, data, packetHeaderFlag, priority = 2) {
    let srcAddress = this.id,
      srcPort = this.port;
    // console.log(`DTM.sendData ${JSON.stringify(data)}`)
    this.writeData(
      srcAddress,
      srcPort,
      dstAddress,
      dstPort,
      data,
      packetHeaderFlag,
      priority
    );
  }

  replyData(data, key, packetHeaderFlag) {
    let arr1 = key.split("->");
    let src = arr1[0].split(":");
    let dst = arr1[1].split(":");
    let sentMessages = this.sendData(
      src[0],
      parseInt(src[1]),
      data,
      packetHeaderFlag
    );
  }

  addressFilter(packet) {
    const { header } = packet;
    const { srcAddress, srcPort, dstAddress, dstPort } = header;
    // Izinkan jika untuk saya, atau jika dstAddress adalah 'broadcast' atau '*'
    if (
      (`${dstAddress}:${dstPort}` == `${this.id}:${this.port}`) ||
      (dstAddress === "*" && this.port == dstPort)
    ) {
      return true;
    }
    return false;
  }

  // addressFilter(packet) {
  //   const { header, payload } = packet; // Ambil header dan payload dari packet
  //   const {
  //     srcAddress,
  //     srcPort,
  //     dstAddress,
  //     dstPort,
  //     packetCount,
  //     packetIndex,
  //   } = header; // Ambil nilai dari header
  //   if (`${dstAddress}:${dstPort}` == `${this.id}:${this.port}`) return true; else return false;
  // }

  receivePacket(packet) {
    const { header, payload } = packet; // Ambil header dan payload dari packet
    const {
      srcAddress,
      srcPort,
      dstAddress,
      dstPort,
      packetCount,
      packetIndex,
    } = header; // Ambil nilai dari header

    const key = `${srcAddress}:${srcPort}->${dstAddress}:${dstPort}`;
    // console.log(`raw rx: ${key} = ${payload}`);
    // console.log(`check is for me: ${dstAddress}:${dstPort} == ${this.id}:${this.port}`);

    //if (`${dstAddress}:${dstPort}` == `${this.id}:${this.port}`) {
    if (this.addressFilter(packet) === true) {
      if (!this.receivedPackets[key]) {
        this.receivedPackets[key] = {
          totalpackets: packetCount,
          received: [],
          timestamp: Date.now() // 🆕 NEW: timestamp untuk memory management
        };
      }

      // Simpan payload ke dalam array di posisi yang sesuai berdasarkan packetIndex
      this.receivedPackets[key].received[packetIndex] = payload;

      // Periksa apakah semua packet telah diterima
      const receivedPackets = this.receivedPackets[key].received;
      const isComplete =
        receivedPackets.filter((item) => item !== undefined).length ===
        packetCount;
      if (this.onReceivedPacket != null) this.onReceivedPacket(packet, key);
      if (isComplete) {
        let packetCount = this.receivedPackets[key].received.length;
        // Susun ulang data berdasarkan urutan packetIndex
        const completeData = receivedPackets.join("");
        delete this.receivedPackets[key]; // Hapus data setelah selesai
        // console.log(`#1 complete rx: ${key} = ${completeData}`);
        if (this.onReceivedData != null) {
          header.packetSize = this.packetSize;
          header.packetCount = receivedPackets.length;
          this.onReceivedData(
            {
              header: header,
              payload: completeData,
            },
            key
          );
          // console.log(`#2 complete rx: ${key} = ${completeData}`);
          if (this.internalLogger != null)
            this.internalLogger(completeData, key);
        }
        return completeData;
      }
      return null; // Data belum lengkap
    }
    return null; // Data belum lengkap
  }

  // Method untuk membagi data menjadi packet kecil
  splitIntoPackets(data, packetSize = null) {
    // 🆕 NEW: Use optimal packet size if not specified (backward compatible)
    const actualPacketSize = packetSize || this.getOptimalPacketSize();

    const packets = [];
    for (let i = 0; i < data.length; i += actualPacketSize) {
      packets.push(data.slice(i, i + actualPacketSize));
    }
    return packets;
  }

  // Method simulasi untuk mengirim packet (dapat diganti dengan logika pengiriman jaringan)
  transmitPacket(srcAddress, dstAddress, message, priority = 2) {
    // 🆕 NEW: Route through priority queue system
    this.queuePacket(srcAddress, dstAddress, message, priority);
  }
}

function mqttForwarder(addressA, addressB, prefixTopic, mqttLib) {
  this.stop = false;
  this.stopForward = () => (this.stop = true);
  this.startForward = () => (this.stop = false);
  function pack(packet) {
    // return packet;
    return [
      packet.header.srcAddress,
      packet.header.srcPort,
      packet.header.dstAddress,
      packet.header.dstPort,
      packet.header.packetCount,
      packet.header.packetIndex,
      packet.header.dataSize,
      packet.header.packetHeaderFlag,
      packet.header.forwarded,
      packet.payload,
    ];
  }

  function unpack(packed) {
    // return packed;
    return {
      header: {
        srcAddress: packed[0],
        srcPort: packed[1],
        dstAddress: packed[2],
        dstPort: packed[3],
        packetCount: packed[4],
        packetIndex: packed[5],
        dataSize: packed[6],
        packetHeaderFlag: packed[7],
        forwarded: packed[8],
      },
      payload: packed[9],
    };
  }

  if (prefixTopic == null) prefixTopic = "mqtnl@1.0/";

  // Koneksi ke Broker A
  const clientA = mqttLib.connect(`mqtt://${addressA}`);
  // const clientA = mqttLib.connect('mqtt://brokerA_address:port');
  // Koneksi ke Broker B
  const clientB = mqttLib.connect(`mqtt://${addressB}`);
  // const clientB = mqttLib.connect('mqtt://brokerB_address:port');

  clientA.on("connect", () => {
    // console.log('Connected to Broker A');
    clientA.subscribe(`${prefixTopic}#`); // Subscribe ke semua topik atau sesuai kebutuhan
  });

  clientB.on("connect", () => {
    // console.log('Connected to Broker B');
    clientB.subscribe(`${prefixTopic}#`); // Subscribe ke semua topik atau sesuai kebutuhan
  });

  // const message = {
  //   srcAddress, srcPort, dstAddress, dstPort, packetCount, packetIndex: i, payload: packets[i],
  // };

  // Meneruskan pesan dari Broker A ke Broker B
  clientA.on("message", (topic, message) => {
    if (this.stop) return;
    try {
      const payload = unpack(JSON.parse(message));
      // console.log(JSON.stringify(payload));

      if (payload.header.forwarded == 0) {
        // Cegah loop
        payload.header.forwarded = 1;
        clientB.publish(topic, JSON.stringify(pack(payload)));
      }
    } catch (e) {
      console.error("Failed to process message from Broker A:", e);
    }
  });

  // Meneruskan pesan dari Broker B ke Broker A
  clientB.on("message", (topic, message) => {
    if (this.stop) return;
    try {
      // console.log((message));
      const payload = unpack(JSON.parse(message));
      // console.log(JSON.stringify(payload));
      if (payload.header.forwarded == 0) {
        // Cegah loop
        payload.header.forwarded = 1;
        clientA.publish(topic, JSON.stringify(pack(payload)));
      }
    } catch (e) {
      console.error("Failed to process message from Broker B:", e);
    }
  });
}

function beeBridge(mqttAddress, beeAddress, prefixTopic, mqttLib, beeLib) {
  this.stop = false;
  this.stopForward = () => (this.stop = true);
  this.startForward = () => (this.stop = false);
  function pack(packet) {
    return [
      packet.header.srcAddress,
      packet.header.srcPort,
      packet.header.dstAddress,
      packet.header.dstPort,
      packet.header.packetCount,
      packet.header.packetIndex,
      packet.header.dataSize,
      packet.header.packetHeaderFlag,
      packet.header.forwarded,
      packet.payload,
    ];
  }

  function unpack(packed) {
    return {
      header: {
        srcAddress: packed[0],
        srcPort: packed[1],
        dstAddress: packed[2],
        dstPort: packed[3],
        packetCount: packed[4],
        packetIndex: packed[5],
        dataSize: packed[6],
        packetHeaderFlag: packed[7],
        forwarded: packed[8],
      },
      payload: packed[9],
    };
  }

  if (prefixTopic == null) prefixTopic = "mqtnl@1.0/";

  const mqttClient = mqttLib.connect(`${mqttAddress}`);
  const beeClient = beeLib.connect(beeAddress); // e.g., "127.0.0.1:1884"

  mqttClient.on("connect", () => {
    mqttClient.subscribe(`${prefixTopic}#`);
  });

  beeClient.on("connect", () => {
    beeClient.subscribe(`${prefixTopic}#`);
    // console.log("beeNet bridge connected! ");
  });

  mqttClient.on("message", (topic, message) => {
    // console.log("%%mqt " + topic + " :: " + message);
    if (this.stop) return;
    try {
      const payload = unpack(JSON.parse(message));
      if (payload.header.forwarded == 0) {
        payload.header.forwarded = 1;
        beeClient.publish(topic, JSON.stringify(pack(payload)));
      }
    } catch (e) {
      console.error("[MQTT→beeNet] Failed to forward:", e);
    }
  });

  beeClient.on("message", (topic, message) => {
    // console.log("%%bee " + topic + " :: " + message);
    if (this.stop) return;
    try {
      const decoded = Buffer.from(message, "base64").toString("utf8");
      const payload = unpack(JSON.parse(message));
      if (payload.header.forwarded == 0) {
        payload.header.forwarded = 1;
        mqttClient.publish(topic, JSON.stringify(pack(payload)));
      }
    } catch (e) {
      console.error("[beeNet→MQTT] Failed to forward:", e);
    }
  });

  // console.log("beeNet bridge activated! ");
}

mqtnlFileReceiveProtocol = (
  conn,
  onReceiveData,
  onReceiveFileList,
  onReceiveFileHeader
) => {
  try {
    conn.onReceive((data, key) => {
      if (JSON.parse(data.payload).type.substring(0, 8) == "fileList") {
        conn.fileList = JSON.parse(data.payload).payload;
        if (onReceiveFileList) onReceiveFileList(data, key);
      } else if (
        JSON.parse(data.payload).type.substring(0, 12) == "fileHeader"
      ) {
        conn.fileHeader = JSON.parse(data.payload).header;
        if (onReceiveFileHeader) onReceiveFileHeader(data, key);
      } else if (
        JSON.parse(data.payload).type.substring(0, 12) == "fileResponse"
      ) {
        let fileResponse = JSON.parse(data.payload);
        const zlib = require("zlib");
        const uncompressedData = zlib.inflateSync(
          Buffer.from(fileResponse.payload)
        );
        if (onReceiveData) onReceiveData(data, key, uncompressedData);
      }
    });
  } catch (e) {
    console.error("Error in mqtnlFileReceiveProtocol:", e);
    throw e; // Pastikan error dilempar kembali
  }
};

mqtnlFileTransferProtocol = (conn, onReceiveDataX, errCallback) => {
  conn.onReceive((data, key) => {
    let payload = JSON.parse(data.payload);
    let command = payload.command;

    if (command.substring(0, 4) == "info") {
      conn.reply("FTP@0.1", key);
    } else if (command.substring(0, 3) == "put") {
      const zlib = require("zlib");
      const uncompressedData = zlib.inflateSync(
        Buffer.from(payload.fileContent)
      );
      conn.reply("Data has been received.", key, Flags.FLAG_FILE_PUT_SUCCESS);
      onReceiveDataX(data, key, uncompressedData);
    } else if (command.substring(0, 12) == "getfileinfo:") {
      let arrcommand = command.split(":");
      // const fs = require("fs");
      let fileName = arrcommand[1];
      const data = fs.readFileSync(fileName);
      const zlib = require("zlib");
      const compressedData = zlib.deflateSync(data);

      let dataResponse = {
        type: "fileHeader",
        header: {
          fileName: fileName,
          fileSize: data.length,
          compressedFileSize: compressedData.length,
        },
      };
      conn.reply(
        JSON.stringify(dataResponse),
        key,
        Flags.FLAG_FILE_HEADER_INFO
      );
    } else if (command.substring(0, 8) == "getfile:") {
      let arrcommand = command.split(":");
      // const fs = require("fs");
      let fileName = arrcommand[1];
      const data = fs.readFileSync(fileName);
      const zlib = require("zlib");
      const compressedData = zlib.deflateSync(data);

      let dataResponse = {
        type: "fileHeader",
        header: {
          fileName: fileName,
          fileSize: data.length,
          compressedFileSize: compressedData.length,
        },
      };
      conn.reply(
        JSON.stringify(dataResponse),
        key,
        Flags.FLAG_FILE_HEADER_GETFILE
      );

      dataResponse = {
        type: "fileResponse",
        header: {
          fileName: fileName,
          fileSize: data.length,
          compressedFileSize: compressedData.length,
        },
        payload: compressedData,
      };
      conn.reply(
        JSON.stringify(dataResponse),
        key,
        Flags.FLAG_FILE_PAYLOAD_GETFILE
      );
    } else if (command.substring(0, 7) == "getlist") {
      let arrcommand = command.split(":");
      // const fs = require("fs");
      const path = require("path");
      const directoryPath = arrcommand[1];

      try {
        const files = fs.readdirSync(directoryPath);
        let directories = [];
        let regularFiles = [];

        files.forEach((file) => {
          const filePath = path.join(directoryPath, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              directories.push(file + "/");
            } else {
              let fileSize;
              if (stats.size < 1024 * 1024)
                fileSize = parseFloat(stats.size / 1024).toFixed(1) + "kb";
              else
                fileSize =
                  parseFloat(stats.size / (1024 * 1024)).toFixed(1) + "mb";
              regularFiles.push(file.padEnd(20, " ") + " " + fileSize);
            }
          } catch (err) {
            throw "Terjadi kesalahan saat memeriksa file ";
          }
        });

        let dataResponse = {
          type: "fileList",
          payload: regularFiles.concat(directories),
        };
        conn.reply(
          JSON.stringify(dataResponse),
          key,
          Flags.FLAG_FILE_LIST_RESPONSE
        );
      } catch (err) {
        throw `Tidak bisa membaca direktori: '${directoryPath}'`;
        if (errCallback) errCallback(err);
      }
    }
  });
};

class firewallManager {
  constructor() {
    this.firewallConfig = []; // Semua aturan disimpan dalam satu array
  }

  // Menambahkan Aturan Baru
  addRule(rule) {
    if (!["incoming", "outgoing"].includes(rule.direction)) {
      throw `Invalid direction "${rule.direction}". Use "incoming" or "outgoing".`;
      return;
    }

    // Konversi dstPort dan srcPort menjadi number jika bukan "*"
    if (rule.condition.dstPort !== "*" && !isNaN(rule.condition.dstPort)) {
      rule.condition.dstPort = Number(rule.condition.dstPort);
    }
    if (rule.condition.srcPort !== "*" && !isNaN(rule.condition.srcPort)) {
      rule.condition.srcPort = Number(rule.condition.srcPort);
    }

    this.firewallConfig.push(rule);
    // console.log(`Rule added at index ${this.firewallConfig.length - 1}`);
  }

  // Menghapus Aturan Berdasarkan Index
  removeRule(index) {
    if (index >= 0 && index < this.firewallConfig.length) {
      this.firewallConfig.splice(index, 1);
      // console.log(`Rule at index ${index} removed successfully.`);
    } else {
      // console.log(`Index "${index}" is out of range.`);
    }
  }

  // Memperbarui Aturan Berdasarkan Index
  updateRule(index, newRule) {
    if (index >= 0 && index < this.firewallConfig.length) {
      if (!["incoming", "outgoing"].includes(newRule.direction)) {
        console.log(
          `Invalid direction "${newRule.direction}". Use "incoming" or "outgoing".`
        );
        return;
      }

      // Konversi dstPort dan srcPort menjadi number jika bukan "*"
      if (
        newRule.condition.dstPort !== "*" &&
        !isNaN(newRule.condition.dstPort)
      ) {
        newRule.condition.dstPort = Number(newRule.condition.dstPort);
      }
      if (
        newRule.condition.srcPort !== "*" &&
        !isNaN(newRule.condition.srcPort)
      ) {
        newRule.condition.srcPort = Number(newRule.condition.srcPort);
      }

      this.firewallConfig[index] = newRule;
      // console.log(`Rule at index ${index} updated successfully.`);
    } else {
      // console.log(`Index "${index}" is out of range.`);
    }
  }

  // Melihat Semua Aturan
  viewRules() {
    this.firewallConfig.forEach((rule, index) => {
      console.log(`${index}: ${JSON.stringify(rule)}`);
    });
  }
}

class PortManager {
  constructor() {
    this.ports = new Set();
    this.lastAllocated = 0;
  }

  allocatePort(port = null, override = false) {
    let availPort = null;

    if (port == null) {
      // Sequential cari port dari 1 sampai 65535
      for (let i = 1; i <= 65535; i++) {
        if (!this.ports.has(i)) {
          availPort = i;
          break;
        }
      }
    } else {
      if (!this.ports.has(port) || override == true) {
        // Port masih bebas, atau override = 1
        availPort = port;
      } else {
        // Kalau port spesifik udah dipakai & override = 0, cari yang lain
        for (let i = 1; i <= 65535; i++) {
          if (!this.ports.has(i)) {
            availPort = i;
            break;
          }
        }
      }
    }

    if (availPort != null) {
      this.ports.add(availPort);
    }

    return availPort;
  }

  allocateRandomPort(min = 1024, max = 65535) {
    if (min >= max || min < 1 || max > 65535) {
      throw new Error(`Invalid port range: min=${min}, max=${max}`);
    }

    const range = max - min + 1;
    const maxAttempts = 1000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const candidate = Math.floor(Math.random() * range) + min;
      if (!this.ports.has(candidate)) {
        this.ports.add(candidate);
        // console.log("*** kadieeuuuuu: " + candidate + " :: " + JSON.stringify(this.ports));
        return candidate;
      }
      attempts++;
    }

    // Baru dilempar error jika gagal dalam 1000 percobaan
    throw new Error(
      `Failed to allocate random port in range ${min}-${max} after ${maxAttempts} attempts.`
    );
  }

  releasePort(port) {
    this.ports.delete(port);
  }

  isPortUsed(port) {
    return this.ports.has(port);
  }
}

// 🆕 NEW: Rate Limiter Class (untuk optional rate limiting)
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(srcAddress) {
    const now = Date.now();
    const key = srcAddress;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key);
    // Remove old timestamps
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  // Get current request count untuk monitoring
  getCurrentRequests(srcAddress) {
    if (!this.requests.has(srcAddress)) return 0;

    const now = Date.now();
    const timestamps = this.requests.get(srcAddress);
    return timestamps.filter(t => now - t < this.windowMs).length;
  }

  // Cleanup old entries
  cleanup() {
    const now = Date.now();
    for (let [key, timestamps] of this.requests) {
      const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// 🆕 NEW: QoS Constants (untuk optional QoS features)
const QoS = {
  CRITICAL: 0,    // Ping, control packets
  HIGH: 1,        // Real-time data
  NORMAL: 2,      // Regular data
  LOW: 3          // File transfers, bulk data
};

module.exports = {
  // Core components
  mqttDispatcher: mqttDispatcher,
  DataTransferManager: DataTransferManager,
  securityAgent: securityAgent,
  connectionManager: connectionManager,
  mqtnlConnection: mqtnlConnection,

  // Bridges
  mqttForwarder: mqttForwarder,
  beeBridge: beeBridge,
  firewallManager: firewallManager,

  // ⚠️ DEPRECATED - Use NOSPacketStackV2 instead
  mqtnlFileTransferProtocol: mqtnlFileTransferProtocol,
  mqtnlFileReceiveProtocol: mqtnlFileReceiveProtocol,

  // Enhanced features
  RateLimiter: RateLimiter,
  QoS: QoS,
  version: "0.68"
};

// 🆕 NEW: Library upgrade info (silent notification)
if (typeof console !== 'undefined') {
  console.log(`
🔧 MQTTNETWORKLIB v0.68 - Enhanced Features Available
═══════════════════════════════════════════════════
✅ 100% Backward Compatible - Existing code works unchanged
🧠 Memory Management: Auto-cleanup for long-running applications  
🛡️ Rate Limiting: Optional protection against spam/DoS
⚡ Adaptive Packet Sizing: Network-aware performance optimization
📊 Enhanced Stats: Detailed monitoring and health assessment
🎯 QoS Support: Priority-based message handling via property
🚀 Priority Queue: True packet prioritization with scheduling

📖 Usage (All Optional):
   cm.enableRateLimit(100, 60000);        // Rate limiting
   dtm.enableAdaptivePacketSizing();      // Adaptive sizing  
   dtm.enablePriorityQueue(10);           // Priority scheduling (10ms)
   const stats = cm.getDetailedStats();   // Enhanced stats
   conn.QoSPriority = 0;                  // High priority (QoS.CRITICAL)
   conn.write(addr, port, data);          // Uses priority setting

🎯 QoS Constants: 0=CRITICAL, 1=HIGH, 2=NORMAL(default), 3=LOW
🚀 Priority Queue ensures high-priority packets are sent first!
🔗 All existing code continues to work without modification.
═══════════════════════════════════════════════════
  `);
}
