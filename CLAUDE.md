# PaydayCal — paycheck-calendar

Static Astro 5 site: a US worker enters their last payday + pay frequency and instantly sees their payday calendar with 3-paycheck months highlighted. Monetized with Google AdSense. Site #1 of a 3-site portfolio (see `../CLAUDE.md` at the portfolio root).

## Commands

- `npm run dev` — dev server (localhost:4321)
- `npm run test` — Vitest unit tests (date engine, ICS)
- `npm run build` — static build to `dist/`
- `npm run preview` — serve the build

## Hard rules

- Site language: English (US). No backend, no external API calls, no analytics.
- Date math: local Y/M/D integers only (`Ymd {y,m,d}`, month 1-12). Never `new Date('YYYY-MM-DD')` (parses as UTC → off-by-one). Never UTC methods for calendar logic. Epoch-day helpers in `src/lib/payday.ts` are the only allowed date arithmetic.
- Payday conventions (documented on site, don't change silently): weekend/federal-holiday paydays shift to the PREVIOUS business day; months and "paychecks remaining" count by the shifted (actual) date; 27-pay-period detection counts SCHEDULED dates in the calendar year.
- AdSense: everything gated behind `ADSENSE_CLIENT_ID` in `src/config.ts` (empty until approval). `public/ads.txt` is a placeholder until then.
- `SITE_URL` in `src/config.ts` is the single source for the domain (also feeds astro.config + sitemap + canonicals).
- Every page: unique title ≤ 60 chars, meta description ≤ 155 chars, canonical, OG tags, JSON-LD where the layout supports it.

## Where things live

- Spec: `docs/specs/2026-07-03-paycheck-calendar-design.md`
- Implementation plan: `docs/plans/2026-07-03-paycheck-calendar.md`
- Launch guide (Vercel/domain/AdSense/promotion, in Spanish for the owner): `docs/LANZAMIENTO.md`
- Date engine (pure, tested): `src/lib/payday.ts` · ICS: `src/lib/ics.ts`
- Interactive island: `src/scripts/tool.ts` + `src/components/Tool.astro` (DOM contract documented in the plan, used by Playwright checks)
- Programmatic pages import the engine at build time — `src/lib/scenarios.ts` is the bridge; never hand-write payday dates in content.
