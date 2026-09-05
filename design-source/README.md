# TrueHomeQuote — redesign export (2026-09-05)

Drop-in replacements for the repo root. `app.js` is byte-identical to the current version
(all element IDs it touches are preserved in the new markup) — no funnel logic changed.

| File | Change |
|---|---|
| index.html | New landing + funnel card markup. Same IDs/classes app.js binds to. |
| styles.css | Full rebuild: brand palette, Bricolage Grotesque + Plus Jakarta Sans, mobile-first, reduced-motion support. |
| thank-you.html | Restyled estimate reveal. Same sessionStorage read + dataLayer push. |
| app.js | Unchanged. |
| privacy.html / terms.html | Body copy untouched; inline styles rebranded to the new palette + type. |
| consent.txt, netlify.toml, PLAN.md, .gitignore | Copied through unchanged. |
| design-source/ | The two live design files (site + brand kit) used to produce this build. Not deployed. |
| favicon.svg | True Mark, 64px-safe. Referenced from both pages. |
| logo.svg | Horizontal lockup for ads, email, invoices. |
| ads.html | Google Ads display set (300x250, 336x280, 160x600, 728x90, 320x50, 1200x628) at real pixel size; noindex. Screenshot each artboard to export upload-ready files. |

Cache-busting query strings bumped to `v=20260905c`.

## Copy notes
- Pro-facing copy says "Direct homeowner leads in your zip codes. Pay per lead, no contract."
  Do NOT claim exclusivity until PLAN item 24 (direct-buyer zip routing) ships.
- TCPA consent sentence is unchanged except the button name now reads "Get my quotes";
  app.js records the rendered consent text verbatim, so CONSENT_VERSION should be bumped
  to `tcpa-2026-09-05b` when this goes live.
