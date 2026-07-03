/**
 * Client island for the payday calculator. Reads the form, runs the pure
 * date engine, renders the year calendar, and powers ICS / print / share-card
 * actions. State round-trips through the URL hash so results are shareable.
 */
import {
  computeYear,
  toDays,
  type Frequency,
  type Options,
  type SemiDays,
  type YearResult,
  type Ymd,
} from '../lib/payday';
import { buildIcs } from '../lib/ics';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;

const dateInput = $('#payday-date') as unknown as HTMLInputElement;
const freqSelect = $('#frequency') as unknown as HTMLSelectElement;
const semiField = $('#semi-days-field');
const semiSelect = $('#semi-days') as unknown as HTMLSelectElement;
const hint = $('#tool-hint');
const results = $('#results');

function todayYmd(): Ymd {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

function parseYmd(value: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function fmtYmd({ y, m, d }: Ymd): string {
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}

function listMonths(months: number[], year: number): string {
  const names = months.map((m) => `<strong>${MONTHS[m - 1]}</strong>`);
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} ${year}`;
  return `${names.slice(0, -1).join(', ')} &amp; ${names[names.length - 1]} ${year}`;
}

let activeYear = todayYmd().y;

function currentOptions(): Options | null {
  const anchor = parseYmd(dateInput.value);
  if (!anchor) return null;
  const today = todayYmd();
  // Reject anchors more than ~13 months out — likely a typo.
  if (toDays(anchor) > toDays(today) + 396) return null;
  return {
    anchor,
    frequency: freqSelect.value as Frequency,
    semiDays: semiSelect.value as SemiDays,
  };
}

// --------------------------------------------------------------- rendering

function renderBanner(r: YearResult, opts: Options): void {
  const banner = $('.extra-banner');
  const note = $('.shift-note');
  note.textContent = '';

  if (opts.frequency === 'semimonthly' || opts.frequency === 'monthly') {
    banner.innerHTML =
      `On a fixed ${opts.frequency} schedule you get the same number of checks every month — ` +
      `so there are <strong>no extra-paycheck months</strong>. The calendar below still maps every payday for ${r.year}. ` +
      `Paid every two weeks instead? Switch the frequency above to find your bonus months.`;
    return;
  }

  const word = opts.frequency === 'weekly' ? '5-paycheck' : '3-paycheck';
  banner.innerHTML = r.extraMonths.length
    ? `🎉 Your ${word} months in ${r.year}: ${listMonths(r.extraMonths, r.year)}`
    : `No ${word} months land in ${r.year} on this schedule — check the surrounding years.`;

  // Explain paydays that slid into a different month (e.g. Jan 1 → Dec 31).
  const crossed = r.months
    .flatMap((mo) => mo.paydays)
    .filter((p) => p.shiftedFrom && p.shiftedFrom.m !== p.m);
  if (crossed.length) {
    const p = crossed[0];
    note.innerHTML =
      `💡 Heads up: your <strong>${fmtYmd(p.shiftedFrom!)}</strong> check arrives early on ` +
      `<strong>${fmtYmd(p)}</strong> (holiday adjustment) — that’s why ${MONTHS[p.m - 1]} gets the bonus check.`;
  }
}

function renderStats(r: YearResult): void {
  const today = todayYmd();
  $('.stat-remaining').textContent = String(r.paychecksRemaining);
  $('.stat-total').textContent = String(r.totalPaychecks);

  const nextEl = $('.stat-next');
  if (!r.nextExtra) {
    nextEl.textContent = '—';
  } else if (r.nextExtra.y === today.y && r.nextExtra.m === today.m) {
    nextEl.textContent = 'This month! 🎉';
  } else {
    const days = toDays({ y: r.nextExtra.y, m: r.nextExtra.m, d: 1 }) - toDays(today);
    nextEl.textContent = `${MONTHS[r.nextExtra.m - 1]} ${r.nextExtra.y} · in ${days} days`;
  }

  const row = $('.stat-long-year-row');
  row.hidden = !r.isLongYear;
  $('.stat-long-year').textContent = r.isLongYear
    ? `${r.scheduledCount} pay periods this year (a rare “extra period” year)`
    : '';
}

function renderCalendar(r: YearResult): void {
  const grid = $('.cal-grid');
  grid.innerHTML = '';
  for (const mo of r.months) {
    const payByDay = new Map(mo.paydays.map((p) => [p.d, p]));
    const first = new Date(mo.y, mo.m - 1, 1);
    const startDow = first.getDay();
    const daysCount = new Date(mo.y, mo.m, 0).getDate();

    const card = document.createElement('article');
    card.className = 'cal-month' + (mo.isExtra ? ' is-extra' : '');

    let cells = DOW.map((d) => `<span class="dow" aria-hidden="true">${d}</span>`).join('');
    cells += '<span></span>'.repeat(startDow);
    for (let d = 1; d <= daysCount; d++) {
      const p = payByDay.get(d);
      if (!p) {
        cells += `<span>${d}</span>`;
      } else {
        const shifted = p.shiftedFrom ? ' shifted' : '';
        const title = p.shiftedFrom ? ` title="Moved up from ${fmtYmd(p.shiftedFrom)}"` : '';
        cells += `<span class="payday-dot${shifted}"${title}>${d}</span>`;
      }
    }

    card.innerHTML =
      `<h3>${MONTHS[mo.m - 1]}${mo.isExtra ? ' <span class="stamp">★ extra check</span>' : ''}</h3>` +
      `<div class="cal-days">${cells}</div>` +
      `<p class="cal-count">${mo.paydays.length} payday${mo.paydays.length === 1 ? '' : 's'}</p>`;
    grid.appendChild(card);
  }
}

function renderYearTabs(): void {
  const tabs = $('.year-tabs');
  const base = todayYmd().y;
  tabs.innerHTML = '';
  for (const y of [base, base + 1]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `year-${y}`;
    b.className = 'year-tab' + (y === activeYear ? ' is-active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(y === activeYear));
    b.textContent = String(y);
    b.addEventListener('click', () => {
      activeYear = y;
      update();
    });
    tabs.appendChild(b);
  }
}

// ------------------------------------------------------------------ update

function update(): void {
  const opts = currentOptions();
  semiField.hidden = freqSelect.value !== 'semimonthly';

  if (!opts) {
    results.hidden = true;
    hint.hidden = false;
    return;
  }

  const r = computeYear(opts, activeYear, todayYmd());
  results.hidden = false;
  hint.hidden = true;
  renderYearTabs();
  renderBanner(r, opts);
  renderStats(r);
  renderCalendar(r);

  history.replaceState(
    null,
    '',
    `#d=${dateInput.value}&f=${opts.frequency}${opts.frequency === 'semimonthly' ? `&s=${opts.semiDays}` : ''}`,
  );
}

// ------------------------------------------------------------------ actions

function download(name: string, blob: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('#btn-ics').addEventListener('click', () => {
  const opts = currentOptions();
  if (!opts) return;
  const y = todayYmd().y;
  const paydays = [
    ...computeYear(opts, y, todayYmd()).months,
    ...computeYear(opts, y + 1, todayYmd()).months,
  ].flatMap((mo) => mo.paydays);
  download('paydaycal-paydays.ics', new Blob([buildIcs(paydays, 'PaydayCal — My Paydays')], { type: 'text/calendar' }));
});

$('#btn-print').addEventListener('click', () => window.print());

$('#btn-card').addEventListener('click', () => {
  const opts = currentOptions();
  if (!opts) return;
  const r = computeYear(opts, activeYear, todayYmd());
  const word = opts.frequency === 'weekly' ? '5-PAYCHECK' : '3-PAYCHECK';

  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const x = c.getContext('2d')!;

  x.fillStyle = '#FAF7F2';
  x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = '#0E7C4A';
  x.fillRect(0, 0, 1080, 14);
  x.fillRect(0, 1336, 1080, 14);

  x.fillStyle = '#C78F1A';
  x.font = '600 34px "Public Sans", sans-serif';
  x.textAlign = 'center';
  x.fillText('P A Y D A Y C A L . C O M', 540, 120);

  x.fillStyle = '#101826';
  x.font = '700 92px Fraunces, Georgia, serif';
  x.fillText(`MY ${word}`, 540, 300);
  x.fillText(`MONTHS IN ${r.year}`, 540, 405);

  x.fillStyle = '#0E7C4A';
  x.font = '700 120px Fraunces, Georgia, serif';
  const names = r.extraMonths.length ? r.extraMonths.map((m) => MONTHS[m - 1]) : ['(none this year)'];
  names.forEach((n, i) => {
    const y0 = 640 + i * 170;
    x.fillText(n.toUpperCase(), 540, y0);
    if (r.extraMonths.length) {
      x.fillStyle = '#F0B429';
      x.font = '700 60px Georgia, serif';
      x.fillText('★', 540, y0 - 105);
      x.fillStyle = '#0E7C4A';
      x.font = '700 120px Fraunces, Georgia, serif';
    }
  });

  x.fillStyle = '#5B6474';
  x.font = '400 36px "Public Sans", sans-serif';
  x.fillText('An extra check, no extra work.', 540, 1160);
  x.fillStyle = '#0E7C4A';
  x.font = '600 40px "Public Sans", sans-serif';
  x.fillText('Find yours free → paydaycal.com', 540, 1240);

  c.toBlob((blob) => blob && download(`my-${word.toLowerCase()}-months-${r.year}.png`, blob), 'image/png');
});

// -------------------------------------------------------------------- init

freqSelect.addEventListener('change', update);
semiSelect.addEventListener('change', update);
dateInput.addEventListener('change', update);
dateInput.addEventListener('input', update);

function restoreFromHash(): void {
  const params = new URLSearchParams(location.hash.slice(1));
  const d = params.get('d');
  const f = params.get('f');
  const s = params.get('s');
  if (d && parseYmd(d)) dateInput.value = d;
  if (f && ['weekly', 'biweekly', 'semimonthly', 'monthly'].includes(f)) freqSelect.value = f;
  if (s && ['first-fifteenth', 'fifteenth-last'].includes(s)) semiSelect.value = s;
  update();
}

// Re-restore when a shared link changes the hash on an already-open page.
window.addEventListener('hashchange', restoreFromHash);
restoreFromHash();
