// N4 Results conversation (present mode): a clean, member-facing view on the left that can go full screen,
// and the NP's side panel on the right to record her choices and push consents to her phone.
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Check, Clock, Expand, Send, Smartphone } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { Button, Card, Chip, EmptyState, inputCls } from '../../components/ui';
import { STAFF_BY_ROLE, FORMS } from '../../data/seed';
import { PLAN_GROUPS } from '../../data/protocol';
import { needsChoice, canRelease } from '../../state/guards';
import { VMRI_BAND_LABEL } from '../../lib/scores';
import { fmtTime } from '../../lib/time';
import type { PlanItem, Report } from '../../types';

const CHOICES = [{ id: 'accept', label: 'Accept' }, { id: 'decline', label: 'Decline' }, { id: 'defer', label: 'Defer' }] as const;
const QUICK_REASONS = ['Not ready yet', 'Wants to think it over', 'Cost', 'Prefers to start one thing at a time'];

export default function Present() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const s = useDemo();
  const nav = useNavigate();
  const stage = useRef<HTMLDivElement>(null);
  const m = s.members.find((x) => x.id === id);
  const report = s.reports.find((r) => r.memberId === id && r.kind === 'baseline');
  if (!m) return <EmptyState heading="h1" title="Member not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const back = <Link to={`/staff/${role}/final/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> Final review</Link>;
  if (!report || !report.finalReviewedAt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{back}
        <Card><EmptyState heading="h1" title="Present mode opens after the final review" body="Finish the final review first, so the scores and findings she sees are the final ones." /></Card>
      </div>
    );
  }
  const live = report.status === 'final_review';
  const canEdit = live && can(role, 'present');
  const first = m.name.split(' ')[0];
  const goFull = () => { stage.current?.requestFullscreen?.().catch(() => undefined); };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      {back}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Results conversation · {m.name}</h1>
        <span className="flex flex-wrap items-center gap-2">
          {canEdit && <ActingNote text={actingAs(role, 'present')} />}
          {report.status === 'released' ? <Chip tone="ok"><Check size={13} aria-hidden="true" /> Released v{report.version}</Chip> : <Chip tone="plum">Present mode</Chip>}
          <Button variant="secondary" size="sm" onClick={goFull}><Expand size={14} aria-hidden="true" /> Full screen for her</Button>
        </span>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
        {/* Member-facing: no codes, no clinical shorthand. */}
        <div ref={stage} className="min-w-0 overflow-auto rounded-card bg-cream-200 p-6 sm:p-10 [&:fullscreen]:p-16">
          <MemberView report={report} first={first} />
        </div>
        <ChoicesPanel report={report} canEdit={canEdit} first={first} onRelease={() => nav(`/staff/${role}/release/${m.id}`)} />
      </div>
    </div>
  );
}

function MemberView({ report, first }: { report: Report; first: string }) {
  const sc = report.scores;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-terracotta-700">Your Vyta Health Assessment</p>
        <h2 className="font-display text-[32px] font-semibold leading-tight text-plum-700 sm:text-[40px]">{first}, here's where you are</h2>
        {report.summary && <p className="mt-2 text-lg leading-relaxed text-plum-900">{report.summary}</p>}
      </div>
      <section aria-labelledby="pm-focus">
        <h3 id="pm-focus" className="mb-3 text-xl font-semibold text-plum-900">Your top 3 focus areas</h3>
        <ol className="space-y-3">
          {report.focusAreas.map((f, i) => {
            const [head, ...rest] = f.split(': ');
            return (
              <li key={i} className="flex gap-4 rounded-card bg-paper p-4 shadow-card">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-700 text-lg font-semibold text-paper" aria-hidden="true">{i + 1}</span>
                <span className="text-lg text-plum-900"><strong>{head}</strong>{rest.length ? `: ${rest.join(': ')}` : ''}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-labelledby="pm-scores" className="grid gap-3 sm:grid-cols-3">
        <h3 id="pm-scores" className="sr-only">Your scores</h3>
        {[
          { label: 'VMRI', value: sc.vmri, sub: `${VMRI_BAND_LABEL[sc.vmriBand]} · higher is better` },
          { label: 'Biological age', value: sc.biologicalAge, sub: 'years · younger is the aim' },
          { label: 'Symptoms', value: sc.symptoms, sub: 'out of 100 · higher is better' },
        ].map((c) => (
          <div key={c.label} className="rounded-card bg-paper p-5 text-center shadow-card">
            <p className="text-sm font-medium text-muted">{c.label}</p>
            <p className="font-display text-[56px] font-semibold leading-none text-plum-700">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.sub}</p>
          </div>
        ))}
      </section>
      <section aria-labelledby="pm-plan">
        <h3 id="pm-plan" className="mb-3 text-xl font-semibold text-plum-900">Your plan, in plain words</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {PLAN_GROUPS.map((g) => {
            const items = report.plan.filter((i) => i.group === g.id && !i.removed);
            if (!items.length) return null;
            return (
              <div key={g.id} className="rounded-card bg-paper p-4 shadow-card">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.label}</h4>
                <ul className="space-y-2">
                  {items.map((i) => (
                    <li key={i.id} className={clsx(i.memberChoice === 'decline' || i.memberChoice === 'defer' ? 'text-muted' : 'text-plum-900')}>
                      <span className="font-semibold">{i.name}</span>
                      {i.memberChoice === 'decline' && <span className="text-sm"> · not starting, your choice</span>}
                      {i.memberChoice === 'defer' && <span className="text-sm"> · later, your choice</span>}
                      <span className="block text-[15px]">{i.purpose}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ChoicesPanel({ report, canEdit, first, onRelease }: { report: Report; canEdit: boolean; first: string; onRelease: () => void }) {
  const s = useDemo();
  const by = STAFF_BY_ROLE[useStaffRole()];
  const items = report.plan.filter(needsChoice);
  const left = items.filter((i) => !i.memberChoice).length;
  const rel = canRelease(s, report);
  return (
    <Card as="section" className="xl:sticky xl:top-16">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-plum-900">Her choices <span className="text-xs font-normal text-muted">· NP only, not shown to her</span></h2>
        <p className="text-xs text-muted">{items.length - left} of {items.length} recorded. Items that need consent can be sent to her phone right now.</p>
      </div>
      {!canEdit && report.status === 'final_review' && <p className="mx-4 mt-3 rounded-lg bg-info-bg px-3 py-2 text-sm text-info-fg">Read only: the NP records her choices.</p>}
      <ul>{items.map((i) => <ChoiceRow key={i.id} item={i} report={report} canEdit={canEdit} />)}</ul>
      <div className="space-y-2 border-t border-line p-4">
        {canEdit && left > 0 && (
          <Button variant="secondary" className="w-full" onClick={() => s.run((d) => ops.acceptRemaining(d, report.id, by), `${left} item${left > 1 ? 's' : ''} accepted`, undefined, { memberId: report.memberId, by })}>
            Accept the rest ({left})
          </Button>
        )}
        {report.status === 'final_review' && (
          <>
            <Button className="w-full" onClick={onRelease}>Approve and release <ArrowRight size={16} aria-hidden="true" /></Button>
            {!rel.ok && <p className="text-xs text-muted">Still needed before release: {rel.missing.map((x) => x.split(':')[0]).join(', ').toLowerCase()}.</p>}
          </>
        )}
        {report.status === 'released' && <p className="text-sm text-plum-900">Released. {first} has her report and plan on her phone.</p>}
      </div>
    </Card>
  );
}

function ChoiceRow({ item: i, report, canEdit }: { item: PlanItem; report: Report; canEdit: boolean }) {
  const s = useDemo();
  const by = STAFF_BY_ROLE[useStaffRole()];
  const [asking, setAsking] = useState<'decline' | 'defer' | null>(null);
  const [reason, setReason] = useState('');
  const consent = FORMS.find((f) => f.id === i.needsConsentFormId);
  const sent = s.assignments.find((a) => a.id === i.consentAssignmentId);
  const undo = { memberId: report.memberId, by };
  const choose = (c: 'accept' | 'decline' | 'defer', why = '') =>
    s.run((d) => ops.recordChoice(d, report.id, i.id, c, why, by), `${i.name}: ${c === 'accept' ? 'accepted' : c === 'decline' ? 'declined' : 'deferred'}`, 'n4-choice', undo);
  return (
    <li className="border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-semibold text-plum-900">{i.name}</span>
        {consent && <Chip tone="info">Needs consent</Chip>}
      </div>
      <p className="text-xs text-muted">{[i.dose, i.form, i.frequency].filter(Boolean).join(' · ')}</p>
      <div role="group" aria-label={`Her choice for ${i.name}`} className="mt-2 inline-flex overflow-hidden rounded-lg border border-plum-700">
        {CHOICES.map((c, n) => (
          <button key={c.id} aria-pressed={i.memberChoice === c.id} disabled={!canEdit}
            onClick={() => (c.id === 'accept' ? choose('accept') : (setAsking(c.id), setReason('')))}
            className={clsx('h-8 px-3 text-[13px] font-medium focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500 disabled:cursor-not-allowed',
              n > 0 && 'border-l border-plum-700', i.memberChoice === c.id ? 'bg-plum-700 text-paper' : 'bg-paper text-plum-700 enabled:hover:bg-plum-100')}>
            {i.memberChoice === c.id && <Check size={12} className="-ml-0.5 mr-1 inline" aria-hidden="true" />}{c.label}
          </button>
        ))}
      </div>
      {i.choiceReason && !asking && <p className="mt-1 text-xs text-muted">Her reason: “{i.choiceReason}”</p>}
      {asking && (
        <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) { choose(asking, reason); setAsking(null); } }}>
          <label htmlFor={`why-${i.id}`} className="block text-xs font-medium text-plum-900">Why {asking === 'decline' ? 'not' : 'later'}? (her words)</label>
          <div className="flex flex-wrap gap-1">{QUICK_REASONS.map((q) => <button type="button" key={q} onClick={() => setReason(q)} className="min-h-[28px] rounded-full border border-line bg-cream-100 px-2.5 text-xs text-plum-900 hover:border-plum-700">{q}</button>)}</div>
          <div className="flex gap-2">
            <input id={`why-${i.id}`} autoFocus className={clsx(inputCls, 'h-9 py-1')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. not ready for injections yet" />
            <Button size="sm" type="submit" disabled={!reason.trim()} className="h-9">Save</Button>
            <Button size="sm" type="button" variant="ghost" className="h-9" onClick={() => setAsking(null)}>Cancel</Button>
          </div>
          {!reason.trim() && <p className="text-xs text-muted">Add a short reason to save.</p>}
        </form>
      )}
      {consent && i.memberChoice === 'accept' && (
        <div className="mt-2">
          {!sent ? (
            <Button size="sm" disabled={!canEdit} onClick={() => s.run((d) => ops.pushConsent(d, report.id, i.id, by), `${consent.title} sent to her phone`)}>
              <Send size={14} aria-hidden="true" /> Send consent to her phone
            </Button>
          ) : sent.status === 'signed'
            ? <Chip tone="ok"><Check size={12} aria-hidden="true" /> Consent signed · {fmtTime(sent.signedAt!)}</Chip>
            : <Chip tone="watch"><Smartphone size={12} aria-hidden="true" /> Sent {fmtTime(sent.sentAt)} · waiting on her signature <Clock size={12} aria-hidden="true" /></Chip>}
        </div>
      )}
    </li>
  );
}
