// ============================================================
// CLIENT API — appel du serveur Node (même origine)
// ============================================================
import { API_BASE } from './config.js';

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || ('HTTP ' + res.status));
    err.status = res.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// ---------- Participation (jeu) ----------
export function participate(payload) {
  return request('/api/participate', { method: 'POST', body: JSON.stringify(payload) });
}

// ---------- Admin ----------
export function adminLogin(password) {
  return request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
}

export function adminParticipants(token) {
  return request('/api/admin/participants', { headers: authHeaders(token) });
}

export function adminClaims(token, { status, q } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const qs = params.toString();
  return request('/api/admin/prize-claims' + (qs ? '?' + qs : ''), { headers: authHeaders(token) });
}

export function adminStocks(token) {
  return request('/api/admin/stocks', { headers: authHeaders(token) });
}

export function adminAudit(token) {
  return request('/api/admin/audit', { headers: authHeaders(token) });
}

export function approveClaim(token, id) {
  return request('/api/admin/prize-claims/' + encodeURIComponent(id) + '/approve', {
    method: 'PATCH', headers: authHeaders(token), body: '{}'
  });
}

export function rejectClaim(token, id, reason) {
  return request('/api/admin/prize-claims/' + encodeURIComponent(id) + '/reject', {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ reason })
  });
}

export function deleteClaim(token, id) {
  return request('/api/admin/prize-claims/' + encodeURIComponent(id), {
    method: 'DELETE', headers: authHeaders(token)
  });
}

// ---------- Vérification d'un code de retrait ----------
export function getClaimByCode(code) {
  return request('/api/claims/' + encodeURIComponent(code));
}
