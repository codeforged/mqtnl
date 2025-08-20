/**
 * Packet Flags for MQTNL
 * Defines standard packet header flags for different packet types
 * Compatible with NOS Ficus Elastica
 */

// Standard communication flags (NOS Compatible)
const FLAG_DATA = 0;
const FLAG_PING_REQUEST = 1;    // ✅ Match NOS
const FLAG_PING_REPLY = 2;      // ✅ Match NOS
const FLAG_BROADCAST_PING = 3;  // ✅ Match NOS
const FLAG_BROADCAST_REPLY = 4; // ✅ Match NOS

// File transfer flags
const FLAG_FILE_HEADER_INFO = 10;
const FLAG_FILE_HEADER_GETFILE = 11;
const FLAG_FILE_PAYLOAD_GETFILE = 12;
const FLAG_FILE_LIST_RESPONSE = 13;
const FLAG_FILE_PUT_SUCCESS = 14;

// Error flags
const FLAG_ERROR = 99;

module.exports = {
  FLAG_DATA,
  FLAG_PING_REQUEST,    // 1 - ✅ NOS Compatible
  FLAG_PING_REPLY,      // 2 - ✅ NOS Compatible  
  FLAG_BROADCAST_PING,  // 3 - ✅ NOS Compatible
  FLAG_BROADCAST_REPLY, // 4 - ✅ NOS Compatible
  FLAG_FILE_HEADER_INFO,
  FLAG_FILE_HEADER_GETFILE,
  FLAG_FILE_PAYLOAD_GETFILE,
  FLAG_FILE_LIST_RESPONSE,
  FLAG_FILE_PUT_SUCCESS,
  FLAG_ERROR
};
