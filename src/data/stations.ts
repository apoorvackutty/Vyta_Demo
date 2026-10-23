// Your Vyta Day body tests (docs/SAMPLE_DATA.md §5). All values fictional; functional cutoffs are illustrative.
import type { Band, Result, Station } from '../types';

export const STATIONS: { id: Station; label: string; panel: string; source: string; upload?: string }[] = [
  { id: 'inbody', label: 'InBody', panel: 'InBody', source: 'InBody scan', upload: 'Upload scan' },
  { id: 'functional', label: 'Functional', panel: 'Functional', source: 'Functional tests (MA entry)' },
  { id: 'shapescale', label: 'ShapeScale', panel: 'ShapeScale', source: 'ShapeScale scan', upload: 'Upload scan' },
  { id: 'vo2', label: 'VO2 max', panel: 'VO2', source: 'VO2 max report', upload: 'Upload report' },
];
export const stationOf = (id: Station) => STATIONS.find((s) => s.id === id)!;

export const SKIP_REASONS = [
  'Scanner offline – reschedule at 3-month',
  'Member declined this test',
  'Not safe today (injury or symptoms)',
  'Ran out of time – reschedule',
  'Other',
];

// A range from the report. `min` only (e.g. SMI ≥6.5) reads "below target" when under it.
interface Range { min?: number; max?: number }
export function rangeBand(value: number, r?: Range): Band {
  if (!r) return 'not_scored';
  const { min, max } = r;
  if ((min === undefined || value >= min) && (max === undefined || value <= max)) return 'optimal';
  if (max === undefined) return 'below_target';
  const bound = min !== undefined && value < min ? min : max;
  return Math.abs(value - bound) / bound <= 0.15 ? 'watch' : 'needs_attention';
}

interface UploadRow { marker: string; value: number | string; unit?: string; target?: string; range?: Range }
export const UPLOADS: Record<Exclude<Station, 'functional'>, UploadRow[]> = {
  inbody: [
    { marker: 'Weight', value: 171.0, unit: 'lb' },
    { marker: 'Skeletal muscle mass', value: 48.5, unit: 'lb', target: '42–50 lb', range: { min: 42, max: 50 } },
    { marker: 'Body fat', value: 41.8, unit: '%', target: '21–30%', range: { min: 21, max: 30 } },
    { marker: 'Body fat mass', value: 71.5, unit: 'lb' },
    { marker: 'Visceral fat area', value: 159.3, unit: 'cm²', target: '<100 cm²', range: { max: 100 } },
    { marker: 'BMI', value: 27.6, target: '18.5–24.9', range: { min: 18.5, max: 24.9 } },
    { marker: 'ECW/TBW', value: 0.389, target: '0.360–0.380', range: { min: 0.36, max: 0.38 } },
    { marker: 'Total body water', value: 73.0, unit: 'lb' },
    { marker: 'Phase angle', value: 4.6, unit: '°', target: '5.0–7.0°', range: { min: 5, max: 7 } },
    { marker: 'BMR', value: 1345, unit: 'kcal' },
    { marker: 'Body cell mass', value: 62.0, unit: 'lb' },
    { marker: 'SMI', value: 6.3, unit: 'kg/m²', target: '≥6.5', range: { min: 6.5 } },
    { marker: 'Lean mass, legs', value: 27.8, unit: 'lb' },
    { marker: 'Lean mass, trunk', value: 41.4, unit: 'lb' },
    { marker: 'Lean mass, arms', value: 9.08, unit: 'lb' },
  ],
  // Testelle's baseline scan is skipped; these are the values a working scanner would return (her 3-month scan).
  shapescale: [
    { marker: 'Shape score', value: 86 },
    { marker: 'Health score', value: 89 },
    { marker: 'Waist', value: 28.3, unit: 'in' },
    { marker: 'Hips', value: 39.7, unit: 'in' },
    { marker: 'Shoulders', value: 40.0, unit: 'in' },
  ],
  vo2: [
    { marker: 'VO2 max', value: 32.0, unit: 'mL/kg/min', target: '25–35', range: { min: 25, max: 35 } },
    { marker: 'Max heart rate', value: 180, unit: 'bpm' },
    { marker: 'Max power', value: 100, unit: 'W' },
    { marker: 'VT2 heart rate', value: 158, unit: 'bpm' },
    { marker: 'VT2 power', value: 85, unit: 'W' },
    { marker: 'VT1 heart rate', value: 108, unit: 'bpm' },
    { marker: 'Percentile', value: 52, unit: '%' },
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const resultId = (visitId: string, station: Station, marker: string) => `res-${visitId}-${station}-${slug(marker)}`;

export function uploadResults(memberId: string, visitId: string, station: Exclude<Station, 'functional'>): Result[] {
  const st = stationOf(station);
  return UPLOADS[station].map((r) => ({
    id: resultId(visitId, station, r.marker), memberId, visitId, panel: st.panel, marker: r.marker, value: r.value, unit: r.unit,
    target: r.target, band: typeof r.value === 'number' ? rangeBand(r.value, r.range) : 'not_scored', source: st.source,
  }));
}

// Re-band an edited upload value against the same report target.
export function bandFor(station: Station, marker: string, value: number | string | null): Band {
  if (station === 'functional') return functionalBand(FUNCTIONAL.find((f) => f.marker === marker)?.id ?? '', value) ?? 'not_scored';
  const row = UPLOADS[station].find((r) => r.marker === marker);
  return typeof value === 'number' && Number.isFinite(value) ? rangeBand(value, row?.range) : 'not_scored';
}

// ---------- Functional tests (MA enters these) ----------
export type FunctionalId = 'carry' | 'balanceR' | 'balanceL' | 'gait' | 'grip' | 'sitStand' | 'subjective' | 'consistency';
export interface FunctionalTest {
  id: FunctionalId; marker: string; label: string; unit?: string; rule: string;
  choices?: string[]; scored: boolean; seed: number | string;
}
export const FUNCTIONAL: FunctionalTest[] = [
  { id: 'carry', marker: 'Farmer carry', label: 'Farmer carry', unit: 'lb', rule: '≥100 Elite · 70–99 Optimal · <70 Watch', scored: true, seed: 70 },
  { id: 'balanceR', marker: 'Single-leg balance R', label: 'Single-leg balance, right', unit: 's', rule: '≥30 Optimal · <30 Watch', scored: true, seed: 30 },
  { id: 'balanceL', marker: 'Single-leg balance L', label: 'Single-leg balance, left', unit: 's', rule: '≥30 Optimal · <30 Watch', scored: true, seed: 30 },
  { id: 'gait', marker: 'Gait speed (30 ft)', label: 'Gait speed, 30 ft', unit: 's', rule: '≤6.0 Elite · 6.1–7.5 Optimal · >7.5 Watch', scored: true, seed: 6.9 },
  { id: 'grip', marker: 'Grip strength', label: 'Grip strength', unit: 'lb', rule: '>60 Elite · ≥35.3 Optimal · <35.3 Watch', scored: true, seed: 58 },
  { id: 'sitStand', marker: 'Sit-to-stand floor rise', label: 'Sit-to-stand floor rise', rule: 'No assistance Optimal · One-hand Watch · Two-hand or unable Needs attention',
    choices: ['No assistance', 'One-hand assistance', 'Two-hand assistance', 'Unable'], scored: true, seed: 'One-hand assistance' },
  { id: 'subjective', marker: 'Subjective strength', label: 'Subjective strength', rule: 'Recorded, not scored', choices: ['Poor', 'Fair', 'Good', 'Excellent'], scored: false, seed: 'Fair' },
  { id: 'consistency', marker: 'Exercise consistency', label: 'Exercise consistency', rule: 'Recorded, not scored', choices: ['Poor', 'Fair', 'Good', 'Excellent'], scored: false, seed: 'Fair' },
];

// Illustrative cutoffs from SAMPLE_DATA §5. Returns null while the entry is empty or not a number.
export function functionalBand(id: FunctionalId | string, value: number | string | null | undefined): Band | null {
  if (value === null || value === undefined || value === '') return null;
  const t = FUNCTIONAL.find((f) => f.id === id);
  if (!t) return null;
  if (!t.scored) return 'not_scored';
  if (t.choices) {
    if (value === 'No assistance') return 'optimal';
    if (value === 'One-hand assistance') return 'watch';
    return t.choices.includes(String(value)) ? 'needs_attention' : null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  switch (t.id) {
    case 'carry': return n >= 100 ? 'elite' : n >= 70 ? 'optimal' : 'watch';
    case 'balanceR': case 'balanceL': return n >= 30 ? 'optimal' : 'watch';
    case 'gait': return n <= 6.0 ? 'elite' : n <= 7.5 ? 'optimal' : 'watch';
    case 'grip': return n > 60 ? 'elite' : n >= 35.3 ? 'optimal' : 'watch';
    default: return null;
  }
}
