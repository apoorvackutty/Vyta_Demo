// G6 Safety flag (Guide) and N7 Escalation (NP): the trigger, her context, the SAGE chat, what's been done, and the
// actions for whoever holds it. It stays pinned on Today until a person closes it with an outcome (PRD S1).
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { ActingNote } from '../../components/domain';
import { actingAs } from '../../state/permissions';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls } from '../../components/ui';
import { SageThread } from '../../components/sage';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { phaseLabel } from '../../components/domain';
import { fmtDate, fmtDateTime } from '../../lib/time';
import type { FlagAction } from '../../types';

type Kind = FlagAction['kind'];
const ACTION: Record<Kind, { label: string; title: string; field: string; required: boolean; placeholder: string; toast: string }> = {
  call: { label: 'Call', title: 'Log a call', field: 'What happened? (optional)', required: false, placeholder: 'e.g. spoke with her: tightness eased, no pain now', toast: 'Call logged' },
  message: { label: 'Message', title: 'Message her', field: 'Message (goes to her app)', required: true, placeholder: 'e.g. Dana will call you before 2:00 pm today', toast: 'Message sent to her app' },
  escalate: { label: 'Escalate to NP', title: 'Escalate to the NP', field: 'Note for Dana', required: true, placeholder: 'e.g. tightness since testosterone started, no pain now, wants to know whether to stop', toast: 'Escalated to Dana (NP)' },
  reply: { label: 'Reply to Guide', title: 'Reply to the Guide', field: 'Reply', required: true, placeholder: 'e.g. I will call her now', toast: 'Reply sent to Maya' },
  order_labs: { label: 'Order labs', title: 'Order labs', field: 'Which labs? (optional)', required: false, placeholder: 'e.g. CBC and lipid panel this week', toast: 'Lab order noted' },
  adjust_plan: { label: 'Adjust plan', title: 'Adjust plan', field: 'What changes?', required: true, placeholder: 'e.g. hold testosterone for 1 week, then review', toast: 'Plan adjustment noted' },
  note: { label: 'Note', title: 'Add a note', field: 'Note', required: true, placeholder: '', toast: 'Note added' },
  close: { label: 'Close with outcome', title: 'Close with outcome', field: 'Outcome', required: true, placeholder: 'e.g. Called: muscular, not cardiac. Holding testosterone 1 week; review at check-in', toast: 'Safety flag closed' },
};
const GUIDE_KINDS: Kind[] = ['call', 'message', 'escalate', 'close'];
const NP_KINDS: Kind[] = ['reply', 'call', 'order_labs', 'adjust_plan', 'close'];
const staffName = (id: string) => STAFF.find((s) => s.id === id)?.name ?? (id === 'sage' ? 'SAGE' : id);

export default function FlagView() {
  const role = useStaffRole();
  const { flagId = '' } = useParams();
  const s = useDemo();
  const by = STAFF_BY_ROLE[role];
  const [kind, setKind] = useState<Kind | null>(null);
  const [note, setNote] = useState('');
  const f = s.flags.find((x) => x.id === flagId);
  if (!f) return <EmptyState heading="h1" title="Flag not found" body="It may be from an earlier demo run." action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const m = s.members.find((x) => x.id === f.memberId)!;
  const escalated = f.status === 'escalated';
  // The Guide owns an open flag; once escalated, the NP does. An urgent flag is on both lists, so the NP may act on it too.
  const kinds = f.status === 'closed' ? [] : role === 'admin' ? (escalated ? NP_KINDS : GUIDE_KINDS)
    : role === 'guide' && !escalated ? GUIDE_KINDS : role === 'np' && (escalated || f.severity === 'urgent') ? NP_KINDS : [];
  const permission = escalated || role === 'np' ? 'flag_np' : 'flag_guide';
  const report = s.reports.find((r) => r.memberId === m.id && r.kind === 'baseline');
  const started = report?.status === 'released' ? report.plan.filter((i) => !i.removed && i.memberChoice === 'accept' && (i.group === 'prescription' || i.group === 'peptide')) : [];
  const others = s.flags.filter((x) => x.memberId === m.id && x.id !== f.id);
  const escalation = f.actions?.filter((a) => a.kind === 'escalate').slice(-1)[0];
  const spec = kind ? ACTION[kind] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link to={`/staff/${role}/today`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> Today</Link>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">{escalated ? 'Escalation' : 'Safety flag'} · {m.name}</h1>
          <p className="text-sm text-muted">Raised {fmtDateTime(f.raisedAt)} by {f.source === 'sage' ? 'SAGE' : f.source} · {f.status === 'closed' ? 'closed' : 'pinned on Today until closed'}</p>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          <Chip tone={f.severity === 'urgent' ? 'danger' : 'watch'}><AlertTriangle size={12} aria-hidden="true" /> {f.severity === 'urgent' ? 'Urgent' : 'Review'}</Chip>
          {f.status === 'closed' ? <Chip tone="ok"><CheckCircle2 size={12} aria-hidden="true" /> Closed</Chip> : escalated ? <Chip tone="plum"><ShieldAlert size={12} aria-hidden="true" /> Escalated to NP</Chip> : <Chip tone="danger">Open</Chip>}
        </span>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <Card className="border-danger-fg/40 p-4">
            <h2 className="mb-1 text-[13px] font-medium text-muted">What she said{f.source === 'sage' ? ' to SAGE' : ''}</h2>
            <p className="font-display text-2xl leading-snug text-plum-900">“{f.quote}”</p>
            {escalation && <p className="mt-3 rounded-md bg-plum-100 px-3 py-2 text-sm text-plum-900"><strong>{staffName(escalation.byId).split(' ')[0]} (Guide):</strong> {escalation.note}</p>}
            {f.outcome && <p className="mt-3 rounded-md bg-ok-bg px-3 py-2 text-sm text-ok-fg"><strong>Outcome:</strong> {f.outcome} · {staffName(f.closedById!)} · {fmtDateTime(f.closedAt!)}</p>}
          </Card>

          {kinds.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-plum-900">{escalated ? 'Your actions (NP)' : role === 'np' ? 'NP actions' : 'Your actions'}</h2>
                <ActingNote text={actingAs(role, permission)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <Button key={k} variant={k === 'close' ? 'primary' : k === 'escalate' ? 'danger' : 'secondary'} onClick={() => { setKind(k); setNote(''); }}>{ACTION[k].label}</Button>
                ))}
              </div>
              {!escalated && role === 'guide' && <p className="mt-2 text-xs text-muted">Not an emergency? Call or message her, then close with what happened. If it needs a clinician, escalate to Dana with a note.</p>}
            </Card>
          )}
          {f.status !== 'closed' && kinds.length === 0 && <p className="rounded-lg bg-info-bg px-4 py-2 text-sm text-info-fg">{escalated ? 'Escalated: Dana (NP) holds this now.' : 'Maya (Guide) holds this flag.'} You can read it here.</p>}

          <Card className="p-4">
            <h2 className="mb-3 text-base font-semibold text-plum-900">SAGE conversation</h2>
            <SageThread memberId={m.id} name={m.name} />
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Card className="p-4 text-sm">
            <h2 className="mb-2 text-base font-semibold text-plum-900">Her context</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted">Member</dt><dd><Link className="text-plum-900 underline underline-offset-2" to={`/staff/${role}/member/${m.id}`}>{m.name}</Link></dd>
              <dt className="text-muted">Where she is</dt><dd className="text-plum-900">{phaseLabel(m.phase)} · {m.step}</dd>
              <dt className="text-muted">Care team</dt><dd className="text-plum-900">{staffName(m.guideId)} (Guide) · {staffName(m.npId)} (NP)</dd>
              {report?.releasedAt && <><dt className="text-muted">Plan released</dt><dd className="text-plum-900">{fmtDate(report.releasedAt)} · v{report.version}</dd></>}
            </dl>
            {started.length > 0 && (
              <>
                <h3 className="mb-1 mt-3 text-[13px] font-medium text-muted">Started with this plan</h3>
                <ul className="space-y-0.5 text-plum-900">{started.map((i) => <li key={i.id}><strong>{i.name}</strong> {[i.dose, i.form, i.frequency].filter(Boolean).join(' · ')}</li>)}</ul>
              </>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 text-base font-semibold text-plum-900">What's been done</h2>
            <ol className="space-y-2 text-sm">
              <li className="text-plum-900"><span className="text-muted">{fmtDateTime(f.raisedAt)}</span> · Raised by {f.source === 'sage' ? 'SAGE' : f.source}, pinned on Guide{f.severity === 'urgent' ? ' and NP' : ''} lists</li>
              {(f.actions ?? []).map((a, i) => (
                <li key={i} className={clsx('text-plum-900', a.kind === 'close' && 'font-medium')}>
                  <span className="text-muted">{fmtDateTime(a.at)}</span> · {staffName(a.byId)}: {ACTION[a.kind].label.toLowerCase()}{a.note ? ` · “${a.note}”` : ''}
                  {a.kind === 'close' && <Check size={13} className="ml-1 inline text-ok-fg" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <h3 className="mb-1 mt-4 text-[13px] font-medium text-muted">Earlier flags</h3>
            {others.length ? <ul className="text-sm text-plum-900">{others.map((o) => <li key={o.id}><Link className="underline underline-offset-2" to={`/staff/${role}/flag/${o.id}`}>{fmtDate(o.raisedAt)} · “{o.quote}”</Link> · {o.status}</li>)}</ul> : <p className="text-sm text-muted">None before this one.</p>}
          </Card>
        </div>
      </div>

      <Dialog open={!!spec} title={spec?.title ?? ''} onClose={() => setKind(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setKind(null)}>Cancel</Button>
          <Button disabled={!!spec?.required && !note.trim()} onClick={() => { s.run((d) => ops.flagAction(d, f.id, kind!, note, by), spec!.toast); setKind(null); }}>{spec?.label}</Button>
        </>}>
        {kind === 'close' && <p className="text-sm text-muted">Closing takes it off every list. The outcome goes on her timeline.</p>}
        {kind === 'escalate' && <p className="text-sm text-muted">It moves to Dana's list as “Escalated by Guide”, with your note.</p>}
        <Field label={spec?.field ?? ''} htmlFor="flag-note" hint={spec?.required && !note.trim() ? 'Required.' : undefined}>
          <textarea id="flag-note" rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={spec?.placeholder} />
        </Field>
      </Dialog>
    </div>
  );
}
