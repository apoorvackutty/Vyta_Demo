// How the member app presents intake questions. Display only: question IDs, wording and stored answer values stay as in data/intake.ts.
import type { IntakeQuestion, IntakeValue } from '../types';
import { detailsKey, reactionKey } from './intakeFormat';

// Single-choice questions whose options run in order (low to high), shown as a slider.
export const ORDERED_SINGLE = new Set(['Q03', 'Q04', 'Q29', 'Q30', 'Q34', 'Q37', 'Q41', 'Q45']);

// Short grid labels for the per-row segmented control. Index-matched to GRID_OPTIONS.
export const GRID_SHORT = ['Rarely', '1–2', '3–4', '5+'];

const yes = (v: IntakeValue | undefined) => v === 'Yes';
const has = (v: IntakeValue | undefined, x: string) => Array.isArray(v) && v.includes(x);
const listed = (v: IntakeValue | undefined) => typeof v === 'string' && v.trim() !== '' && !/^(none|no)\.?$/i.test(v.trim());

// Follow-up questions appear only once the answer they depend on makes them relevant.
export const FOLLOW_UPS: Record<string, { parent: string; when: (v: IntakeValue | undefined) => boolean }> = {
  Q08: { parent: 'Q07', when: yes },
  Q10: { parent: 'Q09', when: (v) => has(v, 'Other gynecologic or pelvic surgery') },
  Q12: { parent: 'Q11', when: yes },
  Q15: { parent: 'Q14', when: yes },
  Q21: { parent: 'Q20', when: yes },
  Q23: { parent: 'Q22', when: listed },
  Q25: { parent: 'Q24', when: listed },
  Q28: { parent: 'Q27', when: yes },
  Q34: { parent: 'Q33', when: (v) => Array.isArray(v) && v.some((x) => x !== 'None') },
  Q35: { parent: 'Q33', when: (v) => Array.isArray(v) && v.some((x) => x !== 'None') },
  Q36: { parent: 'Q33', when: (v) => Array.isArray(v) && v.some((x) => x !== 'None') },
  Q48: { parent: 'Q47', when: yes },
  Q67: { parent: 'Q66', when: (v) => v === 'Somewhat' || v === 'No' },
};

export function hasAnswer(v: IntakeValue | undefined) {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

// A follow-up already holding an answer stays visible, so nothing she typed is ever hidden.
export function isShown(q: IntakeQuestion, ans: Record<string, IntakeValue>) {
  const f = FOLLOW_UPS[q.id];
  return !f || f.when(ans[f.parent]) || hasAnswer(ans[q.id]);
}

// "None" can't be combined with anything else in a multi-choice question.
export function toggleMulti(cur: string[], v: string): string[] {
  if (cur.includes(v)) return cur.filter((x) => x !== v);
  if (v === 'None') return ['None'];
  return [...cur.filter((x) => x !== 'None'), v];
}

// Units stay free text (seed answers read "6 hours", "171 lb"), so no numbers-only keyboards.
export type TextHint = { line?: boolean; placeholder?: string; autoComplete?: string; rows?: number };
const DOSE = 'Name, dose and how long';
export const TEXT_HINTS: Record<string, TextHint> = {
  Q13: { placeholder: 'e.g. Penicillin, or none' },
  Q17: { line: true, placeholder: 'e.g. 28 days' },
  Q19: { placeholder: 'e.g. Estradiol patch, or no' },
  Q21: { placeholder: DOSE }, Q23: { placeholder: DOSE }, Q25: { placeholder: DOSE }, Q28: { placeholder: DOSE },
  Q22: { placeholder: 'List them, or none' }, Q24: { placeholder: 'List them, or none' },
  Q43: { line: true, placeholder: 'e.g. 6 hours' },
  Q55: { line: true, autoComplete: 'sex' },
  Q87: { line: true, placeholder: 'e.g. 5 ft 6 in' },
  Q88: { line: true, placeholder: 'e.g. 150 lb' },
  Q89: { rows: 4 },
};

// Display label for an ordered option: "2 = Often disruptive" reads as "Often disruptive" under the slider.
export const stopLabel = (o: string) => o.replace(/^\d+\s*=\s*/, '');

// Optional "Add details" box under clinically meaningful choice answers. Only where no source follow-up already asks.
// Shows once she picks anything other than "None" / "No" (or the narrower rule given).
const SURGERIES = ['Hysterectomy', 'Oophorectomy', 'Endometrial ablation'];
export const DETAILS: Record<string, { hint: string; when?: (v: IntakeValue | undefined) => boolean }> = {
  // "Other gynecologic or pelvic surgery" already opens Q10, so details cover the named surgeries.
  Q09: { hint: 'When, and why? Any complications?', when: (v) => Array.isArray(v) && v.some((x) => SURGERIES.includes(x)) },
  Q32: { hint: 'Since when? Anything that helps or makes it worse?' },
  Q35: { hint: 'What kind of support, and how often?' },
  Q40: { hint: 'How often? Any foods or times that trigger it?' },
  Q46: { hint: 'Which diagnosis, and when? Any treatment?' },
  Q58: { hint: 'Anything you would like your care team to know?' },
  Q81: { hint: 'What happened, and when? Any treatment?' },
  Q83: { hint: "What's worrying you?" },
};

export function wantsDetails(qid: string, ans: Record<string, IntakeValue>) {
  const d = DETAILS[qid];
  if (!d) return false;
  if (hasAnswer(ans[detailsKey(qid)])) return true;
  const v = ans[qid];
  if (d.when) return d.when(v);
  return Array.isArray(v) ? v.some((x) => x !== 'None') : v === 'Yes';
}

// Optional "How did it go?" box for medications, hormones, birth control, supplements and peptides.
// Where a source follow-up asks which one and what dose (Q21, Q23, Q25, Q28), the box sits under that follow-up, not its parent.
const REACTION_HINT = 'Dose, how long, and how you felt on it: side effects, what helped, why you stopped';
// Under a "List name, dose, duration" follow-up the dose is already asked, so the hint drops it.
export const reactionHint = (qid: string) => FOLLOW_UPS[qid] ? 'How you felt on it: side effects, what helped, why you stopped' : REACTION_HINT;
export const REACTIONS = new Set(['Q19', 'Q21', 'Q23', 'Q25', 'Q26', 'Q28']);

export function wantsReaction(qid: string, ans: Record<string, IntakeValue>) {
  if (!REACTIONS.has(qid)) return false;
  if (hasAnswer(ans[reactionKey(qid)]) || listed(ans[qid])) return true;
  const f = FOLLOW_UPS[qid];
  return !!f && f.when(ans[f.parent]);
}
