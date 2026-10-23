import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { getQueue } from '../queues';
import { INTAKE } from '../../data/intake';
import { TESTELLE_INTAKE } from '../../data/seed';

describe('intake and blood draw flow', () => {
  it('day 0 shows onboarding in the Guide queue', () => {
    const d = buildScenario('day0');
    expect(getQueue(d, 'guide').some((q) => q.key === 'onboard-m-testelle')).toBe(true);
  });
  it('onboarding sends 3 consents + intake and books the draw', () => {
    const d = buildScenario('day0');
    const t = d.members.find((m) => m.id === 'm-testelle')!;
    ops.onboard(d, t.id, { menoStatus: 'peri', goals: t.goals, milestones: t.milestones, slotAt: '2026-10-14T07:30', byId: 's-guide' });
    expect(d.assignments.filter((a) => a.memberId === t.id)).toHaveLength(4);
    expect(d.visits).toHaveLength(1);
    expect(t.phase).toBe('intake_labs');
    expect(getQueue(d, 'ma').some((q) => q.label === 'Confirm blood draw')).toBe(true);
  });
  it('stalled scenario shows intake overdue, and snooze hides it', () => {
    const d = buildScenario('intake_stalled');
    const item = getQueue(d, 'guide').find((q) => q.key === 'intake-m-testelle');
    expect(item?.label).toMatch(/Intake \d+% · \d days/);
    ops.snooze(d, 'm-testelle', 'intake-m-testelle', 'Travelling', '2026-10-20T09:00', 's-guide');
    expect(getQueue(d, 'guide').some((q) => q.key === 'intake-m-testelle')).toBe(false);
  });
  it('completing every section completes intake; a safety Yes raises a pinned flag', () => {
    const d = buildScenario('intake_stalled');
    for (const s of INTAKE) {
      const ans = Object.fromEntries(s.questions.map((q) => [q.id, TESTELLE_INTAKE[q.id]]));
      if (s.id === 's7') ans.Q83 = 'Yes';
      ops.saveIntake(d, 'm-testelle', s.id, ans, true);
    }
    const a = d.assignments.find((x) => x.formId === 'f-intake')!;
    expect(a.status).toBe('signed');
    const q = getQueue(d, 'guide');
    expect(q[0].category).toBe('safety');
  });
  it('labs received moves the item to the NP', () => {
    const d = buildScenario('intake_stalled');
    const v = d.visits[0];
    ops.labsReceived(d, v.id, 's-ma');
    expect(getQueue(d, 'np').some((q) => q.key === `draft-${v.id}`)).toBe(true);
  });
});

describe('demo skip', () => {
  it('skip to end keeps chosen answers and completes intake', () => {
    const d = buildScenario('intake_stalled');
    ops.skipIntakeToEnd(d, 'm-testelle', { Q49: 5 });
    const a = d.assignments.find((x) => x.formId === 'f-intake')!;
    expect(a.status).toBe('signed');
    expect(d.intake['m-testelle'].Q49).toBe(5);
    expect(d.intakeDone['m-testelle']).toHaveLength(7);
  });
});
