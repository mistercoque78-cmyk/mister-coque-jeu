// ============================================================
// INTERFACE ADMIN — login + participants + lots gagnés + stocks + audit
// ============================================================
import {
  adminLogin, adminParticipants, adminClaims, adminStocks, adminAudit,
  approveClaim, rejectClaim, deleteClaim
} from './api.js';

const AUTH_KEY = 'mister_coque_admin_token';
const PWD_KEY = 'mister_coque_admin_pwd';
let token = localStorage.getItem(AUTH_KEY) || '';
let claimFilter = 'pending';
let claimSearch = '';

function init() {
  const authed = !!token;
  document.getElementById('login-screen').classList.toggle('hidden', authed);
  document.getElementById('admin-panel').classList.toggle('hidden', !authed);

  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('export-btn').addEventListener('click', exportData);

  document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('#filter-claims .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { claimFilter = btn.dataset.filter; renderFilterUI(); refreshClaims(); });
  });
  document.getElementById('claim-search').addEventListener('input', () => {
    claimSearch = document.getElementById('claim-search').value.trim().toLowerCase();
    refreshClaims();
  });

  if (authed) refreshAll();
  else {
    // Connexion automatique : mot de passe mémorisé → reconnexion sans saisie.
    const savedPwd = localStorage.getItem(PWD_KEY);
    if (savedPwd) {
      document.getElementById('password').value = savedPwd;
      login();
    }
  }
}

async function login() {
  const pw = document.getElementById('password').value;
  const remember = document.getElementById('remember').checked;
  try {
    const res = await adminLogin(pw);
    token = res.token;
    localStorage.setItem(AUTH_KEY, token);
    if (remember) localStorage.setItem(PWD_KEY, pw);
    else localStorage.removeItem(PWD_KEY);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    document.getElementById('password').value = '';
    refreshAll();
  } catch (e) {
    if (remember) localStorage.removeItem(PWD_KEY);
    alert('Mot de passe incorrect.');
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(PWD_KEY);
  token = '';
  location.reload();
}

async function exportData() {
  try {
    const res = await fetch('/api/admin/export', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) { alert('Session expirée. Reconnectez-vous.'); logout(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mister-coque-export-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Erreur lors de l'export : " + e.message);
  }
}

function switchTab(tab) {
  document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ['participants', 'stocks', 'claims', 'audit'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
  });
  if (tab === 'participants') refreshParticipants();
  if (tab === 'stocks') refreshStocks();
  if (tab === 'claims') refreshClaims();
  if (tab === 'audit') refreshAudit();
}

async function refreshAll() {
  await Promise.all([refreshParticipants(), refreshStocks(), refreshClaims(), refreshAudit()]);
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function short(str, max) {
  str = String(str || '');
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function handleAuthError(e) {
  if (e.status === 401) { alert('Session expirée. Reconnectez-vous.'); logout(); }
  else { console.error(e); alert('Erreur serveur : ' + e.message); }
}

// ---------- Participants ----------
async function refreshParticipants() {
  try {
    const { participants } = await adminParticipants(token);
    document.getElementById('count').textContent = participants.length;
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = participants.length === 0
      ? '<tr><td colspan="8" class="empty">Aucun participant pour le moment</td></tr>'
      : participants.map(p => `
        <tr>
          <td>${esc(p.firstname)}</td>
          <td>${esc(p.lastname)}</td>
          <td>${esc(p.phone)}</td>
          <td>${esc(p.city)}</td>
          <td style="font-size:11px;">${esc(short(p.gain, 20))}</td>
          <td>${consentBadges(p)}</td>
          <td title="IP : ${esc(p.ip)}&#10;UA : ${esc(p.userAgent)}">${esc(fmtDate(p.date))}</td>
          <td><button class="mini out" data-del-participant="${esc(p.id)}" title="Supprimer cette participation">✕</button></td>
        </tr>`).join('');
    document.querySelectorAll('[data-del-participant]').forEach(b => {
      b.addEventListener('click', () => deleteByParticipantId(b.dataset.delParticipant));
    });
  } catch (e) { handleAuthError(e); }
}

function consentBadges(p) {
  const c = p.consents || {};
  const rules = c.rules && c.rules.accepted ? '<span class="badge ok">Règles</span>' : '<span class="badge out">Règles</span>';
  const priv = c.privacy && c.privacy.accepted ? '<span class="badge ok">RGPD</span>' : '<span class="badge out">RGPD</span>';
  const mk = c.marketing && c.marketing.accepted ? '<span class="badge muted">Marketing</span>' : '';
  const pt = c.partners && c.partners.accepted ? '<span class="badge muted">Partenaires</span>' : '';
  return rules + priv + mk + pt;
}
// ---------- Suppression par participant (via son gain) ----------
async function deleteByParticipantId(participantId) {
  if (!confirm('Supprimer cette participation ? Cette action est irréversible.')) return;
  try {
    const { claims } = await adminClaims(token);
    const claim = claims.find(c => c.userId === participantId);
    if (claim) await deleteClaim(token, claim.id);
    await refreshParticipants();
  } catch (e) { handleAuthError(e); }
}

// ---------- Lots gagnés (claims) ----------
function renderFilterUI() {
  document.querySelectorAll('#filter-claims .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === claimFilter);
  });
}

function statusBadge(s) {
  const map = {
    pending: '<span class="badge pending">En attente</span>',
    approved: '<span class="badge ok">Validé</span>',
    rejected: '<span class="badge out">Refusé</span>'
  };
  return map[s] || '<span class="badge muted">' + esc(s) + '</span>';
}

function claimCard(c) {
  const canAct = c.status === 'pending' || c.status === 'approved';
  const actions = canAct
    ? `<button class="mini ok" data-approve="${esc(c.id)}">✓ Valider</button>
       <button class="mini out" data-reject="${esc(c.id)}">✕ Refuser</button>`
    : '';
  const del = `<button class="mini out" data-del-claim="${esc(c.id)}" title="Supprimer">🗑</button>`;
  return `
    <div class="claim-card ${c.status}">
      <div class="claim-head">
        <strong>${esc(c.prizeName)}</strong> ${statusBadge(c.status)}
      </div>
      <div class="claim-body">
        <div>👤 ${esc(c.participantName)} · <span class="mono">${esc(c.phone)}</span></div>
        <div class="mono code-line">${esc(c.claimCode)} <small>(${esc(c.source === 'pyramid' ? 'pyramide' : 'secours')})</small></div>
        <div class="muted">Créé le ${esc(fmtDate(c.createdAt))}</div>
        ${c.reviewedAt ? '<div class="muted">Traité le ' + esc(fmtDate(c.reviewedAt)) + '</div>' : ''}
        ${c.rejectionReason ? '<div class="muted">Motif : ' + esc(c.rejectionReason) + '</div>' : ''}
      </div>
      <div class="claim-actions">${actions}${del}</div>
    </div>`;
}

function renderClaims(claims) {
  const list = document.getElementById('claims-list');
  if (!claims || claims.length === 0) {
    list.innerHTML = '<div class="empty">Aucun gain dans cette catégorie.</div>';
    return;
  }
  list.innerHTML = claims.map(claimCard).join('');

  list.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => act(b.dataset.approve, 'approve')));
  list.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => act(b.dataset.reject, 'reject')));
  list.querySelectorAll('[data-del-claim]').forEach(b => b.addEventListener('click', () => delClaim(b.dataset.delClaim)));
}

async function refreshClaims() {
  try {
    const qs = {};
    if (claimFilter) qs.status = claimFilter;
    if (claimSearch) qs.q = claimSearch;
    const { claims } = await adminClaims(token, qs);
    renderClaims(claims);
  } catch (e) { handleAuthError(e); }
}

async function act(id, action) {
  if (action === 'approve') {
    if (!confirm('Valider ce gain ? Le stock sera attribué.')) return;
    try { await approveClaim(token, id); await refreshClaims(); await refreshStocks(); await refreshAudit(); }
    catch (e) { handleAuthError(e); }
  } else if (action === 'reject') {
    const reason = prompt('Motif du refus (facultatif) :', '');
    if (reason === null) return;
    try { await rejectClaim(token, id, reason || ''); await refreshClaims(); await refreshStocks(); await refreshAudit(); }
    catch (e) { handleAuthError(e); }
  }
}

async function delClaim(id) {
  if (!confirm('Supprimer définitivement cette participation et ce gain ? Le stock sera libéré.')) return;
  try { await deleteClaim(token, id); await refreshClaims(); await refreshStocks(); await refreshAudit(); await refreshParticipants(); }
  catch (e) { handleAuthError(e); }
}

// ---------- Stocks ----------
async function refreshStocks() {
  try {
    const { stocks } = await adminStocks(token);
    const wrap = document.getElementById('stock-container');
    wrap.innerHTML = stocks.map(s => {
      const pct = s.qty > 0 ? Math.round((s.remaining / s.qty) * 100) : 0;
      return `
        <div class="stock-row">
          <div class="stock-head">
            <span class="stock-name">${esc(s.name)}</span>
            <span class="mono">${s.remaining}/${s.qty}</span>
          </div>
          <div class="stock-bar"><div class="stock-fill" style="width:${pct}%"></div></div>
          <div class="muted">réservés : ${s.reserved} · attribués : ${s.attributed}</div>
        </div>`;
    }).join('');
  } catch (e) { handleAuthError(e); }
}

// ---------- Audit ----------
async function refreshAudit() {
  try {
    const { audit } = await adminAudit(token);
    const wrap = document.getElementById('audit-list');
    wrap.innerHTML = audit.length === 0
      ? '<div class="empty">Aucune action enregistrée.</div>'
      : audit.map(a => `
        <div class="audit-row">
          <span class="badge muted">${esc(a.action)}</span>
          <span>${esc(a.details || '')}</span>
          <span class="muted">${esc(fmtDate(a.date))}</span>
        </div>`).join('');
  } catch (e) { handleAuthError(e); }
}

init();

