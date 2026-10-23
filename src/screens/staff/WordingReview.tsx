// C1 Wording review: the Coach reads the member-facing text side by side with suggestions, softens it, and approves.
// Clinical fields (doses, forms, findings) are locked; a clinical change goes back to the NP.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, Check, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls } from '../../components/ui';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { wordingSlots, wordingText, wordingChanged, type WordingSlot } from '../../data/wording';
import { fmtDateTime, fmtTime } from '../../lib/time';
import type { Report } from '../../types';

const staffName = (sid?: string) => STAFF.find((s) => s.id === sid)?.name ?? '';

export default function WordingReview() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const s = useDemo();
  const m = s.members.find((x) => x.id === id);
  const report = s.reports.find((r) => r.memberId === id && r.kind === 'baseline');
  if (!m) return <EmptyState heading="h1" title="Member not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const back = <Link to={`/staff/${role}/member/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> {m.name}'s record</Link>;
  if (!report || ['building', 'draft'].includes(report.status)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{back}
        <Card><EmptyState heading="h1" title="Not ready for wording review" body={report?.status === 'draft' ? 'Waiting on NP pre-review. The wording review opens once Dana approves the draft.' : 'The draft HEAL plan builds when her lab results come in.'} /></Card>
      </div>
    );
  }
  const open = report.status === 'pre_reviewed';
  const canEdit = open && can(role, 'wording_review');
  const approval = s.approvals.filter((a) => a.reportId === report.id && a.gate === 'coach_wording' && a.outcome === 'approved').slice(-1)[0];
  const slots = wordingSlots(report);
  const groups = [...new Set(slots.map((x) => x.group))];

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {back}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Wording review · {m.name}</h1>
            <p className="text-sm text-muted">Draft v{report.version} · pre-reviewed by Dana Reyes (NP) · the words she will read on her phone</p>
          </div>
          {open
            ? <span className="flex flex-wrap items-center gap-2"><ActingNote text={actingAs(role, 'wording_review')} /><Chip tone="watch">Waiting on Coach wording review</Chip></span>
            : approval
              ? <span className="flex flex-wrap items-center gap-2"><Chip tone="ok"><Check size={13} aria-hidden="true" /> Approved · {staffName(approval.byId)} · {fmtTime(approval.at)}</Chip><Chip tone="plum">Ready for Your Vyta Day</Chip></span>
              : <Chip>Moved past wording review</Chip>}
        </header>

        <p className="mb-4 flex items-start gap-2 rounded-lg bg-info-bg px-4 py-2 text-sm text-info-fg">
          <Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Member-facing text only. Doses, forms, findings and scores are locked. If something clinical needs to change, send it back to the NP.{!can(role, 'wording_review') && open ? ' Read only: only the Coach approves wording.' : ''}</span>
        </p>

        <div className="space-y-5">
          {groups.map((g) => (
            <Card as="section" key={g}>
              <h2 className="border-b border-line px-4 py-3 text-base font-semibold text-plum-900">{g}</h2>
              <div className="hidden border-b border-line bg-cream-100 px-4 py-1.5 text-[13px] font-medium text-muted md:grid md:grid-cols-2 md:gap-6">
                <span>Original</span><span>Her version{canEdit ? ' (edit, or use a suggestion)' : ''}</span>
              </div>
              <ul>{slots.filter((x) => x.group === g).map((x) => <SlotRow key={x.key} slot={x} report={report} canEdit={canEdit} />)}</ul>
            </Card>
          ))}
        </div>
      </div>
      <Footer report={report} canEdit={canEdit} first={m.name.split(' ')[0]} />
    </div>
  );
}

function SlotRow({ slot, report, canEdit }: { slot: WordingSlot; report: Report; canEdit: boolean }) {
  const { run } = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const current = wordingText(report, slot);
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);
  const changed = current !== slot.original;
  const save = (t: string) => {
    if (!t.trim() || t.trim() === current) { setText(current); return; }
    run((d) => ops.editWording(d, report.id, slot.key, t, by), `${slot.label}: wording saved`, 'c1-edit', { memberId: report.memberId, by });
  };
  const fieldId = `w-${slot.key}`;
  return (
    <li className={clsx('grid gap-3 border-b border-l-4 border-b-line px-4 py-3 last:border-b-0 md:grid-cols-2 md:gap-6', changed ? 'border-l-plum-700' : 'border-l-transparent')}>
      <div>
        <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-plum-900">{slot.label}{changed && <Chip tone="plum">Reworded</Chip>}</p>
        <p className={clsx('text-sm', changed ? 'text-muted line-through decoration-1' : 'text-plum-900')}><span className="sr-only md:hidden">Original: </span>{slot.original}</p>
        {slot.locked && <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-cream-100 px-2 py-1 text-xs text-muted"><Lock size={12} aria-hidden="true" /> Locked: {slot.locked}</p>}
      </div>
      <div>
        <label htmlFor={fieldId} className="mb-1 block text-[13px] font-medium text-muted md:sr-only">Her version: {slot.label}</label>
        {canEdit ? (
          <textarea id={fieldId} rows={slot.key.startsWith('purpose') ? 2 : 4} className={clsx(inputCls, 'resize-y')} value={text}
            onChange={(e) => setText(e.target.value)} onBlur={() => save(text)} />
        ) : <p id={fieldId} className="text-sm text-plum-900">{current}</p>}
        {canEdit && (
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
            {slot.suggested && current !== slot.suggested && (
              <div className="flex-1 rounded-md bg-plum-100 px-3 py-2 text-sm text-plum-900">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-plum-700"><Sparkles size={12} aria-hidden="true" /> Suggested, softer</p>
                <p>{slot.suggested}</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setText(slot.suggested!); save(slot.suggested!); }}>Use suggestion</Button>
              </div>
            )}
            {changed && <Button size="sm" variant="ghost" onClick={() => { setText(slot.original); save(slot.original); }}><RotateCcw size={14} aria-hidden="true" /> Back to original</Button>}
          </div>
        )}
      </div>
    </li>
  );
}

function Footer({ report, canEdit, first }: { report: Report; canEdit: boolean; first: string }) {
  const s = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const [sendBack, setSendBack] = useState(false);
  const [note, setNote] = useState('');
  const changed = wordingChanged(report).length;
  if (report.status !== 'pre_reviewed') {
    const sent = s.approvals.filter((a) => a.reportId === report.id && a.gate === 'coach_wording').slice(-1)[0];
    return (
      <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-3 shadow-card sm:px-6">
        <p className="mx-auto max-w-6xl text-sm text-plum-900">
          {sent?.outcome === 'sent_back' && report.status === 'draft'
            ? `Sent back to Dana (NP) ${fmtDateTime(sent.at)}: "${sent.reason}". Waiting on NP pre-review.`
            : `Wording approved. ${first}'s report is ready for Your Vyta Day, and the visit is on Jordan's (MA) list.`}
        </p>
      </div>
    );
  }
  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-2 shadow-card sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm text-plum-900"><strong className="tabular-nums">{changed}</strong> sentence{changed === 1 ? '' : 's'} reworded</p>
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ActingNote text={actingAs(role, 'wording_review')} className="max-sm:hidden" />
          <Button variant="danger" className="flex-1 sm:flex-none" disabled={!canEdit} aria-describedby={!canEdit ? 'c1-why' : undefined} onClick={() => setSendBack(true)}>
            <span className="sm:hidden">Send back to NP</span><span className="hidden sm:inline">Send back to NP – clinical change</span>
          </Button>
          <Button className="flex-1 sm:flex-none" disabled={!canEdit} aria-describedby={!canEdit ? 'c1-why' : undefined}
            onClick={() => s.run((d) => ops.approveWording(d, report.id, by), 'Wording approved · ready for Your Vyta Day')}>Approve wording</Button>
          {!canEdit && <span id="c1-why" className="w-full text-xs text-muted sm:w-auto">Only the Coach approves wording or sends it back.</span>}
        </div>
      </div>
      <Dialog open={sendBack} title="Send back to NP – clinical change" onClose={() => setSendBack(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setSendBack(false)}>Cancel</Button>
          <Button disabled={!note.trim()} onClick={() => { s.run((d) => ops.sendBackWording(d, report.id, note, by), 'Sent back to Dana (NP) for a clinical change'); setSendBack(false); setNote(''); }}>Send back</Button>
        </>}>
        <p className="text-sm text-muted">The draft goes back to Dana's pre-review. Your rewording so far is kept.</p>
        <Field label="What needs a clinical change?" htmlFor="c1-note" hint={!note.trim() ? 'Add a short note so Dana knows what to look at.' : undefined}>
          <textarea id="c1-note" rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. she mentioned a fish allergy, check the omega-3" />
        </Field>
      </Dialog>
    </div>
  );
}
