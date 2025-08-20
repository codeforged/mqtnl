/**
 * Packet Flags for MQTNL
 * Defines standard packet header flags for different packet types
 */

// Standard communication flags
const FLAG_DATA = 0;
const FLAG_ACK = 1;
const FLAG_PING_REQUEST = 2;
const FLAG_PING_REPLY = 3;
const FLAG_BROADCAST_PING = 4;
const FLAG_BROADCAST_REPLY = 5;

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
  FLAG_ACK,
  FLAG_PING_REQUEST,
  FLAG_PING_REPLY,
  FLAG_BROADCAST_PING,
  FLAG_BROADCAST_REPLY,
  FLAG_FILE_HEADER_INFO,
  FLAG_FILE_HEADER_GETFILE,
  FLAG_FILE_PAYLOAD_GETFILE,
  FLAG_FILE_LIST_RESPONSE,
  FLAG_FILE_PUT_SUCCESS,
  FLAG_ERROR
};
