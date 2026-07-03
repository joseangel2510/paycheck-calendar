import { describe, it, expect } from 'vitest';
import { computeYear, shiftToBusinessDay } from '../src/lib/payday';

/**
 * Ground truths hand-verified against the 2026/2027 calendar:
 * - Jan 1 2026 = Thursday, so Jan 2 2026 = Friday (biweekly "family A").
 * - Jan 9 2026 = Friday ("family B").
 * - Jan 1 2027 = Friday (New Year's Day) → that scheduled payday shifts to
 *   Thu Dec 31 2026, giving family A THREE December 2026 deposits (4, 18, 31).
 * - July 4 2026 = Saturday, observed Fri Jul 3 → scheduled Fri Jul 3 payday
 *   shifts to Thu Jul 2 (stays in July).
 * - Christmas Dec 25 2026 = Friday → payday shifts to Thu Dec 24.
 */
const T = { y: 2026, m: 7, d: 3 }; // fixed "today" for determinism

describe('biweekly family A (anchor Fri Jan 2 2026)', () => {
  const opts = { anchor: { y: 2026, m: 1, d: 2 }, frequency: 'biweekly' as const };

  it('extra months by actual pay date are Jan, Jul and Dec', () => {
    const r = computeYear(opts, 2026, T);
    expect(r.extraMonths).toEqual([1, 7, 12]);
  });

  it('27 actual deposits land in 2026 but only 26 scheduled periods', () => {
    const r = computeYear(opts, 2026, T);
    expect(r.totalPaychecks).toBe(27); // Jan 1 2027 payday arrives Dec 31 2026
    expect(r.scheduledCount).toBe(26);
    expect(r.isLongYear).toBe(false);
  });

  it('December has paydays on the 4th, 18th and 31st (shifted from Jan 1)', () => {
    const r = computeYear(opts, 2026, T);
    const dec = r.months[11];
    expect(dec.paydays.map((p) => p.d)).toEqual([4, 18, 31]);
    expect(dec.paydays[2].shiftedFrom).toEqual({ y: 2027, m: 1, d: 1 });
  });

  it('counts 13 paychecks remaining from Jul 3 2026', () => {
    // Paid before today: Jan×3, Feb–Jun ×2 each (Jun 19 pays Jun 18 — Juneteenth),
    // Jul 2 (shifted from Jul 3). Remaining: Jul 17+31, Aug–Nov ×2, Dec ×3 = 13.
    const r = computeYear(opts, 2026, T);
    expect(r.paychecksRemaining).toBe(13);
  });

  it('nextExtra from Aug 1 2026 is Dec 2026 (not Jan 2027)', () => {
    const r = computeYear(opts, 2026, { y: 2026, m: 8, d: 1 });
    expect(r.nextExtra).toEqual({ y: 2026, m: 12 });
  });
});

describe('biweekly family B (anchor Fri Jan 9 2026)', () => {
  const opts = { anchor: { y: 2026, m: 1, d: 9 }, frequency: 'biweekly' as const };

  it('extra months are May and Oct', () => {
    const r = computeYear(opts, 2026, T);
    expect(r.extraMonths).toEqual([5, 10]);
    expect(r.totalPaychecks).toBe(26);
  });

  it('Christmas payday pays Dec 24', () => {
    const r = computeYear(opts, 2026, T);
    const dec = r.months[11];
    expect(dec.paydays.map((p) => p.d)).toEqual([11, 24]);
  });
});

describe('holiday shifting', () => {
  it('scheduled Fri Jul 3 2026 (observed July 4th) pays Thu Jul 2', () => {
    expect(shiftToBusinessDay({ y: 2026, m: 7, d: 3 })).toEqual({ y: 2026, m: 7, d: 2 });
  });
  it('Fri Jan 1 2027 (New Year) pays Thu Dec 31 2026', () => {
    expect(shiftToBusinessDay({ y: 2027, m: 1, d: 1 })).toEqual({ y: 2026, m: 12, d: 31 });
  });
  it('Sat/Sun paydays pay the previous Friday', () => {
    expect(shiftToBusinessDay({ y: 2026, m: 8, d: 8 })).toEqual({ y: 2026, m: 8, d: 7 });
    expect(shiftToBusinessDay({ y: 2026, m: 8, d: 9 })).toEqual({ y: 2026, m: 8, d: 7 });
  });
  it('Fri Dec 31 2027 (observed New Year 2028) pays Thu Dec 30', () => {
    expect(shiftToBusinessDay({ y: 2027, m: 12, d: 31 })).toEqual({ y: 2027, m: 12, d: 30 });
  });
});

describe('27-pay-period years', () => {
  it('anchor Fri Jan 1 2027 biweekly → 27 scheduled periods in 2027', () => {
    const r = computeYear({ anchor: { y: 2027, m: 1, d: 1 }, frequency: 'biweekly' }, 2027, T);
    expect(r.scheduledCount).toBe(27);
    expect(r.isLongYear).toBe(true);
  });
});

describe('weekly', () => {
  const opts = { anchor: { y: 2026, m: 1, d: 2 }, frequency: 'weekly' as const };
  it('January 2026 has 5 Friday paydays and is an extra month', () => {
    const r = computeYear(opts, 2026, T);
    expect(r.months[0].paydays.length).toBe(5);
    expect(r.extraMonths).toContain(1);
    expect(r.extraMonths.length).toBeGreaterThanOrEqual(4);
  });
});

describe('semimonthly and monthly never have extra months', () => {
  it.each(['semimonthly', 'monthly'] as const)('%s', (frequency) => {
    const r = computeYear({ anchor: { y: 2026, m: 6, d: 15 }, frequency }, 2026, T);
    expect(r.extraMonths).toEqual([]);
    expect(r.nextExtra).toBeNull();
  });
  it('semimonthly fifteenth-last yields 24 paydays', () => {
    const r = computeYear(
      { anchor: { y: 2026, m: 6, d: 15 }, frequency: 'semimonthly', semiDays: 'fifteenth-last' },
      2026,
      T,
    );
    expect(r.scheduledCount).toBe(24);
  });
  it('monthly yields 12 paydays', () => {
    const r = computeYear({ anchor: { y: 2026, m: 6, d: 15 }, frequency: 'monthly' }, 2026, T);
    expect(r.scheduledCount).toBe(12);
  });
});
