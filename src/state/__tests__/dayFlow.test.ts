import { describe, it, expect } from 'vitest';
import { buildScenario, SCENARIOS } from '../scenarios';
import * as ops from '../ops';
import { getQueue } from '../queues';
import { canRelease } from '../guards';
import { matchSage } from '../../data/sage';

const RID = 'r-m-testelle-baseline';
const T = 'pi-testosterone';

describe('N4 Results conversation', () => {
  it('scenario 4c: final review done, the NP task opens present mode', () => {
    const d = buildScenario('results');
    expect(ops.report(d, RID).finalReviewedAt).toBeTruthy();
    expect(getQueue(d, 'np').find((q) => q.key === `release-${RID}`)?.primary?.action).toEqual({ type: 'present', memberId: 'm-testelle' });
  });

  it('declining needs her reason; accepting testosterone lets the consent be pushed to her phone once', () => {
    const d = buildScenario('results');
    ops.recordChoice(d, RID, 'pi-tirzepatide', 'decline', ' ', 's-np');
    expect(ops.report(d, RID).plan.find((i) => i.id === 'pi-tirzepatide')!.memberChoice).toBeUndefined();
    ops.recordChoice(d, RID, 'pi-tirzepatide', 'decline', 'Not ready for injections yet', 's-np');
    ops.pushConsent(d, RID, T, 's-np'); // not accepted yet: no push
    expect(d.assignments.some((a) => a.formId === 'f-testosterone')).toBe(false);
    ops.recordChoice(d, RID, T, 'accept', '', 's-np');
    ops.pushConsent(d, RID, T, 's-np');
    ops.pushConsent(d, RID, T, 's-np');
    expect(d.assignments.filter((a) => a.formId === 'f-testosterone')).toHaveLength(1);
    expect(d.notices[d.notices.length - 1].text).toContain('Testosterone use consent');
  });
});

describe('N5 Approve and release', () => {
  it('is blocked until her choices are in and the pushed consent is signed', () => {
    const d = buildScenario('results');
    const r = () => ops.report(d, RID);
    expect(canRelease(d, r()).ok).toBe(false);
    ops.recordChoice(d, RID, 'pi-tirzepatide', 'decline', 'Not ready', 's-np');
    ops.recordChoice(d, RID, T, 'accept', '', 's-np');
    ops.acceptRemaining(d, RID, 's-np');
    const check = canRelease(d, r());
    expect(check.ok).toBe(false);
    expect(check.missing.join(' ')).toContain('consent not sent yet');
    expect(ops.releaseReport(d, RID, 's-np')).toBe(false);
    ops.pushConsent(d, RID, T, 's-np');
    expect(canRelease(d, r()).missing.join(' ')).toContain('waiting on her signature');
    ops.signForm(d, r().plan.find((i) => i.id === T)!.consentAssignmentId!, 'Testelle M');
    expect(canRelease(d, r()).ok).toBe(true);
  });

  it('scenario 5: released as v2, she is in her first 30 days, declined items are not ordered', () => {
    const d = buildScenario('released');
    const r = ops.report(d, RID);
    expect(r).toMatchObject({ status: 'released', version: 2, releasedById: 's-np' });
    expect(d.members.find((m) => m.id === 'm-testelle')!.phase).toBe('first_30');
    expect(d.orders.length).toBeGreaterThan(0);
    expect(d.orders.some((o) => o.planItemId === 'pi-tirzepatide')).toBe(false);
    expect(d.approvals[d.approvals.length - 1]).toMatchObject({ gate: 'release', reportVersion: 2 });
  });

  it('not ready sends it back to final review with a reason', () => {
    const d = buildScenario('results');
    ops.notReady(d, RID, 'Recheck VO2 with Jordan', 's-np');
    expect(ops.report(d, RID).finalReviewedAt).toBeUndefined();
    expect(getQueue(d, 'np').some((q) => q.key === `final-${RID}`)).toBe(true);
  });
});

describe('N6 Orders and the G1 next-day call', () => {
  it('open orders sit red on the NP and MA lists until placed', () => {
    const d = buildScenario('released');
    const o = d.orders[0];
    expect(getQueue(d, 'ma').some((q) => q.key === `order-${o.id}`)).toBe(true);
    ops.placeOrder(d, o.id, 's-ma');
    expect(d.orders[0]).toMatchObject({ status: 'placed', placedById: 's-ma' });
    expect(getQueue(d, 'np').some((q) => q.key === `order-${o.id}`)).toBe(false);
  });

  it('the next-day call is on the Guide list after release and leaves once logged', () => {
    const d = buildScenario('released');
    const item = getQueue(d, 'guide').find((q) => q.key === `nextday-${RID}`)!;
    expect(item.label).toBe('Next-day call: Testelle');
    ops.logCall(d, 'm-testelle', 's-guide', 'Settling in well', `nextday-${RID}`);
    expect(getQueue(d, 'guide').some((q) => q.key === `nextday-${RID}`)).toBe(false);
  });
});

describe('M10 SAGE → G6 → N7', () => {
  it('answers from her report with a citation, and passes everything else on', () => {
    expect(matchSage('What is my VMRI?').citation).toContain('Your VMRI');
    expect(matchSage('tell me a joke').reply).toContain("I'll pass it to your care team");
  });

  it('scenario 6: chest tightness raises an urgent flag pinned on the Guide and NP lists', () => {
    const d = buildScenario('safety');
    const f = d.flags[d.flags.length - 1];
    expect(f).toMatchObject({ source: 'sage', severity: 'urgent', status: 'open' });
    expect(d.sage[d.sage.length - 1].text).toContain('call 911');
    for (const role of ['guide', 'np'] as const) expect(getQueue(d, role)[0]).toMatchObject({ key: `flag-${f.id}`, priority: 0 });
  });

  it('escalating needs a note and moves it to the NP; closing needs an outcome and takes it off every list', () => {
    const d = buildScenario('safety');
    const f = d.flags[d.flags.length - 1];
    ops.flagAction(d, f.id, 'escalate', '', 's-guide');
    expect(d.flags.find((x) => x.id === f.id)!.status).toBe('open');
    ops.flagAction(d, f.id, 'call', '', 's-guide');
    ops.flagAction(d, f.id, 'escalate', 'Tightness since testosterone, no pain now', 's-guide');
    expect(getQueue(d, 'guide').some((q) => q.key === `flag-${f.id}`)).toBe(false);
    expect(getQueue(d, 'np')[0]).toMatchObject({ label: 'Escalated by Guide' });
    ops.flagAction(d, f.id, 'close', '', 's-np');
    expect(d.flags.find((x) => x.id === f.id)!.status).toBe('escalated');
    ops.flagAction(d, f.id, 'close', 'Called: muscular. Holding testosterone 1 week', 's-np');
    expect(d.flags.find((x) => x.id === f.id)).toMatchObject({ status: 'closed', closedById: 's-np' });
    expect(getQueue(d, 'np').some((q) => q.key === `flag-${f.id}`)).toBe(false);
    expect(d.timeline.filter((e) => e.kind === 'flag_action' || e.kind === 'flag_closed').length).toBe(3);
  });
});

describe('Scenario jumper', () => {
  it('every scenario marked ready builds without errors', () => {
    for (const sc of SCENARIOS.filter((x) => x.ready)) expect(() => buildScenario(sc.id)).not.toThrow();
  });
});
