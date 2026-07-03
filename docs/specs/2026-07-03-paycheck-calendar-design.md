# Design: Paycheck Calendar — 3-Paycheck Month Finder

**Date:** 2026-07-03
**Status:** Approved (user chose this as site #1 of a 3-site AdSense portfolio)
**Goal:** English-language, US-audience static micro-tool site monetized with Google AdSense. Deploy: GitHub repo → Vercel → custom domain.

## The product in one sentence

The user enters their last payday and pay frequency; the site instantly shows their personal full-year payday calendar with their 3-paycheck months highlighted, plus calendar export (ICS), a printable version, and a shareable result card.

## Why this idea (evidence summary)

- Mass-media republish "three paycheck month" articles every qualifying month (CNBC ran one for July 2026 this month) — proven recurring search demand.
- Tool-intent SERP is held by 3–4 weak new sites (best incumbent next-payday.com lacks ICS export and printables; threepaycheckmonths.com is an unindexable SPA) — proven that zero-authority domains rank here.
- Personal-finance audience (US biweekly wage earners planning a surplus check) = high-RPM AdSense category, zero policy risk (pure date math).
- Fully client-side: free Vercel hosting, no maintenance risk.
- Differentiators no incumbent has: ICS export, designed printable, shareable result card, 27-pay-period detection (live 2026 hook), programmatic month/year pages kept fresh year-round.

## Brand

- Working name: **PaydayCal** — short, brandable; H1 carries the SEO keywords ("Paycheck Calendar Generator — Find Your 3-Paycheck Months").
- Domain candidates (checked at purchase time, in order of preference): `paydaycal.com`, `mypaycheckcalendar.com`, `threepaycheckfinder.com`. Site is built domain-agnostic (single `SITE_URL` constant).
- Tone: friendly, plain-English personal finance. Visual: clean fintech — money-green primary, warm accent, big numbers, the year calendar grid as the hero visual. Mobile-first. No heavy frameworks or fonts.

## Architecture

- **Astro 5** static site (file-based routing, component templates for the ~30 programmatic pages, generates pure HTML), **vanilla TypeScript** for the tool logic, **plain modern CSS** (design tokens in `:root`). Zero client-side JS except the tool module itself.
- Repo: own GitHub repo (`paycheck-calendar`) under account joseangel2510 — one repo per portfolio site (user requirement).
- Hosting: Vercel static output. No backend, no APIs, no database, no analytics in v1.

### Units and boundaries

1. **`src/lib/payday.ts`** — pure date math, zero DOM. Input: `{ lastPayday: Date, frequency: 'weekly'|'biweekly'|'semimonthly'|'monthly', year }`. Output: paydays per month, extra-paycheck months (3 for biweekly, 5 for weekly), paychecks remaining, 26-vs-27 period detection, next-extra-month countdown. Handles weekend/holiday shift (US federal holidays → previous business day, the standard convention). Unit-testable in isolation (Vitest).
2. **`src/lib/ics.ts`** — pure function: paydays → RFC 5545 `.ics` string (client Blob download).
3. **`src/components/Tool.astro`** + **`src/scripts/tool.ts`** — the interactive widget: form, year calendar grid render, result banner, ICS/print/share-card buttons. Share card drawn on `<canvas>` → PNG download.
4. **Content layouts** — `Base.astro` (head/meta/schema/nav/footer/ad slots), `Article.astro` (guides), month/year page templates fed by `src/data/*.ts` generated content data.

### Pages (URLs)

| URL | Purpose |
|---|---|
| `/` | Tool above the fold + full explainer + FAQ (FAQPage schema) |
| `/3-paycheck-months-2026/`, `/3-paycheck-months-2027/` | Year pages: both standard Friday scenarios, all qualifying months, CTA to tool |
| `/months/{month}-{year}/` × 24 | "Is {Month} {Year} a 3-paycheck month?" programmatic pages (2026–2027) |
| `/27-pay-periods-2026/` | Employee-facing "will my paycheck shrink?" guide (2026 hook) |
| `/what-to-do-with-your-extra-paycheck/` | Money guide (high-RPM supporting content) |
| `/biweekly-vs-semimonthly-pay/` | Explainer guide |
| `/about/`, `/contact/`, `/privacy-policy/`, `/terms/` | AdSense-required trust pages |
| `robots.txt`, `sitemap.xml`, `ads.txt`, favicons, OG image | Technical SEO |

### SEO & monetization plumbing

- Per-page title/meta/canonical/OG/Twitter; JSON-LD: `WebApplication` (tool), `FAQPage` (home FAQ), `Article` (guides), `BreadcrumbList`.
- Internal linking: month pages ↔ year pages ↔ tool ↔ guides.
- Ad slots reserved in layout (below tool result, mid-article, end-of-article) behind a single `ADSENSE_CLIENT_ID` constant — empty/commented until AdSense approval; `ads.txt` placeholder committed.

### Error handling

- Tool validates input (future dates > 1 year out rejected with friendly message; semimonthly/monthly get an explainer that fixed schedules have no extra months — with calendar still rendered).
- All date math in local time with explicit Y/M/D integers (no UTC drift bugs).
- No network calls → no network failure modes.

## Testing / verification

- **Vitest** unit tests on `payday.ts`: known scenarios — biweekly Friday anchored Jan 2 2026 → extra months Jan & Jul 2026; Jan 9 2026 → May & Oct 2026; weekly → 5-payday months; 27-period year detection; holiday-shift cases; semimonthly returns none.
- **Playwright** (webapp-testing skill) against `astro dev`: fill form → assert highlighted months, download ICS and validate contents, print CSS smoke check.
- `astro build` clean; sitemap contains all pages; Lighthouse ≥ 95 Performance/SEO/Accessibility on home.

## Out of scope (v1)

Analytics, dark mode, non-US holiday calendars, UK/CA/AU localization, blog beyond the 3 guides, email capture. Candidates for v1.1 based on traffic.

## Portfolio roadmap (after this site is 100%)

Site #2: Mortgage Recast Calculator (own repo). Site #3: Wage Garnishment Calculator (own repo). Research for both preserved in workflow `wf_feec14a7-2ca` journal and session memory.
