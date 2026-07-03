import { describe, it, expect } from 'vitest';
import { buildIcs } from '../src/lib/ics';
import type { Ymd } from '../src/lib/payday';

const paydays: Ymd[] = [
  { y: 2026, m: 1, d: 2 },
  { y: 2026, m: 1, d: 16 },
  { y: 2026, m: 12, d: 31 },
];

describe('buildIcs', () => {
  const ics = buildIcs(paydays, 'PaydayCal — My Paydays');

  it('is a valid VCALENDAR envelope with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:PaydayCal — My Paydays');
    // no bare LF: every \n is preceded by \r
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('emits one all-day VEVENT per payday with exclusive DTEND', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260102');
    expect(ics).toContain('DTEND;VALUE=DATE:20260103');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101'); // rolls over the year
  });

  it('has stable unique UIDs and a payday summary', () => {
    expect(ics).toContain('UID:payday-20260102@paydaycal');
    expect(ics).toContain('UID:payday-20261231@paydaycal');
    expect(ics.match(/SUMMARY:💰 Payday/g)).toHaveLength(3);
  });

  it('is deterministic (DTSTAMP derived from first payday, not wall clock)', () => {
    expect(buildIcs(paydays, 'PaydayCal — My Paydays')).toBe(ics);
    expect(ics).toContain('DTSTAMP:20260102T000000Z');
  });
});
