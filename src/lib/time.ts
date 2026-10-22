// Demo times are naive local strings "YYYY-MM-DDTHH:mm" (clinic time, Mountain). Parsed manually so the viewer's timezone never shifts them.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(iso: string) {
  const [d, t = '00:00'] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return { y, m, day, hh, mm };
}
export function toMs(iso: string): number {
  const p = parts(iso);
  return Date.UTC(p.y, p.m - 1, p.day, p.hh, p.mm);
}
export function fromMs(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function addDays(iso: string, days: number): string {
  return fromMs(toMs(iso) + days * 86400000);
}
export function addMinutes(iso: string, mins: number): string {
  return fromMs(toMs(iso) + mins * 60000);
}
export function fmtDate(iso: string): string {
  const p = parts(iso);
  const dow = DAYS[new Date(Date.UTC(p.y, p.m - 1, p.day)).getUTCDay()];
  return `${dow} ${p.day} ${MONTHS[p.m - 1]}`;
}
export function fmtTime(iso: string): string {
  const p = parts(iso);
  const h = p.hh % 12 === 0 ? 12 : p.hh % 12;
  return `${h}:${String(p.mm).padStart(2, '0')} ${p.hh < 12 ? 'am' : 'pm'}`;
}
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((toMs(toIso) - toMs(fromIso)) / 86400000);
}
export function ageLabel(fromIso: string, nowIso: string): string {
  const mins = Math.max(0, Math.round((toMs(nowIso) - toMs(fromIso)) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
export function ageYears(dob: string, nowIso: string): number {
  const a = parts(dob); const n = parts(nowIso);
  let y = n.y - a.y;
  if (n.m < a.m || (n.m === a.m && n.day < a.day)) y -= 1;
  return y;
}
export function isBefore(a: string, b: string) { return toMs(a) < toMs(b); }
