/**
 * Simple Security Agent for MQTNL
 * Basic encryption using string reversal (for demo purposes)
 */

class SimpleSecurityAgent {
  constructor() {
    this.algorithm = 'reverse'; // Simple reversal algorithm
  }

  /**
   * Encrypt data by reversing the string
   * @param {string} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  cipher(data) {
    if (typeof data !== 'string') {
      data = String(data);
    }
    
    // Simple reversal: "hello" -> "olleh"
    return data.split('').reverse().join('');
  }

  /**
   * Decrypt data by reversing back
   * @param {string} encryptedData - Data to decrypt
   * @returns {string} - Decrypted data
   */
  decipher(encryptedData) {
    if (typeof encryptedData !== 'string') {
      encryptedData = String(encryptedData);
    }
    
    // Reverse back: "olleh" -> "hello"
    return encryptedData.split('').reverse().join('');
  }

  /**
   * Get algorithm info
   * @returns {string} - Algorithm name
   */
  getAlgorithm() {
    return this.algorithm;
  }
}

module.exports = SimpleSecurityAgent;
