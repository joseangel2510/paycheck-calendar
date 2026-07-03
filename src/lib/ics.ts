/**
 * Minimal RFC 5545 calendar builder for payday events.
 * All-day events; DTEND is exclusive (next day) per the spec.
 * Deterministic output: DTSTAMP derives from the first payday so the same
 * input always produces byte-identical files (testable, cacheable).
 */
import { toDays, fromDays, type Ymd } from './payday';

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

function basic({ y, m, d }: Ymd): string {
  return `${y}${pad(m)}${pad(d)}`;
}

export function buildIcs(paydays: Ymd[], calName: string): string {
  const sorted = [...paydays].sort((a, b) => toDays(a) - toDays(b));
  const stamp = sorted.length ? `${basic(sorted[0])}T000000Z` : '19700101T000000Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PaydayCal//Payday Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  for (const day of sorted) {
    const next = fromDays(toDays(day) + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:payday-${basic(day)}@paydaycal`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${basic(day)}`,
      `DTEND;VALUE=DATE:${basic(next)}`,
      'SUMMARY:💰 Payday',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
