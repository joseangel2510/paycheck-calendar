# PaydayCal — Paycheck Calendar & 3-Paycheck Month Finder

Enter your last payday and pay frequency; instantly see your personal payday calendar with 3-paycheck months highlighted, calendar (ICS) export, a printable version, and a shareable result card. US federal-holiday aware (paydays shift to the previous business day — including the sneaky Jan 1 → Dec 31 case that moves your bonus month).

**Live:** _(deploy pending — Vercel)_

## Stack

- [Astro 5](https://astro.build) static output — 35 pages, zero client JS except one ~4 kB (gzip) island
- Pure-TypeScript date engine (`src/lib/payday.ts`) with 21 Vitest ground-truth tests
- Plain CSS design system (`src/styles/global.css`) — no UI framework
- Playwright end-to-end suite (29 checks) against the production build

## Develop

```bash
npm install
npm run dev       # localhost:4321
npm run test      # vitest unit tests
npm run build     # static build to dist/
npm run preview   # serve dist/
```

## Monetization plumbing

Ad slots and the AdSense loader are gated behind `ADSENSE_CLIENT_ID` in `src/config.ts` (empty until approval). `public/ads.txt` is a placeholder. The production domain lives in `SITE_URL` in the same file.

## Docs

- Spec: `docs/specs/2026-07-03-paycheck-calendar-design.md`
- Implementation plan: `docs/plans/2026-07-03-paycheck-calendar.md`
- Launch runbook (Spanish): `docs/LANZAMIENTO.md`
