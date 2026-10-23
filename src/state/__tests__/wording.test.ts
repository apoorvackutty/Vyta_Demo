import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { getQueue } from '../queues';
import { wordingSlots, WORDING_SUGGESTIONS } from '../../data/wording';
import { can } from '../permissions';

const RID = 'r-m-testelle-baseline';

describe('C1 Wording review', () => {
  it('scenario 3b puts the wording review on the Coach list, opening C1', () => {
    const d = buildScenario('wording');
    expect(ops.report(d, RID).status).toBe('pre_reviewed');
    const item = getQueue(d, 'coach').find((i) => i.key === `wording-${RID}`)!;
    expect(item.primary?.action).toEqual({ type: 'wording_review', memberId: 'm-testelle' });
  });

  it('offers the opening line, the top 3 focus areas and each kept plan step, with clinical detail locked', () => {
    const r = ops.report(buildScenario('wording'), RID);
    const slots = wordingSlots(r);
    expect(slots.filter((x) => x.group === 'Top 3 focus areas')).toHaveLength(3);
    expect(slots.find((x) => x.key === 'purpose-pi-testosterone')?.locked).toContain('0.5 mg');
  });

  it('softening one sentence and approving writes it into the report: ready for Your Vyta Day, visit booked', () => {
    const d = buildScenario('wording');
    ops.editWording(d, RID, 'focus-2', WORDING_SUGGESTIONS['focus-2'], 's-coach');
    expect(ops.approveWording(d, RID, 's-coach')).toBe(true);
    const r = ops.report(d, RID);
    expect(r.status).toBe('ready_for_visit');
    expect(r.focusAreas[2]).toBe(WORDING_SUGGESTIONS['focus-2']);
    expect(d.approvals[d.approvals.length - 1]).toMatchObject({ gate: 'coach_wording', outcome: 'approved', byId: 's-coach' });
    expect(d.timeline.some((e) => e.kind === 'wording_edit')).toBe(true);
    expect(d.timeline.some((e) => e.text.includes('Ready for Your Vyta Day'))).toBe(true);
    expect(ops.vytaDayVisit(d, 'm-testelle')).toBeTruthy();
    expect(getQueue(d, 'ma').some((i) => i.label.startsWith('Your Vyta Day booked'))).toBe(true);
  });

  it('send back to the NP needs a note and returns the draft to pre-review', () => {
    const d = buildScenario('wording');
    ops.sendBackWording(d, RID, '  ', 's-coach');
    expect(ops.report(d, RID).status).toBe('pre_reviewed');
    ops.sendBackWording(d, RID, 'Check omega-3: fish allergy', 's-coach');
    expect(ops.report(d, RID).status).toBe('draft');
    expect(d.approvals[d.approvals.length - 1]).toMatchObject({ gate: 'coach_wording', outcome: 'sent_back' });
  });

  it('only the Coach (or the super admin) may approve wording', () => {
    expect(can('coach', 'wording_review')).toBe(true);
    expect(can('admin', 'wording_review')).toBe(true);
    expect(can('np', 'wording_review')).toBe(false);
  });
});
