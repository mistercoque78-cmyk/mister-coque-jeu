// ============================================================
// SERVEUR — Jeu Instant Gagnant (Node, zéro dépendance)
// Sert les fichiers statiques + API REST (participation + admin)
// Démarrage : node server.js
// ============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOT_PYRAMID, LOT_FALLBACK } from './assets/lots.js';
import { QUESTIONS } from './assets/questions.js';
import { getDB, saveDB } from './server/store.js';
import { createToken, verifyToken, getPassword } from './server/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ---------- Helpers HTTP ----------
function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function getIP(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function bearerToken(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function guardAdmin(req, res, handler) {
  if (!verifyToken(bearerToken(req))) return sendJSON(res, 401, { error: 'UNAUTHORIZED' });
  return handler();
}

// ---------- Divers ----------
function uniqueClaimCode(db) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let code = 'MC-';
    for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    code += '-';
    for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!db.claims.some(c => c.claimCode === code)) return code;
  }
}

function logAudit(db, action, meta = {}) {
  db.audit.push({
    id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    action,
    admin: meta.admin || 'system',
    claimId: meta.claimId || null,
    details: meta.details || null,
    date: new Date().toISOString()
  });
}

// ---------- Validation des réponses du QCM ----------
function validateAnswers(answers) {
  const out = {};
  if (!answers || typeof answers !== 'object') return { error: 'INVALID_ANSWERS' };
  for (const q of QUESTIONS) {
    const val = answers[q.id];
    if (q.type === 'single') {
      // exactement une réponse, obligatoire
      if (typeof val !== 'string' || !val.trim()) return { error: 'INVALID_ANSWERS', question: q.id };
      if (!q.options.some(o => o.id === val.trim())) return { error: 'INVALID_ANSWERS', question: q.id };
      out[q.id] = val.trim();
    } else {
      // multiple : au moins une réponse si required
      if (!Array.isArray(val) || val.length === 0) return { error: 'INVALID_ANSWERS', question: q.id };
      const validIds = new Set(q.options.map(o => o.id));
      const clean = val.filter(x => validIds.has(x));
      if (clean.length === 0) return { error: 'INVALID_ANSWERS', question: q.id };
      out[q.id] = clean;
    }
  }
  return { answers: out };
}
// ---------- Tirage + réservation de stock (côté serveur uniquement) ----------
// Gros lots garantis dans les 20 premiers participants (numéro participant → ordre du lot).
// Billet 100€ = order 10 ; Billet 20€ = order 11 ; Montre Boss = order 12.
const GROS_LOT_PLAN = [
  { num: 2,  order: 10 }, // Billet de 100€
  { num: 5,  order: 12 }, // Montre Boss homme
  { num: 8,  order: 11 }, // Billet de 20€
  { num: 11, order: 11 },
  { num: 14, order: 11 },
  { num: 17, order: 11 },
  { num: 20, order: 11 }
];

function reserveStock(db, stock) {
  stock.remaining -= 1;
  stock.reserved += 1;
  const def = LOT_PYRAMID.find(l => l.order === stock.order);
  return {
    source: 'pyramid',
    prizeName: stock.name,
    prizeOrder: stock.order,
    quantity: 1,
    stockId: stock.id,
    stockReserved: true,
    detail: def ? def.detail : ''
  };
}

function drawAndReserve(db, participantNum) {
  // 1) Gros lot planifié : garanti dans les 20 premiers participants.
  const plan = GROS_LOT_PLAN.find(p => p.num === participantNum);
  if (plan) {
    const stock = db.stocks.find(s => s.order === plan.order && s.remaining > 0);
    if (stock) return reserveStock(db, stock);
  }

  // 2) Tirage aléatoire pondéré par le stock restant.
  //    Pendant les 20 premiers tirages, on écarte les gros lots (réservés au plan).
  let available = db.stocks.filter(s => s.remaining > 0);
  if (participantNum <= 20) {
    const bigOrders = new Set(GROS_LOT_PLAN.map(p => p.order));
    available = available.filter(s => !bigOrders.has(s.order));
  }
  const total = available.reduce((sum, s) => sum + s.remaining, 0);

  if (total > 0) {
    let ticket = Math.floor(Math.random() * total);
    let chosen = null;
    for (const s of available) {
      if (ticket < s.remaining) { chosen = s; break; }
      ticket -= s.remaining;
    }
    return reserveStock(db, chosen);
  }

  // 3) Lots de secours : toute la pyramide est épuisée.
  const fb = LOT_FALLBACK[Math.floor(Math.random() * LOT_FALLBACK.length)];
  return {
    source: 'fallback',
    prizeName: fb.name,
    prizeOrder: null,
    quantity: 1,
    stockId: null,
    stockReserved: false,
    detail: fb.detail
  };
}

// ---------- POST /api/participate ----------
async function handleParticipate(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (e) { return sendJSON(res, 400, { error: 'BAD_REQUEST' }); }

  const consents = body.consents || {};

  // 1) Consentements obligatoires AVANT toute réservation de stock
  if (consents.rulesAccepted !== true || consents.privacyAccepted !== true) {
    return sendJSON(res, 400, { error: 'CONSENT_REQUIRED' });
  }

  const firstname = String(body.firstname || '').trim();
  const lastname = String(body.lastname || '').trim();
  const phone = String(body.phone || '').replace(/[\s.\-()]/g, '');
  const city = String(body.city || '').trim();
  const zipcode = String(body.zipcode || '').trim();

  if (!firstname || !lastname || !phone || !city || !zipcode) {
    return sendJSON(res, 400, { error: 'MISSING_FIELDS' });
  }
  if (!/^0[1-9]\d{8}$/.test(phone)) return sendJSON(res, 400, { error: 'INVALID_PHONE' });
  if (!/^\d{5}$/.test(zipcode)) return sendJSON(res, 400, { error: 'INVALID_ZIPCODE' });

  const q = validateAnswers(body.answers);
  if (q.error) return sendJSON(res, 400, { error: q.error, question: q.question });

  const db = getDB();

  // Anti-fraude : 1 participation par numéro de téléphone
  if (db.participants.some(p => p.phone === phone)) {
    return sendJSON(res, 409, { error: 'ALREADY_PARTICIPATED' });
  }

  // 2) Tirage + réservation (transaction en mémoire, écrite atomiquement)
  const draw = drawAndReserve(db, db.counters.participant + 1);

  db.counters.participant += 1;
  const num = db.counters.participant;
  const now = new Date().toISOString();
  const consentVersions = body.consentVersions || {};
  const readable = body.answersText || {};

  const participant = {
    id: 'part-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    num,
    firstname,
    lastname,
    phone,
    city,
    zipcode,
    answers: {
      sources: String(readable.sources || ''),
      universes: String(readable.universes || '')
    },
    answersIds: q.answers,
    consents: {
      rules: { accepted: true, version: consentVersions.rules || 'v1' },
      privacy: { accepted: true, version: consentVersions.privacy || 'v1' },
      marketing: { accepted: consents.marketingAccepted === true, version: consentVersions.marketing || 'v1' },
      partners: { accepted: consents.partnersAccepted === true, version: consentVersions.partners || 'v1' }
    },
    consentDate: now,
    ip: getIP(req),
    userAgent: String(req.headers['user-agent'] || ''),
    gain: draw.prizeName,
    date: now
  };
  db.participants.push(participant);

  db.counters.claim += 1;
  const claim = {
    id: 'claim-' + db.counters.claim,
    userId: participant.id,
    participantNum: num,
    participantName: firstname + ' ' + lastname,
    phone,
    prizeName: draw.prizeName,
    prizeOrder: draw.prizeOrder,
    quantity: draw.quantity,
    status: 'pending',
    claimCode: uniqueClaimCode(db),
    createdAt: now,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    stockReserved: draw.stockReserved,
    stockId: draw.stockId,
    source: draw.source
  };
  db.claims.push(claim);

  logAudit(db, 'PARTICIPATE', { claimId: claim.id, details: 'Gain créé (pending) — ' + claim.prizeName });

  saveDB();

  return sendJSON(res, 201, {
    participantNum: num,
    prize: { name: draw.prizeName, detail: draw.detail, source: draw.source },
    claimCode: claim.claimCode,
    status: claim.status
  });
}

// ---------- POST /api/admin/login ----------
async function handleAdminLogin(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (e) { return sendJSON(res, 400, { error: 'BAD_REQUEST' }); }
  if (String(body.password || '') === getPassword()) {
    return sendJSON(res, 200, { token: createToken() });
  }
  return sendJSON(res, 401, { error: 'INVALID_PASSWORD' });
}
// ---------- GET /api/admin/participants ----------
function handleAdminParticipants(req, res) {
  const db = getDB();
  const list = db.participants.slice().sort((a, b) => b.num - a.num);
  return sendJSON(res, 200, { participants: list });
}

// ---------- GET /api/admin/prize-claims?status=&q= ----------
function handleAdminClaims(req, res, query) {
  const db = getDB();
  let list = db.claims.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const status = query.get('status');
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    list = list.filter(c => c.status === status);
  }
  const q = (query.get('q') || '').trim().toLowerCase();
  if (q) {
    list = list.filter(c =>
      (c.claimCode || '').toLowerCase().includes(q) ||
      (c.participantName || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }
  return sendJSON(res, 200, { claims: list });
}

// ---------- PATCH /api/admin/prize-claims/:id/approve|reject ----------
async function handleClaimAction(req, res, id, action) {
  let body = {};
  try { body = await readBody(req); }
  catch (e) { /* corps optionnel */ }

  const db = getDB();
  const claim = db.claims.find(c => c.id === id);
  if (!claim) return sendJSON(res, 404, { error: 'NOT_FOUND' });

  const admin = 'admin';
  const now = new Date().toISOString();

  if (action === 'approve') {
    if (claim.status === 'approved') return sendJSON(res, 200, { claim }); // idempotent
    if (claim.status !== 'pending') return sendJSON(res, 409, { error: 'INVALID_TRANSITION', status: claim.status });
    if (claim.stockReserved && claim.stockId) {
      const stock = db.stocks.find(s => s.id === claim.stockId);
      if (stock) {
        stock.reserved = Math.max(0, stock.reserved - claim.quantity);
        stock.attributed += claim.quantity;
      }
    }
    claim.status = 'approved';
    claim.reviewedAt = now;
    claim.reviewedBy = admin;
    claim.rejectionReason = null;
    logAudit(db, 'APPROVE', { admin, claimId: claim.id, details: claim.prizeName });
    saveDB();
    return sendJSON(res, 200, { claim });
  }

  if (action === 'reject') {
    const reason = String(body.reason || '').trim();
    if (claim.status === 'rejected') {
      if (reason) { claim.rejectionReason = reason; claim.reviewedAt = now; claim.reviewedBy = admin; saveDB(); }
      return sendJSON(res, 200, { claim }); // idempotent
    }
    if (claim.status !== 'pending' && claim.status !== 'approved') {
      return sendJSON(res, 409, { error: 'INVALID_TRANSITION', status: claim.status });
    }
    if (claim.stockReserved && claim.stockId) {
      const stock = db.stocks.find(s => s.id === claim.stockId);
      if (stock) {
        if (claim.status === 'pending') stock.reserved = Math.max(0, stock.reserved - claim.quantity);
        else stock.attributed = Math.max(0, stock.attributed - claim.quantity);
        stock.remaining += claim.quantity;
      }
    }
    claim.status = 'rejected';
    claim.reviewedAt = now;
    claim.reviewedBy = admin;
    claim.rejectionReason = reason || null;
    claim.stockReserved = false;
    logAudit(db, 'REJECT', { admin, claimId: claim.id, details: claim.prizeName + (reason ? ' — ' + reason : '') });
    saveDB();
    return sendJSON(res, 200, { claim });
  }

  return sendJSON(res, 400, { error: 'BAD_ACTION' });
}

// ---------- DELETE /api/admin/prize-claims/:id (suppression participation) ----------
function handleDeleteClaim(req, res, id) {
  const db = getDB();
  const claim = db.claims.find(c => c.id === id);
  if (!claim) return sendJSON(res, 404, { error: 'NOT_FOUND' });

  if (claim.stockReserved && claim.stockId) {
    const stock = db.stocks.find(s => s.id === claim.stockId);
    if (stock) {
      if (claim.status === 'pending') stock.reserved = Math.max(0, stock.reserved - claim.quantity);
      else if (claim.status === 'approved') stock.attributed = Math.max(0, stock.attributed - claim.quantity);
      stock.remaining += claim.quantity;
    }
  }

  db.claims = db.claims.filter(c => c.id !== id);
  db.participants = db.participants.filter(p => p.id !== claim.userId);
  logAudit(db, 'DELETE', { admin: 'admin', claimId: id, details: 'Participation supprimée — ' + claim.participantName + ' (' + claim.prizeName + ')' });
  saveDB();
  return sendJSON(res, 200, { ok: true });
}

// ---------- GET /api/admin/stocks ----------
function handleAdminStocks(req, res) {
  const db = getDB();
  return sendJSON(res, 200, { stocks: db.stocks });
}

// ---------- GET /api/admin/audit ----------
function handleAdminAudit(req, res) {
  const db = getDB();
  return sendJSON(res, 200, { audit: db.audit.slice().reverse() });
}

// ---------- GET /api/claims/:code ----------
function handleGetClaimByCode(req, res, code) {
  const db = getDB();
  const claim = db.claims.find(c => c.claimCode.toLowerCase() === code.toLowerCase());
  if (!claim) return sendJSON(res, 404, { error: 'NOT_FOUND' });
  return sendJSON(res, 200, {
    claimCode: claim.claimCode,
    participantName: claim.participantName,
    prizeName: claim.prizeName,
    status: claim.status,
    redeemable: claim.status === 'approved'
  });
}

function handleAdminExport(req, res) {
  const db = getDB();
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="mister-coque-export-' + Date.now() + '.json"'
  });
  res.end(JSON.stringify(db, null, 2));
}
// ---------- Fichiers statiques ----------
function serveStatic(req, res, urlPath) {
  let p = urlPath;
  if (p === '/') p = '/index.html';
  // Ne jamais exposer les données (RGPD) ni le code serveur.
  if (p.startsWith('/data/') || p.startsWith('/server/') || p === '/server.js' || p.startsWith('/.')) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const filePath = path.normalize(path.join(ROOT, p));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 introuvable : ' + p);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- Routeur ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const method = req.method;

    if (p === '/healthz' && method === 'GET') return sendJSON(res, 200, { ok: true });
    if (p === '/api/participate' && method === 'POST') return await handleParticipate(req, res);
    if (p === '/api/admin/login' && method === 'POST') return await handleAdminLogin(req, res);
    if (p === '/api/admin/participants' && method === 'GET') return await guardAdmin(req, res, () => handleAdminParticipants(req, res));
    if (p === '/api/admin/stocks' && method === 'GET') return await guardAdmin(req, res, () => handleAdminStocks(req, res));
    if (p === '/api/admin/audit' && method === 'GET') return await guardAdmin(req, res, () => handleAdminAudit(req, res));
    if (p === '/api/admin/export' && method === 'GET') return await guardAdmin(req, res, () => handleAdminExport(req, res));
    if (p === '/api/admin/prize-claims' && method === 'GET') return await guardAdmin(req, res, () => handleAdminClaims(req, res, url.searchParams));
    const act = /^\/api\/admin\/prize-claims\/([^/]+)\/(approve|reject)$/.exec(p);
    if (act && method === 'PATCH') return await guardAdmin(req, res, () => handleClaimAction(req, res, act[1], act[2]));
    const del = /^\/api\/admin\/prize-claims\/([^/]+)$/.exec(p);
    if (del && method === 'DELETE') return await guardAdmin(req, res, () => handleDeleteClaim(req, res, del[1]));
    const cc = /^\/api\/claims\/([^/]+)$/.exec(p);
    if (cc && method === 'GET') return handleGetClaimByCode(req, res, cc[1]);

    if (method === 'GET' || method === 'HEAD') return serveStatic(req, res, p);
    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    console.error(e);
    sendJSON(res, 500, { error: 'INTERNAL_ERROR' });
  }
});

// Arrêt propre (SIGTERM / SIGINT) : sauvegarde des données avant de quitter.
function shutdown(signal) {
  console.log(signal + ' reçu — sauvegarde et arrêt…');
  saveDB();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log('Serveur démarré : http://' + HOST + ':' + PORT);
  console.log('Jeu             : http://' + HOST + ':' + PORT + '/');
  console.log('Admin           : http://' + HOST + ':' + PORT + '/admin.html');
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_PASSWORD) {
      console.log('⚠️  ADMIN_PASSWORD non défini — mot de passe admin généré (à noter) : ' + getPassword());
    }
    if (!process.env.ADMIN_SECRET) {
      console.log('⚠️  ADMIN_SECRET non défini — les sessions admin expirent à chaque redémarrage.');
    }
  }
});



