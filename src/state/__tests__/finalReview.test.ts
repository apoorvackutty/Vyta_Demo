import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { getQueue } from '../queues';
import { canFinishFinalReview, vytaDayFindings } from '../guards';
import { vytaDayScores } from '../../lib/scores';
import { PRE_REVIEW_SCORES, BASELINE_SCORES } from '../../data/protocol';

const RID = 'r-m-testelle-baseline';
const setup = () => {
  const d = buildScenario('tests_done');
  const v = ops.vytaDayVisit(d, 'm-testelle')!;
  const results = () => d.results.filter((r) => r.visitId === v.id);
  return { d, v, results, r: () => ops.report(d, RID) };
};

describe('N3 Final review', () => {
  it('scenario 4b: completeness passed, the NP task opens N3', () => {
    const { d, r } = setup();
    expect(r().status).toBe('final_review');
    expect(r().preReviewScores).toEqual(PRE_REVIEW_SCORES);
    const task = getQueue(d, 'np').find((q) => q.key === `final-${RID}`)!;
    expect(task.primary?.action).toEqual({ type: 'final_review', memberId: 'm-testelle' });
  });

  it('the body tests take the labs-only scores to the report baseline (ShapeScale skipped, not zero)', () => {
    const { results } = setup();
    const s = vytaDayScores(PRE_REVIEW_SCORES, results());
    expect(s.vmri).toBe(BASELINE_SCORES.vmri);
    expect(s.biologicalAge).toBe(BASELINE_SCORES.biologicalAge);
  });

  it('lists new out-of-range findings from Your Vyta Day, and blocks finishing until each is decided', () => {
    const { d, r, v, results } = setup();
    const fresh = vytaDayFindings(r(), results());
    expect(fresh.map((x) => x.result.marker)).toEqual(expect.arrayContaining(['Body fat', 'Visceral fat area', 'SMI']));
    const check = canFinishFinalReview(r(), v, results());
    expect(check.ok).toBe(false);
    expect(check.missing[0]).toContain('need a decision');
    for (const x of fresh) ops.decideNewFinding(d, RID, x.result.id, 'treat', 's-np');
    expect(canFinishFinalReview(r(), ops.vytaDayVisit(d, 'm-testelle'), results()).ok).toBe(true);
  });

  it('correcting a value re-bands it and keeps the original; leaving one out drops it from scores with a reason', () => {
    const { d, results } = setup();
    const smi = results().find((x) => x.marker === 'SMI')!;
    ops.correctResult(d, smi.id, 6.6, '', 's-np');
    expect(results().find((x) => x.id === smi.id)!.value).toBe(6.3);
    ops.correctResult(d, smi.id, 6.6, 'Transcription: printout reads 6.6', 's-np');
    const after = results().find((x) => x.id === smi.id)!;
    expect(after).toMatchObject({ value: 6.6, band: 'optimal', corrected: { from: 6.3 } });
    const phase = results().find((x) => x.marker === 'Phase angle')!;
    ops.excludeResult(d, phase.id, 'Ate just before the scan', 's-np');
    expect(results().find((x) => x.id === phase.id)).toMatchObject({ excludedFromScore: true, excludedReason: 'Ate just before the scan' });
    expect(d.timeline.filter((e) => e.kind === 'result_corrected' || e.kind === 'result_excluded')).toHaveLength(2);
  });

  it('finishing writes the gate, the final scores, and puts her NP on to the results conversation', () => {
    const { d, r, results } = setup();
    for (const x of vytaDayFindings(r(), results())) ops.decideNewFinding(d, RID, x.result.id, 'monitor', 's-np');
    expect(ops.finishFinalReview(d, RID, 's-np')).toBe(true);
    expect(r().scores.vmri).toBe(54);
    expect(r().finalReviewedAt).toBeTruthy();
    expect(d.approvals[d.approvals.length - 1]).toMatchObject({ gate: 'np_final_review', outcome: 'approved' });
    expect(getQueue(d, 'np').some((q) => q.key === `final-${RID}`)).toBe(false);
  });
});
