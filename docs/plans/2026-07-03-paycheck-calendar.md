# Paycheck Calendar Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship PaydayCal — a static Astro site where a US worker enters their last payday + pay frequency and instantly sees their personal payday calendar with 3-paycheck months highlighted, with ICS export, printable view, and share card; SEO content pages; AdSense-ready plumbing; own GitHub repo.

**Architecture:** Astro 5 static site. All logic in pure TypeScript modules (`src/lib/`) with Vitest tests; one interactive island (`tool.ts`) hydrates the calculator; every other page is pure HTML. Programmatic month/year pages import the same date engine at build time (single source of truth).

**Tech Stack:** Astro 5, TypeScript, Vitest, plain CSS (design tokens), @astrojs/sitemap. No UI framework, no runtime deps.

## Global Constraints

- Site language: **English (US)**. Repo/docs comments: English.
- 100% client-side — no backend, no fetch to external APIs, no analytics (v1).
- Brand: **PaydayCal**. Site URL constant `SITE_URL = "https://paydaycal.com"` (single place to change after domain purchase).
- AdSense: all ad slots render ONLY when `ADSENSE_CLIENT_ID` constant is non-empty; committed value is `""`.
- Every page: unique title ≤ 60 chars, meta description ≤ 155 chars, canonical, OG/Twitter tags.
- Date math: local-time Y/M/D integers only — never `new Date(string)` with ISO strings (UTC drift), never UTC methods.
- Convention: paydays landing on weekend/US federal holiday shift to the **previous business day**; months/paychecks-remaining count by the **shifted (actual)** date; the 27-pay-period detection counts **scheduled** dates in the calendar year (payroll convention).
- Commits: conventional commits, frequent, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
paycheck-calendar/
├── CLAUDE.md                     # repo guide for future sessions
├── astro.config.mjs              # site URL, sitemap integration
├── package.json / tsconfig.json / vitest.config.ts
├── public/
│   ├── robots.txt  ├── ads.txt  ├── favicon.svg  └── og.png
├── docs/specs/… docs/plans/…     # (already exist)
├── src/
│   ├── config.ts                 # SITE_URL, SITE_NAME, ADSENSE_CLIENT_ID
│   ├── lib/payday.ts             # date engine (pure)
│   ├── lib/ics.ts                # ICS generator (pure)
│   ├── styles/global.css         # tokens + base + print styles
│   ├── layouts/Base.astro        # head/meta/JSON-LD slots/nav/footer/AdSlot
│   ├── layouts/Article.astro     # guide layout (breadcrumbs, Article schema)
│   ├── components/Tool.astro     # calculator markup (server-rendered shell)
│   ├── components/AdSlot.astro   # gated ad placeholder
│   ├── components/FaqBlock.astro # FAQ + FAQPage JSON-LD
│   ├── scripts/tool.ts           # client island: form → render results
│   └── pages/
│       ├── index.astro
│       ├── 3-paycheck-months-2026.astro   (and -2027)
│       ├── months/[slug].astro            # 24 static paths
│       ├── 27-pay-periods-2026.astro
│       ├── what-to-do-with-your-extra-paycheck.astro
│       ├── biweekly-vs-semimonthly-pay.astro
│       ├── about.astro  contact.astro  privacy-policy.astro  terms.astro
│       └── 404.astro
└── tests/payday.test.ts  tests/ics.test.ts
```

---

### Task 1: Scaffold + repo

**Files:** Create `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/config.ts`, `.gitignore`, `CLAUDE.md`

- [ ] **Step 1:** `cd "d:\Claude code\Monetizar Web\paycheck-calendar"` → `npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict` (or hand-write the 4 config files if the wizard fights the non-empty dir), then `npm i` + `npm i -D vitest @astrojs/sitemap`.
- [ ] **Step 2:** `astro.config.mjs`: `site` from config, `integrations: [sitemap()]`, `trailingSlash: 'always'`, `build: { format: 'directory' }`.
- [ ] **Step 3:** `src/config.ts`:

```ts
export const SITE_URL = 'https://paydaycal.com';
export const SITE_NAME = 'PaydayCal';
export const ADSENSE_CLIENT_ID = ''; // e.g. 'ca-pub-XXXXXXXXXXXXXXXX' after approval
```

- [ ] **Step 4:** `CLAUDE.md` (repo): what the site is, `npm run dev|build|test`, the Global Constraints above, pointer to spec/plan.
- [ ] **Step 5:** `git init` + initial commit `chore: scaffold astro site`.

### Task 2: Date engine `src/lib/payday.ts` (TDD)

**Files:** Create `src/lib/payday.ts`, `tests/payday.test.ts`

**Interfaces (Produces):**

```ts
export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type SemiDays = 'first-fifteenth' | 'fifteenth-last';
export interface Options { anchor: Ymd; frequency: Frequency; semiDays?: SemiDays }
export interface Ymd { y: number; m: number; d: number }           // m: 1-12
export interface MonthResult { y: number; m: number; paydays: Ymd[]; isExtra: boolean }
export interface YearResult {
  year: number; months: MonthResult[]; totalPaychecks: number;
  extraMonths: number[];            // 1-12, actual-date based
  scheduledCount: number;           // scheduled dates in year
  isLongYear: boolean;              // 27 biweekly / 53 weekly (scheduled)
  paychecksRemaining: number;       // actual paydays >= today
  nextExtra: { y: number; m: number } | null; // searches +18 months
}
export function computeYear(opts: Options, year: number, today: Ymd): YearResult
export function usFederalHolidays(year: number): Set<string>       // 'YYYY-MM-DD'
export function shiftToBusinessDay(d: Ymd): Ymd
```

- [ ] **Step 1: failing tests** — the ground-truth scenarios (verified by hand):

```ts
import { describe, it, expect } from 'vitest';
import { computeYear, usFederalHolidays, shiftToBusinessDay } from '../src/lib/payday';
const T = { y: 2026, m: 7, d: 3 }; // fixed "today" for determinism

it('biweekly Fri Jan 2 2026 → extra months Jan & Jul', () => {
  const r = computeYear({ anchor: { y: 2026, m: 1, d: 2 }, frequency: 'biweekly' }, 2026, T);
  expect(r.extraMonths).toEqual([1, 7]);
  expect(r.totalPaychecks).toBe(26);
  expect(r.isLongYear).toBe(false);
});
it('biweekly Fri Jan 9 2026 → extra months May & Oct', () => {
  const r = computeYear({ anchor: { y: 2026, m: 1, d: 9 }, frequency: 'biweekly' }, 2026, T);
  expect(r.extraMonths).toEqual([5, 10]);
});
it('holiday shift: scheduled Fri Jul 3 2026 (observed July 4th) pays Thu Jul 2', () => {
  expect(shiftToBusinessDay({ y: 2026, m: 7, d: 3 })).toEqual({ y: 2026, m: 7, d: 2 });
});
it('Christmas Fri Dec 25 2026 pays Thu Dec 24', () => {
  expect(shiftToBusinessDay({ y: 2026, m: 12, d: 25 })).toEqual({ y: 2026, m: 12, d: 24 });
});
it('27 scheduled biweekly paydays in 2027 for Jan 1 anchor', () => {
  const r = computeYear({ anchor: { y: 2027, m: 1, d: 1 }, frequency: 'biweekly' }, 2027, T);
  expect(r.scheduledCount).toBe(27);
  expect(r.isLongYear).toBe(true);
});
it('weekly → months with 5 paydays are extra', () => {
  const r = computeYear({ anchor: { y: 2026, m: 1, d: 2 }, frequency: 'weekly' }, 2026, T);
  expect(r.extraMonths.length).toBeGreaterThanOrEqual(4);
  expect(r.months[0].paydays.length).toBe(5); // Jan 2026 has 5 Fridays
});
it('semimonthly/monthly → never extra', () => {
  for (const frequency of ['semimonthly', 'monthly'] as const) {
    const r = computeYear({ anchor: { y: 2026, m: 6, d: 15 }, frequency }, 2026, T);
    expect(r.extraMonths).toEqual([]);
  }
});
it('paychecksRemaining counts actual paydays on/after today', () => {
  const r = computeYear({ anchor: { y: 2026, m: 1, d: 2 }, frequency: 'biweekly' }, 2026, T);
  expect(r.paychecksRemaining).toBe(13); // Jul 2 already paid (shifted before Jul 3)
});
it('nextExtra looks across year boundary', () => {
  const r = computeYear({ anchor: { y: 2026, m: 1, d: 2 }, frequency: 'biweekly' }, 2026, { y: 2026, m: 8, d: 1 });
  expect(r.nextExtra).toEqual({ y: 2027, m: 1 }); // Jan 2027: Fri 1(→Dec31'26? no—see impl note), 15, 29
});
```

  Implementation note for the last case: compute with actual dates; if the shifted New-Year payday lands in Dec 2026, January 2027 still has Jan 15+29 only (2) — then expected is the next actual 3-payday month; **derive the expected value by hand-walking the engine rules before finalizing the test, and document the walk in a comment.**
- [ ] **Step 2:** `npx vitest run` → all fail (module missing).
- [ ] **Step 3: implement** — helpers: `toDays(ymd)`/`fromDays(n)` via `Date.UTC` epoch-days (safe: only whole days), `dow(ymd)`, `nthWeekday(y,m,n,dow)`, `lastWeekday(y,m,dow)`, `observedFixed(y,m,d)` (Sat→Fri, Sun→Mon). Holidays: New Year, MLK, Presidents, Memorial, Juneteenth, July 4, Labor, Columbus, Veterans, Thanksgiving, Christmas. `generateScheduled(opts, from, to)`: weekly/biweekly = anchor ± k·(7|14) within range; semimonthly = the two pattern days per month (clamp last day); monthly = anchor day clamped. `computeYear`: scheduled over [Dec 1 prev-year, Jan 31 next-year buffer] → shift each → bucket actual into months of `year`; extra = count > (biweekly:2 | weekly:4); semimonthly/monthly never extra; `scheduledCount` = scheduled in year; `nextExtra`: walk months from `today`'s month forward 18 months across years.
- [ ] **Step 4:** `npx vitest run` → PASS. Fix the engine, never the ground truth.
- [ ] **Step 5:** Commit `feat: payday date engine`.

### Task 3: ICS generator (TDD)

**Files:** Create `src/lib/ics.ts`, `tests/ics.test.ts`

**Produces:** `buildIcs(paydays: Ymd[], calName: string): string` — RFC 5545, CRLF, all-day events (`DTSTART;VALUE=DATE`, exclusive `DTEND` next day), `UID:payday-YYYYMMDD@paydaycal`, `SUMMARY:💰 Payday`, deterministic `DTSTAMP` derived from first payday.

- [ ] **Step 1:** Tests: output starts `BEGIN:VCALENDAR`, contains one `BEGIN:VEVENT` per payday, `DTSTART;VALUE=DATE:20260102`, DTEND is +1 day, lines CRLF-joined, ends `END:VCALENDAR`.
- [ ] **Step 2:** Fail → implement → pass.
- [ ] **Step 3:** Commit `feat: ics export`.

### Task 4: Design system + Base layout

**Files:** Create `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/AdSlot.astro`

**REQUIRED SUB-SKILL at execution:** `frontend-design:frontend-design` (distinctive, non-generic UI). Direction (locked): warm paper background `#FAF7F2`, ink `#101826`, money-green primary `#0E7C4A`, gold accent `#F0B429` for the "extra" highlights; display font Fraunces (self-hosted woff2, weights 600/700) for headings, system-ui body; 16px radius cards, generous whitespace, soft single-direction shadows; the year-calendar grid is the visual hero. Print stylesheet: hide nav/footer/ads/buttons, calendar fits one page, black-on-white.

- [ ] **Step 1:** `global.css` — `:root` tokens, reset, typography scale, buttons, cards, calendar-grid classes, `@media print`.
- [ ] **Step 2:** `Base.astro` props: `{ title, description, path, schema?: object[] }` → canonical `SITE_URL + path`, OG/Twitter (og.png), skip-link, header (logo wordmark + nav: Tool · 2026 · 2027 · Guides), footer (About/Contact/Privacy/Terms + disclaimer line "PaydayCal provides general information, not financial advice."), JSON-LD `<script type="application/ld+json">` per schema prop, and AdSense `<script>` only when `ADSENSE_CLIENT_ID` set.
- [ ] **Step 3:** `AdSlot.astro`: renders `<ins class="adsbygoogle" …>` only if `ADSENSE_CLIENT_ID`; otherwise renders nothing (no empty boxes).
- [ ] **Step 4:** Commit `feat: design system and base layout`.

### Task 5: The Tool (island)

**Files:** Create `src/components/Tool.astro`, `src/scripts/tool.ts`; modify `src/pages/index.astro` (created here as shell)

**Consumes:** `computeYear`, `buildIcs`. **Produces:** `<pay-tool>` markup contract used by Playwright tests: `#payday-date`, `#frequency`, `#semi-days` (hidden unless semimonthly), `#results` (hidden until valid input), `.extra-banner`, `.stat-remaining`, `.stat-next`, `.stat-long-year`, `.cal-month` ×12 with `.is-extra` class, `.payday-dot` per payday, buttons `#btn-ics`, `#btn-print`, `#btn-card`, year tabs `#year-2026`, `#year-2027`.

- [ ] **Step 1:** `Tool.astro`: form (date input defaults empty, frequency select biweekly default, semi-days sub-select), results section with the contract classes above, `<script src="../scripts/tool.ts">`.
- [ ] **Step 2:** `tool.ts`: read inputs on `input`/`change` → `computeYear` for active year tab → render: banner ("Your 3-paycheck months in 2026: **January & July** 🎉" / weekly variant "5-paycheck months" / semimonthly-monthly explainer variant), stats (paychecks left, next extra month + day countdown, 27-period callout when `isLongYear`), 12 month cards with day-number dots on paydays and `.is-extra` highlight. Persist state in `location.hash` (`#d=2026-01-02&f=biweekly`) and restore on load (shareable/bookmarkable).
- [ ] **Step 3:** ICS button → `buildIcs(actual paydays of both years)` → Blob download `paydaycal-paydays.ics`. Print button → `window.print()`. Card button → 1080×1350 `<canvas>`: brand colors, "MY 3-PAYCHECK MONTHS", the two month names huge, `paydaycal.com` footer → PNG download (Pinterest/TikTok format).
- [ ] **Step 4:** Manual smoke via `npm run dev` + browser; then Commit `feat: interactive payday tool`.

### Task 6: Home page content

**Files:** Modify `src/pages/index.astro`; create `src/components/FaqBlock.astro`

- [ ] **Step 1:** H1 "Paycheck Calendar Generator — Find Your 3-Paycheck Months". Above fold: one-line promise + Tool. Below: sections "What is a 3-paycheck month?" (biweekly 26 checks vs 24 budget months), "How it works" (3 steps), "2026 quick answer" (both Friday scenarios table + link to year page), "What to do with your extra paycheck" teaser → guide.
- [ ] **Step 2:** `FaqBlock.astro` (props: `items: {q, a}[]`, emits FAQPage JSON-LD): 8 FAQs — which months 2026, why do I get 3, does everyone get the same months, semimonthly?, 27 pay periods 2026?, taxes on 3rd check?, holiday paydays?, is it really "extra" money?
- [ ] **Step 3:** Schema: `WebApplication` (name, url, applicationCategory FinanceApplication, offers price 0) + FAQPage. Title: "3 Paycheck Months Calculator 2026 & 2027 | PaydayCal". Commit `feat: home page`.

### Task 7: Year pages (2026 & 2027)

**Files:** Create `src/pages/3-paycheck-months-2026.astro`, `-2027.astro`, `src/lib/scenarios.ts`

- [ ] **Step 1:** `scenarios.ts`: for a year, compute both biweekly Friday families (anchor first Friday vs second Friday) via `computeYear` → `{ familyA: {anchors, extraMonths}, familyB: … }`. (Build-time reuse of the engine — no hand-maintained data.)
- [ ] **Step 2:** Page content: H1 "3 Paycheck Months in 2026 (Both Pay Schedules)", intro, table per family (months + payday dates), "not sure which you are? → tool" CTA, month-by-month list linking to `/months/…/`, FAQ (3 items), Article + BreadcrumbList schema. Same template for 2027 ("published before the news cycle" advantage).
- [ ] **Step 3:** Commit `feat: year pages`.

### Task 8: Programmatic month pages (×24)

**Files:** Create `src/pages/months/[slug].astro`

- [ ] **Step 1:** `getStaticPaths()`: months 2026-01…2027-12 → slug `january-2026`. For each, compute at build time: is it extra for family A / family B / neither; payday dates per family; that month's federal holidays affecting paydays.
- [ ] **Step 2:** Template: H1 "Is January 2026 a 3-Paycheck Month?", direct answer paragraph first (snippet-friendly: "Yes — if your paydays are on the Jan 2/16/30 schedule…"), per-family breakdown, holiday-shift notes, CTA to tool, prev/next month links, links to its year page. Article schema. ~350 words of generated-but-specific prose (varies by computed facts, not lorem).
- [ ] **Step 3:** Verify `astro build` emits 24 pages. Commit `feat: month pages`.

### Task 9: Guides (3 articles)

**Files:** Create the three guide pages + `src/layouts/Article.astro`

**Parallelizable:** content of the 3 guides can be drafted by parallel subagents given the outlines; final edit inline.

- [ ] **Step 1:** `Article.astro`: breadcrumbs, byline-free Article schema, TOC for h2s, mid-article `AdSlot`, end CTA to tool.
- [ ] **Step 2:** `/27-pay-periods-2026/` (~1200 words, employee-facing): what 27 periods means, will my paycheck shrink (1/26 vs 1/27 employer methods), who gets it in 2026 (anchor-dependent), salaried-vs-hourly, benefits/401k per-check effects, use the tool CTA. Target: "27 pay periods 2026", "will my paycheck be smaller 27 pay periods".
- [ ] **Step 3:** `/what-to-do-with-your-extra-paycheck/` (~1300 words, the RPM page): priority ladder — emergency fund, high-interest debt, HYSA, 401k/IRA bump, sinking funds, one guilt-free splurge %; concrete $ examples on a $2,000 net check. Target: "extra paycheck what to do", "3 paycheck month budget".
- [ ] **Step 4:** `/biweekly-vs-semimonthly-pay/` (~1000 words): comparison table (26 vs 24, amounts differ, extra months only biweekly), pros/cons, how to tell which you have. Target: "biweekly vs semimonthly".
- [ ] **Step 5:** Commit `feat: guides`.

### Task 10: Trust pages + technical SEO

**Files:** Create about/contact/privacy-policy/terms/404 pages, `public/robots.txt`, `public/ads.txt`, `public/favicon.svg`, `public/og.png`

- [ ] **Step 1:** About (who/why + methodology note "dates computed from federal holiday rules"), Contact (email `contact@paydaycal.com` placeholder + note to update post-domain), Privacy Policy (AdSense/cookies/GDPR-CCPA language — Google's required disclosures for publishers), Terms (+ not-financial-advice), 404 (links home).
- [ ] **Step 2:** `robots.txt` (allow all + sitemap URL), `ads.txt` (`# placeholder — add google.com, pub-XXXX line after AdSense approval`), favicon (calendar+$ glyph SVG), `og.png` 1200×630 generated via the share-card canvas aesthetic (script or hand export).
- [ ] **Step 3:** Commit `feat: trust pages and technical seo`.

### Task 11: End-to-end verification

**REQUIRED SUB-SKILLS:** `superpowers:verification-before-completion`, `webapp-testing` (Playwright)

- [ ] **Step 1:** `npx vitest run` all green; `npx astro build` clean; count emitted HTML files = 24 + 11 static + 404.
- [ ] **Step 2:** Playwright against preview: enter `2026-01-02` biweekly → assert banner contains "January" and "July", 12 `.cal-month`, 2 `.is-extra`; download ICS → file contains `DTSTART;VALUE=DATE:20260102`; switch year tab → 2027 renders; hash-restore works on reload; mobile viewport (390px) no horizontal scroll.
- [ ] **Step 3:** Lighthouse on `/` (preview build): Performance/SEO/A11y/Best-Practices ≥ 95; fix regressions.
- [ ] **Step 4:** Validate one page's JSON-LD (paste into validator or schema-dts check). Commit fixes.

### Task 12: GitHub

- [ ] **Step 1:** `gh repo create paycheck-calendar --public --source . --push` (account joseangel2510). Public = allows Vercel free import + looks legit.
- [ ] **Step 2:** Verify `gh repo view --web` URL exists; README.md with screenshot, live URL placeholder, stack, `npm run dev` (add before push).

### Task 13: Launch guide (user-facing, Spanish)

**Files:** Create `docs/LANZAMIENTO.md`

- [ ] **Step 1:** Paso a paso Vercel (import repo → framework Astro autodetectado → deploy), dominio (comprar en Porkbun/Namecheap ~$10, candidatos: paydaycal.com → conectar en Vercel → DNS), AdSense (crear cuenta con el dominio, pegar `ADSENSE_CLIENT_ID` en `src/config.ts`, completar `ads.txt`, activar consent EU en AdSense, esperar revisión 1–14 días, activar Auto ads), y plan de promoción concreto: subreddits (r/personalfinance no self-promo — usar r/budget, r/MiddleClassFinance con contexto útil), Pinterest (pins del printable/calendario), TikTok (formato "did you know you get 3 paychecks in October?"), fecha clave: contenido "2027" en octubre-noviembre 2026.

## Self-Review (done)

- Spec coverage: tool features (ICS/print/share/27-detection/holiday shift) → Tasks 2/3/5; pages inventory → Tasks 6–10; SEO/schema → 4/6/7/8/10; AdSense gating → 1/4/10/13; verification → 11; repo → 12. Roadmap sites #2/#3 intentionally out of scope.
- No placeholders beyond deliberate post-domain values (email, ads.txt) which are documented as such.
- Type consistency: `Ymd {y,m,d}` and `computeYear(opts, year, today)` used consistently across Tasks 2/3/5/7/8.
