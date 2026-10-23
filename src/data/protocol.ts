// Testelle's baseline labs and the draft HEAL plan the NP pre-reviews. All fictional: docs/SAMPLE_DATA.md §4, §6, §7.
import type { Band, Finding, PlanItem, PlanField, PlanGroup, Result, Scores } from '../types';

export const PROTOCOL_NAME = 'Standard perimenopause protocol';
export const LAB_SOURCE = 'Sample lab report (PDF)';

type Row = [marker: string, value: number | string, unit: string, target: string, band: Band, summary?: string];
// Rows with a summary are out of range at baseline and become Findings (★ in SAMPLE_DATA).
const PANELS: { panel: string; page: number; rows: Row[] }[] = [
  { panel: 'Hormones', page: 2, rows: [
    ['FSH', 13.4, 'mIU/mL', '10–25 (peri)', 'optimal'],
    ['LH', 14.3, 'mIU/mL', '—', 'optimal'],
    ['Estradiol', 90, 'pg/mL', '50–100 (peri/HRT)', 'optimal'],
    ['Progesterone', 9.0, 'ng/mL', '10–20', 'below_target', 'Below target for perimenopause; fits irregular cycles and sleep changes.'],
    ['Free testosterone', 0.7, 'pg/mL', '4.5–10.0', 'below_target', 'Low; fits her low libido and low energy.'],
    ['Total testosterone', 13, 'ng/dL', '60–200', 'below_target', 'Low, in line with free testosterone.'],
    ['SHBG', 78, 'nmol/L', '60–70', 'watch'],
    ['DHEA-S', 86, 'mcg/dL', '200–600', 'below_target', 'Low adrenal androgen.'],
    ['TSH', 2.37, 'mIU/L', '0.5–2.5', 'optimal'],
    ['Free T3', 2.4, 'pg/mL', '2.8–4.2', 'below_target', 'Low free T3 with TSH in range; fits fatigue.'],
    ['Free T4', 1.1, 'ng/dL', '0.8–1.8', 'optimal'],
    ['Prolactin', 6.6, 'ng/mL', '3.0–29.0', 'optimal'],
  ] },
  { panel: 'Metabolic', page: 3, rows: [
    ['hs-CRP', 9.5, 'mg/L', '<1.0', 'needs_attention', 'Systemic inflammation well above target.'],
    ['HbA1c', 5.1, '%', '5.0–5.3', 'optimal'],
    ['Fasting glucose', 80, 'mg/dL', '70–85', 'optimal'],
    ['Fasting insulin', 5.6, 'uIU/mL', '2–5', 'watch'],
    ['HOMA-IR', 1.11, '', '<1.5', 'optimal'],
    ['Total cholesterol', 205, 'mg/dL', '<200', 'watch'],
    ['HDL', 52, 'mg/dL', '≥50', 'optimal'],
    ['LDL', 130, 'mg/dL', '<100', 'watch', 'Above target.'],
    ['Triglycerides', 115, 'mg/dL', '<100', 'watch'],
  ] },
  { panel: 'Complete blood count', page: 4, rows: [
    ['Hemoglobin', 12.7, 'g/dL', '12.0–15.5', 'optimal'],
    ['RDW', 13.7, '%', '<13.5', 'watch'],
    ['Neutrophils', 74.5, '%', '40–60', 'needs_attention', 'High; drives the raised NLR.'],
    ['Lymphocytes (absolute)', 671, 'cells/uL', '1,000–4,800', 'below_target', 'Low absolute lymphocytes.'],
    ['NLR', 5.44, '', '<3.0', 'needs_attention', 'High neutrophil-to-lymphocyte ratio; fits the inflammation picture.'],
  ] },
  { panel: 'Nutrients', page: 5, rows: [
    ['Ferritin', 8, 'ng/mL', '12–150', 'needs_attention', 'Iron stores low; likely part of her fatigue.'],
    ['Iron (total)', 37, 'mcg/dL', '60–170', 'below_target', 'Low iron availability.'],
    ['Iron saturation', 10, '%', '20–50', 'below_target', 'Low; consistent with low ferritin.'],
    ['Vitamin D', 32, 'ng/mL', '40–60', 'watch', 'Below target despite D3 2,000 IU daily.'],
    ['Vitamin B12', 351, 'pg/mL', '400–900', 'below_target', 'Below target despite B12 drops.'],
    ['Homocysteine', 11.2, 'umol/L', '<10', 'watch', 'Mildly raised; review with B12.'],
    ['Magnesium', 2.0, 'mg/dL', '1.7–2.3', 'optimal'],
  ] },
  { panel: 'Liver and kidney', page: 6, rows: [
    ['ALT', 7, 'U/L', '7–35', 'optimal'],
    ['AST', 14, 'U/L', '10–35', 'optimal'],
    ['Albumin', 4.3, 'g/dL', '3.5–5.0', 'optimal'],
    ['eGFR', 109, 'mL/min', '>90', 'optimal'],
    ['Creatinine', 0.63, 'mg/dL', '0.5–1.1', 'optimal'],
    ['BUN', 11, 'mg/dL', '7–20', 'optimal'],
  ] },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function baselineLabs(memberId: string, visitId: string): Result[] {
  return PANELS.flatMap(({ panel, page, rows }) => rows.map(([marker, value, unit, target, band]) => ({
    id: `res-${slug(marker)}`, memberId, visitId, panel, marker, value, unit: unit || undefined, target, band, source: `${LAB_SOURCE} p.${page}`,
  })));
}

// What the protocol suggests for each finding (illustrative). Treat where the draft plan already acts on it.
const SUGGESTED: Record<string, NonNullable<Finding['suggested']>> = {
  Progesterone: 'treat', 'Free testosterone': 'treat', 'Total testosterone': 'treat', 'DHEA-S': 'monitor', 'Free T3': 'monitor',
  'hs-CRP': 'treat', LDL: 'monitor', Neutrophils: 'monitor', 'Lymphocytes (absolute)': 'monitor', NLR: 'monitor',
  Ferritin: 'treat', 'Iron (total)': 'treat', 'Iron saturation': 'treat', 'Vitamin D': 'treat', 'Vitamin B12': 'treat', Homocysteine: 'monitor',
};

export function draftFindings(): Finding[] {
  return PANELS.flatMap(({ rows }) => rows.filter((r) => r[5]).map(([marker, , , , , summary]) => ({
    id: `fd-${slug(marker)}`, resultId: `res-${slug(marker)}`, summary: summary!, suggested: SUGGESTED[marker],
  })));
}

// Worst first: what the NP should look at before anything else.
export const BAND_RANK: Record<Band, number> = {
  needs_attention: 0, below_target: 1, watch: 2, not_retested: 3, not_scored: 4, optimal: 5, elite: 6,
};

// Final baseline scores, once Your Vyta Day's body tests are in (SAMPLE_DATA: VMRI 54, biological age 51, symptoms 58).
export const BASELINE_SCORES: Scores = { vmri: 54, vmriBand: 'moderate_burden', biologicalAge: 51, symptoms: 58 };
// What the draft could score from labs and intake alone, as the NP saw it at pre-review. The N3 diff runs from here.
export const PRE_REVIEW_SCORES: Scores = { vmri: 52, vmriBand: 'moderate_burden', biologicalAge: 53, symptoms: 58 };
export const BASELINE_FOCUS = [
  'Rebuild your energy: iron stores are low (ferritin 8).',
  'Calm inflammation: hs-CRP is 9.5 and your immune ratio is high.',
  'Build strength and protect your bones: fat mass is high for your frame, and you have osteopenia.',
];

export const PLAN_GROUPS: { id: PlanGroup; label: string }[] = [
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'supplement', label: 'Supplements' },
  { id: 'peptide', label: 'Peptides' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'sleep', label: 'Sleep' },
];
export const isLifestyle = (g: PlanGroup) => g === 'nutrition' || g === 'exercise' || g === 'sleep';

// Choosing a form moves the route with it, so the NP changes one dropdown, not two.
export const FORM_ROUTE: Record<string, string> = {
  patch: 'Transdermal', cream: 'Transdermal', gel: 'Transdermal', ring: 'Vaginal', troche: 'Buccal',
  injection: 'Subcutaneous injection', capsule: 'Oral', tablet: 'Oral', softgel: 'Oral', drops: 'Sublingual',
};

export const FIELD_LABEL: Record<PlanField, string> = { dose: 'Dose', form: 'Form', route: 'Route', frequency: 'Frequency' };

// Pre-filled from the protocol (Brett: "force the protocol, they delete what they don't want"). Dose options are illustrative.
export function draftPlan(): PlanItem[] {
  return [
    { id: 'pi-estradiol', group: 'prescription', name: 'Estradiol', change: 'new', dose: '0.05 mg', form: 'patch', route: 'Transdermal', frequency: 'Twice weekly',
      options: { dose: ['0.025 mg', '0.0375 mg', '0.05 mg', '0.075 mg', '0.1 mg'], form: ['patch', 'cream', 'gel', 'ring', 'troche'], route: ['Transdermal', 'Vaginal', 'Buccal'], frequency: ['Twice weekly', 'Daily', 'Nightly'] },
      purpose: 'Steadies the hormone swings behind your energy and mood changes.', supplier: 'retail' },
    { id: 'pi-progesterone', group: 'prescription', name: 'Micronized progesterone', change: 'new', dose: '100 mg', form: 'capsule', route: 'Oral', frequency: 'Nightly',
      options: { dose: ['100 mg', '200 mg'], frequency: ['Nightly', 'Nightly, days 1–12'] },
      purpose: 'Balances estradiol and supports sleep.', supplier: 'retail' },
    { id: 'pi-testosterone', group: 'prescription', name: 'Testosterone', change: 'new', form: 'troche', route: 'Buccal', frequency: 'Twice weekly',
      options: { dose: ['0.5 mg', '1 mg'], form: ['troche', 'cream', 'injection'], frequency: ['Twice weekly', 'Three times a week', 'Daily'] },
      purpose: 'Supports energy, strength and libido.', flag: 'incomplete', flagNote: 'Strength per troche missing', missing: ['dose'],
      needsConsentFormId: 'f-testosterone', supplier: 'compounding' },
    { id: 'pi-iron', group: 'supplement', name: 'Iron', change: 'new', form: 'tablet', route: 'Oral', frequency: 'Daily',
      options: { dose: ['18 mg elemental', '25 mg elemental', '65 mg elemental'], frequency: ['Daily', 'Every other day'] },
      purpose: 'Rebuilds your iron stores (ferritin 8) for steadier energy.', flag: 'incomplete', flagNote: 'Elemental amount missing', missing: ['dose'], supplier: 'fullscript' },
    { id: 'pi-vitd', group: 'supplement', name: 'Vitamin D3', change: 'continued', dose: '2,000 IU', form: 'softgel', route: 'Oral', frequency: 'Daily',
      options: { dose: ['1,000 IU', '2,000 IU', '4,000 IU', '5,000 IU'] },
      purpose: 'Brings vitamin D into range for bones and mood.', supplier: 'fullscript' },
    { id: 'pi-mag', group: 'supplement', name: 'Magnesium L-threonate', change: 'continued', dose: '2 caps', form: 'capsule', route: 'Oral', frequency: 'Nightly',
      purpose: 'Supports sleep and recovery.', supplier: 'fullscript' },
    { id: 'pi-b12', group: 'supplement', name: 'B12 drops', change: 'continued', dose: '1,000 mcg', form: 'drops', route: 'Sublingual', frequency: 'Daily',
      purpose: 'Keeps B12 up for energy and focus.', supplier: 'fullscript' },
    { id: 'pi-omega', group: 'supplement', name: 'Omega-3 fish oil', change: 'continued', dose: '2 g', form: 'softgel', route: 'Oral', frequency: 'Daily',
      purpose: 'Helps calm inflammation.', supplier: 'fullscript' },
    { id: 'pi-tirzepatide', group: 'peptide', name: 'Tirzepatide', change: 'new', form: 'injection', frequency: 'Weekly',
      options: { route: ['Subcutaneous injection'], frequency: ['Weekly'] },
      purpose: 'Supports body composition alongside strength work.', flag: 'incomplete', flagNote: 'Dose and route missing', missing: ['dose', 'route'],
      needsConsentFormId: 'f-peptides', supplier: 'peptide_supplier' },
    { id: 'pi-fiber', group: 'nutrition', name: 'Fiber 35 g/day', change: 'changed', dose: '3–4 target days/week',
      options: { dose: ['3–4 target days/week', '5+ target days/week', 'Daily'] },
      purpose: 'Your clearest nutrition gap; helps bloating and inflammation.', flag: 'proposed', flagNote: 'Proposed progression from 1–2 days/week' },
    { id: 'pi-protein', group: 'nutrition', name: 'Protein first at each meal', change: 'new', dose: 'Every main meal',
      purpose: 'Protects muscle while you build strength.' },
    { id: 'pi-strength', group: 'exercise', name: 'Strength training', change: 'changed', dose: '3 sessions/week, upper body + loaded carries',
      options: { dose: ['2 sessions/week', '3 sessions/week, upper body + loaded carries'] },
      purpose: 'Builds the upper-body strength you asked for and protects your bones.', flag: 'proposed', flagNote: 'Proposed step up from 1–2 sessions/week' },
    { id: 'pi-zone2', group: 'exercise', name: 'Zone 2 cardio', change: 'continued', dose: '3–4 days/week; cycling if knee flares',
      purpose: 'Keeps your aerobic base strong.' },
    { id: 'pi-winddown', group: 'sleep', name: '60-minute wind-down', change: 'changed', dose: '5 nights/week',
      options: { dose: ['3 nights/week', '5 nights/week'] },
      purpose: 'The one sleep habit you said is inconsistent.', flag: 'proposed', flagNote: 'Proposed step up from 1–2 nights/week' },
  ];
}
