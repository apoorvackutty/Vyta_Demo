// N5 Approve and release: the checklist, the version she'll get, Release to member, or Not ready → back to N3.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls } from '../../components/ui';
import { OrdersList } from '../../components/orders';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { canRelease } from '../../state/guards';
import { fmtDateTime } from '../../lib/time';

export default function Release() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const s = useDemo();
  const nav = useNavigate();
  const by = STAFF_BY_ROLE[role];
  const [why, setWhy] = useState(false);
  const [holding, setHolding] = useState(false);
  const [reason, setReason] = useState('');
  const m = s.members.find((x) => x.id === id);
  const report = s.reports.find((r) => r.memberId === id && r.kind === 'baseline');
  if (!m) return <EmptyState heading="h1" title="Member not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const back = <Link to={`/staff/${role}/present/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> Results conversation</Link>;
  if (!report || !['final_review', 'released'].includes(report.status)) {
    return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{back}<Card><EmptyState heading="h1" title="Nothing to release yet" body="Release opens after Your Vyta Day's final review and results conversation." /></Card></div>;
  }
  const check = canRelease(s, report);
  const canAct = can(role, 'release') && report.status === 'final_review';
  const released = report.status === 'released';
  const first = m.name.split(' ')[0];
  const release = () => {
    if (!check.ok) { setWhy(true); return; }
    s.run((d) => ops.releaseReport(d, report.id, by), `Released v${report.version + 1} · ${first}'s app updated`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {back}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Approve and release · {m.name}</h1>
          <p className="text-sm text-muted">{released ? `Version ${report.version} · released ${fmtDateTime(report.releasedAt!)} by ${STAFF.find((x) => x.id === report.releasedById)?.name}` : `Releases as version ${report.version + 1}: her report and plan, exactly as approved`}</p>
        </div>
        {released ? <Chip tone="ok"><Check size={13} aria-hidden="true" /> Released v{report.version}</Chip> : <span className="flex items-center gap-2">{canAct && <ActingNote text={actingAs(role, 'release')} />}<Chip tone={check.ok ? 'ok' : 'watch'}>{check.ok ? 'Ready to release' : 'Not ready yet'}</Chip></span>}
      </header>

      {!released && (
        <Card as="section" className="mb-5">
          <h2 className="border-b border-line px-4 py-3 text-base font-semibold text-plum-900">Before release</h2>
          <ul>
            {check.items.map((x) => (
              <li key={x.label} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className={clsx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', x.ok ? 'bg-ok-bg text-ok-fg' : 'bg-attn-bg text-attn-fg')}>{x.ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span>
                <span className="flex-1"><span className="block font-medium text-plum-900">{x.label} <span className="sr-only">{x.ok ? '(done)' : '(not done)'}</span></span><span className="text-sm text-muted">{x.detail}</span></span>
                <span className={clsx('text-xs font-medium', x.ok ? 'text-ok-fg' : 'text-attn-fg')}>{x.ok ? 'Done' : 'Missing'}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <Button variant="danger" disabled={!canAct} onClick={() => setHolding(true)}>Not ready</Button>
            <div className="group relative ml-auto" onMouseLeave={() => setWhy(false)}>
              <Button aria-disabled={!check.ok || !canAct} disabled={!canAct} aria-describedby="n5-why" onClick={release}
                className={clsx(!check.ok && 'cursor-not-allowed opacity-50 hover:bg-plum-700')}>Release to member</Button>
              {(!check.ok || !canAct) && (
                <div id="n5-why" role="tooltip" className={clsx('absolute bottom-full right-0 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg bg-plum-900 p-3 text-xs text-cream-100 shadow-card group-hover:block group-focus-within:block', why ? 'block' : 'hidden')}>
                  <p className="mb-1 font-semibold">Before you can release:</p>
                  <ul className="list-disc space-y-0.5 pl-4">{(canAct ? check.missing : ['Only the NP releases a report']).map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {released && (
        <>
          <Card className="mb-5 p-4 text-sm text-plum-900">
            <p><strong>{first}'s app has updated.</strong> Report and plan v{report.version} are on her phone, signed off “Approved by {STAFF.find((x) => x.id === report.releasedById)?.name}, NP”. Maya has the next-day call on her list.</p>
          </Card>
          <Card as="section" className="p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-plum-900">Orders</h2>
            <OrdersList memberId={m.id} />
          </Card>
        </>
      )}

      <Dialog open={holding} title="Not ready to release" onClose={() => setHolding(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setHolding(false)}>Cancel</Button>
          <Button disabled={!reason.trim()} onClick={() => { s.run((d) => ops.notReady(d, report.id, reason, by), 'Back to final review'); setHolding(false); setReason(''); nav(`/staff/${role}/final/${m.id}`); }}>Back to final review</Button>
        </>}>
        <p className="text-sm text-muted">The report goes back to your final review. Her choices and signed consents are kept.</p>
        <Field label="What isn't ready?" htmlFor="n5-reason" hint={!reason.trim() ? 'Add a short reason for the record.' : undefined}>
          <input id="n5-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. recheck the VO2 entry with Jordan" />
        </Field>
      </Dialog>
    </div>
  );
}
