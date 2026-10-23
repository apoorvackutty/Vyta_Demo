// C1 Wording review: the member-facing sentences of the draft, and the Coach's scripted suggestions (TRD §4: no AI).
import type { Report } from '../types';

export const BASELINE_SUMMARY = 'Your labs show low iron stores, high inflammation and low testosterone. Each one fits how you have been feeling, and each has a next step in your plan.';

// Softer phrasings offered beside the original. The Coach can take one, edit it, or write her own.
export const WORDING_SUGGESTIONS: Record<string, string> = {
  summary: 'Your labs help explain how you have been feeling: iron stores are low, inflammation is up and testosterone is low. The good news is that each one has a clear next step in your plan.',
  'focus-1': 'Calm inflammation: your hs-CRP (9.5) and immune ratio are higher than we would like, and your plan starts bringing them down.',
  'focus-2': 'Build strength and protect your bones: more muscle will help your body composition and keep your bones strong as you manage osteopenia.',
};

export interface WordingSlot {
  key: string;
  group: 'Opening' | 'Top 3 focus areas' | 'Plan: why each step';
  label: string;
  original: string;
  suggested?: string;
  locked?: string; // the clinical detail beside it, which the Coach can't change
}

export function wordingSlots(r: Report): WordingSlot[] {
  const slots: WordingSlot[] = [
    { key: 'summary', group: 'Opening', label: 'Opening line', original: r.summary ?? BASELINE_SUMMARY, suggested: WORDING_SUGGESTIONS.summary },
    ...r.focusAreas.map((t, i) => ({ key: `focus-${i}`, group: 'Top 3 focus areas' as const, label: `Focus area ${i + 1}`, original: t, suggested: WORDING_SUGGESTIONS[`focus-${i}`] })),
    ...r.plan.filter((i) => !i.removed).map((i) => ({
      key: `purpose-${i.id}`, group: 'Plan: why each step' as const, label: i.name, original: i.purpose,
      locked: [i.dose, i.form, i.route, i.frequency].filter(Boolean).join(' · ') || undefined,
    })),
  ];
  return slots;
}

export const wordingText = (r: Report, slot: WordingSlot) => r.wordingEdits?.[slot.key] ?? slot.original;
export const wordingChanged = (r: Report) => wordingSlots(r).filter((s) => r.wordingEdits?.[s.key] !== undefined && r.wordingEdits[s.key] !== s.original);
