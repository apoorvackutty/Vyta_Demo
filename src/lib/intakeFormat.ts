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
// Optional note on how she got on with a medication, hormone or supplement, stored as e.g. "Q21_reaction".
export const reactionKey = (qid: string) => `${qid}_reaction`;
// Every optional extra stored beside a question's answer.
// Required structured extras: a year per ticked surgery, a dose (and optional how often) per listed medication.
export const yearsKey = (qid: string) => `${qid}_years`;
export const doseKey = (qid: string) => `${qid}_dose`;
export const oftenKey = (qid: string) => `${qid}_often`;
export const extraKeys = (qid: string) => [detailsKey(qid), reactionKey(qid), yearsKey(qid), doseKey(qid), oftenKey(qid)];
