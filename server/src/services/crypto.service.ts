import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface EncryptedPayload {
  encryptedText: string;
  iv: string;
  tag: string;
}

const ALGORITHM = 'aes-256-gcm';
// Ensure key is 32 bytes (256 bits)
const KEY = crypto.createHash('sha256').update(ENV.TOKEN_ENCRYPTION_KEY).digest();

/**
 * Encrypts sensitive GitHub OAuth access tokens at rest using AES-256-GCM.
 * As specified in Architecture Spec Section 3.
 */
export function encryptToken(plainText: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encryptedText: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypts AES-256-GCM encrypted GitHub access tokens.
 */
export function decryptToken(encryptedText: string, ivHex: string, tagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
