import crypto from 'crypto';
import { env } from '../config/env.js';
// AES-256-GCM using SESSION_SECRET as key material (derive key via HKDF)
class AesGcmCipher {
    key;
    constructor(secret) {
        // Derive 32-byte key using HKDF-SHA256
        const ab = crypto.hkdfSync('sha256', Buffer.from(secret), Buffer.alloc(0), Buffer.from('aes-gcm-256'), 32);
        this.key = Buffer.from(ab);
    }
    encrypt(plaintext) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, ciphertext]).toString('base64');
    }
    decrypt(payload) {
        const data = Buffer.from(payload, 'base64');
        const iv = data.subarray(0, 12);
        const tag = data.subarray(12, 28);
        const ciphertext = data.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString('utf8');
    }
}
export const secretCipher = new AesGcmCipher(env.SESSION_SECRET);
