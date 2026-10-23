import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { getQueue } from '../queues';
import { nextSlots } from '../../lib/slots';
import { toMs } from '../../lib/time';
import { BLOOD_DRAW_SLOTS } from '../../data/seed';

const MID = 'm-testelle';
const last = <T,>(xs: T[]) => xs[xs.length - 1];
// Day 0 after onboarding: blood draw booked for Wed 14 Oct, then confirmed by the MA.
function booked() {
  const d = buildScenario('day0');
  const t = d.members.find((m) => m.id === MID)!;
  ops.onboard(d, MID, { menoStatus: 'peri', goals: t.goals, milestones: t.milestones, slotAt: BLOOD_DRAW_SLOTS[0].at, byId: 's-guide' });
  const v = d.visits.find((x) => x.memberId === MID && x.type === 'blood_draw')!;
  ops.confirmVisit(d, v.id, 's-ma');
  return { d, v };
}
const draw = (d: ReturnType<typeof booked>['d']) => d.visits.find((x) => x.memberId === MID && x.type === 'blood_draw')!;

describe('slots', () => {
  it('offers only future weekday mornings and skips the current booking', () => {
    const now = '2026-10-16T09:00'; // a Friday, after the last blood-draw time
    const slots = nextSlots(now, 'blood_draw', '2026-10-19T07:30');
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(toMs(s.at)).toBeGreaterThan(toMs(now));
      expect([0, 6]).not.toContain(new Date(toMs(s.at)).getUTCDay());
    }
    expect(slots[0].at).toBe('2026-10-19T08:00');
    expect(slots.map((s) => s.at)).not.toContain('2026-10-19T07:30');
  });
});

describe('rescheduling the blood draw', () => {
  it('staff move: timeline entry, back to booked, member notified, MA confirm item returns', () => {
    const { d, v } = booked();
    expect(getQueue(d, 'ma').some((q) => q.key === `confirm-${v.id}`)).toBe(false);
    const notices = d.notices.length;
    expect(ops.rescheduleVisit(d, v.id, '2026-10-15T08:00', 's-guide', { reason: 'Member asked' })).toBe(true);
    expect(draw(d).at).toBe('2026-10-15T08:00');
    expect(draw(d).status).toBe('booked');
    const ev = last(d.timeline);
    expect(ev).toMatchObject({ kind: 'visit_rescheduled', by: 's-guide' });
    expect(ev.text).toContain('Thu 15 Oct · 8:00 am');
    expect(ev.text).toContain('Member asked');
    expect(d.notices.length).toBe(notices + 1);
    expect(last(d.notices).text).toContain('Thu 15 Oct · 8:00 am');
    expect(getQueue(d, 'ma').some((q) => q.key === `confirm-${v.id}`)).toBe(true);
  });

  it('staff can choose not to notify her', () => {
    const { d, v } = booked();
    const notices = d.notices.length;
    ops.rescheduleVisit(d, v.id, '2026-10-15T08:00', 's-ma', { tellMember: false });
    expect(d.notices.length).toBe(notices);
  });

  it('a member change logs as hers and sends no notice', () => {
    const { d, v } = booked();
    const notices = d.notices.length;
    expect(ops.rescheduleVisit(d, v.id, '2026-10-15T07:30', 'member')).toBe(true);
    expect(last(d.timeline).by).toBe('member');
    expect(d.notices.length).toBe(notices);
  });

  it('refuses a done draw, a past draw, or a new time in the past', () => {
    const done = buildScenario('intake_stalled'); // drawn on 14 Oct
    const dv = done.visits.find((x) => x.memberId === MID && x.type === 'blood_draw')!;
    const before = done.timeline.length;
    expect(ops.rescheduleVisit(done, dv.id, '2026-10-20T07:30', 's-guide')).toBe(false);
    expect(done.timeline.length).toBe(before);

    const { d, v } = booked();
    expect(ops.rescheduleVisit(d, v.id, '2026-10-12T07:30', 's-guide')).toBe(false);
    d.now = '2026-10-14T09:00'; // the booked time has passed but nobody marked it drawn
    expect(ops.rescheduleVisit(d, v.id, '2026-10-15T07:30', 's-guide')).toBe(false);
    expect(draw(d).at).toBe(BLOOD_DRAW_SLOTS[0].at);
  });
});

describe('rescheduling Your Vyta Day', () => {
  it('moves the date, logs it and notifies her when staff change it', () => {
    const d = buildScenario('labs_back');
    const notices = d.notices.length;
    expect(ops.rescheduleVytaDay(d, MID, '2026-10-29T10:00', 's-guide', { reason: 'Clinic change' })).toBe(true);
    expect(d.members.find((m) => m.id === MID)!.vytaDayAt).toBe('2026-10-29T10:00');
    expect(last(d.timeline)).toMatchObject({ kind: 'visit_rescheduled', by: 's-guide' });
    expect(d.notices.length).toBe(notices + 1);
  });

  it('refuses once the day has passed or she has moved on', () => {
    const d = buildScenario('labs_back');
    d.now = '2026-10-28T09:00';
    expect(ops.rescheduleVytaDay(d, MID, '2026-10-30T10:00', 'member')).toBe(false);
    const e = buildScenario('labs_back');
    e.members.find((m) => m.id === MID)!.phase = 'first_30';
    expect(ops.rescheduleVytaDay(e, MID, '2026-10-30T10:00', 's-guide')).toBe(false);
  });
});
