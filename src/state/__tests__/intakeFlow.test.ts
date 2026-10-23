import { describe, expect, it } from 'vitest';
import type { IntakeValue } from '../../types';
import { INTAKE } from '../../data/intake';
import { TESTELLE_INTAKE } from '../../data/seed';
import { skipIntakeToEnd } from '../ops';
import { DETAILS, FOLLOW_UPS, GRID_SHORT, ORDERED_SINGLE, isShown, toggleMulti, wantsDetails, REACTIONS, reactionHint, wantsReaction, requiredMissing, fillRequired, listItems } from '../../lib/intakeFlow';
import { GRID_OPTIONS, detailsKey, reactionKey } from '../../lib/intakeFormat';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';

const QS = INTAKE.flatMap((s) => s.questions);
const byId = Object.fromEntries(QS.map((q) => [q.id, q]));

describe('intake display rules', () => {
  it('sliders only cover single-choice questions, and seed answers are on a stop', () => {
    for (const id of ORDERED_SINGLE) {
      expect(byId[id]?.type).toBe('single');
      expect(byId[id].options!.map(String)).toContain(TESTELLE_INTAKE[id]);
    }
  });

  it('every follow-up and its parent sit in the same section, parent first', () => {
    for (const [id, f] of Object.entries(FOLLOW_UPS)) {
      const sec = INTAKE.find((s) => s.questions.some((q) => q.id === id))!;
      const ids = sec.questions.map((q) => q.id);
      expect(ids.indexOf(f.parent)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(f.parent)).toBeLessThan(ids.indexOf(id));
      expect(byId[id].safety).toBeFalsy();
    }
  });

  it('follow-ups show after "Yes", hide after "No", and never hide an answer', () => {
    expect(isShown(byId.Q08, { Q07: 'Yes' })).toBe(true);
    expect(isShown(byId.Q08, { Q07: 'No' })).toBe(false);
    expect(isShown(byId.Q08, { Q07: 'No', Q08: 'Mother, BRCA1' })).toBe(true);
    expect(isShown(byId.Q34, { Q33: ['None'] })).toBe(false);
    expect(isShown(byId.Q34, { Q33: ['Alcohol'] })).toBe(true);
  });

  it('"None" is exclusive in multi-choice', () => {
    expect(toggleMulti(['Bloating'], 'None')).toEqual(['None']);
    expect(toggleMulti(['None'], 'Reflux')).toEqual(['Reflux']);
    expect(toggleMulti(['Reflux', 'Bloating'], 'Reflux')).toEqual(['Bloating']);
  });

  it('grid short labels line up with the stored values', () => {
    expect(GRID_SHORT).toHaveLength(GRID_OPTIONS.length);
  });
});

describe('optional answer details', () => {
  it('only offers details on choice questions that have no source follow-up asking the same', () => {
    for (const id of Object.keys(DETAILS)) {
      expect(['single', 'multi']).toContain(byId[id]?.type);
      // Q09's source follow-up (Q10) only covers "Other", so its details are limited to the named surgeries.
      if (id !== 'Q09') expect(Object.values(FOLLOW_UPS).some((f) => f.parent === id)).toBe(false);
    }
  });

  it('shows Q09 details for a named surgery, not for None or Other alone', () => {
    expect(wantsDetails('Q09', { Q09: ['Hysterectomy'] })).toBe(true);
    expect(wantsDetails('Q09', { Q09: ['None'] })).toBe(false);
    expect(wantsDetails('Q09', { Q09: ['Other gynecologic or pelvic surgery'] })).toBe(false);
    expect(wantsDetails('Q46', { Q46: 'Yes' })).toBe(true);
    expect(wantsDetails('Q46', { Q46: 'No' })).toBe(false);
    expect(wantsDetails('Q46', { Q46: 'No', Q46_more: 'typed earlier' })).toBe(true);
    expect(wantsDetails('Q02', { Q02: ['Stress or burnout'] })).toBe(false);
  });

  it('details are stored beside the answer, survive skip-to-end, and do not count towards progress', () => {
    const d = buildScenario('intake_stalled');
    const before = d.assignments.find((a) => a.memberId === 'm-testelle' && a.formId === 'f-intake')!.progress;
    ops.saveIntake(d, 'm-testelle', 's1', { [detailsKey('Q09')]: '2019, fibroids' }, false);
    const a = d.assignments.find((x) => x.memberId === 'm-testelle' && x.formId === 'f-intake')!;
    expect(a.progress).toBe(before);
    ops.skipIntakeToEnd(d, 'm-testelle', { Q46: 'Yes', Q46_more: 'Anxiety, 2021' });
    expect(d.intake['m-testelle'].Q09_more).toBe('2019, fibroids');
    expect(d.intake['m-testelle'].Q46_more).toBe('Anxiety, 2021');
    expect(a.status).toBe('signed');
  });
});

describe('how did it go (medications, hormones, supplements)', () => {
  it('sits on free-text questions in section 2, under the dose follow-up where one exists', () => {
    for (const id of REACTIONS) {
      expect(byId[id].type).toBe('text');
      expect(INTAKE[1].questions.some((q) => q.id === id)).toBe(true);
    }
    // Yes/No parents never get the box: their "Name, dose, duration" follow-up does.
    for (const parent of ['Q20', 'Q22', 'Q24', 'Q27']) expect(REACTIONS.has(parent)).toBe(false);
    // ...and doesn't ask for the dose again there.
    expect(reactionHint('Q21')).not.toMatch(/dose/i);
    expect(reactionHint('Q26')).not.toMatch(/dose/i);
  });

  it('shows once she says yes or lists something, not for none/no', () => {
    expect(wantsReaction('Q21', { Q20: 'Yes' })).toBe(true);
    expect(wantsReaction('Q21', { Q20: 'No' })).toBe(false);
    expect(wantsReaction('Q26', { Q26: 'Vitamin D3' })).toBe(true);
    expect(wantsReaction('Q26', { Q26: 'None' })).toBe(false);
    expect(wantsReaction('Q19', { Q19: 'No' })).toBe(false);
    expect(wantsReaction('Q19', { Q19: 'No', Q19_reaction: 'Stopped HRT in 2024' })).toBe(true);
  });

  it('is stored beside the answer, survives skip-to-end and does not move progress', () => {
    const d = buildScenario('intake_stalled');
    const a = d.assignments.find((x) => x.memberId === 'm-testelle' && x.formId === 'f-intake')!;
    const before = a.progress;
    ops.saveIntake(d, 'm-testelle', 's2', { [reactionKey('Q26')]: 'Magnesium helps my sleep' }, false);
    expect(a.progress).toBe(before);
    ops.skipIntakeToEnd(d, 'm-testelle', { Q20: 'Yes', Q21: 'Pill, 10 years', Q21_reaction: 'Mood dips, stopped 2023' });
    expect(d.intake['m-testelle'].Q26_reaction).toBe('Magnesium helps my sleep');
    expect(d.intake['m-testelle'].Q21_reaction).toBe('Mood dips, stopped 2023');
  });
});

describe('required years and doses', () => {
  const s1 = INTAKE[0].questions, s2 = INTAKE[1].questions;
  const fields = (m: { field: string }[]) => m.map((x) => x.field);

  it('asks a year for each ticked surgery, validated 1940 to the demo year', () => {
    expect(requiredMissing(s1, { Q09: ['None'] }, 2026)).toEqual([]);
    const m = requiredMissing(s1, { Q09: ['Hysterectomy', 'Oophorectomy'], Q09_years: { Oophorectomy: '1939' } }, 2026);
    expect(m.map((x) => x.message)).toEqual(['Add the year of your hysterectomy', 'Enter a year between 1940 and 2026']);
    expect(requiredMissing(s1, { Q09: ['Hysterectomy'], Q09_years: { Hysterectomy: '2027' } }, 2026)[0].message).toBe('Enter a year between 1940 and 2026');
    expect(requiredMissing(s1, { Q09: ['Hysterectomy'], Q09_years: { Hysterectomy: '2019' } }, 2026)).toEqual([]);
  });

  it('asks a dose for each listed HRT or supplement item', () => {
    expect(listItems('Vitamin D3; magnesium, B12\nfish oil')).toEqual(['Vitamin D3', 'magnesium', 'B12', 'fish oil']);
    expect(listItems('No')).toEqual([]);
    expect(fields(requiredMissing(s2, { Q19: 'No', Q26: 'Vitamin D3; B12', Q26_dose: { 'Vitamin D3': '2,000 IU' } }, 2026))).toEqual(['Q26_dose:B12']);
  });

  it('makes the source "name, dose, duration" follow-up required only after Yes or a listed item', () => {
    expect(fields(requiredMissing(s2, { Q20: 'No', Q22: 'None', Q24: 'None', Q27: 'No' }, 2026))).toEqual([]);
    expect(fields(requiredMissing(s2, { Q20: 'Yes', Q22: 'Metformin', Q24: 'None', Q27: 'Yes' }, 2026))).toEqual(['Q21', 'Q23', 'Q28']);
    expect(fields(requiredMissing(s2, { Q20: 'Yes', Q21: '  ' }, 2026))).toEqual(['Q21']);
  });

  it('demo fill leaves nothing required missing, using Testelle\'s fictional doses', () => {
    const ans = { ...Object.fromEntries(s2.map((q) => [q.id, TESTELLE_INTAKE[q.id]])), Q20: 'Yes', Q19: 'Estradiol patch' } as Record<string, IntakeValue>;
    const filled = { ...ans, ...fillRequired(s2, ans, 2026) };
    expect(requiredMissing(s2, filled, 2026)).toEqual([]);
    expect((filled.Q26_dose as Record<string, string>)['Vitamin D3']).toBe('2,000 IU');
    const s1ans = { Q09: ['Endometrial ablation'] };
    expect(requiredMissing(s1, { ...s1ans, ...fillRequired(s1, s1ans, 2026) }, 2026)).toEqual([]);
  });

  it('skip to the end fills every required field, and the stalled scenario has her doses', () => {
    const d = buildScenario('intake_stalled');
    expect((d.intake['m-testelle'].Q26_dose as Record<string, string>).B12).toBe('1,000 mcg');
    skipIntakeToEnd(d, 'm-testelle', { Q09: ['Hysterectomy'], Q27: 'Yes', Q28: '' });
    const ans = d.intake['m-testelle'];
    for (const sec of INTAKE) expect(requiredMissing(sec.questions, ans, 2026)).toEqual([]);
  });
});
