import type { DemoData } from './ops';
import {
  onboard, signForm, saveIntake, markDrawn, confirmVisit, labsReceived, finishDraft, skipIntakeToEnd, log,
  acceptSuggestions, editPlanItem, reviewPlanItem, approvePreReview, approveWording, bookVytaDayVisit, editWording,
  vytaDayVisit, startVisit, uploadStation, markStationChecked, saveFunctional, skipStation, passCompleteness, type FunctionalEntry,
  report, decideNewFinding, finishFinalReview, recordChoice, pushConsent, acceptRemaining, releaseReport, placeOrder, askSage,
} from './ops';
import { vytaDayFindings } from './guards';
import { SAGE_SCRIPT } from '../data/sage';

const RID = 'r-m-testelle-baseline';
import { FUNCTIONAL } from '../data/stations';
import { WORDING_SUGGESTIONS } from '../data/wording';
import { TESTELLE_BASE, ROSTER, TESTELLE_INTAKE, BLOOD_DRAW_SLOTS } from '../data/seed';
import { INTAKE } from '../data/intake';
import { fillRequired } from '../lib/intakeFlow';

export type ScenarioId = 'day0' | 'intake_stalled' | 'labs_back' | 'wording' | 'vyta_day' | 'tests_done' | 'results' | 'released' | 'safety' | 'quarterly';

export const SCENARIOS: { id: ScenarioId; label: string; ready: boolean }[] = [
  { id: 'day0', label: '1 · Day 0 – after discovery call', ready: true },
  { id: 'intake_stalled', label: '2 · Intake in progress (stalled)', ready: true },
  { id: 'labs_back', label: '3 · Labs back – draft for NP', ready: true },
  { id: 'wording', label: '3b · Pre-review approved – wording for Coach', ready: true },
  { id: 'vyta_day', label: '4 · Your Vyta Day – morning', ready: true },
  { id: 'tests_done', label: '4b · Tests done – final review for NP', ready: true },
  { id: 'results', label: '4c · Final review done – results conversation', ready: true },
  { id: 'released', label: '5 · After release – member home', ready: true },
  { id: 'safety', label: '6 · Safety flag raised', ready: true },
  { id: 'quarterly', label: '7 · 3-month review', ready: false },
];

function day0(): DemoData {
  const d: DemoData = {
    now: '2026-10-12T10:30',
    members: [structuredClone(TESTELLE_BASE), ...structuredClone(ROSTER)],
    assignments: [], visits: [], flags: [], followUps: [], timeline: [], notices: [],
    intake: {}, intakeDone: {}, results: [], reports: [], approvals: [], orders: [], sage: [], seq: 0,
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

// Dana approved the pre-review on 19 Oct. Tue 20 Oct, 10:00: the draft waits on Sienna's wording review (C1).
// Tirzepatide stays in the plan so Testelle can decline it at the results conversation (SAMPLE_DATA §7).
function wording(): DemoData {
  const d = labsBack();
  const rid = 'r-m-testelle-baseline';
  // Maya's nudge worked: the last onboarding consent was signed on Sun 18 Oct.
  d.now = '2026-10-18T19:05';
  for (const a of d.assignments.filter((x) => x.memberId === 'm-testelle' && x.status !== 'signed' && x.formId !== 'f-intake')) signForm(d, a.id, 'Testelle M');
  d.now = '2026-10-19T09:40';
  acceptSuggestions(d, rid, 's-np');
  editPlanItem(d, rid, 'pi-testosterone', 'dose', '0.5 mg', 's-np');
  editPlanItem(d, rid, 'pi-iron', 'dose', '25 mg elemental', 's-np');
  editPlanItem(d, rid, 'pi-tirzepatide', 'dose', '2.5 mg', 's-np');
  editPlanItem(d, rid, 'pi-tirzepatide', 'route', 'Subcutaneous injection', 's-np');
  for (const item of ['pi-testosterone', 'pi-iron', 'pi-tirzepatide', 'pi-fiber', 'pi-strength', 'pi-winddown']) reviewPlanItem(d, rid, item, 's-np');
  approvePreReview(d, rid, 's-np');
  d.now = '2026-10-20T10:00';
  return d;
}

// Sienna checked the wording on 20 Oct (softening one focus area). Wed 28 Oct, 8:15: Jordan's morning.
function vytaDay(): DemoData {
  const d = wording();
  const rid = 'r-m-testelle-baseline';
  d.now = '2026-10-20T10:15';
  editWording(d, rid, 'focus-2', WORDING_SUGGESTIONS['focus-2'], 's-coach');
  approveWording(d, rid, 's-coach');
  d.now = '2026-10-27T16:00';
  bookVytaDayVisit(d, 'm-testelle', 's-ma');
  d.now = '2026-10-28T08:15';
  return d;
}

// Jordan runs the stations in clinic order (demo script step 5): ShapeScale skipped, scanner offline. 9:40: with Dana.
export function testsDone(): DemoData {
  const d = vytaDay();
  const v = vytaDayVisit(d, 'm-testelle')!;
  const at = (t: string) => { d.now = `2026-10-28T${t}`; };
  at('08:32'); startVisit(d, v.id, 's-ma');
  at('08:41'); uploadStation(d, v.id, 'inbody', 's-ma'); markStationChecked(d, v.id, 'inbody', 's-ma');
  at('08:58'); saveFunctional(d, v.id, Object.fromEntries(FUNCTIONAL.map((t) => [t.id, t.seed])) as FunctionalEntry, 's-ma');
  at('09:02'); skipStation(d, v.id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
  at('09:24'); uploadStation(d, v.id, 'vo2', 's-ma'); markStationChecked(d, v.id, 'vo2', 's-ma');
  at('09:26'); passCompleteness(d, v.id, 's-ma');
  at('09:40');
  return d;
}

// Dana decides the new findings and finishes the final review while Testelle is with Sienna. 10:30: results conversation.
function results(): DemoData {
  const d = testsDone();
  const r = report(d, RID);
  const v = vytaDayVisit(d, 'm-testelle')!;
  d.now = '2026-10-28T09:52';
  for (const x of vytaDayFindings(r, d.results.filter((res) => res.visitId === v.id))) decideNewFinding(d, RID, x.result.id, 'treat', 's-np');
  finishFinalReview(d, RID, 's-np');
  d.now = '2026-10-28T10:30';
  return d;
}

// Demo script steps 8–10: she declines tirzepatide, accepts testosterone and signs its consent; Dana releases v2. 11:00: member home.
function released(): DemoData {
  const d = results();
  d.now = '2026-10-28T10:36';
  recordChoice(d, RID, 'pi-tirzepatide', 'decline', 'Not ready for injections yet', 's-np');
  recordChoice(d, RID, 'pi-testosterone', 'accept', '', 's-np');
  pushConsent(d, RID, 'pi-testosterone', 's-np');
  acceptRemaining(d, RID, 's-np');
  d.now = '2026-10-28T10:41';
  signForm(d, report(d, RID).plan.find((i) => i.id === 'pi-testosterone')!.consentAssignmentId!, 'Testelle M');
  d.now = '2026-10-28T10:48';
  releaseReport(d, RID, 's-np');
  d.now = '2026-10-28T11:00';
  return d;
}

// Thu 29 Oct, 11:20: Testelle tells SAGE about chest tightness. 11:25: it's pinned on Maya's and Dana's lists.
function safety(): DemoData {
  const d = released();
  d.now = '2026-10-29T09:05';
  for (const o of d.orders) placeOrder(d, o.id, 's-np');
  d.now = '2026-10-29T11:20';
  askSage(d, 'm-testelle', SAGE_SCRIPT.find((t) => t.id === 'chest')!.chip);
  d.now = '2026-10-29T11:25';
  return d;
}

export function buildScenario(id: ScenarioId): DemoData {
  if (id === 'results') return results();
  if (id === 'released') return released();
  if (id === 'safety') return safety();
  if (id === 'tests_done') return testsDone();
  if (id === 'wording') return wording();
  if (id === 'vyta_day') return vytaDay();
  if (id === 'intake_stalled') return intakeStalled();
  if (id === 'labs_back') return labsBack();
  return day0();
}
