import type { DemoData } from './ops';
import {
  onboard, signForm, saveIntake, markDrawn, confirmVisit, labsReceived, finishDraft, skipIntakeToEnd, log,
  acceptSuggestions, editPlanItem, removePlanItem, reviewPlanItem, approvePreReview, approveWording, bookVytaDayVisit,
} from './ops';
import { TESTELLE_BASE, ROSTER, TESTELLE_INTAKE, BLOOD_DRAW_SLOTS } from '../data/seed';
import { INTAKE } from '../data/intake';
import { fillRequired } from '../lib/intakeFlow';

export type ScenarioId = 'day0' | 'intake_stalled' | 'labs_back' | 'vyta_day' | 'released' | 'safety' | 'quarterly';

export const SCENARIOS: { id: ScenarioId; label: string; ready: boolean }[] = [
  { id: 'day0', label: '1 · Day 0 – after discovery call', ready: true },
  { id: 'intake_stalled', label: '2 · Intake in progress (stalled)', ready: true },
  { id: 'labs_back', label: '3 · Labs back – draft for NP', ready: true },
  { id: 'vyta_day', label: '4 · Your Vyta Day – morning', ready: true },
  { id: 'released', label: '5 · After release – member home', ready: false },
  { id: 'safety', label: '6 · Safety flag raised', ready: false },
  { id: 'quarterly', label: '7 · 3-month review', ready: false },
];

function day0(): DemoData {
  const d: DemoData = {
    now: '2026-10-12T10:30',
    members: [structuredClone(TESTELLE_BASE), ...structuredClone(ROSTER)],
    assignments: [], visits: [], flags: [], followUps: [], timeline: [], notices: [],
    intake: {}, intakeDone: {}, results: [], reports: [], approvals: [], seq: 0,
  };
  log(d, 'm-testelle', 'system', 'lead', 'Consult request from the website', '2026-10-06T19:12');
  log(d, 'm-testelle', 's-guide', 'call', 'Discovery call with Maya: good fit, wants energy and strength back', '2026-10-09T15:00');
  log(d, 'm-testelle', 'system', 'payment', 'Payment received · Discover program', '2026-10-12T09:58');
  return d;
}

function intakeStalled(): DemoData {
  const d = day0();
  d.now = '2026-10-12T10:40';
  const t = d.members.find((m) => m.id === 'm-testelle')!;
  onboard(d, t.id, { menoStatus: 'peri', goals: t.goals, milestones: t.milestones, slotAt: BLOOD_DRAW_SLOTS[0].at, byId: 's-guide' });
  d.now = '2026-10-12T11:05';
  const consents = d.assignments.filter((a) => a.memberId === t.id && a.formId !== 'f-intake');
  signForm(d, consents[0].id, 'Testelle M');
  signForm(d, consents[1].id, 'Testelle M');
  d.now = '2026-10-12T16:20';
  const v = d.visits.find((x) => x.memberId === t.id)!;
  confirmVisit(d, v.id, 's-ma');
  // Intake: sections 1–2 done, half of section 3, on the evening of 13 Oct.
  d.now = '2026-10-13T20:10';
  for (const s of INTAKE.slice(0, 2)) {
    const ans = Object.fromEntries(s.questions.map((q) => [q.id, TESTELLE_INTAKE[q.id]]).filter(([, v]) => v !== undefined));
    saveIntake(d, t.id, s.id, { ...ans, ...fillRequired(s.questions, ans, 2026) }, true);
  }
  const s3 = INTAKE[2];
  const half = Object.fromEntries(s3.questions.slice(0, 5).map((q) => [q.id, TESTELLE_INTAKE[q.id]]));
  saveIntake(d, t.id, s3.id, half, false);
  d.now = '2026-10-14T07:42';
  markDrawn(d, v.id, 's-ma');
  d.now = '2026-10-16T09:00';
  return d;
}

// Intake finished, labs back on Mon 19 Oct and the draft built: Dana's pre-review morning.
function labsBack(): DemoData {
  const d = intakeStalled();
  d.now = '2026-10-16T19:30';
  skipIntakeToEnd(d, 'm-testelle');
  const v = d.visits.find((x) => x.memberId === 'm-testelle' && x.type === 'blood_draw')!;
  d.now = '2026-10-19T07:50';
  labsReceived(d, v.id, 's-ma');
  d.now = '2026-10-19T07:53';
  finishDraft(d, 'r-m-testelle-baseline');
  d.now = '2026-10-19T08:30';
  return d;
}

// Dana approved the pre-review on 19 Oct, Sienna checked the wording on 20 Oct. Wed 28 Oct, 8:15: Jordan's morning.
function vytaDay(): DemoData {
  const d = labsBack();
  const rid = 'r-m-testelle-baseline';
  d.now = '2026-10-19T09:40';
  acceptSuggestions(d, rid, 's-np');
  editPlanItem(d, rid, 'pi-testosterone', 'dose', '0.5 mg', 's-np');
  editPlanItem(d, rid, 'pi-iron', 'dose', '25 mg elemental', 's-np');
  removePlanItem(d, rid, 'pi-tirzepatide', true, 's-np');
  for (const item of ['pi-testosterone', 'pi-iron', 'pi-fiber', 'pi-strength', 'pi-winddown']) reviewPlanItem(d, rid, item, 's-np');
  approvePreReview(d, rid, 's-np');
  d.now = '2026-10-20T10:15';
  approveWording(d, rid, 's-coach');
  d.now = '2026-10-27T16:00';
  bookVytaDayVisit(d, 'm-testelle', 's-ma');
  d.now = '2026-10-28T08:15';
  return d;
}

export function buildScenario(id: ScenarioId): DemoData {
  if (id === 'vyta_day') return vytaDay();
  if (id === 'intake_stalled') return intakeStalled();
  if (id === 'labs_back') return labsBack();
  return day0();
}
