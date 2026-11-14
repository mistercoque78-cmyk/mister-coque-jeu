// ============================================================
// AUTH ADMIN — jeton HMAC signé (sans dépendance)
// ============================================================
import crypto from 'node:crypto';

const SECRET = process.env.ADMIN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL = 8 * 60 * 60 * 1000; // 8 h

export function createToken() {
  const exp = Date.now() + TOKEN_TTL;
  const payload = 'admin:' + exp;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return payload + '.' + sig;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const payload = parts[0];
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (parts[1] !== expected) return false;
  const m = /^admin:(\d+)$/.exec(payload);
  if (!m) return false;
  return Number(m[1]) > Date.now();
}

let generatedPassword = null;

export function getPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production') {
    if (!generatedPassword) generatedPassword = crypto.randomBytes(9).toString('base64url');
    return generatedPassword;
  }
  return 'mistercoque2025';
}
