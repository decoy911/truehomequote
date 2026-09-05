# Lead-Gen Site — Master Plan

Owner: DV8 Solutions LLC
Site name: (fill in)
Domain: (fill in)
Build environment: Claude Code over SSH on DO droplet → GitHub → Netlify
Backend: n8n + NocoDB on droplet
Verticals: Pool (first), HVAC (second), Solar (third)

Rule: work top to bottom. Mark `[x]` when done. Next unchecked item is the next step.

## Phase 1 — Foundation
- [ ] 1. Pick site name, buy .com
- [ ] 2. (Optional) File Arizona trade name under DV8 Solutions LLC
- [ ] 3. Create GitHub repo; create Netlify site linked to repo; point domain at Netlify
- [ ] 4. Write Privacy Policy, Terms, and TCPA consent sentence for the form

## Phase 2 — Build (Claude Code)
- [ ] 5. Button-flow funnel: service → job type → qualifier → budget → own/rent → zip → contact form (mobile first)
- [ ] 6. Thank-you page showing the homeowner's price range
- [ ] 7. "For Pros" page (exclusive leads, Stripe link) + 3–5 cost info pages per vertical
- [ ] 8. NocoDB Leads table: all funnel fields + source, campaign, consent text, timestamp, IP, network, status, payout
- [ ] 9. n8n workflow: webhook → NocoDB write → confirmation email to homeowner
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
