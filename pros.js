/* TrueHomeQuote — For Pros lead-buyer inquiry form (pros.html). Vanilla JS, no dependencies. */
'use strict';

/* ==================== CONFIG ==================== */
// Second n8n webhook, separate from the homeowner funnel's WEBHOOK_URL in app.js.
// Leave empty to log the payload to the console instead of POSTing.
const PROS_WEBHOOK_URL = 'https://n8n.dv8solutions.com/webhook/thq-pro-inquiry-3c6f950b'; // n8n 'THQ - Pro Inquiry' (nTc3JyBuTg6qiMDo)
const PROS_FORM_VERSION = 'pros-v1';
const PROS_REQUEST_TIMEOUT_MS = 8000;

const $ = (id) => document.getElementById(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? d : null;
}
function formatPhone(d) { return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); }
function parseZips(raw) {
  const seen = {};
  return (String(raw || '').match(/\b\d{5}\b/g) || []).filter((z) => (seen[z] ? false : (seen[z] = true)));
}

function setError(id, msg) {
  const el = $(id);
  const err = $(id + '-error');
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
}

function validate() {
  let firstBad = null;
  const check = (id, valid, msg) => { setError(id, valid ? '' : msg); if (!valid) firstBad = firstBad || $(id); };
  check('company', $('company').value.trim().length > 0, 'Enter your company name.');
  check('contact', $('contact').value.trim().length > 0, 'Enter a contact name.');
  check('pro-email', EMAIL_RE.test($('pro-email').value.trim()), 'Enter a valid email address.');
  check('pro-phone', !!normalizePhone($('pro-phone').value), 'Enter a valid 10-digit US phone number.');
  check('service', $('service').value !== '', 'Choose a service type.');
  check('zips', parseZips($('zips').value).length > 0, 'Enter at least one 5-digit ZIP code.');
  if (firstBad) { firstBad.focus(); return false; }
  return true;
}

function buildPayload() {
  const digits = normalizePhone($('pro-phone').value);
  const params = new URLSearchParams(location.search);
  return {
    source: 'truehomequote.com/pros',
    form_version: PROS_FORM_VERSION,
    company_name: $('company').value.trim(),
    contact_name: $('contact').value.trim(),
    email: $('pro-email').value.trim(),
    phone: digits ? '+1' + digits : $('pro-phone').value.trim(),
    phone_display: digits ? formatPhone(digits) : $('pro-phone').value.trim(),
    service_type: $('service').value,
    zips: parseZips($('zips').value),
    zips_raw: $('zips').value.trim(),
    page_url: location.href,
    referrer: document.referrer,
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    user_agent: navigator.userAgent,
    client_timestamp: new Date().toISOString(),
    client_timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
  };
}

async function send(payload) {
  if (!PROS_WEBHOOK_URL) {
    console.warn('[TrueHomeQuote] PROS_WEBHOOK_URL is empty; inquiry not sent.', payload);
    return { sent: false, reason: 'no_webhook' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROS_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(PROS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal,
    });
    return { sent: res.ok, status: res.status };
  } catch (err) {
    console.error('[TrueHomeQuote] pros POST failed', err);
    return { sent: false, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function init() {
  const form = $('pros-form');
  if (!form) return;
  let submitting = false;

  ['company', 'contact', 'pro-email', 'pro-phone', 'service', 'zips'].forEach((id) => {
    $(id).addEventListener('input', () => setError(id, ''));
  });
  $('pro-phone').addEventListener('blur', () => {
    const d = normalizePhone($('pro-phone').value);
    if (d) $('pro-phone').value = formatPhone(d);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    // Honeypot: real users never see or fill this field.
    if ($('website').value) { $('pros-form-wrap').classList.add('hidden'); $('pros-done').classList.remove('hidden'); return; }
    if (!validate()) return;
    submitting = true;
    const btn = $('pros-submit');
    const status = $('pros-status');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    status.textContent = '';
    status.classList.remove('err');
    try {
      const result = await send(buildPayload());
      if (result.sent || result.reason === 'no_webhook') {
        $('pros-form-wrap').classList.add('hidden');
        $('pros-done').classList.remove('hidden');
        $('pros-done').scrollIntoView({ block: 'center' });
        return;
      }
      status.textContent = "Something went wrong. Email us at hello@truehomequote.com and we'll set you up.";
      status.classList.add('err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Request my ZIP codes';
      submitting = false;
    }
  });
}
init();
