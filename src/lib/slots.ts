// Bookable appointment times, generated from the demo clock so later scenarios never offer a time in the past.
import { addDays, fmtDate, toMs } from './time';

export type SlotKind = 'blood_draw' | 'vyta_day';
// Blood draws are fasting, so early mornings; Your Vyta Day runs mid-morning.
const TIMES: Record<SlotKind, string[]> = { blood_draw: ['07:30', '08:00', '08:30'], vyta_day: ['08:30', '10:00'] };

export interface Slot { at: string; day: string }

// The next `days` weekdays (today included if a time is still ahead), skipping `exclude` (the current booking).
export function nextSlots(now: string, kind: SlotKind, exclude?: string, days = 4): Slot[] {
  const out: Slot[] = [];
  for (let i = 0, found = 0; found < days && i < 14; i++) {
    const date = addDays(now, i).slice(0, 10);
    const dow = new Date(toMs(`${date}T00:00`)).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const times = TIMES[kind].map((t) => `${date}T${t}`).filter((at) => toMs(at) > toMs(now) && at !== exclude);
    if (!times.length) continue;
    found++;
    out.push(...times.map((at) => ({ at, day: fmtDate(at) })));
  }
  return out;
}
