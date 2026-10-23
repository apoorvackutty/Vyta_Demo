import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { canApprovePreReview } from '../guards';
import { getQueue } from '../queues';
import { BAND_RANK } from '../../data/protocol';

const RID = 'r-m-testelle-baseline';
const setup = () => {
  const d = buildScenario('labs_back');
  return { d, r: d.reports.find((x) => x.id === RID)! };
};
// Everything the NP must do before Approve unlocks.
function resolveAll(d: ReturnType<typeof setup>['d']) {
  ops.acceptSuggestions(d, RID, 's-np');
  ops.editPlanItem(d, RID, 'pi-testosterone', 'dose', '0.5 mg', 's-np');
  ops.editPlanItem(d, RID, 'pi-iron', 'dose', '25 mg elemental', 's-np');
  ops.removePlanItem(d, RID, 'pi-tirzepatide', true, 's-np');
  for (const id of ['pi-testosterone', 'pi-iron', 'pi-fiber', 'pi-strength', 'pi-winddown']) ops.reviewPlanItem(d, RID, id, 's-np');
}

describe('N2 pre-review', () => {
  it('scenario 3 loads a draft with findings and a protocol plan', () => {
    const { d, r } = setup();
    expect(r.status).toBe('draft');
    expect(r.findings.length).toBe(16);
    expect(r.plan.length).toBe(14);
    expect(getQueue(d, 'np')[0].label).toBe('Pre-review: draft ready');
  });

  it('ferritin, hs-CRP and NLR are among the worst-band findings', () => {
    const { d, r } = setup();
    const worst = r.findings.map((f) => d.results.find((x) => x.id === f.resultId)!).filter((x) => BAND_RANK[x.band] === 0).map((x) => x.marker);
    expect(worst).toEqual(expect.arrayContaining(['Ferritin', 'hs-CRP', 'NLR']));
  });

  it('blocks approval and lists what is missing in plain words', () => {
    const { d, r } = setup();
    const check = canApprovePreReview(r, d.results);
    expect(check.ok).toBe(false);
    expect(check.missing[0]).toMatch(/^16 findings need a decision/);
    expect(check.missing).toContain('Testosterone: dose missing');
    expect(check.missing).toContain('Tirzepatide: dose and route missing');
    expect(check.missing).toContain('Fiber 35 g/day: proposed step needs your review');
    expect(ops.approvePreReview(d, RID, 's-np')).toBe(false);
    expect(r.status).toBe('draft');
  });

  it('a † item cannot be marked reviewed until its missing field is filled', () => {
    const { d, r } = setup();
    ops.reviewPlanItem(d, RID, 'pi-testosterone', 's-np');
    expect(r.plan.find((x) => x.id === 'pi-testosterone')!.resolved).toBeUndefined();
    ops.editPlanItem(d, RID, 'pi-testosterone', 'dose', '0.75 mg', 's-np');
    ops.reviewPlanItem(d, RID, 'pi-testosterone', 's-np');
    expect(r.plan.find((x) => x.id === 'pi-testosterone')!.resolved).toBe(true);
  });

  it('changing estradiol form moves the route and keeps the item', () => {
    const { d, r } = setup();
    ops.editPlanItem(d, RID, 'pi-estradiol', 'form', 'ring', 's-np');
    const e = r.plan.find((x) => x.id === 'pi-estradiol')!;
    expect(e.form).toBe('ring');
    expect(e.route).toBe('Vaginal');
    expect(d.timeline.slice(-1)[0]?.text).toBe('Estradiol: form patch → ring');
  });

  it('approval records name, time and version, and hands the Coach a wording task', () => {
    const { d, r } = setup();
    resolveAll(d);
    expect(canApprovePreReview(r, d.results).ok).toBe(true);
    expect(ops.approvePreReview(d, RID, 's-np')).toBe(true);
    expect(r.status).toBe('pre_reviewed');
    expect(d.approvals.slice(-1)[0]).toMatchObject({ gate: 'np_pre_review', outcome: 'approved', byId: 's-np', reportVersion: 1, at: d.now });
    expect(getQueue(d, 'coach').some((q) => q.label === 'Wording review' && q.memberId === 'm-testelle')).toBe(true);
    expect(getQueue(d, 'np').some((q) => q.key === `report-${RID}`)).toBe(false);
    expect(d.members.find((m) => m.id === 'm-testelle')!.step).toMatch(/waiting on Coach wording review/);
  });

  it('send back rebuilds as v2 and keeps the NP\'s decisions', () => {
    const { d, r } = setup();
    ops.decideFinding(d, RID, 'fd-ferritin', 'treat', 's-np');
    ops.sendBackDraft(d, RID, 'Use the post-menopause protocol', 's-np');
    expect(r.status).toBe('building');
    expect(d.approvals.slice(-1)[0]).toMatchObject({ outcome: 'sent_back', reason: 'Use the post-menopause protocol' });
    ops.finishDraft(d, RID);
    expect(r.status).toBe('draft');
    expect(r.version).toBe(2);
    expect(r.findings.find((f) => f.id === 'fd-ferritin')!.decision).toBe('treat');
  });

  it('accepting suggestions only fills findings the NP has not decided', () => {
    const { d, r } = setup();
    ops.decideFinding(d, RID, 'fd-ferritin', 'refer', 's-np');
    ops.acceptSuggestions(d, RID, 's-np');
    expect(r.findings.every((f) => f.decision)).toBe(true);
    expect(r.findings.find((f) => f.id === 'fd-ferritin')!.decision).toBe('refer');
    expect(r.findings.find((f) => f.id === 'fd-nlr')!.decision).toBe('monitor');
  });

  it('every pre-review action writes a timeline event', () => {
    const { d } = setup();
    const before = d.timeline.length;
    ops.decideFinding(d, RID, 'fd-ferritin', 'treat', 's-np');
    ops.noteFinding(d, RID, 'fd-ferritin', 'Recheck in 8 weeks', 's-np');
    ops.setSideNote(d, RID, 'pi-testosterone', 'Allergy: cottonseed oil', 's-np');
    ops.removePlanItem(d, RID, 'pi-omega', true, 's-np');
    expect(d.timeline.length).toBe(before + 4);
  });
});
