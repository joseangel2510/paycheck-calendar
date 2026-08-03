/**
 * Build-time bridge between the payday engine and the content pages.
 * Never hand-write payday dates in content — derive them here so every page
 * stays consistent with the tool.
 */
import { computeYear, type Ymd, type YearResult } from './payday';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface FridayFamily {
  /** 'A' = paid the 1st Friday of the year, 'B' = the 2nd. */
  key: 'A' | 'B';
  anchor: Ymd;
  anchorLabel: string;
  result: YearResult;
  extraMonthNames: string[];
}

function firstFriday(year: number): number {
  for (let d = 1; d <= 7; d++) {
    if (new Date(year, 0, d).getDay() === 5) return d;
  }
  /* istanbul ignore next */ throw new Error('unreachable');
}

function family(year: number, key: 'A' | 'B'): FridayFamily {
  const d = firstFriday(year) + (key === 'B' ? 7 : 0);
  const anchor = { y: year, m: 1, d };
  const result = computeYear({ anchor, frequency: 'biweekly' }, year, { y: year, m: 1, d: 1 });
  return {
    key,
    anchor,
    anchorLabel: `Friday, January ${d}, ${year}`,
    result,
    extraMonthNames: result.extraMonths.map((m) => MONTH_NAMES[m - 1]),
  };
}

/** The two biweekly-Friday payroll families for a year. */
export function fridayFamilies(year: number): { a: FridayFamily; b: FridayFamily } {
  return { a: family(year, 'A'), b: family(year, 'B') };
}

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

export interface WeeklyFamily {
  /** Weekday people are paid on, e.g. 'Friday'. */
  weekday: string;
  /** 1 = Monday … 5 = Friday. */
  dow: number;
  anchor: Ymd;
  result: YearResult;
  /** Month names with a 5th weekly paycheck (by actual deposit date). */
  extraMonthNames: string[];
}

function firstWeekday(year: number, dow: number): number {
  for (let d = 1; d <= 7; d++) {
    if (new Date(year, 0, d).getDay() === dow) return d;
  }
  /* istanbul ignore next */ throw new Error('unreachable');
}

/**
 * The five business-weekday weekly-pay schedules for a year (Mon–Fri).
 * A weekly payday scheduled on Sat/Sun deposits the previous business day, so
 * Mon–Fri covers every distinct real-world deposit schedule.
 */
export function weeklyFamilies(year: number): WeeklyFamily[] {
  const out: WeeklyFamily[] = [];
  for (let dow = 1; dow <= 5; dow++) {
    const d = firstWeekday(year, dow);
    const anchor: Ymd = { y: year, m: 1, d };
    const result = computeYear({ anchor, frequency: 'weekly' }, year, { y: year, m: 1, d: 1 });
    out.push({
      weekday: WEEKDAY_NAMES[dow],
      dow,
      anchor,
      result,
      extraMonthNames: result.extraMonths.map((m) => MONTH_NAMES[m - 1]),
    });
  }
  return out;
}

export function fmt(d: Ymd): string {
  return `${MONTH_NAMES[d.m - 1]} ${d.d}, ${d.y}`;
}

export function fmtShort(d: Ymd): string {
  return `${MONTH_NAMES[d.m - 1].slice(0, 3)} ${d.d}`;
}

/** "January & July" / "January, July & December" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
