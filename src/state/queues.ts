// Queue items are derived from data, never stored (docs/SCHEMA.md §2).
import type { QueueItem, StaffRole, QueueCategory } from '../types';
import type { DemoData } from './ops';
import { STATIC_TASKS } from '../data/seed';
import { ageLabel, daysBetween, fmtDateTime, fmtDate, toMs } from '../lib/time';

function snoozed(d: DemoData, taskKey: string) {
  return d.followUps.some((f) => f.taskKey === taskKey && toMs(f.dueAt) > toMs(d.now));
}

export function getQueue(d: DemoData, role: StaffRole): QueueItem[] {
  const items: (QueueItem & { roles: StaffRole[] })[] = [];

  for (const f of d.flags.filter((x) => x.status !== 'closed')) {
    items.push({
      key: `flag-${f.id}`, memberId: f.memberId, category: 'safety', roles: f.severity === 'urgent' ? ['guide', 'np'] : ['guide'],
      label: 'Safety concern', reason: f.quote, ageLabel: ageLabel(f.raisedAt, d.now), priority: 0,
      primary: { label: 'Open', action: { type: 'open_record', memberId: f.memberId } },
    });
  }

  for (const m of d.members.filter((x) => x.isLead)) {
    if (m.phase === 'join') {
      items.push({
        key: `onboard-${m.id}`, memberId: m.id, category: 'onboard', roles: ['guide'],
        label: 'Ready to onboard', reason: 'Discovery call done · paid today', ageLabel: ageLabel(m.joinedAt, d.now), priority: 1,
        primary: { label: 'Onboard', action: { type: 'onboard', memberId: m.id } },
      });
    }
    const consents = d.assignments.filter((a) => a.memberId === m.id && a.formId !== 'f-intake');
    const unsigned = consents.filter((a) => a.status !== 'signed');
    if (consents.length && unsigned.length && daysBetween(unsigned[0].sentAt, d.now) >= 1) {
      const key = `consents-${m.id}`;
      if (!snoozed(d, key)) items.push({
        key, memberId: m.id, category: 'forms', roles: ['guide'],
        label: `Consents: ${consents.length - unsigned.length} of ${consents.length} signed`,
        reason: `Waiting on: ${unsigned.length} form${unsigned.length > 1 ? 's' : ''}`, ageLabel: ageLabel(unsigned[0].sentAt, d.now), priority: 2,
        primary: { label: 'Nudge', action: { type: 'nudge', memberId: m.id, taskKey: key, text: 'You have a consent form left to sign. It takes a minute.' } },
        secondary: [{ label: 'Snooze', action: { type: 'snooze', memberId: m.id, taskKey: key } }],
      });
    }
    const intake = d.assignments.find((a) => a.memberId === m.id && a.formId === 'f-intake');
    if (intake && intake.status !== 'signed' && daysBetween(intake.sentAt, d.now) >= 2) {
      const key = `intake-${m.id}`;
      const pct = Math.round((intake.progress ?? 0) * 100);
      const since = intake.startedAt ?? intake.sentAt;
      if (!snoozed(d, key)) items.push({
        key, memberId: m.id, category: 'overdue', roles: ['guide'],
        label: `Intake ${pct}% · ${daysBetween(since, d.now)} days`,
        reason: intake.status === 'sent' ? 'Not started yet' : 'Stopped part-way · labs are moving ahead',
        ageLabel: ageLabel(since, d.now), priority: 2,
        primary: { label: 'Nudge', action: { type: 'nudge', memberId: m.id, taskKey: key, text: 'Your intake is almost there. Pick up where you left off: your answers are saved.' } },
        secondary: [
          { label: 'Log call', action: { type: 'log_call', memberId: m.id, taskKey: key } },
          { label: 'Snooze', action: { type: 'snooze', memberId: m.id, taskKey: key } },
        ],
      });
    }
    for (const v of d.visits.filter((x) => x.memberId === m.id && x.type === 'blood_draw')) {
      if (v.status === 'booked') items.push({
        key: `confirm-${v.id}`, memberId: m.id, category: 'visits', roles: ['ma'],
        label: 'Confirm blood draw', reason: `${fmtDateTime(v.at)} · fasting`, ageLabel: ageLabel(d.now, v.at), priority: 2,
        primary: { label: 'Confirm', action: { type: 'confirm_visit', visitId: v.id } },
      });
      if ((v.status === 'booked' || v.status === 'confirmed') && toMs(v.at) <= toMs(d.now)) items.push({
        key: `draw-${v.id}`, memberId: m.id, category: 'visits', roles: ['ma', 'guide'],
        label: 'Blood draw today', reason: fmtDateTime(v.at), ageLabel: '—', priority: 1,
        primary: { label: 'Mark drawn', action: { type: 'mark_drawn', visitId: v.id } },
      });
      if (v.status === 'confirmed' && toMs(v.at) > toMs(d.now)) items.push({
        key: `upcoming-${v.id}`, memberId: m.id, category: 'visits', roles: ['ma'],
        label: 'Blood draw booked', reason: `${fmtDateTime(v.at)} · confirmed`, ageLabel: '—', priority: 3,
        primary: { label: 'Mark drawn', action: { type: 'mark_drawn', visitId: v.id } },
      });
      if (v.status === 'done' && !v.labsReceivedAt) items.push({
        key: `labs-${v.id}`, memberId: m.id, category: 'labs', roles: ['ma'],
        label: 'Labs awaited', reason: `Drawn ${fmtDate(v.at)} · chase the lab if not back by day 3`, ageLabel: ageLabel(v.at, d.now), priority: 2,
        primary: { label: 'Labs received', action: { type: 'labs_received', visitId: v.id } },
      });
      if (v.labsReceivedAt) items.push({
        key: `draft-${v.id}`, memberId: m.id, category: 'reviews', roles: ['np'],
        label: 'Labs received · draft next', reason: 'The draft HEAL plan and pre-review arrive in the next build', ageLabel: ageLabel(v.labsReceivedAt, d.now), priority: 2,
        primary: { label: 'Open', action: { type: 'open_record', memberId: m.id } },
      });
    }
  }

  for (const t of STATIC_TASKS) {
    if (snoozed(d, t.id)) continue;
    items.push({
      key: t.id, memberId: t.memberId, category: t.category, roles: t.roles, label: t.label, reason: t.reason,
      ageLabel: t.ageLabel, priority: t.priority,
      primary: { label: 'Open', action: { type: 'open_record', memberId: t.memberId } },
      secondary: t.roles.includes('guide') && role === 'guide' ? [{ label: 'Snooze', action: { type: 'snooze', memberId: t.memberId, taskKey: t.id } }] : undefined,
    });
  }

  return items
    .filter((i) => role === 'admin' || i.roles.includes(role))
    .sort((a, b) => a.priority - b.priority)
    .map(({ roles, ...rest }) => rest);
}

export const CATEGORY_LABEL: Record<QueueCategory, string> = {
  safety: 'Safety', onboard: 'To onboard', overdue: 'Overdue steps', forms: 'Forms', labs: 'Labs', visits: 'Visits',
  reviews: 'Reviews', orders: 'Orders', messages: 'Messages', engagement: 'Drifting',
};

export const ROLE_TILES: Record<StaffRole, QueueCategory[]> = {
  guide: ['safety', 'onboard', 'overdue', 'forms', 'messages'],
  ma: ['visits', 'labs', 'overdue'],
  np: ['safety', 'reviews', 'orders'],
  coach: ['reviews', 'engagement'],
  admin: ['safety', 'overdue', 'visits', 'reviews', 'messages'],
};
