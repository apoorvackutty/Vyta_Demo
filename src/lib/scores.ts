// Score recalculation (SCHEMA §4 "Skipped tests"): a skipped test is left out, never counted as zero.
// The points per band are illustrative; the real VMRI weighting comes from the clinic.
import type { Band, Result } from '../types';

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
