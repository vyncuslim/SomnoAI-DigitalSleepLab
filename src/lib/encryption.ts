import crypto from 'crypto';

const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || '5f8e9a2b4c7d1e6f0a3b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f';
const ENCRYPTION_KEY = ENCRYPTION_KEY_RAW.length === 64 
  ? Buffer.from(ENCRYPTION_KEY_RAW, 'hex') 
  : Buffer.alloc(32).fill(ENCRYPTION_KEY_RAW, 'utf8');

const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
