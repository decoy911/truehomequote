# Lead-Gen Site — Master Plan

Owner: DV8 Solutions LLC
Site name: TrueHomeQuote
Domain: truehomequote.com
Build environment: Claude Code over SSH on DO droplet → GitHub → Netlify
Backend: n8n + NocoDB on droplet
Verticals: Pool (first), HVAC (second), Solar (third)

Rule: work top to bottom. Mark `[x]` when done. Next unchecked item is the next step.

## Phase 1 — Foundation
- [x] 1. Pick site name, buy .com
- [x] 2. (Optional) File Arizona trade name under DV8 Solutions LLC — skipped 2026-09-05
- [x] 3. Cloudflare DNS pointed at droplet, nginx block live
- [x] 4. Write Privacy Policy, Terms, and TCPA consent sentence for the form

## Phase 2 — Build (Claude Code)
- [x] 5. Button-flow funnel: service → job type → qualifier → budget → own/rent → zip → contact form (mobile first)
- [x] 6. Thank-you page showing the homeowner's price range
- [x] 7. "For Pros" page (exclusive leads, Stripe link) + 3–5 cost info pages per vertical — built 2026-09-05 without the exclusivity claim (see item 24) or a Stripe link; six cost guides (3 pool, 2 HVAC, 1 solar)
- [x] 8. NocoDB Leads table: all funnel fields + source, campaign, consent text, timestamp, IP, network, status, payout — done 2026-09-05 (base "TrueHomeQuote": Leads + ProInquiries)
- [x] 9. n8n workflow: webhook → NocoDB write → confirmation email to homeowner — done 2026-09-05 ("THQ - Lead Intake" + "THQ - Pro Inquiry", both active, end-to-end tested)
- [ ] 10. Deploy; test full flow on phone end to end

## Phase 3 — Buyers
- [ ] 11. Apply as affiliate/publisher: Networx, Modernize, + 1–2 smaller networks
- [ ] 12. Wire approved network's form/tracking link into funnel final step; send test lead; confirm in their dashboard

## Phase 4 — Paid traffic
- [ ] 13. Google Ads account; install Google tag; set "lead submitted" as conversion
- [ ] 14. Pool-only search campaign: exact/phrase keywords (pool repair cost, pool cleaning cost, pool resurfacing cost + city variants); negatives (jobs, DIY, free, supplies)
- [ ] 15. Ad copy matches funnel; ad clicks straight to funnel screen 1
- [ ] 16. Budget $15–20/day; run 2 weeks untouched
- [ ] 17. Compare cost per lead vs. network payout per lead. Positive → raise budget. Negative → fix funnel/keywords first.

## Phase 5 — Free traffic
- [ ] 18. Generate city pages (top 100 metros × 3 verticals) from data file with real regional cost ranges; submit sitemap in Search Console
- [ ] 19. Embeddable calculator widget; pitch to realtor, home-inspector, HOA sites for backlinks
- [ ] 20. Reddit/Facebook group answers with links; short screen-recorded videos on YouTube/TikTok

## Phase 6 — Scale
- [ ] 21. At 50+ leads/month: request network API access; move to n8n push (own every lead)
- [ ] 22. Add HVAC campaign, then Solar, each with its own cost-per-lead check
- [ ] 23. AdSense on thank-you and info pages only (never in funnel)
- [ ] 24. Route direct-buyer zips (from For Pros page) first, remainder to network

## Notes / decisions
- (Claude Code appends decisions, credentials locations, and gotchas here)
- 2026-09-05: Site is hosted on the DO droplet with nginx behind Cloudflare, not Netlify.
- 2026-09-05: Droplet public IP: 159.203.71.179. nginx server block: /etc/nginx/sites-available/truehomequote (symlinked into sites-enabled). Port 80 only, truehomequote.com + www. Logs: /var/log/nginx/truehomequote.{access,error}.log.
- 2026-09-05: nginx runs as www-data and /root is mode 700, so the repo is bind-mounted at /var/www/truehomequote (fstab entry + systemd mount unit) and nginx's root points there. Same directory as ~/truehomequote, edits are live. GOTCHA: deleting files under /var/www/truehomequote deletes them from the repo.
- 2026-09-05: nginx returns 404 for dotfiles (incl. .git), PLAN.md, netlify.toml, README.md so repo internals are never served.
- 2026-09-05: Cloudflare: A records for @ and www -> 159.203.71.179, proxied. SSL/TLS mode must be Flexible (origin is HTTP-only); Full (strict) will fail until a Cloudflare Origin CA cert is installed on the droplet. Enable Always Use HTTPS in Cloudflare. No certbot for this domain.
- 2026-09-05: Claude Design redesign applied. It was uploaded via GitHub into export/ and moved to the repo root (index.html, styles.css, thank-you.html, privacy.html, terms.html, favicon.svg, logo.svg, ads.html, design-source/). app.js is unchanged except CONSENT_VERSION → tcpa-2026-09-05b, because the submit button now reads "Get my quotes" and app.js records the rendered consent text verbatim. Asset version is now v=20260905c. netlify.toml removed. The export's README is at design-source/README.md (copy notes: do not claim lead exclusivity until item 24 ships).
- 2026-09-05: ads.html holds the Google Ads display-ad set for item 15 (300x250, 336x280, 160x600, 728x90, 320x50, 1200x628 at real pixel size; noindex). Screenshot each artboard to export upload-ready files. nginx returns 404 for /ads.html and /design-source/ so neither is publicly served.
- 2026-09-05: Item 7 shipped. /pros (pros.html + pros.js) has a lead-buyer inquiry form that POSTs JSON to PROS_WEBHOOK_URL in pros.js (empty for now; logs to console). Pricing table on /pros is a TBD placeholder, marked with an HTML comment. Copy deliberately does not claim exclusivity (item 24). Contact address on the page: hello@truehomequote.com.
- 2026-09-05: Cost guides live at /cost/ (index) + /cost/{pool-cleaning,pool-repair,pool-resurfacing,hvac-repair,ac-replacement,solar-panels}. Each has FAQPage JSON-LD, canonical to the extensionless URL, and a CTA to /?vertical={pool|hvac|solar}#quote. app.js reads ?vertical= on a fresh landing (no history state), pre-selects the trade, and opens on step 2. Solar and HVAC guides do not cite the federal 25D/25C credits (both ended for systems placed in service after 2025-12-31); they point to state/utility incentives instead.
- 2026-09-05: sitemap.xml + robots.txt added (thank-you, ads.html, design-source disallowed). nginx: absolute_redirect off, and /pros.html + /cost/*.html 301 to the clean URLs (via $request_uri so try_files' internal redirect does not loop). Asset version is now v=20260905d. "Cost Guides" link added to every footer.
- 2026-09-05: NocoDB base "TrueHomeQuote" (id ppzfavhdh87s4rl) with tables Leads (mx1hwk1b91fnbtm; 33 payload columns + ip, network, network_lead_id, status[new/sent/accepted/rejected/sold_direct], payout, rejection_reason, buyer, notes, created_at) and ProInquiries (m099wbwhkpp2mox; pros form fields + status[new/contacted/onboarded/declined], notes, ip, created_at). Row Id 1 in each table is the 2026-09-05 end-to-end test (status rejected/declined, safe to delete). GOTCHA: in this NocoDB build the v2 insert (POST /api/v2/tables/{id}/records) returns 422 ERR_INVALID_PK_VALUE even though the row is written (upstream nocodb#13284); the workflows insert through the v1 data endpoint (POST /api/v1/db/data/noco/{baseId}/{tableId}), which returns the row with its Id. v2 GET/PATCH/DELETE work fine.
- 2026-09-05: n8n "THQ - Lead Intake" (MAKPGV26l9ZOFMEb) POST https://n8n.dv8solutions.com/webhook/thq-lead-intake-b929d851 = WEBHOOK_URL in app.js. Webhook → Prepare Lead (IP from X-Real-IP/X-Forwarded-For) → Valid? (400 if no first name/email/phone/zip) → Create Lead Row (status=new) → Summarize → Respond 200 {ok, lead_id} (500 if the DB write failed) → Email Homeowner (estimate range + "up to 4 licensed pros will reach out shortly") → Email Coy (lead summary + homeowner-send status). "Post to network API" is a disabled placeholder for item 21. "THQ - Pro Inquiry" (nTc3JyBuTg6qiMDo) POST https://n8n.dv8solutions.com/webhook/thq-pro-inquiry-3c6f950b = PROS_WEBHOOK_URL in pros.js: Webhook → Prepare → Valid? → Create Inquiry Row → Respond → Email Coy. n8n answers the browser's CORS preflight itself. JSON copies: /home/coypeterman/thq-build/workflows/. Asset version v=20260905e.
- 2026-09-05: EMAIL SENDER LIMITATION. Graph refuses Send-As for hello@truehomequote.com from the SDR Outlook credential (ErrorSendAsDenied; truehomequote.com is not in the dv8solutions.com Microsoft 365 tenant, MX is Cloudflare Email Routing). Both workflows therefore send from coy.peterman@dv8solutions.com (Outlook ignores the "TrueHomeQuote" from-name override) with Reply-To hello@truehomequote.com. To send truly from hello@: add truehomequote.com to the M365 tenant, create hello@ as an alias or shared mailbox with Send As for Coy, add Outlook to the domain's SPF/DKIM, then change the from address in the two Graph nodes.
- 2026-09-05: n8n 2.x API gotcha: a Webhook node created via the public API must carry a webhookId (any uuid) or activation reports active=true but never registers the production URL (404 "not registered").
