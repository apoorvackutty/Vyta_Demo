// Member app from Your Vyta Day on: M7 agenda (live), M8 Report, M9 My plan, M10 SAGE, and home after release.
// Nothing clinical shows until the report is released (CLAUDE.md hard rule).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Check, ChevronRight, Circle, Clock, FileSignature, FileText, ClipboardCheck, Lock, MinusCircle, Send, Sparkles, Phone } from 'lucide-react';
import { useDemo } from '../../state/store';
import { ops } from '../../state/store';
import { Button, Chip, ProgressBar, inputCls, type Tone } from '../../components/ui';
import { BandChip } from '../../components/domain';
import { STAFF, FORMS } from '../../data/seed';
import { STATIONS } from '../../data/stations';
import { PLAN_GROUPS } from '../../data/protocol';
import { SAGE_SCRIPT } from '../../data/sage';
import { VMRI_BAND_LABEL } from '../../lib/scores';
import { fmtDate, fmtTime } from '../../lib/time';
import { MEMBER_ID, Top, useNavigate } from './memberKit';
import type { PlanItem, Report, Result } from '../../types';

const staff = (id?: string) => STAFF.find((s) => s.id === id);
const first = (id?: string) => staff(id)?.name.split(' ')[0] ?? '';
const npSign = (id?: string) => `${staff(id)?.name ?? ''}, ${staff(id)?.title === 'Nurse Practitioner' ? 'NP' : staff(id)?.title ?? ''}`;

type StepState = 'done' | 'now' | 'next' | 'later' | 'skipped';
export function useDayState() {
  const s = useDemo();
  const m = s.members.find((x) => x.id === MEMBER_ID)!;
  const report = s.reports.find((r) => r.memberId === MEMBER_ID && r.kind === 'baseline');
  const visit = s.visits.find((v) => v.memberId === MEMBER_ID && v.type === 'vyta_day' && v.stations);
  const released = report?.status === 'released';
  const isToday = !!visit && visit.at.slice(0, 10) === s.now.slice(0, 10);
  // Treatment consents pushed from the plan that she hasn't signed yet: they surface on M7 and Home.
  const pushed = s.assignments.filter((a) => a.memberId === MEMBER_ID && FORMS.find((f) => f.id === a.formId)?.kind === 'treatment_consent');
  const toSign = pushed.filter((a) => a.status !== 'signed');
  return { s, m, report, visit, released, isToday, toSign, pushed };
}

// "Your Vyta Day" steps in clinic order, each with its live state.
function daySteps(d: ReturnType<typeof useDayState>) {
  const { visit, report, released } = d;
  if (!visit) return [];
  const started = ops.visitStarted(visit);
  const testsDone = visit.completeness === 'passed';
  const talking = !!report?.plan.some((i) => i.memberChoice) || d.pushed.length > 0;
  const steps: { id: string; label: string; sub: string; state: StepState }[] = [
    { id: 'checkin', label: 'Check in', sub: `${fmtTime(visit.at)} · with ${first(visit.maId)}, your MA`, state: started ? 'done' : 'now' },
  ];
  let nextGiven = !started;
  for (const st of STATIONS) {
    const status = visit.stations![st.id];
    const state: StepState = status === 'done' ? 'done' : status === 'skipped' ? 'skipped' : status === 'in_progress' ? 'now' : !nextGiven && started ? 'next' : 'later';
    if (state === 'now' || state === 'next') nextGiven = true;
    steps.push({ id: st.id, label: st.label, sub: STATION_SUB[st.id][state === 'skipped' ? 1 : 0], state });
  }
  const coach: StepState = !testsDone ? (nextGiven ? 'later' : 'next') : talking || released ? 'done' : 'now';
  steps.push({ id: 'coach', label: `Coach session with ${first(d.m.coachId)}`, sub: 'While we finalise your report: 20 minutes with your coach on your goals.', state: coach });
  const results: StepState = released ? 'done' : talking ? 'now' : coach === 'now' ? 'next' : 'later';
  steps.push({ id: 'results', label: `Results with ${first(d.m.npId)}, your NP`, sub: report?.finalReviewedAt && !talking && !released ? `${first(d.m.npId)} has your report ready and will come and find you.` : 'Your scores, your top 3 focus areas and your plan, and what you want to start.', state: results });
  steps.push({ id: 'leave', label: 'Leave with your report and plan', sub: released ? `Released ${fmtTime(report!.releasedAt!)}. It's in the Report and My plan tabs.` : 'They appear in this app as soon as your NP approves them.', state: released ? 'done' : 'later' });
  return steps;
}
const STATION_SUB: Record<string, [string, string]> = {
  inbody: ['Body composition scan, about 2 minutes', 'Not today. We will do it at your next visit.'],
  functional: ['Grip, carry, balance and walking tests', 'Not today. We will do it at your next visit.'],
  shapescale: ['3D body shape scan', "Not today: the scanner is offline. We'll do it at your 3-month visit, and it doesn't count against your scores."],
  vo2: ['Fitness test on the bike, about 15 minutes', 'Not today. We will do it at your next visit.'],
};
const STEP_LOOK: Record<StepState, { word: string; tone: Tone; Icon: typeof Check }> = {
  done: { word: 'Done', tone: 'ok', Icon: Check }, now: { word: 'Now', tone: 'plum', Icon: Clock },
  next: { word: 'Up next', tone: 'info', Icon: ChevronRight }, later: { word: 'Later', tone: 'neutral', Icon: Circle },
  skipped: { word: 'Not today', tone: 'watch', Icon: MinusCircle },
};

function ConsentPrompts({ toSign }: { toSign: ReturnType<typeof useDayState>['toSign'] }) {
  const nav = useNavigate();
  if (!toSign.length) return null;
  return (
    <div className="mx-4 mt-4 space-y-2">
      {toSign.map((a) => {
        const f = FORMS.find((x) => x.id === a.formId)!;
        return (
          <button key={a.id} onClick={() => nav(`/forms/${a.id}`)} className="flex min-h-[64px] w-full items-center gap-3 rounded-mcard border-2 border-terracotta-500 bg-paper p-4 text-left shadow-card">
            <FileSignature size={22} className="shrink-0 text-terracotta-700" aria-hidden="true" />
            <span className="flex-1"><span className="block text-[15px] font-semibold text-plum-900">Please sign: {f.title}</span><span className="block text-[13px] text-muted">Sent by {first(a.sentById)} just now · takes a minute</span></span>
            <ChevronRight size={18} className="text-muted" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

// M7: today's agenda, updating live as staff act.
export function VytaDayAgenda() {
  const d = useDayState();
  const steps = daySteps(d);
  if (!d.visit) {
    return <div className="pb-6"><Top title="Your Vyta Day" back="/home" /><p className="p-6 text-center text-[15px] text-plum-900">Your Vyta Day is booked once your report is ready. We'll let you know here.</p></div>;
  }
  const done = steps.filter((x) => x.state === 'done' || x.state === 'skipped').length;
  return (
    <div className="pb-6">
      <Top title="Your Vyta Day" back="/home" />
      <div className="mx-4 mt-4 rounded-mcard bg-plum-700 p-4 text-paper shadow-card">
        <p className="text-[13px] opacity-80">{fmtDate(d.visit.at)} · {d.visit.location}</p>
        <p className="font-display text-[26px] font-semibold leading-tight">{d.released ? 'All done. Thank you!' : d.isToday ? "Today's plan" : 'Your plan for the day'}</p>
        <p className="mt-1 text-[14px] opacity-90" aria-live="polite">{done} of {steps.length} done</p>
        <ProgressBar value={done / steps.length} label="Your Vyta Day progress" className="mt-2" />
      </div>
      <ConsentPrompts toSign={d.toSign} />
      <ol className="m-4 rounded-mcard bg-paper p-4 shadow-card" aria-label="Today's agenda">
        {steps.map((st, i) => {
          const look = STEP_LOOK[st.state];
          return (
            <li key={st.id} className="relative flex gap-3 pb-5 last:pb-0" aria-current={st.state === 'now' ? 'step' : undefined}>
              {i < steps.length - 1 && <span className={clsx('absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5', st.state === 'done' || st.state === 'skipped' ? 'bg-plum-700' : 'bg-line')} aria-hidden="true" />}
              <span className={clsx('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                st.state === 'done' && 'border-plum-700 bg-plum-700 text-paper', st.state === 'now' && 'border-terracotta-500 bg-terracotta-500 text-paper',
                st.state === 'skipped' && 'border-watch-fg bg-paper text-watch-fg', (st.state === 'next' || st.state === 'later') && 'border-line bg-paper text-muted')}>
                <look.Icon size={14} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className={clsx('text-[15px] font-semibold', st.state === 'later' ? 'text-muted' : 'text-plum-900')}>{st.label}</span><Chip tone={look.tone}>{look.word}</Chip></span>
                <span className="block text-[13px] text-muted">{st.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="px-6 text-center text-[13px] text-muted">This updates by itself as your care team goes. No need to refresh.</p>
    </div>
  );
}

// Home card on the day itself.
export function DayCard() {
  const d = useDayState();
  const nav = useNavigate();
  const steps = daySteps(d);
  if (!d.visit || !d.isToday || d.released) return null;
  const now = steps.find((x) => x.state === 'now') ?? steps.find((x) => x.state === 'next');
  const done = steps.filter((x) => x.state === 'done' || x.state === 'skipped').length;
  return (
    <>
      <ConsentPrompts toSign={d.toSign} />
      <button onClick={() => nav('/today')} className="mx-4 mt-4 block w-[calc(100%-2rem)] rounded-mcard border border-line bg-paper p-4 text-left shadow-card">
        <span className="flex items-baseline justify-between"><span className="text-[17px] font-semibold text-plum-900">Your Vyta Day is today</span><span className="text-[13px] text-muted">{done} of {steps.length}</span></span>
        <ProgressBar value={done / steps.length} label="Your Vyta Day progress" className="mt-2" />
        {now && <span className="mt-2 block text-[14px] text-plum-900"><strong>{now.state === 'now' ? 'Now' : 'Up next'}:</strong> {now.label}</span>}
        <span className="mt-1 block text-[13px] text-terracotta-700">See today's plan</span>
      </button>
    </>
  );
}

function NotYet({ title, body }: { title: string; body: string }) {
  return (
    <div className="pb-6">
      <Top title={title} />
      <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
        <img src="/assets/botanical-clover.png" alt="" className="h-28 w-28 object-contain mix-blend-multiply" />
        <Lock size={18} className="text-muted" aria-hidden="true" />
        <p className="text-[15px] text-plum-900">{body}</p>
      </div>
    </div>
  );
}

function Approved({ report }: { report: Report }) {
  return <p className="mx-4 mt-4 text-center text-[13px] text-muted">Approved by {npSign(report.releasedById)} · version {report.version} · {fmtDate(report.releasedAt!)}</p>;
}

function FocusAreas({ report }: { report: Report }) {
  return (
    <section className="mx-4 mt-4 rounded-mcard bg-paper p-4 shadow-card" aria-labelledby="focus-h">
      <h2 id="focus-h" className="text-[17px] font-semibold text-plum-900">Your top 3 focus areas</h2>
      <ol className="mt-3 space-y-3">
        {report.focusAreas.map((f, i) => {
          const [head, ...rest] = f.split(': ');
          return (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum-700 text-[14px] font-semibold text-paper" aria-hidden="true">{i + 1}</span>
              <span className="text-[15px] text-plum-900"><strong>{head}</strong>{rest.length ? `: ${rest.join(': ')}` : ''}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Home once the report is released: what she leaves with.
export function ReleasedHome() {
  const { m, report, toSign } = useDayState();
  const nav = useNavigate();
  const unread = useDemo((s) => s.notices.filter((n) => n.memberId === MEMBER_ID && !n.read).slice(-1)[0]);
  const markRead = useDemo((s) => s.markNoticesRead);
  if (!report) return null;
  return (
    <div className="pb-6">
      <div className="relative overflow-hidden bg-plum-700 px-5 pb-6 pt-8 text-paper">
        <img src="/assets/cover-figure.png" alt="" className="absolute -right-10 -top-4 h-48 opacity-30 mix-blend-multiply" />
        <p className="text-[13px] opacity-80">First 30 days</p>
        <h1 className="font-display text-[34px] font-semibold leading-tight">Hi {m.name.split(' ')[0]}</h1>
        <p className="mt-1 max-w-[270px] text-[15px] opacity-90">Here's what you're working on first.</p>
      </div>
      {unread && (
        <div className="mx-4 -mt-3 flex items-start gap-3 rounded-mcard border border-line bg-paper p-4 shadow-card">
          <p className="flex-1 text-[14px] text-plum-900">{unread.text}<span className="block text-[12px] text-muted">{fmtDate(unread.at)} · {fmtTime(unread.at)}</span></p>
          <button onClick={() => markRead(MEMBER_ID)} className="-m-2 flex h-11 min-w-[44px] items-center justify-center rounded-full px-2 text-[13px] text-muted">Dismiss</button>
        </div>
      )}
      <ConsentPrompts toSign={toSign} />
      <FocusAreas report={report} />
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => nav('/report')} className="flex min-h-[88px] flex-col items-start justify-between rounded-mcard bg-paper p-4 text-left shadow-card">
          <FileText size={20} className="text-terracotta-700" aria-hidden="true" /><span className="text-[15px] font-semibold text-plum-900">Your report</span>
        </button>
        <button onClick={() => nav('/plan')} className="flex min-h-[88px] flex-col items-start justify-between rounded-mcard bg-paper p-4 text-left shadow-card">
          <ClipboardCheck size={20} className="text-terracotta-700" aria-hidden="true" /><span className="text-[15px] font-semibold text-plum-900">My plan</span>
        </button>
      </div>
      <button onClick={() => nav('/sage')} className="mx-4 mt-3 flex min-h-[56px] w-[calc(100%-2rem)] items-center gap-3 rounded-mcard border border-line bg-paper p-4 text-left shadow-card">
        <Sparkles size={20} className="shrink-0 text-plum-700" aria-hidden="true" />
        <span className="flex-1 text-[14px] text-plum-900"><strong>Questions about your report?</strong> Ask SAGE, your AI guide to it.</span>
        <ChevronRight size={18} className="text-muted" aria-hidden="true" />
      </button>
      <Approved report={report} />
    </div>
  );
}

// ---------- M8 Report ----------
interface Section { id: string; title: string; intro: string; rows?: { label: string; value: string; result?: Result; note?: string }[] }
function reportSections(report: Report, results: Result[], visitId?: string): Section[] {
  const day = results.filter((r) => r.visitId === visitId);
  const labs = results.filter((r) => r.visitId !== visitId);
  const val = (r: Result) => `${r.value}${r.unit ? ` ${r.unit}` : ''}`;
  const pick = (rows: Result[], markers: string[]) => markers.map((mk) => rows.find((r) => r.marker === mk)).filter(Boolean) as Result[];
  const plan = (groups: PlanItem['group'][]) => report.plan.filter((i) => !i.removed && groups.includes(i.group));
  const asRow = (i: PlanItem) => ({ label: i.name, value: [i.dose, i.frequency].filter(Boolean).join(' · '), note: i.memberChoice === 'decline' ? 'Not started: your choice' : i.purpose });
  const shape = day.find((r) => r.panel === 'ShapeScale' && r.skipped);
  return [
    { id: 'next90', title: 'Your next 90 days', intro: 'The few things that matter most until your 3-month review. Small, steady steps.', rows: plan(['nutrition', 'exercise', 'sleep']).map(asRow) },
    { id: 'symptoms', title: 'Symptoms', intro: `Your symptom score is ${report.scores.symptoms} out of 100 (higher is better). It comes from what you told us in your intake: energy, sleep, mood and libido. We re-score it at every review.` },
    { id: 'sleep', title: 'Sleep', intro: 'Better sleep makes everything else easier. Your plan builds a wind-down habit and supports sleep from the inside.', rows: report.plan.filter((i) => !i.removed && ['pi-winddown', 'pi-mag', 'pi-progesterone'].includes(i.id)).map(asRow) },
    { id: 'nutrition', title: 'Nutrition', intro: 'Fiber is your clearest gap, and protein first protects the muscle you are building.', rows: plan(['nutrition']).map(asRow) },
    { id: 'exercise', title: 'Exercise', intro: 'Your fitness is a real strength: keep the aerobic base and add upper-body strength.', rows: [...pick(day, ['VO2 max', 'Grip strength', 'Farmer carry']).map((r) => ({ label: r.marker, value: val(r), result: r })), ...plan(['exercise']).map(asRow)] },
    { id: 'body', title: 'Body', intro: `From your body tests on Your Vyta Day.${shape ? ' ShapeScale was not done this time (scanner offline). We will do it at your 3-month visit; it does not count against your scores.' : ''}`,
      rows: pick(day, ['Body fat', 'Visceral fat area', 'Skeletal muscle mass', 'SMI', 'Phase angle']).filter((r) => !r.excludedFromScore).map((r) => ({ label: r.marker, value: val(r), result: r })) },
    { id: 'bloodwork', title: 'Bloodwork', intro: 'Your lab results that are outside the target range. Everything else is in range. Your NP has decided on each one.',
      rows: labs.filter((r) => report.findings.some((f) => f.resultId === r.id && !f.fromVytaDay)).map((r) => ({ label: r.marker, value: val(r), result: r, note: r.target ? `Target ${r.target}` : undefined })) },
    { id: 'stack', title: 'Health stack', intro: 'Your prescriptions, supplements and peptides, as approved by your NP. My plan has how and when.', rows: plan(['prescription', 'supplement', 'peptide']).map(asRow) },
  ];
}

export function ReportScreen() {
  const { s, report, released, visit } = useDayState();
  const nav = useNavigate();
  if (!report || !released) return <NotYet title="Report" body="Your Vyta Health Assessment appears here on Your Vyta Day, after your nurse practitioner reviews it with you." />;
  const sections = reportSections(report, s.results.filter((r) => r.memberId === MEMBER_ID), visit?.id);
  const cards: { label: string; value: string; sub: string }[] = [
    { label: 'VMRI', value: `${report.scores.vmri}`, sub: `${VMRI_BAND_LABEL[report.scores.vmriBand]} · higher is better` },
    { label: 'Biological age', value: `${report.scores.biologicalAge}`, sub: 'years · younger is the aim' },
    { label: 'Symptoms', value: `${report.scores.symptoms}`, sub: 'out of 100 · higher is better' },
  ];
  return (
    <div className="pb-6">
      <Top title="Your report" />
      {report.summary && <p className="mx-4 mt-4 text-[15px] leading-relaxed text-plum-900">{report.summary}</p>}
      <FocusAreas report={report} />
      <section className="mx-4 mt-4 grid grid-cols-3 gap-2" aria-label="Your scores">
        {cards.map((c) => (
          <div key={c.label} className="rounded-mcard bg-paper p-3 text-center shadow-card">
            <p className="text-[12px] font-medium text-muted">{c.label}</p>
            <p className="font-display text-[32px] font-semibold leading-none text-plum-700">{c.value}</p>
            <p className="mt-1 text-[12px] leading-tight text-muted">{c.sub}</p>
          </div>
        ))}
      </section>
      <ul className="m-4 divide-y divide-line rounded-mcard bg-paper shadow-card" aria-label="Report sections">
        {sections.map((x) => (
          <li key={x.id}>
            <button onClick={() => nav(`/report/${x.id}`)} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
              <span className="flex-1 text-[15px] font-semibold text-plum-900">{x.title}</span><ChevronRight size={18} className="text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Approved report={report} />
    </div>
  );
}

export function ReportSectionScreen({ id }: { id: string }) {
  const { s, report, released, visit } = useDayState();
  if (!report || !released) return <NotYet title="Report" body="Your report appears here once your nurse practitioner approves it." />;
  const x = reportSections(report, s.results.filter((r) => r.memberId === MEMBER_ID), visit?.id).find((y) => y.id === id);
  if (!x) return <NotYet title="Report" body="That section isn't in your report." />;
  return (
    <div className="pb-6">
      <Top title={x.title} back="/report" />
      <p className="mx-4 mt-4 text-[15px] leading-relaxed text-plum-900">{x.intro}</p>
      {!!x.rows?.length && (
        <ul className="m-4 divide-y divide-line rounded-mcard bg-paper shadow-card">
          {x.rows.map((r) => (
            <li key={r.label} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2"><span className="flex-1 text-[15px] font-semibold text-plum-900">{r.label}</span>{r.result && <BandChip band={r.result.band} />}</div>
              {r.value && <p className="text-[14px] tabular-nums text-plum-900">{r.value}</p>}
              {r.note && <p className="text-[13px] text-muted">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
      <Approved report={report} />
    </div>
  );
}

// ---------- M9 My plan ----------
export function PlanScreen() {
  const { report, released } = useDayState();
  if (!report || !released) return <NotYet title="My plan" body="Your plan appears here after Your Vyta Day, once your nurse practitioner has gone through it with you and approved it." />;
  const groups = [
    ...PLAN_GROUPS.filter((g) => ['prescription', 'supplement', 'peptide'].includes(g.id)).map((g) => ({ label: g.label, ids: [g.id] })),
    { label: 'Daily habits', ids: ['nutrition', 'exercise', 'sleep'] },
  ];
  return (
    <div className="pb-6">
      <Top title="My plan" />
      {groups.map((g) => {
        const items = report.plan.filter((i) => !i.removed && g.ids.includes(i.group));
        if (!items.length) return null;
        return (
          <section key={g.label} className="mt-4" aria-label={g.label}>
            <h2 className="px-5 text-[13px] font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
            <ul className="mx-4 mt-2 space-y-2">
              {items.map((i) => <PlanCard key={i.id} item={i} report={report} />)}
            </ul>
          </section>
        );
      })}
      <Approved report={report} />
    </div>
  );
}

function PlanCard({ item: i, report }: { item: PlanItem; report: Report }) {
  const notStarted = i.memberChoice === 'decline' || i.memberChoice === 'defer';
    // "2 caps" already says capsule; don't repeat the form.
  const form = i.form && !i.dose?.toLowerCase().includes(i.form.slice(0, 3)) ? i.form : undefined;
  const facts: [string, string | undefined][] = [['What', [i.dose, form].filter(Boolean).join(' ')], ['How', i.route], ['When', i.frequency]];
  return (
    <li className={clsx('rounded-mcard bg-paper p-4 shadow-card', notStarted && 'bg-cream-100')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx('flex-1 text-[16px] font-semibold', notStarted ? 'text-muted' : 'text-plum-900')}>{i.name}</span>
        {notStarted ? <Chip>{i.memberChoice === 'decline' ? 'Not started: your choice' : 'Later: your choice'}</Chip> : i.change === 'new' ? <Chip tone="info">New</Chip> : i.change === 'changed' ? <Chip tone="plum">Changed</Chip> : null}
      </div>
      {!notStarted && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[14px]">
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="text-plum-900">{v}</dd></div>)}
        </dl>
      )}
      <p className="mt-2 text-[14px] text-plum-900"><span className="text-muted">Why: </span>{i.purpose}</p>
      {notStarted && i.choiceReason && <p className="mt-1 text-[13px] text-muted">You said: “{i.choiceReason}”. You can start any time; just ask your care team.</p>}
      <p className="mt-2 text-[12px] text-muted">Approved by {npSign(report.releasedById)}, {fmtDate(report.releasedAt!).replace(/^\w+ /, '')}</p>
    </li>
  );
}

// ---------- M10 SAGE ----------
export function SageScreen() {
  const { s, released } = useDayState();
  const msgs = s.sage.filter((x) => x.memberId === MEMBER_ID);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  const ask = (q: string) => { if (!q.trim()) return; s.run((d) => ops.askSage(d, MEMBER_ID, q), undefined); setText(''); };
  const banner = (
    <div className="sticky top-14 z-[5] border-b border-line bg-plum-100 px-4 py-2 text-[13px] text-plum-900" role="note">
      <span className="mr-1.5 rounded bg-plum-700 px-1.5 py-0.5 text-[12px] font-semibold text-paper">AI</span>
      SAGE is an AI. It explains your report; it doesn't give medical advice. <strong className="text-danger-fg">Not for emergencies: call 911.</strong>
    </div>
  );
  if (!released) {
    return (
      <div className="pb-6">
        <Top title="SAGE" />
        {banner}
        <p className="px-6 pt-6 text-center text-[14px] text-muted">Your report arrives on Your Vyta Day. Then you can ask me anything about it.</p>
      </div>
    );
  }
  const used = new Set(msgs.filter((x) => x.from === 'member').map((x) => x.text));
  return (
    <div className="flex min-h-full flex-col">
      <Top title="SAGE" />
      {banner}
      <div className="flex-1 space-y-3 px-4 py-4" aria-live="polite">
        <Bubble from="sage"><p>Hi, I'm SAGE. Ask me about your report: your scores, your results, or why something is in your plan.</p></Bubble>
        {msgs.map((x) => (
          <Bubble key={x.id} from={x.from} flagged={x.flagged}>
            <p>{x.text}</p>
            {x.citation && <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-cream-100 px-2 py-0.5 text-[12px] text-plum-700"><FileText size={12} aria-hidden="true" /> {x.citation}</p>}
            {x.from === 'sage' && x.text.includes('911') && (
              <div className="mt-2 rounded-lg bg-danger-bg p-2.5 text-[13px] text-danger-fg">
                <p className="flex items-center gap-1.5 font-semibold"><Phone size={14} aria-hidden="true" /> Happening now? Call 911.</p>
                <p className="mt-0.5 text-plum-900">Your care team has been told. Expect a reply by 2:00 pm.</p>
              </div>
            )}
          </Bubble>
        ))}
        <div ref={end} className="scroll-mb-40" />
      </div>
      <div className="sticky bottom-0 border-t border-line bg-cream-200 px-3 pb-3 pt-2">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Suggested questions">
          {SAGE_SCRIPT.filter((t) => !used.has(t.chip)).map((t) => (
            <button key={t.id} onClick={() => ask(t.chip)} className="min-h-[44px] shrink-0 rounded-full border border-plum-700 bg-paper px-3 text-left text-[13px] text-plum-700">{t.chip}</button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <label htmlFor="sage-q" className="sr-only">Ask SAGE about your report</label>
          <input id="sage-q" className={clsx(inputCls, 'h-11 text-[16px]')} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your report" autoComplete="off" />
          <Button type="submit" className="h-11 w-11 shrink-0 px-0" aria-label="Send" disabled={!text.trim()}><Send size={18} aria-hidden="true" /></Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ from, flagged, children }: { from: 'member' | 'sage'; flagged?: boolean; children: ReactNode }) {
  return (
    <div className={clsx('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug', from === 'member' ? 'ml-auto rounded-br-sm bg-plum-700 text-paper' : 'rounded-bl-sm bg-paper text-plum-900 shadow-card')}>
      {from === 'sage' && <p className="mb-0.5 text-[12px] font-semibold text-plum-700">SAGE · AI</p>}
      {children}
      {flagged && <p className="mt-1 flex items-center gap-1 text-[12px] opacity-90"><AlertTriangle size={12} aria-hidden="true" /> Shared with your care team</p>}
    </div>
  );
}
