import { describe, expect, it } from 'vitest';
import { INTAKE } from '../../data/intake';
import { TESTELLE_INTAKE } from '../../data/seed';
import { DETAILS, FOLLOW_UPS, GRID_SHORT, ORDERED_SINGLE, isShown, toggleMulti, wantsDetails, REACTIONS, reactionHint, wantsReaction } from '../../lib/intakeFlow';
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
    expect(reactionHint('Q26')).toMatch(/dose/i);
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
