/**
 * Payday date engine — pure functions, no DOM, no timezone pitfalls.
 *
 * All dates are plain { y, m, d } integers (month 1-12). Internally dates are
 * converted to "epoch days" (whole days since 1970-01-01) so arithmetic is
 * exact; JS Date is used only via Date.UTC with integer components.
 *
 * Conventions (documented on the site — keep in sync with content):
 * - A payday falling on a weekend or US federal holiday (observed) is paid on
 *   the PREVIOUS business day.
 * - Months, totals and "paychecks remaining" count the shifted (actual) date —
 *   the day money reaches the account.
 * - The 26-vs-27 pay-period detection counts SCHEDULED dates in the calendar
 *   year (payroll convention used by employers).
 */

export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type SemiDays = 'first-fifteenth' | 'fifteenth-last';

export interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

export interface Options {
  anchor: Ymd;
  frequency: Frequency;
  semiDays?: SemiDays;
}

export interface PayDate extends Ymd {
  /** Present when the payday was moved off a weekend/holiday. */
  shiftedFrom?: Ymd;
}

export interface MonthResult {
  y: number;
  m: number;
  paydays: PayDate[];
  isExtra: boolean;
}

export interface YearResult {
  year: number;
  months: MonthResult[];
  /** Actual deposits landing inside `year`. */
  totalPaychecks: number;
  /** Months (1-12) with an extra paycheck, by actual date. */
  extraMonths: number[];
  /** Scheduled pay dates inside `year` (payroll periods). */
  scheduledCount: number;
  /** 27 biweekly / 53 weekly scheduled periods. */
  isLongYear: boolean;
  /** Actual paydays on/after `today` within `year`. */
  paychecksRemaining: number;
  /** Next month (looking ~18 months ahead from `today`) with an extra paycheck. */
  nextExtra: { y: number; m: number } | null;
}

// ---------------------------------------------------------------------------
// Epoch-day helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export function toDays({ y, m, d }: Ymd): number {
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDays(n: number): Ymd {
  const dt = new Date(n * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Day of week, 0 = Sunday … 6 = Saturday. (Epoch day 0 was a Thursday.) */
function dowOfDays(n: number): number {
  return (((n + 4) % 7) + 7) % 7;
}

function iso({ y, m, d }: Ymd): string {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function daysInMonth(y: number, m: number): number {
  // Date.UTC month is 0-based, so (y, m, 0) = day 0 of the NEXT month = last day of m.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// ---------------------------------------------------------------------------
// US federal holidays (observed)
// ---------------------------------------------------------------------------

/** nth (1-based) weekday `dow` of month m in year y. */
function nthWeekday(y: number, m: number, nth: number, dow: number): Ymd {
  const first = toDays({ y, m, d: 1 });
  const offset = (dow - dowOfDays(first) + 7) % 7;
  return fromDays(first + offset + (nth - 1) * 7);
}

/** Last weekday `dow` of month m in year y. */
function lastWeekday(y: number, m: number, dow: number): Ymd {
  const last = toDays({ y, m, d: daysInMonth(y, m) });
  const offset = (dowOfDays(last) - dow + 7) % 7;
  return fromDays(last - offset);
}

/** Observed date for a fixed-date holiday: Sat → Fri, Sun → Mon. */
function observed(y: number, m: number, d: number): Ymd {
  const n = toDays({ y, m, d });
  const dow = dowOfDays(n);
  if (dow === 6) return fromDays(n - 1);
  if (dow === 0) return fromDays(n + 1);
  return { y, m, d };
}

/**
 * Observed US federal holidays that fall within calendar year `y`.
 * Includes the observance of NEXT year's New Year's Day when Jan 1 falls on a
 * Saturday (observed Fri Dec 31 of year `y`).
 */
export function usFederalHolidays(y: number): Set<string> {
  const days: Ymd[] = [
    observed(y, 1, 1), // New Year's Day
    nthWeekday(y, 1, 3, 1), // MLK Day — 3rd Monday of January
    nthWeekday(y, 2, 3, 1), // Washington's Birthday — 3rd Monday of February
    lastWeekday(y, 5, 1), // Memorial Day — last Monday of May
    observed(y, 6, 19), // Juneteenth
    observed(y, 7, 4), // Independence Day
    nthWeekday(y, 9, 1, 1), // Labor Day — 1st Monday of September
    nthWeekday(y, 10, 2, 1), // Columbus Day — 2nd Monday of October
    observed(y, 11, 11), // Veterans Day
    nthWeekday(y, 11, 4, 4), // Thanksgiving — 4th Thursday of November
    observed(y, 12, 25), // Christmas
  ];
  const nextNewYear = observed(y + 1, 1, 1);
  if (nextNewYear.y === y) days.push(nextNewYear); // Jan 1 (y+1) is a Saturday
  return new Set(days.filter((h) => h.y === y).map(iso));
}

const holidayCache = new Map<number, Set<string>>();
function isHoliday(d: Ymd): boolean {
  let set = holidayCache.get(d.y);
  if (!set) {
    set = usFederalHolidays(d.y);
    holidayCache.set(d.y, set);
  }
  return set.has(iso(d));
}

/** Move a payday off weekends/holidays to the previous business day. */
export function shiftToBusinessDay(date: Ymd): Ymd {
  let n = toDays(date);
  for (;;) {
    const dow = dowOfDays(n);
    const ymd = fromDays(n);
    if (dow !== 0 && dow !== 6 && !isHoliday(ymd)) return ymd;
    n -= 1;
  }
}

// ---------------------------------------------------------------------------
// Schedule generation
// ---------------------------------------------------------------------------

/** Scheduled (unshifted) pay dates within [fromDay, toDay], as epoch days. */
function generateScheduled(opts: Options, fromDay: number, toDay: number): number[] {
  const out: number[] = [];
  const { frequency } = opts;

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const step = frequency === 'weekly' ? 7 : 14;
    const anchor = toDays(opts.anchor);
    const k = Math.ceil((fromDay - anchor) / step);
    for (let n = anchor + k * step; n <= toDay; n += step) out.push(n);
    return out;
  }

  const start = fromDays(fromDay);
  const end = fromDays(toDay);
  for (let y = start.y; y <= end.y; y++) {
    const mFrom = y === start.y ? start.m : 1;
    const mTo = y === end.y ? end.m : 12;
    for (let m = mFrom; m <= mTo; m++) {
      const last = daysInMonth(y, m);
      const dates: number[] =
        frequency === 'semimonthly'
          ? opts.semiDays === 'first-fifteenth'
            ? [1, 15]
            : [15, last]
          : [Math.min(opts.anchor.d, last)]; // monthly, clamped to month end
      for (const d of dates) {
        const n = toDays({ y, m, d });
        if (n >= fromDay && n <= toDay) out.push(n);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

function extraThreshold(frequency: Frequency): number | null {
  if (frequency === 'biweekly') return 2;
  if (frequency === 'weekly') return 4;
  return null; // semimonthly/monthly schedules are fixed per month
}

interface ActualPayday {
  actual: Ymd;
  scheduled: Ymd;
}

function generateActual(opts: Options, fromDay: number, toDay: number): ActualPayday[] {
  // Widen the scheduled window so shifts across the range edges are caught.
  return generateScheduled(opts, fromDay - 3, toDay + 3)
    .map((n) => {
      const scheduled = fromDays(n);
      return { scheduled, actual: shiftToBusinessDay(scheduled) };
    })
    .filter(({ actual }) => {
      const n = toDays(actual);
      return n >= fromDay && n <= toDay;
    });
}

export function computeYear(opts: Options, year: number, today: Ymd): YearResult {
  const threshold = extraThreshold(opts.frequency);
  const yearStart = toDays({ y: year, m: 1, d: 1 });
  const yearEnd = toDays({ y: year, m: 12, d: 31 });

  const actual = generateActual(opts, yearStart, yearEnd);

  const months: MonthResult[] = Array.from({ length: 12 }, (_, i) => ({
    y: year,
    m: i + 1,
    paydays: [] as PayDate[],
    isExtra: false,
  }));
  for (const { actual: a, scheduled } of actual) {
    const pay: PayDate = { ...a };
    if (a.y !== scheduled.y || a.m !== scheduled.m || a.d !== scheduled.d) {
      pay.shiftedFrom = scheduled;
    }
    months[a.m - 1].paydays.push(pay);
  }
  for (const mo of months) {
    mo.paydays.sort((a, b) => toDays(a) - toDays(b));
    mo.isExtra = threshold !== null && mo.paydays.length > threshold;
  }

  const scheduledCount = generateScheduled(opts, yearStart, yearEnd).length;
  const isLongYear =
    (opts.frequency === 'biweekly' && scheduledCount === 27) ||
    (opts.frequency === 'weekly' && scheduledCount === 53);

  const todayDay = toDays(today);
  const paychecksRemaining = actual.filter(({ actual: a }) => toDays(a) >= todayDay).length;

  // Next extra month: walk up to 18 months ahead of `today` by actual dates.
  let nextExtra: YearResult['nextExtra'] = null;
  if (threshold !== null) {
    for (let i = 0; i < 18 && nextExtra === null; i++) {
      const total = (today.m - 1 + i);
      const y = today.y + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const from = toDays({ y, m, d: 1 });
      const to = toDays({ y, m, d: daysInMonth(y, m) });
      const count = generateActual(opts, from, to).length;
      if (count > threshold) nextExtra = { y, m };
    }
  }

  return {
    year,
    months,
    totalPaychecks: actual.length,
    extraMonths: months.filter((mo) => mo.isExtra).map((mo) => mo.m),
    scheduledCount,
    isLongYear,
    paychecksRemaining,
    nextExtra,
  };
}
