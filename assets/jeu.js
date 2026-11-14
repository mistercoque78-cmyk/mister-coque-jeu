// ============================================================
// LOGIQUE DU JEU — formulaire (QCM) dynamique + consentements
// Le parcours reste instantané : le gain est affiché immédiatement.
// ============================================================
import { QUESTIONS } from './questions.js';
import { CONSENT_VERSIONS } from './config.js';
import { participate } from './api.js';

let submitting = false;

function normalizePhone(raw) { return raw.replace(/[\s.\-()]/g, ''); }

// ---------- Rendu du QCM ----------
function renderQuestions() {
  const container = document.getElementById('questions');
  container.innerHTML = '';

  QUESTIONS.forEach(q => {
    const field = document.createElement('div');
    field.className = 'field';

    const label = document.createElement('label');
    label.textContent = q.label + ' ';
    const req = document.createElement('span');
    req.className = 'req';
    req.textContent = '*';
    label.appendChild(req);
    field.appendChild(label);

    const opts = document.createElement('div');
    opts.className = 'options';
    opts.id = 'q-' + q.id;

    q.options.forEach(o => {
      opts.appendChild(q.type === 'single' ? renderRadio(q.id, o) : renderCheckCard(q.id, o));
    });

    field.appendChild(opts);
    container.appendChild(field);
  });
}

function renderRadio(qid, o) {
  const label = document.createElement('label');
  label.className = 'radio-item';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = qid;
  input.value = o.id;
  const span = document.createElement('span');
  span.className = 'radio-label';
  span.textContent = o.label;
  label.appendChild(input);
  label.appendChild(span);
  return label;
}

function renderCheckCard(qid, o) {
  const wrap = document.createElement('div');
  wrap.className = 'option-wrap';

  const card = document.createElement('label');
  card.className = 'option-item';
  card.dataset.key = o.id;

  const box = document.createElement('span');
  box.className = 'check-box';
  const txt = document.createElement('span');
  txt.textContent = o.label;
  card.appendChild(box);
  card.appendChild(txt);
  wrap.appendChild(card);

  const hasSub = !!(o.subs && o.subs.length);
  const hasCustom = !!o.customText;

  if (hasSub || hasCustom) {
    const sub = document.createElement('div');
    sub.className = 'sub-options hidden';
    if (hasSub) {
      o.subs.forEach(s => {
        const sl = document.createElement('label');
        sl.className = 'sub-option';
        const si = document.createElement('input');
        si.type = 'checkbox';
        si.value = s;
        sl.appendChild(si);
        sl.appendChild(document.createTextNode(' ' + s));
        sub.appendChild(sl);
      });
    } else {
      const ti = document.createElement('input');
      ti.type = 'text';
      ti.placeholder = 'Précisez...';
      ti.className = 'text-input';
      sub.appendChild(ti);
    }
    wrap.appendChild(sub);
    card.addEventListener('click', () => {
      const sel = card.classList.toggle('selected');
      sub.classList.toggle('hidden', !sel);
    });
  } else {
    card.addEventListener('click', () => card.classList.toggle('selected'));
  }

  return wrap;
}

// ---------- Collecte des réponses ----------
function collectQuestion(q) {
  if (q.type === 'single') {
    const checked = document.querySelector('input[name="' + q.id + '"]:checked');
    const id = checked ? checked.value : '';
    const opt = q.options.find(o => o.id === id);
    return { id, readable: opt ? opt.label : '' };
  }

  const cards = document.querySelectorAll('#q-' + q.id + ' .option-item.selected');
  const ids = [];
  const parts = [];
  cards.forEach(card => {
    const key = card.dataset.key;
    ids.push(key);
    const opt = q.options.find(o => o.id === key);
    let part = opt ? opt.label : key;
    const wrap = card.parentElement;
    if (opt && opt.subs && opt.subs.length) {
      const subs = Array.from(wrap.querySelectorAll('.sub-options input:checked')).map(i => i.value);
      if (subs.length) part += ' (' + subs.join(', ') + ')';
    } else if (opt && opt.customText) {
      const ti = wrap.querySelector('.sub-options input[type="text"]');
      const val = ti ? ti.value.trim() : '';
      if (val) part += ' : ' + val;
    }
    parts.push(part);
  });
  return { ids, readable: parts.join(' | ') };
}

function collectAll() {
  const answers = {};
  const answersText = {};
  for (const q of QUESTIONS) {
    const c = collectQuestion(q);
    answers[q.id] = q.type === 'single' ? c.id : c.ids;
    answersText[q.id] = c.readable;
  }
  return { answers, answersText };
}
// ---------- Consentements ----------
function consentEls() {
  return {
    rules: document.getElementById('consent-rules'),
    privacy: document.getElementById('consent-privacy'),
    marketing: document.getElementById('consent-marketing'),
    partners: document.getElementById('consent-partners')
  };
}

function requiredConsentsOK() {
  const c = consentEls();
  return c.rules.checked && c.privacy.checked;
}

function refreshSubmit() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = !requiredConsentsOK() || submitting;
}

function wireConsents() {
  ['consent-rules', 'consent-privacy', 'consent-marketing', 'consent-partners'].forEach(id => {
    document.getElementById(id).addEventListener('change', refreshSubmit);
  });
}

function showRules() {
  alert("Règlement du jeu-concours — Mister Coque × Arabian Seduct.\n" +
    "• Une seule participation par personne et par numéro de téléphone.\n" +
    "• L'instant gagnant désigne un gain (lot de la pyramide ou remise de secours).\n" +
    "• Le gain est validé par l'équipe avant remise en boutique.\n" +
    "• Lots non échangeables, non remboursables, à retirer sous 30 jours.");
}

function showPrivacy() {
  alert("Traitement des données : vos informations (nom, téléphone, ville, réponses au QCM) " +
    "sont collectées pour l'organisation du jeu, la gestion des gains et la preuve de consentement. " +
    "Elles ne sont utilisées à des fins marketing que si vous y avez consenti.");
}

function validateClient() {
  const firstname = document.getElementById('firstname').value.trim();
  const lastname = document.getElementById('lastname').value.trim();
  const phoneRaw = document.getElementById('phone').value.trim();
  const city = document.getElementById('city').value.trim();
  const zipcode = document.getElementById('zipcode').value.trim();

  if (!firstname || !lastname || !phoneRaw || !city || !zipcode) {
    alert('Merci de remplir tous les champs obligatoires.');
    return null;
  }
  const phone = normalizePhone(phoneRaw);
  if (!/^0[1-9]\d{8}$/.test(phone)) {
    alert('Numéro de téléphone invalide (10 chiffres, format français).');
    return null;
  }
  if (!/^\d{5}$/.test(zipcode)) {
    alert('Code postal invalide (5 chiffres).');
    return null;
  }
  const q = collectAll();
  if (q.answers.sources.length === 0 || !q.answers.universes) {
    alert('Merci de répondre au questionnaire.');
    return null;
  }
  if (!requiredConsentsOK()) {
    alert('Merci d\'accepter le règlement et le traitement des données.');
    return null;
  }
  return { firstname, lastname, phone, city, zipcode, answers: q.answers, answersText: q.answersText };
}

// ---------- Soumission (parcours instantané) ----------
async function submit() {
  if (submitting) return;
  const payload = validateClient();
  if (!payload) return;

  submitting = true;
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Tirage en cours…';

  const c = consentEls();
  payload.consents = {
    rulesAccepted: c.rules.checked,
    privacyAccepted: c.privacy.checked,
    marketingAccepted: c.marketing.checked,
    partnersAccepted: c.partners.checked
  };
  payload.consentVersions = { ...CONSENT_VERSIONS };

  try {
    const res = await participate(payload);
    showResult(res);
  } catch (e) {
    console.error(e);
    const msg =
      e.code === 'ALREADY_PARTICIPATED' ? 'Une participation existe déjà avec ce numéro de téléphone.'
      : e.code === 'CONSENT_REQUIRED' ? 'Les consentements obligatoires sont requis.'
      : 'Une erreur est survenue. Merci de réessayer.';
    alert(msg);
  } finally {
    submitting = false;
    btn.textContent = 'Tenter ma chance';
    refreshSubmit();
  }
}

// ---------- Écran résultat ----------
function showResult(res) {
  document.getElementById('step-form').classList.add('hidden');
  const step = document.getElementById('step-result');
  step.classList.remove('hidden');

  const isBig = res.prize.source === 'pyramid';
  document.getElementById('result-emoji').textContent = isBig ? '🎁' : '🎟️';
  document.getElementById('result-title').textContent = isBig ? 'Félicitations !' : 'Vous avez gagné';
  document.getElementById('result-subtitle').textContent = isBig ? 'Vous remportez' : 'Votre remise';
  document.getElementById('result-header-emoji').textContent = isBig ? '🎉' : '🎟️';
  document.getElementById('result-header-title').textContent = isBig ? 'Gagnant !' : 'Une remise !';
  document.getElementById('result-lot').textContent = res.prize.name;
  document.getElementById('result-lot-detail').textContent = res.prize.detail || '';
  document.getElementById('confirm-num').textContent = res.participantNum;
  document.getElementById('result-code').textContent = res.claimCode;
}

function resetToForm() {
  document.getElementById('step-result').classList.add('hidden');
  document.getElementById('step-form').classList.remove('hidden');
}

function init() {
  renderQuestions();
  wireConsents();
  refreshSubmit();

  document.getElementById('submit-btn').addEventListener('click', submit);
  document.getElementById('retour-btn').addEventListener('click', resetToForm);
  document.getElementById('rules-link').addEventListener('click', e => { e.preventDefault(); showRules(); });
  document.getElementById('privacy-link').addEventListener('click', e => { e.preventDefault(); showPrivacy(); });
}

init();

