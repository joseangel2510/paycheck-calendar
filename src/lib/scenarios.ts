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
