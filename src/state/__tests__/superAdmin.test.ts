import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { canApprovePreReview } from '../guards';
import { getQueue } from '../queues';
import { ACTION_ROLES, can, actingAs, queueActionKind, type StaffAction } from '../permissions';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import type { StaffRole } from '../../types';

const ADMIN = STAFF_BY_ROLE.admin;
const ACTIONS = Object.keys(ACTION_ROLES) as StaffAction[];
const ROLES: StaffRole[] = ['guide', 'ma', 'np', 'coach'];

describe('Super admin role checks', () => {
  it('is Quinn Harper, the clinic owner', () => {
    expect(STAFF.find((s) => s.id === ADMIN)).toMatchObject({ name: 'Quinn Harper', title: 'Clinic owner · Super admin' });
  });

  it('passes every role check any other role passes', () => {
    for (const a of ACTIONS) {
      expect(can('admin', a)).toBe(true);
      for (const r of ROLES) if (can(r, a)) expect(can('admin', a)).toBe(true);
    }
  });

  it('other roles stay limited to their own actions', () => {
    expect(can('ma', 'onboard')).toBe(false);
    expect(can('coach', 'send_form')).toBe(false);
    expect(can('guide', 'pre_review')).toBe(false);
    expect(can('np', 'confirm_visit')).toBe(false);
    expect(can('ma', 'confirm_visit')).toBe(true);
  });

  it('says whose action she is taking', () => {
    expect(actingAs('admin', 'pre_review')).toBe('Acting as NP');
    expect(actingAs('admin', 'confirm_visit')).toBe('Acting as MA');
    expect(actingAs('admin', 'onboard')).toBe('Acting as Guide');
    expect(actingAs('np', 'pre_review')).toBeNull();
  });

  it('sees every queue item, and can take the primary action on each', () => {
    for (const id of ['day0', 'intake_stalled', 'labs_back'] as const) {
      const d = buildScenario(id);
      const all = getQueue(d, 'admin');
      for (const r of ROLES) for (const item of getQueue(d, r)) expect(all.map((x) => x.key)).toContain(item.key);
      for (const item of all) {
        const kind = item.primary && queueActionKind(item.primary.action);
        if (kind) expect(can('admin', kind)).toBe(true);
        expect(item.roles.length).toBeGreaterThan(0);
      }
    }
  });

  it('gets Snooze on Guide tasks, like the Guide', () => {
    const d = buildScenario('day0');
    const t = getQueue(d, 'admin').find((x) => x.key === 't-maren')!;
    expect(t.secondary?.map((s) => s.label)).toContain('Snooze');
  });
});

describe('Super admin actions are recorded under her own id', () => {
  it('onboard (scenario 1)', () => {
    const d = buildScenario('day0');
    const m = d.members.find((x) => x.isLead && x.phase === 'join')!;
    const before = d.timeline.length;
    ops.onboard(d, m.id, { menoStatus: 'peri', goals: m.goals, milestones: m.milestones, slotAt: d.now, byId: ADMIN });
    expect(m.phase).toBe('intake_labs');
    const events = d.timeline.slice(before);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.by === ADMIN)).toBe(true);
    expect(d.assignments.filter((a) => a.memberId === m.id).every((a) => a.sentById === ADMIN)).toBe(true);
  });

  it('MA visit steps: confirm, mark drawn, labs received', () => {
    const d = buildScenario('day0');
    const m = d.members.find((x) => x.isLead && x.phase === 'join')!;
    ops.onboard(d, m.id, { menoStatus: 'peri', goals: m.goals, milestones: m.milestones, slotAt: d.now, byId: ADMIN });
    const v = d.visits.find((x) => x.memberId === m.id && x.type === 'blood_draw')!;
    const before = d.timeline.length;
    if (v.status === 'booked') ops.confirmVisit(d, v.id, ADMIN);
    ops.markDrawn(d, v.id, ADMIN);
    ops.labsReceived(d, v.id, ADMIN);
    expect(v.labsReceivedAt).toBeTruthy();
    const added = d.timeline.slice(before);
    expect(added.length).toBeGreaterThan(0);
    expect(added.filter((e) => e.by !== 'system').every((e) => e.by === ADMIN)).toBe(true);
  });

  it('nudge, snooze and log call', () => {
    const d = buildScenario('intake_stalled');
    const m = d.members.find((x) => x.isLead)!;
    ops.nudge(d, m.id, ADMIN, 'Reminder');
    ops.logCall(d, m.id, ADMIN, 'Left a voicemail');
    ops.snooze(d, m.id, `intake-${m.id}`, 'Travelling', d.now, ADMIN);
    expect(d.timeline.slice(-3).every((e) => e.by === ADMIN)).toBe(true);
  });
});

describe('Guards still block the super admin', () => {
  const RID = 'r-m-testelle-baseline';

  it('approve stays blocked while findings are undecided', () => {
    const d = buildScenario('labs_back');
    const r = d.reports.find((x) => x.id === RID)!;
    expect(canApprovePreReview(r, d.results).ok).toBe(false);
    expect(ops.approvePreReview(d, RID, ADMIN)).toBe(false);
    expect(r.status).toBe('draft');
    expect(d.approvals.filter((a) => a.reportId === RID)).toHaveLength(0);
  });

  it('approve goes through once resolved, with her as the approver (scenario 3)', () => {
    const d = buildScenario('labs_back');
    ops.acceptSuggestions(d, RID, ADMIN);
    ops.editPlanItem(d, RID, 'pi-testosterone', 'dose', '0.5 mg', ADMIN);
    ops.editPlanItem(d, RID, 'pi-iron', 'dose', '25 mg elemental', ADMIN);
    ops.removePlanItem(d, RID, 'pi-tirzepatide', true, ADMIN);
    for (const id of ['pi-testosterone', 'pi-iron', 'pi-fiber', 'pi-strength', 'pi-winddown']) ops.reviewPlanItem(d, RID, id, ADMIN);
    expect(ops.approvePreReview(d, RID, ADMIN)).toBe(true);
    expect(d.approvals.slice(-1)[0]).toMatchObject({ byId: ADMIN, outcome: 'approved' });
    expect(d.timeline.slice(-1)[0].text).toContain('Quinn Harper');
  });

  it('send back needs a reason, even for her', () => {
    const d = buildScenario('labs_back');
    const r = d.reports.find((x) => x.id === RID)!;
    ops.sendBackDraft(d, RID, '  ', ADMIN);
    expect(r.status).toBe('draft');
    ops.sendBackDraft(d, RID, 'Recheck ferritin', ADMIN);
    expect(d.approvals.slice(-1)[0]).toMatchObject({ byId: ADMIN, outcome: 'sent_back' });
  });
});
