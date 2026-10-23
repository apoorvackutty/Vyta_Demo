// S3 Member record: header, phase tracker, milestones, tabs.
import { useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ClipboardCheck, Droplet, FileSignature, FileText, Send } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { JourneyTracker, MilestoneBar, BandChip, PROGRAM_LABEL, MENO_LABEL } from '../../components/domain';
import { Avatar, Button, Card, Chip, Dialog, EmptyState, Field, ProgressBar, SectionTitle, Tabs, inputCls } from '../../components/ui';
import { STAFF, STAFF_BY_ROLE, FORMS } from '../../data/seed';
import { INTAKE } from '../../data/intake';
import { ageYears, fmtDate, fmtDateTime, fmtTime } from '../../lib/time';
import { nextSlots, type SlotKind } from '../../lib/slots';
import { detailsKey, doseKey, fmtAnswer, oftenKey, reactionKey, yearsKey } from '../../lib/intakeFormat';
import { DOSE_LISTS, SURGERY_YEARS, listItems } from '../../lib/intakeFlow';
import { SourceDialog, SourceLabel, fmtValue, sectionSummary } from '../../components/results';
import { PLAN_GROUPS, isLifestyle } from '../../data/protocol';
import type { IntakeValue, Result, StaffRole, Visit } from '../../types';
import NotFound from './NotFound';
import { can, actingAs, isSuperAdmin } from '../../state/permissions';
import { ActingNote } from '../../components/domain';

type Tab = 'overview' | 'timeline' | 'forms' | 'intake' | 'results' | 'report' | 'notes' | 'orders' | 'sage';
// Who sees which tab (SCREENS S3). Admin sees everything.
const TAB_ROLES: Record<Tab, StaffRole[]> = {
  overview: ['guide', 'ma', 'np', 'coach'], timeline: ['guide', 'ma', 'np', 'coach'], forms: ['guide', 'np'], intake: ['guide', 'np'],
  results: ['np', 'ma'], report: ['np', 'coach', 'guide'], notes: ['np', 'coach', 'guide'], orders: ['np', 'ma'], sage: ['guide', 'np'],
};
const GATE_WORDS: Record<string, string> = {
  np_pre_review: 'NP pre-review', coach_wording: 'Coach wording review', completeness: 'Completeness check', np_final_review: 'NP final review', release: 'Release',
};
const STATUS_WORDS: Record<string, string> = {
  building: 'Draft building', draft: 'Waiting on NP pre-review', pre_reviewed: 'Waiting on Coach wording review', wording_checked: 'Wording checked',
  ready_for_visit: 'Ready for Your Vyta Day', final_review: 'Final review', released: 'Released', withdrawn: 'Withdrawn',
};

export default function MemberRecord() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const nav = useNavigate();
  const s = useDemo();
  const [params, setParams] = useSearchParams();
  const [source, setSource] = useState<Result | null>(null);
  const [moving, setMoving] = useState<SlotKind | null>(null);
  const allowed = (t: Tab) => isSuperAdmin(role) || TAB_ROLES[t].includes(role);
  const asked = params.get('tab') as Tab | null;
  const tab: Tab = asked && asked in TAB_ROLES && allowed(asked) ? asked : 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const m = s.members.find((x) => x.id === id);
  if (!m) return <NotFound title="Member not found" body="She may have been removed, or the link is out of date." />;
  const by = STAFF_BY_ROLE[role];
  const canMove = can(role, 'reschedule');
  const forms = s.assignments.filter((a) => a.memberId === m.id);
  const intake = forms.find((a) => a.formId === 'f-intake');
  const draw = s.visits.find((v) => v.memberId === m.id && v.type === 'blood_draw');
  const flags = s.flags.filter((f) => f.memberId === m.id && f.status !== 'closed');
  const events = s.timeline.filter((e) => e.memberId === m.id).slice().reverse();
  const staffName = (sid: string) => STAFF.find((x) => x.id === sid)?.name ?? (sid === 'member' ? m.name : 'System');
  const unsigned = forms.filter((f) => f.status !== 'signed').length;
  const report = s.reports.find((r) => r.memberId === m.id && r.kind === 'baseline');
  const results = s.results.filter((r) => r.memberId === m.id);
  const dayVisit = s.visits.find((v) => v.memberId === m.id && v.type === 'vyta_day');
  const dayResults = results.filter((r) => dayVisit && r.visitId === dayVisit.id);
  const labs = results.filter((r) => !dayResults.includes(r));
  const reportLine = !report ? null
    : report.status === 'building' ? 'Draft HEAL plan building'
      : report.status === 'draft' ? `Draft v${report.version} · waiting on NP pre-review`
        : report.status === 'pre_reviewed' ? `Draft v${report.version} pre-reviewed · waiting on Coach wording review`
          : `Report v${report.version} · ${STATUS_WORDS[report.status].toLowerCase()}`;

  // Roster members aren't playable in the demo; their seeded step says what they're waiting on.
  const waiting = !m.isLead ? { what: m.step, owner: `${staffName(m.guideId).split(' ')[0]} (Guide)` }
    : m.phase === 'join' ? { what: 'Onboarding', owner: 'Maya (Guide)' }
    : intake && intake.status !== 'signed' ? { what: `Her intake (${Math.round((intake.progress ?? 0) * 100)}%)`, owner: `${m.name.split(' ')[0]} · Maya follows up` }
      : draw && !draw.labsReceivedAt ? { what: draw.status === 'done' ? 'Lab results' : 'Blood draw', owner: 'Jordan (MA)' }
        : dayVisit?.completeness === 'passed' ? { what: 'NP final review', owner: 'Dana (NP)' }
        : dayVisit ? { what: 'Your Vyta Day tests', owner: 'Jordan (MA)' }
        : report?.status === 'pre_reviewed' ? { what: 'Coach wording review', owner: 'Sienna (Coach)' }
          : report?.status === 'building' ? { what: 'Draft HEAL plan (building)', owner: 'System' }
            : { what: 'NP pre-review', owner: 'Dana (NP)' };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <button onClick={() => nav(-1)} className="mb-3 flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} /> Back</button>
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={m.name} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[32px] font-semibold leading-none text-plum-700">{m.name}</h1>
              {flags.length > 0 && <Chip tone="danger">Safety flag</Chip>}
            </div>
            <p className="mt-1 text-sm text-muted">{ageYears(m.dob, s.now)} · {MENO_LABEL[m.menoStatus]} · {PROGRAM_LABEL[m.program]} program · Guide {staffName(m.guideId)} · NP {staffName(m.npId)}</p>
          </div>
          <div className="rounded-lg bg-cream-100 px-4 py-2 text-sm">
            <span className="block text-xs text-muted">Waiting on</span>
            <span className="font-semibold text-plum-900">{waiting.what}</span>
            <span className="block text-xs text-muted">Owner: {waiting.owner}</span>
          </div>
        </div>
        <div className="mt-5"><JourneyTracker program={m.program} phase={m.phase} step={m.step} /></div>
        {m.milestones.some((x) => x.selected) && m.phase !== 'join' && <div className="mt-5 max-w-md"><MilestoneBar milestones={m.milestones} /></div>}
      </Card>

      <Tabs<Tab> label="Member record" value={tab} onChange={setTab} tabs={([
        { id: 'overview', label: 'Overview' }, { id: 'timeline', label: 'Timeline' },
        { id: 'forms', label: 'Forms', badge: unsigned || undefined }, { id: 'intake', label: 'Intake' }, { id: 'results', label: 'Results' },
        { id: 'report', label: 'Report & plan' }, { id: 'notes', label: 'Notes' }, { id: 'orders', label: 'Orders' }, { id: 'sage', label: 'SAGE' },
      ] as { id: Tab; label: string; badge?: number }[]).filter((t) => allowed(t.id))} />

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <SectionTitle>Next step</SectionTitle>
              {m.phase === 'join' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-plum-900">Discovery call done and paid. Record her goals, then send her intake and book her blood draw in one step.</p>
                  {can(role, 'onboard') && <span className="flex flex-wrap items-center gap-2"><ActingNote text={actingAs(role, 'onboard')} /><Button onClick={() => nav(`/staff/${role}/onboard/${m.id}`)}>Onboard {m.name.split(' ')[0]}</Button></span>}
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><FileSignature size={16} className="text-terracotta-700" /> Consents: {forms.filter((f) => f.formId !== 'f-intake' && f.status === 'signed').length} of {forms.filter((f) => f.formId !== 'f-intake').length} signed</span>
                    <Button size="sm" variant="ghost" onClick={() => setTab('forms')}>View forms</Button>
                  </li>
                  {intake && (
                    <li className="flex items-center gap-3">
                      <span className="w-40 shrink-0">Intake {intake.status === 'signed' ? 'complete' : `${Math.round((intake.progress ?? 0) * 100)}%`}</span>
                      <ProgressBar value={intake.progress ?? 0} label="Intake progress" className="flex-1" />
                    </li>
                  )}
                  {draw && (
                    <li className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><Droplet size={16} className="text-terracotta-700" /> Blood draw {fmtDateTime(draw.at)} · {draw.labsReceivedAt ? 'labs received' : draw.status === 'done' ? 'drawn, labs awaited' : draw.status}</span>
                      {can(role, 'mark_drawn') && (
                        <span className="flex flex-wrap items-center gap-2">
                          <ActingNote text={actingAs(role, 'mark_drawn')} />
                          {draw.status === 'booked' && can(role, 'confirm_visit') && <Button size="sm" variant="secondary" onClick={() => s.run((d) => ops.confirmVisit(d, draw.id, by), 'Blood draw confirmed')}>Confirm</Button>}
                          {(draw.status === 'booked' || draw.status === 'confirmed') && <Button size="sm" variant="secondary" onClick={() => s.run((d) => ops.markDrawn(d, draw.id, by), 'Marked as drawn')}>Mark drawn</Button>}
                          {draw.status === 'done' && !draw.labsReceivedAt && can(role, 'labs_received') && <Button size="sm" onClick={() => s.run((d) => ops.labsReceived(d, draw.id, by), 'Labs received')}>Labs received</Button>}
                          {canMove && ops.canRescheduleVisit(s, draw) && <Button size="sm" variant="ghost" onClick={() => setMoving('blood_draw')}>Reschedule</Button>}
                        </span>
                      )}
                    </li>
                  )}
                  {m.vytaDayAt && (
                    <li className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><CalendarDays size={16} className="text-terracotta-700" /> Your Vyta Day {fmtDateTime(m.vytaDayAt)}</span>
                      {canMove && ops.canRescheduleVytaDay(s, m) && <span className="flex flex-wrap items-center gap-2"><ActingNote text={actingAs(role, 'reschedule')} /><Button size="sm" variant="ghost" onClick={() => setMoving('vyta_day')}>Reschedule</Button></span>}
                    </li>
                  )}
                  {report && reportLine && (
                    <li className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><ClipboardCheck size={16} className="text-terracotta-700" /> {reportLine}</span>
                      {can(role, 'pre_review') && <ActingNote text={actingAs(role, 'pre_review')} />}
                      {can(role, 'pre_review') && <Button size="sm" variant={report.status === 'draft' ? 'primary' : 'ghost'} onClick={() => nav(`/staff/${role}/pre-review/${m.id}`)}>{report.status === 'draft' ? 'Pre-review' : 'View draft'}</Button>}
                    </li>
                  )}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <SectionTitle>Her goals</SectionTitle>
              <ul className="space-y-2 text-sm text-plum-900">{m.goals.map((g) => <li key={g} className="font-display text-lg leading-snug text-plum-700">“{g}”</li>)}</ul>
              {m.phase !== 'join' && (
                <>
                  <h3 className="mb-2 mt-5 text-sm font-semibold text-plum-900">Milestones · baseline → target</h3>
                  <ul className="space-y-1.5 text-sm">
                    {m.milestones.filter((x) => x.selected).map((x) => (
                      <li key={x.id} className="flex justify-between gap-3"><span>{x.label}</span><span className="whitespace-nowrap tabular-nums text-muted">{x.score ?? '–'} → {x.target}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        )}

        {tab === 'timeline' && (
          <Card className="p-5">
            {events.length === 0 && <EmptyState title="Nothing yet" body="Every form, visit, call and approval shows here with who and when." />}
            <ol className="relative space-y-4 border-l border-line pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-terracotta-500" aria-hidden="true" />
                  <p className="text-sm text-plum-900">{e.text}</p>
                  <p className="text-xs text-muted">{fmtDate(e.at)} · {fmtTime(e.at)} · {staffName(e.by)}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {tab === 'forms' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <SectionTitle>Her forms</SectionTitle>
              {forms.length === 0 ? <p className="text-sm text-muted">No forms sent yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[13px] text-muted"><tr><th className="pb-2 font-medium">Form</th><th className="font-medium">Sent</th><th className="font-medium">Status</th></tr></thead>
                  <tbody>
                    {forms.map((f) => {
                      const t = FORMS.find((x) => x.id === f.formId)!;
                      return (
                        <tr key={f.id} className="border-t border-line">
                          <td className="py-2.5 text-plum-900">{t.title} <span className="text-xs text-muted">{t.version}</span></td>
                          <td className="text-muted">{fmtDate(f.sentAt)}</td>
                          <td>{f.status === 'signed' ? <Chip tone="ok">{f.formId === 'f-intake' ? 'Completed' : 'Signed'} {fmtDate(f.signedAt!)}</Chip>
                            : f.status === 'in_progress' ? <Chip tone="info">In progress {Math.round((f.progress ?? 0) * 100)}%</Chip> : <Chip tone="watch">Waiting on her</Chip>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
            <Card className="p-5">
              <SectionTitle>Forms library</SectionTitle>
              <p className="mb-3 text-xs text-muted">Send any form or handout straight to her phone, even mid-visit.</p>
              <ActingNote text={actingAs(role, 'send_form')} className="mb-3" />
              {!can(role, 'send_form') && <p className="mb-3 text-xs text-muted">Sending forms is for the Guide or NP.</p>}
              <ul className="space-y-2">
                {FORMS.filter((f) => f.kind !== 'intake').map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-plum-900">{f.title}</span>
                    <Button size="sm" variant="ghost" disabled={!can(role, 'send_form')} onClick={() => s.run((d) => ops.sendForm(d, m.id, f.id, by), `Sent "${f.title}" to her phone`)}><Send size={14} /> Send</Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {tab === 'intake' && <IntakeTab memberId={m.id} />}

        {tab === 'report' && (
          <Card className="p-5">
            {!report ? <EmptyState title="No report yet" body="The draft HEAL plan builds as soon as her lab results come in." /> : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-plum-900">Baseline report · v{report.version}</h2>
                    <p className="text-sm text-muted">From the {report.protocol.toLowerCase()}{report.builtAt ? ` · built ${fmtDateTime(report.builtAt)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={report.status === 'draft' || report.status === 'pre_reviewed' ? 'watch' : report.status === 'building' ? 'info' : 'ok'}>{STATUS_WORDS[report.status]}</Chip>
                    {can(role, 'pre_review') && report.status !== 'building' && <ActingNote text={actingAs(role, 'pre_review')} />}
                    {can(role, 'pre_review') && report.status !== 'building' && <Button size="sm" variant={report.status === 'draft' ? 'primary' : 'secondary'} onClick={() => nav(`/staff/${role}/pre-review/${m.id}`)}>{report.status === 'draft' ? 'Pre-review' : 'View draft'}</Button>}
                    {can(role, 'final_review') && report.status === 'final_review' && <Button size="sm" variant={report.finalReviewedAt ? 'secondary' : 'primary'} onClick={() => nav(`/staff/${role}/final/${m.id}`)}>Final review</Button>}
                    {(role === 'coach' || isSuperAdmin(role)) && !['building', 'draft'].includes(report.status) && <Button size="sm" variant={report.status === 'pre_reviewed' ? 'primary' : 'secondary'} onClick={() => nav(`/staff/${role}/wording/${m.id}`)}>{report.status === 'pre_reviewed' ? 'Review wording' : 'View wording'}</Button>}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-plum-900">Version history</h3>
                  {s.approvals.filter((a) => a.reportId === report.id).length === 0
                    ? <p className="text-sm text-muted">No reviews yet. Draft v1 is waiting on the NP.</p>
                    : (
                      <ul className="space-y-1.5 text-sm">
                        {s.approvals.filter((a) => a.reportId === report.id).map((a) => (
                          <li key={a.id} className="flex flex-wrap gap-x-2">
                            <span className="font-medium text-plum-900">v{a.reportVersion}</span>
                            <span className="text-plum-900">{GATE_WORDS[a.gate] ?? a.gate} {a.outcome === 'approved' ? 'approved' : `sent back: "${a.reason}"`}</span>
                            <span className="text-muted">· {staffName(a.byId)} · {fmtDateTime(a.at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
                {report.plan.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-plum-900">HEAL plan</h3>
                    <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                      {PLAN_GROUPS.map((g) => {
                        const items = report.plan.filter((i) => i.group === g.id);
                        if (!items.length) return null;
                        return (
                          <div key={g.id}>
                            <h4 className="mb-1 text-[13px] font-medium text-muted">{g.label}</h4>
                            <ul className="space-y-1 text-sm">
                              {items.map((i) => (
                                <li key={i.id} className={i.removed ? 'text-muted line-through' : 'text-plum-900'}>
                                  <span className="font-medium">{i.name}</span>{' '}
                                  <span className="text-muted">{(isLifestyle(i.group) ? [i.dose] : [i.dose, i.form, i.frequency]).filter(Boolean).join(' · ') || 'Details to confirm'}</span>
                                  {i.removed && <span className="sr-only"> (removed)</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {tab === 'notes' && (
          <Card className="p-5">
            {events.filter((e) => e.kind === 'call').length === 0
              ? <EmptyState title="No notes yet" body="SOAP notes, coach session notes and call logs show here. Each one can be visible to her or kept internal." />
              : (
                <ul className="divide-y divide-line">
                  {events.filter((e) => e.kind === 'call').map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                      <span><span className="block text-sm text-plum-900">{e.text}</span><span className="text-xs text-muted">Call log · {staffName(e.by)} · {fmtDateTime(e.at)}</span></span>
                      <Chip>Internal</Chip>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        )}

        {tab === 'orders' && (
          <Card className="p-5"><EmptyState title="No orders yet" body="Orders are created from her plan when the NP releases it, and stay red until they're placed." /></Card>
        )}

        {tab === 'sage' && (
          <Card className="p-5"><EmptyState title="No SAGE conversations yet" body="Once her report is released she can ask SAGE about it. Anything SAGE flags is highlighted here." /></Card>
        )}

        {tab === 'results' && (
          <Card className="p-5">
            {draw?.labsReceivedAt && results.length ? (
              <>
                <SectionTitle action={reportLine && <span className="text-xs text-muted">{reportLine}</span>}>Baseline labs · received {fmtDate(draw.labsReceivedAt)}</SectionTitle>
                <div className="grid gap-x-8 xl:grid-cols-2">
                  {[...new Set(labs.map((r) => r.panel))].map((panel) => (
                    <div key={panel} className="mb-4">
                      <h3 className="mb-1 text-[13px] font-medium text-muted">{panel}</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          {labs.filter((r) => r.panel === panel).map((r) => (
                            <tr key={r.id} className="border-t border-line">
                              <td className="py-1.5 text-plum-900">{r.marker}</td>
                              <td className="tabular-nums text-plum-900">{fmtValue(r)}</td>
                              <td className="text-right"><BandChip band={r.band} /></td>
                              <td className="w-16 text-right"><button onClick={() => setSource(r)} className="inline-flex min-h-[28px] items-center gap-1 rounded px-1 text-xs text-terracotta-700 underline-offset-2 hover:underline" aria-label={`Source for ${r.marker}`}><FileText size={12} /> Source</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <VytaDayResults results={dayResults} visit={dayVisit} />
              </>
            ) : <EmptyState title="No results yet" body={draw ? `Blood draw ${draw.status === 'done' ? 'done' : 'booked'} for ${fmtDateTime(draw.at)}.` : 'Results appear here after her blood draw and Your Vyta Day.'} />}
          </Card>
        )}
      </div>
      <SourceDialog result={source} results={results} onClose={() => setSource(null)} />
      {moving && (
        <RescheduleDialog
          kind={moving} current={moving === 'blood_draw' ? draw!.at : m.vytaDayAt!} firstName={m.name.split(' ')[0]} onClose={() => setMoving(null)}
          onSave={(at, reason, tellMember) => {
            const what = moving === 'blood_draw' ? 'Blood draw' : 'Your Vyta Day';
            s.run((d) => (moving === 'blood_draw' ? ops.rescheduleVisit(d, draw!.id, at, by, { reason, tellMember }) : ops.rescheduleVytaDay(d, m.id, at, by, { reason, tellMember })),
              `${what} moved to ${fmtDateTime(at)}${tellMember ? ` · ${m.name.split(' ')[0]} notified` : ''}`);
            setMoving(null);
          }}
        />
      )}
    </div>
  );
}

const PIN = ['Q06', 'Q07', 'Q13', 'Q44', 'Q80', 'Q81', 'Q82', 'Q83'];
const REASONS = ['Member asked', 'Clinic change', 'Other'] as const;
function RescheduleDialog({ kind, current, firstName, onClose, onSave }: { kind: SlotKind; current: string; firstName: string; onClose: () => void; onSave: (at: string, reason: string, tellMember: boolean) => void }) {
  const now = useDemo((x) => x.now);
  const [at, setAt] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('Member asked');
  const [other, setOther] = useState('');
  const [tell, setTell] = useState(true);
  const slots = nextSlots(now, kind, current);
  const ready = !!at && (reason !== 'Other' || other.trim().length > 0);
  return (
    <Dialog
      open title={`Reschedule ${kind === 'blood_draw' ? 'blood draw' : 'Your Vyta Day'}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ready} onClick={() => onSave(at, reason === 'Other' ? other.trim() : reason, tell)}>Reschedule</Button></>}
    >
      <p className="text-sm text-plum-900">Now booked for <span className="font-medium">{fmtDateTime(current)}</span>.</p>
      <Field label="New time" htmlFor="rs-slot">
        <select id="rs-slot" className={inputCls} value={at} onChange={(e) => setAt(e.target.value)}>
          <option value="">Choose a time</option>
          {slots.map((x) => <option key={x.at} value={x.at}>{fmtDateTime(x.at)}</option>)}
        </select>
      </Field>
      <Field label="Reason" htmlFor="rs-reason">
        <select id="rs-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      {reason === 'Other' && (
        <Field label="What happened?" htmlFor="rs-other" hint="Required. Goes on her timeline.">
          <input id="rs-other" className={inputCls} value={other} onChange={(e) => setOther(e.target.value)} />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm text-plum-900">
        <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} className="h-4 w-4 accent-plum-700" />
        Let her know
      </label>
      {!tell && <p className="text-xs text-muted">{firstName} won't get a notice. Tell her another way.</p>}
    </Dialog>
  );
}

// The member's optional notes ("Add details", "How did it go?"), shown under the answer they belong to.
function AnswerNote({ v, label }: { v: IntakeValue | undefined; label: string }) {
  if (typeof v !== 'string' || !v.trim()) return null;
  return <dd className="mt-1 border-l-2 border-line pl-2 text-plum-900"><span className="text-xs text-muted">{label}: </span>{v}</dd>;
}
const rec = (v: IntakeValue | undefined) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, string> : {});
// Surgeries read with their year beside each: "Hysterectomy (2019), Oophorectomy (2019)".
function answerText(qid: string, ans: Record<string, IntakeValue>) {
  const v = ans[qid];
  if (SURGERY_YEARS.has(qid) && Array.isArray(v)) { const y = rec(ans[yearsKey(qid)]); return v.map((x) => (y[x] ? `${x} (${y[x]})` : x)).join(', ') || '—'; }
  return fmtAnswer(v);
}
function AnswerExtras({ ans, qid }: { ans: Record<string, IntakeValue>; qid: string }) {
  const doses = rec(ans[doseKey(qid)]), often = rec(ans[oftenKey(qid)]);
  const items = DOSE_LISTS.has(qid) ? listItems(ans[qid]) : [];
  return (
    <>
      {items.length > 0 && (
        <dd className="mt-1"><ul className="space-y-0.5">{items.map((it) => (
          <li key={it} className="text-plum-900">{it}: {doses[it] || <span className="text-muted">dose not given</span>}{often[it] ? ` · ${often[it]}` : ''}</li>
        ))}</ul></dd>
      )}
      <AnswerNote v={ans[detailsKey(qid)]} label="Member's details" />
      <AnswerNote v={ans[reactionKey(qid)]} label="How she reacted" />
    </>
  );
}

// Your Vyta Day results (MA3), shown under the labs with their source. Skipped tests say why and that they don't count as zero.
function VytaDayResults({ results, visit }: { results: Result[]; visit?: Visit }) {
  if (!visit || !results.length) return null;
  return (
    <>
      <SectionTitle>Your Vyta Day · {fmtDate(visit.at)}</SectionTitle>
      <div className="grid gap-x-8 xl:grid-cols-2">
        {[...new Set(results.map((r) => r.panel))].map((panel) => {
          const rows = results.filter((r) => r.panel === panel);
          const sections = [...new Set(rows.map((r) => r.section ?? ''))];
          return (
            <div key={panel} className="mb-4">
              <h3 className="mb-1 text-[13px] font-medium text-muted">{panel} · source: {rows[0].source}</h3>
              {sections.map((sec) => {
                const list = rows.filter((r) => (r.section ?? '') === sec);
                return (
                  <div key={sec} className="mb-2">
                    {sec && <h4 className="mt-2 text-xs font-medium text-plum-900">{sec} <span className="font-normal text-muted">· {sectionSummary(list)}</span></h4>}
                    <table className="w-full text-sm">
                      <tbody>
                        {list.map((r) => (
                          <tr key={r.id} className="border-t border-line">
                            {r.skipped ? (
                              <td colSpan={4} className="py-1.5 text-plum-900"><SourceLabel result={r} /> <span className="text-muted">Not counted as zero; scores are worked out without it.</span></td>
                            ) : (<>
                              <td className="py-1.5 text-plum-900">{r.marker}</td>
                              <td className="tabular-nums text-plum-900">{fmtValue(r)}</td>
                              <td className="text-right"><SourceLabel result={r} /></td>
                              <td className="w-28 text-right">{r.band === 'not_scored' ? <span className="text-xs text-muted">Not scored</span> : <BandChip band={r.band} />}</td>
                            </>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function IntakeTab({ memberId }: { memberId: string }) {
  const s = useDemo();
  const ans = s.intake[memberId] ?? {};
  const done = s.intakeDone[memberId] ?? [];
  const a = s.assignments.find((x) => x.memberId === memberId && x.formId === 'f-intake');
  if (!a) return <Card className="p-5"><EmptyState title="Intake not sent yet" body="It goes out with her consents when she's onboarded." /></Card>;
  const all = INTAKE.flatMap((x) => x.questions);
  const pinned = all.filter((q) => PIN.includes(q.id) && ans[q.id] !== undefined);
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-plum-900">Intake · {Math.round((a.progress ?? 0) * 100)}% answered</h2><span className="text-xs text-muted">{done.length} of {INTAKE.length} sections finished</span></div>
        <ProgressBar value={a.progress ?? 0} label="Intake progress" />
        {pinned.length > 0 && (
          <div className="mt-4 rounded-lg bg-cream-100 p-4">
            <h3 className="mb-2 text-sm font-semibold text-plum-900">Worth knowing first</h3>
            <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              {pinned.map((q) => <div key={q.id}><dt className="text-xs text-muted">{q.text}</dt><dd className={q.safety && ans[q.id] === 'Yes' ? 'font-semibold text-danger-fg' : 'text-plum-900'}>{answerText(q.id, ans)}</dd><AnswerExtras ans={ans} qid={q.id} /></div>)}
            </dl>
          </div>
        )}
      </Card>
      {INTAKE.map((sec) => {
        const any = sec.questions.some((q) => ans[q.id] !== undefined);
        return (
          <Card key={sec.id} className="p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-plum-900">{sec.title}</h3>{done.includes(sec.id) ? <Chip tone="ok">Finished</Chip> : any ? <Chip tone="info">Started</Chip> : <Chip>Not started</Chip>}</div>
            {any && (
              <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                {sec.questions.filter((q) => fmtAnswer(ans[q.id]) !== '—' || [detailsKey(q.id), reactionKey(q.id)].some((k) => fmtAnswer(ans[k]) !== '—')).map((q) => (
                  <div key={q.id}><dt className="text-xs text-muted">{q.text}</dt><dd className="text-plum-900">{answerText(q.id, ans)}</dd><AnswerExtras ans={ans} qid={q.id} /></div>
                ))}
              </dl>
            )}
          </Card>
        );
      })}
    </div>
  );
}
