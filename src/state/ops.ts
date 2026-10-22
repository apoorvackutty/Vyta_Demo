// Pure data operations. Each op mutates a cloned DemoData draft. Every op writes a TimelineEvent.
import type {
  Member, FormAssignment, Visit, SafetyFlag, FollowUp, TimelineEvent, MemberNotice, IntakeValue, MenoStatus, Milestone,
} from '../types';
import { ONBOARDING_FORM_IDS, FORMS, CLINIC_LOCATION } from '../data/seed';
import { INTAKE } from '../data/intake';
import { fmtDateTime, fmtDate } from '../lib/time';

export interface DemoData {
  now: string;
  members: Member[];
  assignments: FormAssignment[];
  visits: Visit[];
  flags: SafetyFlag[];
  followUps: FollowUp[];
  timeline: TimelineEvent[];
  notices: MemberNotice[];
  intake: Record<string, Record<string, IntakeValue>>;
  intakeDone: Record<string, string[]>; // completed section ids per member
  seq: number;
}

const id = (d: DemoData, p: string) => `${p}-${++d.seq}`;
export const member = (d: DemoData, memberId: string) => {
  const m = d.members.find((x) => x.id === memberId);
  if (!m) throw new Error(`Unknown member ${memberId}`);
  return m;
};
export function log(d: DemoData, memberId: string, by: string, kind: string, text: string, at = d.now) {
  d.timeline.push({ id: id(d, 'ev'), memberId, at, by, kind, text });
}
export function notify(d: DemoData, memberId: string, text: string, at = d.now) {
  d.notices.push({ id: id(d, 'n'), memberId, at, text, read: false });
}
const formTitle = (formId: string) => FORMS.find((f) => f.id === formId)?.title ?? formId;

export interface OnboardInput {
  menoStatus: MenoStatus;
  goals: string[];
  milestones: Milestone[];
  slotAt: string;
  byId: string;
}

export function onboard(d: DemoData, memberId: string, input: OnboardInput) {
  const m = member(d, memberId);
  m.menoStatus = input.menoStatus;
  m.goals = input.goals.filter((g) => g.trim());
  m.milestones = input.milestones;
  m.phase = 'intake_labs';
  m.step = 'Intake sent · blood draw booked';
  m.lastContactAt = d.now;
  for (const formId of [...ONBOARDING_FORM_IDS, 'f-intake']) {
    d.assignments.push({ id: id(d, 'fa'), memberId, formId, sentAt: d.now, sentById: input.byId, status: 'sent', progress: 0 });
  }
  d.visits.push({ id: id(d, 'v'), memberId, type: 'blood_draw', at: input.slotAt, location: CLINIC_LOCATION, status: 'booked' });
  log(d, memberId, input.byId, 'goals', `Goals recorded and ${m.milestones.filter((x) => x.selected).length} milestones set`);
  log(d, memberId, input.byId, 'forms_sent', '3 consents and the intake form sent to her phone');
  log(d, memberId, input.byId, 'visit_booked', `Blood draw booked for ${fmtDateTime(input.slotAt)}`);
  notify(d, memberId, `Welcome to Vyta. Your first steps are ready, and your blood draw is booked for ${fmtDateTime(input.slotAt)}.`);
}

export function signForm(d: DemoData, assignmentId: string, name: string) {
  const a = d.assignments.find((x) => x.id === assignmentId);
  if (!a || a.status === 'signed') return;
  a.status = 'signed';
  a.signedAt = d.now;
  a.signedName = name;
  log(d, a.memberId, 'member', 'form_signed', `Signed "${formTitle(a.formId)}" (${FORMS.find((f) => f.id === a.formId)?.version})`);
  refreshStep(d, a.memberId);
}

export function sendForm(d: DemoData, memberId: string, formId: string, byId: string) {
  d.assignments.push({ id: id(d, 'fa'), memberId, formId, sentAt: d.now, sentById: byId, status: 'sent' });
  log(d, memberId, byId, 'form_sent', `Sent "${formTitle(formId)}" to her phone`);
  notify(d, memberId, `New form to sign: ${formTitle(formId)}.`);
}

const TOTAL_Q = INTAKE.reduce((n, s) => n + s.questions.length, 0);
function answered(v: IntakeValue | undefined) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

export function saveIntake(d: DemoData, memberId: string, sectionId: string, answers: Record<string, IntakeValue>, sectionComplete: boolean) {
  const a = d.assignments.find((x) => x.memberId === memberId && x.formId === 'f-intake');
  if (!a) return;
  d.intake[memberId] = { ...(d.intake[memberId] ?? {}), ...answers };
  const done = new Set(d.intakeDone[memberId] ?? []);
  if (sectionComplete) done.add(sectionId);
  d.intakeDone[memberId] = [...done];
  const count = Object.values(d.intake[memberId]).filter(answered).length;
  a.progress = Math.min(1, count / TOTAL_Q);
  if (a.status === 'sent') {
    a.status = 'in_progress';
    a.startedAt = d.now;
    log(d, memberId, 'member', 'intake_started', 'Started the intake form');
  }
  const title = INTAKE.find((s) => s.id === sectionId)?.title ?? sectionId;
  if (sectionComplete) log(d, memberId, 'member', 'intake_section', `Finished intake section: ${title}`);
  if (done.size === INTAKE.length) {
    a.status = 'signed';
    a.signedAt = d.now;
    a.progress = 1;
    log(d, memberId, 'member', 'intake_done', 'Completed the intake form');
    // Safety screen: any "Yes" on self-harm, seizures/cardiac, or urgent concerns raises a flag.
    const ans = d.intake[memberId];
    const hits = INTAKE.flatMap((s) => s.questions).filter((q) => q.safety && ans[q.id] === 'Yes');
    for (const q of hits) {
      d.flags.push({ id: id(d, 'flag'), memberId, source: 'intake', quote: `Intake: "${q.text}" answered Yes`, severity: 'urgent', status: 'open', raisedAt: d.now });
      log(d, memberId, 'system', 'flag_raised', `Safety flag raised from intake (${q.id})`);
    }
  }
  refreshStep(d, memberId);
}

export function nudge(d: DemoData, memberId: string, byId: string, text: string) {
  notify(d, memberId, text);
  log(d, memberId, byId, 'nudge', `In-app reminder sent: "${text}"`);
}

export function snooze(d: DemoData, memberId: string, taskKey: string, reason: string, dueAt: string, byId: string) {
  d.followUps = d.followUps.filter((f) => f.taskKey !== taskKey);
  d.followUps.push({ id: id(d, 'fu'), memberId, taskKey, reason, dueAt, byId });
  log(d, memberId, byId, 'snooze', `Follow-up set for ${fmtDate(dueAt)}: ${reason}`);
}

export function logCall(d: DemoData, memberId: string, byId: string, outcome: string) {
  member(d, memberId).lastContactAt = d.now;
  log(d, memberId, byId, 'call', `Call logged: ${outcome}`);
}

export function confirmVisit(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.status = 'confirmed';
  log(d, v.memberId, byId, 'visit_confirmed', `Blood draw confirmed with her for ${fmtDateTime(v.at)}`);
  notify(d, v.memberId, `Your blood draw is confirmed for ${fmtDateTime(v.at)}. Remember to fast for 12 hours.`);
}

export function markDrawn(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.status = 'done';
  log(d, v.memberId, byId, 'blood_drawn', 'Blood drawn and sent to the lab');
  refreshStep(d, v.memberId);
}

export function labsReceived(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.labsReceivedAt = d.now;
  log(d, v.memberId, byId, 'labs_received', 'Lab results received (sample lab PDF attached)');
  notify(d, v.memberId, 'Your lab results are in. Your care team is preparing your report.');
  refreshStep(d, v.memberId);
}

export function refreshStep(d: DemoData, memberId: string) {
  const m = member(d, memberId);
  if (m.phase !== 'intake_labs') return;
  const intake = d.assignments.find((x) => x.memberId === memberId && x.formId === 'f-intake');
  const draw = d.visits.find((x) => x.memberId === memberId && x.type === 'blood_draw');
  const pct = Math.round((intake?.progress ?? 0) * 100);
  const intakePart = intake?.status === 'signed' ? 'Intake done' : `Intake ${pct}%`;
  const labsPart = draw?.labsReceivedAt ? 'labs received' : draw?.status === 'done' ? 'labs awaited' : 'blood draw booked';
  m.step = `${intakePart} · ${labsPart}`;
}
