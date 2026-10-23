import { describe, expect, it } from 'vitest';
import { INTAKE } from '../../data/intake';
import { TESTELLE_INTAKE } from '../../data/seed';
import { FOLLOW_UPS, GRID_SHORT, ORDERED_SINGLE, isShown, toggleMulti } from '../../lib/intakeFlow';
import { GRID_OPTIONS } from '../../lib/intakeFormat';

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
