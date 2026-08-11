// src/utils/cryptoHelper.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES

function getEncryptionKey() {
  const key = process.env.NOTIFICATION_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-notification-secret-key-32b';
  // Generate a cryptographically strong 32-byte key from whatever secret is provided
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a string value using AES-256-CBC.
 * Returns the encrypted string prefixed with the IV (hex encoded format "iv:ciphertext").
 * @param {string} text 
 * @returns {string}
 */
export function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('[CryptoHelper] Encryption failed:', err.message);
    throw err;
  }
}

/**
 * Decrypts a previously encrypted string.
 * Expects the input to be in the "iv:ciphertext" format.
 * @param {string} encryptedText 
 * @returns {string}
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CryptoHelper] Decryption failed:', err.message);
    throw err;
  }
}
