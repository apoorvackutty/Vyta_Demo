import type { IntakeValue } from '../types';
export function fmtAnswer(v: IntakeValue | undefined): string {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(' · ');
  return String(v);
}
export const GRID_OPTIONS = ['Rarely', '1–2 days/week', '3–4 days/week', '5+'];
// Optional free-text context the member adds under a choice answer, stored beside it as e.g. "Q09_more".
export const detailsKey = (qid: string) => `${qid}_more`;
