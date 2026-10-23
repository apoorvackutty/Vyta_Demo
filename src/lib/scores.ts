// Score recalculation (SCHEMA §4 "Skipped tests"): a skipped test is left out, never counted as zero.
// The points per band are illustrative; the real VMRI weighting comes from the clinic.
import type { Band, Result, Scores } from '../types';

export const BAND_POINTS: Partial<Record<Band, number>> = {
  elite: 100, optimal: 85, watch: 60, below_target: 45, needs_attention: 30,
};

export const counts = (r: Result) =>
  !r.skipped && !r.excludedFromScore && r.value !== null && r.value !== '' && BAND_POINTS[r.band] !== undefined;

export interface ScoreBreakdown {
  score: number | null; // 0–100, null when nothing can be scored
  counted: number;
  excluded: string[];   // markers or panels left out, with no zero put in their place
}

export function scoreResults(results: Result[]): ScoreBreakdown {
  const scored = results.filter(counts);
  const excluded = results.filter((r) => r.skipped || r.excludedFromScore).map((r) => r.marker);
  if (!scored.length) return { score: null, counted: 0, excluded };
  const total = scored.reduce((n, r) => n + BAND_POINTS[r.band]!, 0);
  return { score: Math.round(total / scored.length), counted: scored.length, excluded };
}

// One score per panel, then averaged, so a skipped panel drops out instead of dragging the mean down.
export function scoreByPanel(results: Result[]): { overall: number | null; panels: Record<string, ScoreBreakdown> } {
  const panels: Record<string, ScoreBreakdown> = {};
  for (const p of [...new Set(results.map((r) => r.panel))]) panels[p] = scoreResults(results.filter((r) => r.panel === p));
  const live = Object.values(panels).filter((b) => b.score !== null);
  return { overall: live.length ? Math.round(live.reduce((n, b) => n + b.score!, 0) / live.length) : null, panels };
}

export const VMRI_BAND = (vmri: number): Scores['vmriBand'] =>
  vmri >= 80 ? 'optimized' : vmri >= 65 ? 'resilient' : vmri >= 45 ? 'moderate_burden' : vmri >= 30 ? 'high_vulnerability' : 'critical_burden';
export const VMRI_BAND_LABEL: Record<Scores['vmriBand'], string> = {
  optimized: 'Optimized', resilient: 'Resilient', moderate_burden: 'Moderate burden', high_vulnerability: 'High vulnerability', critical_burden: 'Critical burden',
};

// Illustrative: Your Vyta Day's body tests nudge the labs-only scores from pre-review. Testelle's body tests
// (ShapeScale skipped, left out) score 73, which gives the report's VMRI 54 and biological age 51.
export function vytaDayScores(pre: Scores, visitResults: Result[]): Scores & { body: number | null } {
  const body = scoreByPanel(visitResults).overall;
  if (body === null) return { ...pre, body };
  const vmri = Math.max(0, Math.min(100, pre.vmri + Math.round((body - 63) / 5)));
  return { vmri, vmriBand: VMRI_BAND(vmri), biologicalAge: pre.biologicalAge - Math.round((body - 57) / 8), symptoms: pre.symptoms, body };
}
