/* TrueHomeQuote lead funnel. Vanilla JS, no dependencies.
   Screens: service -> job type -> qualifier -> budget -> own/rent -> zip -> contact -> thank-you */
'use strict';

/* ==================== CONFIG ==================== */
// n8n webhook that receives the lead as JSON (PLAN item 9).
// Leave empty to run the funnel without POSTing; the payload is logged to the console instead.
const WEBHOOK_URL = '';
const FORM_VERSION = 'funnel-v1';
const CONSENT_VERSION = 'tcpa-2026-09-05';
const REQUEST_TIMEOUT_MS = 8000;
const TOTAL_STEPS = 7;
const THANKS = TOTAL_STEPS + 1;
const STEP_IDS = { 1: 's-vertical', 2: 's-job', 3: 's-qual', 4: 's-budget', 5: 's-owner', 6: 's-zip', 7: 's-contact', 8: 's-thanks' };

/* ==================== FUNNEL DATA ==================== */
// jobs / qualifiers: [key, label] pairs in display order.
// budgets: keyed by job key. estimates: job key -> qualifier key -> [low, high, unit?].
const SOLAR_BUDGETS = ['$10,000–20,000', '$20,000–30,000', '$30,000+', 'Not sure'];
const SOLAR_ESTIMATES = {
  under100: [10000, 16000],
  '100to200': [15000, 24000],
  '200to300': [22000, 32000],
  over300: [30000, 45000],
};

const VERTICALS = {
  pool: {
    label: 'Pool',
    jobQuestion: 'What does your pool need?',
    jobs: [['cleaning', 'Cleaning'], ['repair', 'Repair'], ['resurfacing', 'Resurfacing']],
    qualifierQuestion: 'How big is your pool?',
    qualifiers: [['small', 'Small (under 10,000 gal)'], ['medium', 'Medium (10,000–20,000 gal)'], ['large', 'Large (20,000+ gal)']],
    budgets: {
      cleaning: ['$100–200/mo', '$200–300/mo', '$300+/mo', 'Not sure'],
      repair: ['$400–800', '$800–1,500', '$1,500–3,000', '$3,000+', 'Not sure'],
      resurfacing: ['$4,000–7,000', '$7,000–10,000', '$10,000–15,000', '$15,000+', 'Not sure'],
    },
    estimates: {
      cleaning: { small: [80, 150, '/mo'], medium: [100, 200, '/mo'], large: [150, 300, '/mo'] },
      repair: { small: [300, 1200], medium: [400, 1800], large: [500, 2500] },
      resurfacing: { small: [4000, 7000], medium: [6000, 10000], large: [9000, 15000] },
    },
    estimateNote: 'Typical range for this pool size. Condition and materials change the price.',
  },
  hvac: {
    label: 'HVAC',
    jobQuestion: 'What does your HVAC system need?',
    jobs: [['repair', 'Repair'], ['replace', 'Replace'], ['install', 'New install']],
    qualifierQuestion: 'How big is your home?',
    qualifiers: [['under1500', 'Under 1,500 sq ft'], ['1500to2500', '1,500–2,500 sq ft'], ['over2500', 'Over 2,500 sq ft']],
    budgets: {
      repair: ['$150–400', '$400–800', '$800–1,500', '$1,500+', 'Not sure'],
      replace: ['$4,000–7,000', '$7,000–10,000', '$10,000–15,000', '$15,000+', 'Not sure'],
      install: ['$6,000–10,000', '$10,000–15,000', '$15,000–25,000', '$25,000+', 'Not sure'],
    },
    estimates: {
      repair: { under1500: [150, 650], '1500to2500': [200, 800], over2500: [250, 1000] },
      replace: { under1500: [4500, 8000], '1500to2500': [6000, 11000], over2500: [8000, 15000] },
      install: { under1500: [7000, 12000], '1500to2500': [9000, 16000], over2500: [12000, 22000] },
    },
    estimateNote: 'Typical installed range for this home size. Equipment efficiency and ductwork change the price.',
  },
  solar: {
    label: 'Solar',
    jobQuestion: 'What are you looking for?',
    jobs: [['quotes', 'Get installer quotes'], ['estimate', 'Just an estimate']],
    qualifierQuestion: "What's your average monthly electric bill?",
    qualifiers: [['under100', 'Under $100'], ['100to200', '$100–200'], ['200to300', '$200–300'], ['over300', 'Over $300']],
    budgets: { quotes: SOLAR_BUDGETS, estimate: SOLAR_BUDGETS },
    estimates: { quotes: SOLAR_ESTIMATES, estimate: SOLAR_ESTIMATES },
    estimateNote: 'Typical installed cost before incentives, sized to your bill. Roof, equipment, and utility rates change the price.',
  },
};

/* ==================== STATE ==================== */
const EMPTY_STATE = {
  vertical: null, verticalLabel: '', jobType: null, jobTypeLabel: '', qualifier: null, qualifierLabel: '',
  budget: null, ownsHome: null, zip: '', firstName: '', lastName: '', email: '', phone: '',
};
let state = Object.assign({}, EMPTY_STATE);
let currentStep = 1;
let submitted = false;
let submitting = false;

const $ = (id) => document.getElementById(id);

function saveState() { try { sessionStorage.setItem('thq_state', JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
function restoreState() {
  try {
    const s = JSON.parse(sessionStorage.getItem('thq_state') || 'null');
    if (s && typeof s === 'object') state = Object.assign({}, EMPTY_STATE, s);
  } catch (e) { /* ignore */ }
}
function resetState() {
  state = Object.assign({}, EMPTY_STATE);
  submitted = false;
  try { sessionStorage.removeItem('thq_state'); } catch (e) { /* ignore */ }
}

// First step that still needs an answer. Used to clamp navigation so a screen never renders without its inputs.
function firstIncompleteStep() {
  const v = VERTICALS[state.vertical];
  if (!v) return 1;
  if (!v.jobs.some(([k]) => k === state.jobType)) return 2;
  if (!v.qualifiers.some(([k]) => k === state.qualifier)) return 3;
  if (!(v.budgets[state.jobType] || []).includes(state.budget)) return 4;
  if (state.ownsHome !== 'yes' && state.ownsHome !== 'no') return 5;
  if (!/^\d{5}$/.test(state.zip)) return 6;
  return 7;
}

/* ==================== ATTRIBUTION ==================== */
// Captured once on landing and kept in sessionStorage so UTMs survive in-session reloads.
function captureAttribution() {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  const params = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('thq_attr') || '{}') || {}; } catch (e) { saved = {}; }
  const out = {};
  keys.forEach((k) => { out[k] = params.get(k) || saved[k] || ''; });
  out.landing_url = saved.landing_url || location.href;
  out.referrer = typeof saved.referrer === 'string' ? saved.referrer : document.referrer;
  try { sessionStorage.setItem('thq_attr', JSON.stringify(out)); } catch (e) { /* ignore */ }
  return out;
}
const ATTRIBUTION = captureAttribution();

/* ==================== RENDERING ==================== */
function renderChoices(containerId, pairs, field, selected) {
  const c = $(containerId);
  c.innerHTML = '';
  pairs.forEach(([value, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (value === selected ? ' selected' : '');
    b.dataset.value = value;
    b.textContent = label;
    b.setAttribute('aria-pressed', value === selected ? 'true' : 'false');
    b.addEventListener('click', () => onChoice(field, value, label));
    c.appendChild(b);
  });
}

function budgetQuestion(list) {
  return list.some((b) => b.indexOf('/mo') !== -1) ? "What's your monthly budget?" : "What's your budget for this project?";
}

function prepareStep(step) {
  const v = VERTICALS[state.vertical];
  switch (step) {
    case 1:
      renderChoices('choices-vertical', Object.keys(VERTICALS).map((k) => [k, VERTICALS[k].label]), 'vertical', state.vertical);
      break;
    case 2:
      $('q-job').textContent = v.jobQuestion;
      renderChoices('choices-job', v.jobs, 'jobType', state.jobType);
      break;
    case 3:
      $('q-qual').textContent = v.qualifierQuestion;
      renderChoices('choices-qual', v.qualifiers, 'qualifier', state.qualifier);
      break;
    case 4: {
      const list = v.budgets[state.jobType];
      $('q-budget').textContent = budgetQuestion(list);
      renderChoices('choices-budget', list.map((b) => [b, b]), 'budget', state.budget);
      break;
    }
    case 5:
      renderChoices('choices-owner', [['yes', 'Yes'], ['no', 'No']], 'ownsHome', state.ownsHome);
      $('renter-note').classList.toggle('hidden', state.ownsHome !== 'no');
      break;
    case 6:
      $('zip').value = state.zip;
      clearError('zip');
      break;
    case 7:
      $('first-name').value = state.firstName;
      $('last-name').value = state.lastName;
      $('email').value = state.email;
      $('phone').value = state.phone;
      ['first-name', 'last-name', 'email', 'phone'].forEach(clearError);
      break;
    default:
      break;
  }
}

function render(step) {
  if (step > 1 && step <= TOTAL_STEPS) step = Math.min(step, firstIncompleteStep());
  currentStep = step;
  if (step !== THANKS) prepareStep(step);

  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const screen = $(STEP_IDS[step]);
  screen.classList.add('active');

  const isThanks = step === THANKS;
  $('progress-wrap').classList.toggle('hidden', isThanks);
  $('back-btn').classList.toggle('hidden', step === 1 || isThanks);
  if (!isThanks) {
    $('progress-bar').style.width = Math.round((step / TOTAL_STEPS) * 100) + '%';
    $('progress').setAttribute('aria-valuenow', String(step));
    $('step-label').textContent = 'Step ' + step + ' of ' + TOTAL_STEPS;
  }

  window.scrollTo(0, 0);
  const focusTarget = step === 6 ? $('zip') : step === 7 ? $('first-name') : screen.querySelector('h1');
  if (focusTarget) {
    if (focusTarget.tagName === 'H1') focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }
}

function goTo(step) {
  history.pushState({ step }, '');
  render(step);
}

function onChoice(field, value, label) {
  if (field === 'vertical' && state.vertical !== value) {
    state.jobType = null; state.jobTypeLabel = ''; state.qualifier = null; state.qualifierLabel = ''; state.budget = null;
  }
  if (field === 'jobType' && state.jobType !== value) state.budget = null;
  state[field] = value;
  if (field === 'vertical') state.verticalLabel = label;
  if (field === 'jobType') state.jobTypeLabel = label;
  if (field === 'qualifier') state.qualifierLabel = label;
  saveState();

  // Renters: flag it, explain, and let them continue explicitly.
  if (field === 'ownsHome' && value === 'no') {
    prepareStep(5);
    $('renter-continue').focus();
    return;
  }
  goTo(currentStep + 1);
}

/* ==================== VALIDATION ==================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(id, msg) {
  const input = $(id);
  const err = $(id + '-error');
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
}
function clearError(id) { setError(id, ''); }

// Returns the 10 national digits of a valid US (NANP) number, or null.
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? d : null;
}
function formatPhone(d) { return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); }

function validateContact() {
  let ok = true;
  let firstBad = null;
  const check = (id, valid, msg) => {
    setError(id, valid ? '' : msg);
    if (!valid) { ok = false; firstBad = firstBad || $(id); }
  };
  const fn = $('first-name').value.trim();
  const ln = $('last-name').value.trim();
  const em = $('email').value.trim();
  const ph = normalizePhone($('phone').value);
  check('first-name', fn.length > 0, 'Enter your first name.');
  check('last-name', ln.length > 0, 'Enter your last name.');
  check('email', EMAIL_RE.test(em), 'Enter a valid email address.');
  check('phone', !!ph, 'Enter a valid 10-digit US phone number.');
  if (!ok) { firstBad.focus(); return false; }
  state.firstName = fn; state.lastName = ln; state.email = em; state.phone = formatPhone(ph);
  saveState();
  return true;
}

/* ==================== ESTIMATE ==================== */
function getEstimate() {
  const v = VERTICALS[state.vertical];
  const byJob = v && v.estimates[state.jobType];
  const e = byJob && byJob[state.qualifier];
  if (!e) return null;
  return { low: e[0], high: e[1], unit: e[2] || '', note: v.estimateNote };
}
function money(n) { return '$' + n.toLocaleString('en-US'); }

function showThanks() {
  const v = VERTICALS[state.vertical];
  const est = getEstimate();
  $('thanks-title').textContent = 'Thanks' + (state.firstName ? ', ' + state.firstName : '') + "! Here's your estimate";
  $('estimate-for').textContent = v.label + ' · ' + state.jobTypeLabel + ' · ' + state.qualifierLabel;
  $('estimate-range').textContent = est ? money(est.low) + ' – ' + money(est.high) + est.unit : 'Estimate unavailable';
  $('estimate-note').textContent = est ? est.note : '';
  $('thanks-zip').textContent = state.zip;
  goTo(THANKS);
}

/* ==================== SUBMISSION ==================== */
function buildPayload() {
  const est = getEstimate();
  const digits = normalizePhone(state.phone);
  return {
    source: 'truehomequote.com',
    form_version: FORM_VERSION,
    // answers
    vertical: state.vertical,
    vertical_label: state.verticalLabel,
    job_type: state.jobType,
    job_type_label: state.jobTypeLabel,
    qualifier: state.qualifier,
    qualifier_label: state.qualifierLabel,
    budget: state.budget,
    owns_home: state.ownsHome === 'yes',
    zip: state.zip,
    first_name: state.firstName,
    last_name: state.lastName,
    email: state.email,
    phone: digits ? '+1' + digits : state.phone,
    phone_display: state.phone,
    // estimate shown on the thank-you screen
    estimate_low: est ? est.low : null,
    estimate_high: est ? est.high : null,
    estimate_unit: est ? est.unit : '',
    // attribution
    page_url: location.href,
    landing_url: ATTRIBUTION.landing_url,
    referrer: ATTRIBUTION.referrer,
    utm_source: ATTRIBUTION.utm_source,
    utm_medium: ATTRIBUTION.utm_medium,
    utm_campaign: ATTRIBUTION.utm_campaign,
    utm_term: ATTRIBUTION.utm_term,
    utm_content: ATTRIBUTION.utm_content,
    gclid: ATTRIBUTION.gclid,
    user_agent: navigator.userAgent,
    // consent, exactly as displayed (whitespace collapsed the way the browser renders it)
    consent_text: $('consent-text').textContent.replace(/\s+/g, ' ').trim(),
    consent_version: CONSENT_VERSION,
    client_timestamp: new Date().toISOString(),
    client_timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
  };
}

async function sendLead(payload) {
  if (!WEBHOOK_URL) {
    console.warn('[TrueHomeQuote] WEBHOOK_URL is empty; lead not sent.', payload);
    return { sent: false, reason: 'no_webhook' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal,
    });
    return { sent: res.ok, status: res.status };
  } catch (err) {
    console.error('[TrueHomeQuote] lead POST failed', err);
    return { sent: false, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// Google Ads / GTM hook (PLAN item 13). No PII goes into the dataLayer.
function pushDataLayer(payload, result) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'lead_submitted',
    vertical: payload.vertical,
    job_type: payload.job_type,
    qualifier: payload.qualifier,
    budget: payload.budget,
    owns_home: payload.owns_home,
    zip: payload.zip,
    lead_sent: !!result.sent,
  });
}

/* ==================== EVENTS ==================== */
function bindEvents() {
  $('back-btn').addEventListener('click', () => {
    if (history.state && history.state.step === currentStep && currentStep > 1) history.back();
    else goTo(Math.max(1, currentStep - 1));
  });

  window.addEventListener('popstate', (e) => {
    if (submitted) { resetState(); history.replaceState({ step: 1 }, ''); render(1); return; }
    const s = (e.state && Number(e.state.step)) || 1;
    render(s === THANKS ? 1 : s);
  });

  $('renter-continue').addEventListener('click', () => goTo(6));

  $('zip').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
    state.zip = e.target.value;
    saveState();
    clearError('zip');
  });
  $('zip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const z = $('zip').value.trim();
    if (!/^\d{5}$/.test(z)) { setError('zip', 'Enter a 5-digit ZIP code.'); $('zip').focus(); return; }
    state.zip = z;
    saveState();
    goTo(7);
  });

  [['first-name', 'firstName'], ['last-name', 'lastName'], ['email', 'email'], ['phone', 'phone']].forEach(([id, key]) => {
    $(id).addEventListener('input', () => { state[key] = $(id).value; saveState(); clearError(id); });
  });
  $('phone').addEventListener('blur', () => {
    const d = normalizePhone($('phone').value);
    if (d) { $('phone').value = formatPhone(d); state.phone = $('phone').value; saveState(); }
  });

  $('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting || !validateContact()) return;
    submitting = true;
    const btn = $('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const payload = buildPayload();
      const result = await sendLead(payload);
      pushDataLayer(payload, result);
      submitted = true;
      try { sessionStorage.removeItem('thq_state'); } catch (e2) { /* ignore */ }
      showThanks();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit';
      submitting = false;
    }
  });
}

/* ==================== INIT ==================== */
function init() {
  restoreState();
  const hs = history.state && Number(history.state.step);
  let step = 1;
  if (hs && hs >= 1 && hs <= TOTAL_STEPS) step = Math.min(hs, firstIncompleteStep());
  history.replaceState({ step }, '');
  bindEvents();
  render(step);
}
init();
