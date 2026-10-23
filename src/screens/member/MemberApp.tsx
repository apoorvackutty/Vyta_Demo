// Member app (phone). Uses a small in-app router so it can sit next to the staff view.
import { createContext, useContext, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Home as HomeIcon, ClipboardCheck, FileText, Sparkles, Menu, ChevronLeft, ChevronRight, Check, Bell, X, Lock, Droplet, CalendarDays, LogOut, AlertCircle } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { Avatar, Button, Chip, ProgressBar, inputCls } from '../../components/ui';
import { MemberSignIn } from '../SignIn';
import { useAnnouncePage } from '../../components/shell';
import { FORMS, STAFF, BLOOD_DRAW_PREP } from '../../data/seed';
import { PHASES, PROGRAM_LABEL, PROGRAM_ORDER, ProgramLadder, journeyLabel, phaseIndex, programIndex } from '../../components/domain';
import { INTAKE } from '../../data/intake';
import { TESTELLE_INTAKE } from '../../data/seed';
import { GRID_OPTIONS, detailsKey, extraKeys, reactionKey } from '../../lib/intakeFormat';
import { GRID_SHORT, ORDERED_SINGLE, TEXT_HINTS, hasAnswer, isShown, stopLabel, toggleMulti, FOLLOW_UPS, DETAILS, wantsDetails, reactionHint, wantsReaction } from '../../lib/intakeFlow';
import { fmtDate, fmtDateTime, fmtTime } from '../../lib/time';
import { nextSlots, type SlotKind } from '../../lib/slots';
import type { IntakeQuestion, IntakeValue } from '../../types';

const MEMBER_ID = 'm-testelle';

// A tiny in-app router: React Router can't nest a second router inside the staff one.
const NavCtx = createContext<{ path: string; go: (p: string) => void }>({ path: '/home', go: () => {} });
function useNavigate() { return useContext(NavCtx).go; }

function screenFor(path: string): ReactNode {
  const [, a, b] = path.split('/');
  switch (a) {
    case 'goals': return <Goals />;
    case 'journey': return <Journey />;
    case 'forms': return b ? <FormView aid={b} /> : <Forms />;
    case 'intake': return b ? <IntakeSectionView key={b} sid={b} /> : <Intake />;
    case 'blood-draw': return <BloodDraw />;
    case 'status': return <Status />;
    case 'plan': return <Locked title="My plan" body="Your plan appears here after Your Vyta Day, once your nurse practitioner has gone through it with you and approved it." />;
    case 'report': return <Locked title="Report" body="Your Vyta Health Assessment appears here on Your Vyta Day, after your nurse practitioner reviews it with you." />;
    case 'sage': return <Sage />;
    case 'more': return <More />;
    case 'thanks': return <Thanks kind={b} />;
    case 'home': case '': case undefined: return <Home />;
    default: return <MemberNotFound />;
  }
}

export default function MemberApp() {
  const scenario = useDemo((s) => s.scenario);
  return <MemberAppInner key={scenario} />;
}
function MemberAppInner() {
  const signedIn = useDemo((s) => s.memberSignedIn);
  const name = useDemo((s) => s.members.find((m) => m.id === MEMBER_ID)?.name ?? '');
  const [path, setPath] = useState('/home');
  const scroller = useRef<HTMLDivElement>(null);
  // Each in-app screen change moves focus to its title, so screen readers hear the new page.
  // Beside the staff view (split) the phone is secondary, so it leaves the browser tab's title alone.
  const primary = useDemo((s) => s.role === 'member') || window.location.pathname.startsWith('/member');
  useAnnouncePage(`${signedIn}${path}`, () => scroller.current, 'Vyta', primary);
  if (!signedIn) return <div ref={scroller} className="h-full"><MemberSignIn name={name} /></div>;
  const go = (p: string) => { setPath(p); requestAnimationFrame(() => scroller.current?.scrollTo({ top: 0 })); };
  return (
    <NavCtx.Provider value={{ path, go }}>
      <div className="flex h-full flex-col">
        <div id="member-scroll" ref={scroller} className="min-h-0 flex-1 overflow-y-auto">{screenFor(path)}</div>
        <TabBar />
      </div>
    </NavCtx.Provider>
  );
}

function TabBar() {
  const { path, go } = useContext(NavCtx);
  const unread = useDemo((s) => s.notices.filter((n) => n.memberId === MEMBER_ID && !n.read).length);
  const tabs: [string, string, ReactNode][] = [['/home', 'Home', <HomeIcon size={20} />], ['/plan', 'My plan', <ClipboardCheck size={20} />], ['/report', 'Report', <FileText size={20} />], ['/sage', 'SAGE', <Sparkles size={20} />], ['/more', 'More', <Menu size={20} />]];
  return (
    <nav aria-label="Member app" className="flex border-t border-line bg-paper pb-2">
      {tabs.map(([to, label, icon]) => {
        const active = to === '/home' ? path === '/home' : path.startsWith(to);
        return (
          <button key={to} onClick={() => go(to)} aria-current={active ? 'page' : undefined} className={clsx('relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs', active ? 'font-semibold text-plum-700' : 'text-muted')}>
            {icon}{label}
            {to === '/home' && unread > 0 && <span className="absolute right-[22%] top-1.5 min-w-[18px] rounded-full bg-terracotta-700 px-1 text-xs font-semibold leading-[18px] text-paper">{unread}<span className="sr-only"> new</span></span>}
          </button>
        );
      })}
    </nav>
  );
}

function Top({ title, back }: { title: string; back?: string }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-cream-200/95 px-3 backdrop-blur">
      {back && <button aria-label="Back" onClick={() => nav(back)} className="flex h-11 w-11 items-center justify-center rounded-full text-plum-700"><ChevronLeft size={22} /></button>}
      <h1 className={clsx('font-display text-2xl font-semibold text-plum-700', !back && 'pl-2')}>{title}</h1>
    </header>
  );
}

function useMember() {
  const s = useDemo();
  const m = s.members.find((x) => x.id === MEMBER_ID)!;
  const forms = s.assignments.filter((a) => a.memberId === MEMBER_ID);
  const consents = forms.filter((a) => a.formId !== 'f-intake');
  const intake = forms.find((a) => a.formId === 'f-intake');
  const draw = s.visits.find((v) => v.memberId === MEMBER_ID && v.type === 'blood_draw');
  const notices = s.notices.filter((n) => n.memberId === MEMBER_ID);
  return { s, m, forms, consents, intake, draw, notices };
}

function Row({ to, icon, title, sub, done, right }: { to: string; icon: ReactNode; title: string; sub: string; done?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <li>
      <button onClick={() => nav(to)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left">
        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', done ? 'bg-plum-700 text-paper' : 'bg-plum-100 text-plum-700')}>{done ? <Check size={18} /> : icon}</span>
        <span className="min-w-0 flex-1"><span className={clsx('block text-[15px] font-semibold', done ? 'text-muted line-through decoration-1' : 'text-plum-900')}>{title}</span><span className="block text-[13px] text-muted">{sub}</span></span>
        {right ?? <ChevronRight size={18} className="text-muted" />}
      </button>
    </li>
  );
}

function Home() {
  const { s, m, consents, intake, draw, notices } = useMember();
  const nav = useNavigate();
  const latest = [...notices].reverse().find((n) => !n.read);
  if (m.phase === 'join') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <img src="/assets/cover-figure.png" alt="" className="h-56 w-auto rounded-mcard" />
        <h1 className="font-display text-3xl font-semibold text-plum-700">Welcome to Vyta, {m.name.split(' ')[0]}</h1>
        <p className="text-[15px] text-plum-900">Maya, your Guide, is setting up your first steps. You'll get a notification here as soon as they're ready.</p>
      </div>
    );
  }
  const signed = consents.filter((c) => c.status === 'signed').length;
  const steps = [signed === consents.length && consents.length > 0, intake?.status === 'signed', draw?.status === 'done', false];
  const doneCount = steps.filter(Boolean).length;
  const guide = STAFF.find((x) => x.id === m.guideId)!;
  return (
    <div className="pb-6">
      <div className="relative overflow-hidden bg-plum-700 px-5 pb-6 pt-8 text-paper">
        <img src="/assets/cover-figure.png" alt="" className="absolute -right-10 -top-4 h-48 opacity-30 mix-blend-multiply" />
        <p className="text-[13px] opacity-80">{journeyLabel(m.program, m.phase)}</p>
        <h1 className="font-display text-[34px] font-semibold leading-tight">Hi {m.name.split(' ')[0]}</h1>
        <p className="mt-1 max-w-[260px] text-[15px] opacity-90">Here's what's next. Everything is saved as you go.</p>
      </div>

      {latest && (
        <div className="mx-4 -mt-3 flex items-start gap-3 rounded-mcard border border-line bg-paper p-4 shadow-card">
          <Bell size={18} className="mt-0.5 shrink-0 text-terracotta-700" />
          <p className="flex-1 text-[14px] text-plum-900">{latest.text}<span className="block text-[12px] text-muted">{fmtDate(latest.at)} · {fmtTime(latest.at)}</span></p>
          <button aria-label="Dismiss" onClick={() => s.markNoticesRead(MEMBER_ID)} className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"><X size={16} /></button>
        </div>
      )}

      <section className="mx-4 mt-4 rounded-mcard border border-line bg-paper shadow-card" aria-label="Your first steps">
        <div className="px-4 pt-4">
          <div className="flex items-baseline justify-between"><h2 className="text-[17px] font-semibold text-plum-900">Your first steps</h2><span className="text-[13px] text-muted">{doneCount} of 4 done</span></div>
          <ProgressBar value={doneCount / 4} label="First steps" className="mt-2" />
        </div>
        <ul className="divide-y divide-line">
          <Row to="/forms" icon={<FileText size={18} />} title="Sign your consents" sub={`${signed} of ${consents.length} signed`} done={steps[0]} />
          <Row to="/intake" icon={<ClipboardCheck size={18} />} title="Complete your intake" sub={intake?.status === 'signed' ? 'Done, thank you' : `${Math.round((intake?.progress ?? 0) * 100)}% · about 25 minutes in total`} done={steps[1]} />
          <Row to="/blood-draw" icon={<Droplet size={18} />} title="Blood draw" sub={draw ? (draw.status === 'done' ? `Done ${fmtDate(draw.at)}` : `${fmtDateTime(draw.at)} · fast 12 h`) : 'Being booked'} done={steps[2]} />
          <Row to="/status" icon={<CalendarDays size={18} />} title="Your Vyta Day" sub={draw?.labsReceivedAt ? `${fmtDate(m.vytaDayAt!)} · tests, results and your plan` : "We'll book it once your labs are back"} />
        </ul>
      </section>

      <button onClick={() => nav('/journey')} className="mx-4 mt-4 block w-[calc(100%-2rem)] rounded-mcard border border-line bg-paper p-4 text-left shadow-card" aria-label={`Your journey: ${PROGRAM_LABEL[m.program]}, step ${phaseIndex(m.phase) + 1} of ${PHASES.length}. See your journey`}>
        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold text-plum-900">Your journey</span><span className="text-[13px] text-muted">Step {phaseIndex(m.phase) + 1} of {PHASES.length}</span></span>
        <span className="mt-2 block"><ProgramLadder program={m.program} inline /></span>
        <span className="mt-2 block text-[14px] text-plum-900">You're in <strong>{PROGRAM_LABEL[m.program]}</strong>, at {PHASES[phaseIndex(m.phase)].label}.</span>
        <span className="mt-1 block text-[13px] text-terracotta-700">See your whole journey</span>
      </button>

      <button onClick={() => nav('/goals')} className="mx-4 mt-4 block w-[calc(100%-2rem)] rounded-mcard border border-line bg-paper p-4 text-left shadow-card">
        <span className="text-[13px] text-muted">What you're working towards</span>
        <span className="mt-1 block font-display text-xl leading-snug text-plum-700">“{m.goals[0]}”</span>
        <span className="mt-1 block text-[13px] text-terracotta-700">See all your goals and milestones</span>
      </button>

      <section className="mx-4 mt-4 rounded-mcard border border-line bg-paper p-4 shadow-card" aria-label="Your care team">
        <h2 className="mb-3 text-[15px] font-semibold text-plum-900">Your care team</h2>
        <ul className="space-y-2 text-[14px] text-plum-900">
          {[m.guideId, m.npId, m.coachId].map((id) => { const p = STAFF.find((x) => x.id === id)!; return <li key={id} className="flex justify-between"><span>{p.name}</span><span className="text-muted">{p.title}</span></li>; })}
        </ul>
        <p className="mt-3 text-[13px] text-muted">Questions? {guide.name.split(' ')[0]} usually replies within a day.</p>
      </section>
    </div>
  );
}

// Where she is: the programmes in order, and the steps inside the one she's in now.
function Journey() {
  const { m } = useMember();
  const pIdx = programIndex(m.program);
  const sIdx = phaseIndex(m.phase);
  return (
    <div className="pb-6">
      <Top title="Your journey" back="/home" />
      <div className="space-y-4 p-4">
        <p className="text-[15px] text-plum-900">You're in <strong>{PROGRAM_LABEL[m.program]}</strong>, programme {pIdx + 1} of 4. Here's where you are, and what comes after.</p>
        <ol className="rounded-mcard bg-paper p-4 shadow-card" aria-label="Your programmes">
          {PROGRAM_ORDER.map((p, i) => {
            const done = i < pIdx; const current = i === pIdx;
            return (
              <li key={p} aria-current={current ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
                {i < PROGRAM_ORDER.length - 1 && <span className={clsx('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', done ? 'bg-plum-700' : 'bg-line')} aria-hidden="true" />}
                <span className={clsx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold',
                  done && 'border-plum-700 bg-plum-700 text-paper', current && 'border-terracotta-500 bg-paper text-terracotta-700', !done && !current && 'border-line bg-paper text-muted')}>
                  {done ? <Check size={16} aria-hidden="true" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={clsx('text-[16px]', current ? 'font-semibold text-plum-900' : done ? 'text-muted' : 'text-plum-900')}>{PROGRAM_LABEL[p]}</p>
                  <p className={clsx('text-[13px]', current ? 'text-terracotta-700' : 'text-muted')}>{done ? 'Done' : current ? "You're here" : i === pIdx + 1 ? 'Comes next' : 'Later'}</p>
                  {current && (
                    <ol className="mt-3 space-y-2.5" aria-label={`Steps in ${PROGRAM_LABEL[p]}`}>
                      {PHASES.map((ph, j) => (
                        <li key={ph.id} className="flex items-start gap-2.5" aria-current={j === sIdx ? 'step' : undefined}>
                          <span className={clsx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                            j < sIdx && 'border-plum-700 bg-plum-700 text-paper', j === sIdx && 'border-terracotta-500 bg-paper', j > sIdx && 'border-line bg-paper')}>
                            {j < sIdx && <Check size={11} aria-hidden="true" />}
                          </span>
                          <span className="text-[14px] text-plum-900">
                            <span className={j === sIdx ? 'font-semibold' : j < sIdx ? 'text-muted' : ''}>{ph.label}</span>
                            {j < sIdx && <span className="sr-only"> (done)</span>}
                            {j === sIdx && <span className="block text-[13px] text-terracotta-700">Now: {m.step}</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-[13px] text-muted">Your care team decides with you when you're ready to move on to the next programme.</p>
      </div>
    </div>
  );
}

function Goals() {
  const { m } = useMember();
  return (
    <div className="pb-6">
      <Top title="Your goals" back="/home" />
      <div className="space-y-4 p-4">
        <section className="rounded-mcard bg-paper p-4 shadow-card">
          <ul className="space-y-3">{m.goals.map((g) => <li key={g} className="font-display text-xl leading-snug text-plum-700">“{g}”</li>)}</ul>
        </section>
        <section className="rounded-mcard bg-paper p-4 shadow-card">
          <h2 className="mb-1 text-[15px] font-semibold text-plum-900">Milestones this year</h2>
          <p className="mb-3 text-[13px] text-muted">You'll rate these again at each 3-month review.</p>
          <ul className="space-y-3">
            {m.milestones.filter((x) => x.selected).map((x) => (
              <li key={x.id}>
                <div className="flex justify-between text-[14px]"><span className="text-plum-900">{x.label}</span><span className="tabular-nums text-muted">{x.score ?? '–'} → {x.target}</span></div>
                <ProgressBar value={(x.score ?? 0) / 10} label={x.label} className="mt-1.5" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Forms() {
  const { consents } = useMember();
  const nav = useNavigate();
  const sorted = [...consents].sort((a, b) => Number(a.status === 'signed') - Number(b.status === 'signed'));
  return (
    <div>
      <Top title="Forms to sign" back="/home" />
      <ul className="m-4 divide-y divide-line rounded-mcard bg-paper shadow-card">
        {sorted.map((a) => {
          const f = FORMS.find((x) => x.id === a.formId)!;
          return (
            <li key={a.id}>
              <button onClick={() => nav(`/forms/${a.id}`)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left">
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-plum-900">{f.title}</span><span className="block text-[13px] text-muted">{f.summary}</span></span>
                {a.status === 'signed' ? <Chip tone="ok">Signed</Chip> : <Chip tone="watch">To sign</Chip>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FormView({ aid }: { aid: string }) {
  const { s, m, forms, consents } = useMember();
  const nav = useNavigate();
  const a = forms.find((x) => x.id === aid);
  const [name, setName] = useState('');
  const [read, setRead] = useState(false);
  if (!a) return <MemberNotFound back="/forms" />;
  const lastOne = consents.every((c) => c.id === a.id || c.status === 'signed');
  const f = FORMS.find((x) => x.id === a.formId)!;
  return (
    <div className="pb-6">
      <Top title={f.title} back="/forms" />
      <article className="space-y-3 p-4 text-[15px] leading-relaxed text-plum-900">
        <p className="text-[12px] text-muted">Version {f.version}</p>
        {f.body.map((p, i) => <p key={i}>{p}</p>)}
      </article>
      {a.status === 'signed' ? (
        <div className="mx-4 rounded-mcard bg-ok-bg p-4 text-[14px] text-ok-fg">Signed by {a.signedName} · {fmtDateTime(a.signedAt!)}</div>
      ) : (
        <div className="mx-4 space-y-3 rounded-mcard bg-paper p-4 shadow-card">
          <label className="flex min-h-[44px] items-center gap-3 text-[14px] text-plum-900"><input type="checkbox" className="h-5 w-5 accent-plum-700" checked={read} onChange={(e) => setRead(e.target.checked)} />I've read and understood this form</label>
          <label htmlFor="sig" className="block text-[13px] font-medium text-plum-900">Type your full name to sign</label>
          {/* Demo: Tab or → on the empty field fills her name, like accepting a suggestion */}
          <input id="sig" className={clsx(inputCls, 'h-12 text-[16px]')} value={name} onChange={(e) => setName(e.target.value)} placeholder={m.name} autoComplete="name"
            aria-describedby="sig-hint"
            onKeyDown={(e) => { if (!name && ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight')) { e.preventDefault(); setName(m.name); } }} />
          {!name && (
            <p id="sig-hint" className="flex min-h-[44px] items-center gap-1 text-[13px] text-muted">
              Press Tab or
              <button type="button" className="inline-flex min-h-[44px] items-center font-medium text-terracotta-700 underline underline-offset-2" onClick={() => setName(m.name)}>tap here</button>
              to fill in {m.name}
            </p>
          )}
          {(!read || name.trim().length < 2) && (
            <p className="text-[13px] text-muted" aria-live="polite">
              {!read && name.trim().length < 2 ? 'Tick the box and add your name to sign.' : !read ? 'Tick the box above to sign.' : 'Add your name to sign.'}
            </p>
          )}
          <Button size="lg" className="w-full" disabled={!read || name.trim().length < 2} onClick={() => { s.run((d) => ops.signForm(d, a.id, name.trim()), 'Signed · thank you'); nav(lastOne ? '/thanks/consents' : '/forms'); }}>Sign</Button>
        </div>
      )}
    </div>
  );
}

function Intake() {
  const { s, intake } = useMember();
  const nav = useNavigate();
  const done = s.intakeDone[MEMBER_ID] ?? [];
  const ans = s.intake[MEMBER_ID] ?? {};
  if (!intake) return <Locked title="Intake" body="Your intake form arrives with your first steps." />;
  const next = INTAKE.find((x) => !done.includes(x.id));
  return (
    <div className="pb-6">
      <Top title="Your intake" back="/home" />
      <div className="p-4">
        <div className="rounded-mcard bg-paper p-4 shadow-card">
          <p className="text-[14px] text-plum-900">{intake.status === 'signed' ? 'All done. Your care team will read this before your visit.' : '7 short sections. Your answers save as you go, so you can stop any time.'}</p>
          <ProgressBar value={intake.progress ?? 0} label="Intake progress" className="mt-3" />
          <p className="mt-1.5 text-[13px] text-muted">{done.length} of {INTAKE.length} sections done</p>
          {next && <Button size="lg" className="mt-4 w-full" onClick={() => nav(`/intake/${next.id}`)}>{done.length || Object.keys(ans).length ? 'Pick up where you left off' : 'Start'}</Button>}
          {next && <div className="mt-3"><DemoControls onSkip={() => { s.run((d) => ops.skipIntakeToEnd(d, MEMBER_ID), 'Intake complete'); nav('/thanks/intake'); }} /></div>}
        </div>
        <ol className="mt-4 divide-y divide-line rounded-mcard bg-paper shadow-card">
          {INTAKE.map((sec, i) => {
            const isDone = done.includes(sec.id);
            const started = sec.questions.some((q) => ans[q.id] !== undefined);
            return (
              <li key={sec.id}>
                <button onClick={() => nav(`/intake/${sec.id}`)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold', isDone ? 'bg-plum-700 text-paper' : 'bg-plum-100 text-plum-700')}>{isDone ? <Check size={16} /> : i + 1}</span>
                  <span className="flex-1 text-[15px] text-plum-900">{sec.title}<span className="block text-[12px] text-muted">{sec.questions.length} questions{!isDone && started ? ' · started' : ''}</span></span>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function IntakeSectionView({ sid }: { sid: string }) {
  const { s } = useMember();
  const nav = useNavigate();
  const idx = INTAKE.findIndex((x) => x.id === sid);
  const sec = INTAKE[idx];
  const [ans, setAns] = useState<Record<string, IntakeValue>>(() => Object.fromEntries((sec?.questions ?? []).flatMap((q) => [q.id, ...extraKeys(q.id)]).map((k) => [k, (s.intake[MEMBER_ID] ?? {})[k]]).filter(([, v]) => v !== undefined)));
  const [check, setCheck] = useState<'none' | 'blanks' | 'safety'>('none');
  if (!sec) return <MemberNotFound back="/intake" />;
  const set = (id: string, v: IntakeValue) => { setAns((a) => ({ ...a, [id]: v })); if (check === 'safety') setCheck('none'); };
  // Follow-ups stay hidden until the answer they hang off makes them relevant.
  const shown = sec.questions.filter((q) => isShown(q, ans));
  const answered = shown.filter((q) => hasAnswer(ans[q.id])).length;
  // Free-text questions are follow-ups ("if yes, tell us more"), so only choice questions count as blank.
  const blank = shown.filter((q) => q.type !== 'text' && !hasAnswer(ans[q.id]));
  const safetyBlank = blank.filter((q) => q.safety);
  const scrollTo = (qid?: string) => qid && document.getElementById(`q-${qid}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  const advance = () => {
    if (safetyBlank.length) { setCheck('safety'); scrollTo(safetyBlank[0].id); return; }
    if (blank.length && check !== 'blanks') { setCheck('blanks'); return; }
    save(true);
    const allDone = useDemo.getState().intakeDone[MEMBER_ID]?.length === INTAKE.length;
    nav(allDone ? '/thanks/intake' : nextSec ? `/intake/${nextSec.id}` : '/intake');
  };
  const save = (complete: boolean) => s.run((d) => ops.saveIntake(d, MEMBER_ID, sec.id, ans, complete), complete ? `Section ${idx + 1} saved` : 'Saved. Come back any time');
  const nextSec = INTAKE[idx + 1];
  return (
    <div className="pb-6" data-intake-top>
      <Top title={`${idx + 1} of ${INTAKE.length}`} back="/intake" />
      <div className="px-4 pt-4">
        <h2 className="font-display text-[26px] font-semibold leading-tight text-plum-700">{sec.title}</h2>
        <DemoControls
          onFill={() => setAns((cur) => ({ ...Object.fromEntries(sec.questions.map((q) => [q.id, TESTELLE_INTAKE[q.id]]).filter(([, v]) => v !== undefined)), ...Object.fromEntries(Object.entries(cur).filter(([, v]) => v !== undefined && v !== '')) }))}
          onSkip={() => { s.run((d) => ops.skipIntakeToEnd(d, MEMBER_ID, ans), 'Intake complete'); nav('/thanks/intake'); }}
        />
      </div>
      <div className="space-y-4 p-4">
        {shown.map((q, i) => <QuestionInput key={q.id} q={q} value={ans[q.id]} onChange={(v) => set(q.id, v)}
          pos={`Question ${i + 1} of ${shown.length}`} followUp={!!FOLLOW_UPS[q.id]}
          extras={[
            wantsDetails(q.id, ans) && { key: detailsKey(q.id), label: 'Add details', hint: DETAILS[q.id].hint },
            wantsReaction(q.id, ans) && { key: reactionKey(q.id), label: 'How did it go?', hint: reactionHint(q.id) },
          ].filter((x): x is Omit<Extra, 'value' | 'onChange'> => !!x).map((x) => ({ ...x, value: ans[x.key], onChange: (v: string) => set(x.key, v) }))}
          flag={check === 'safety' && q.safety && !hasAnswer(ans[q.id]) ? 'Please answer this one' : check === 'blanks' && blank.includes(q) ? 'Not answered yet' : undefined} />)}
      </div>
      <div className="sticky bottom-0 border-t border-line bg-cream-200/95 p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <ProgressBar value={shown.length ? answered / shown.length : 0} label="Answered in this section" className="flex-1" />
          <p className="shrink-0 text-[13px] text-muted">{answered} of {shown.length} answered</p>
        </div>
        {check === 'safety' && (
          <p role="alert" className="mb-3 flex gap-2 rounded-lg bg-danger-bg p-3 text-[13px] text-danger-fg"><AlertCircle size={16} className="mt-0.5 shrink-0" />
            Please answer the {safetyBlank.length > 1 ? `${safetyBlank.length} safety questions` : 'safety question'}. They help your care team keep you safe.</p>
        )}
        {check === 'blanks' && (
          <div role="alert" className="mb-3 rounded-lg bg-watch-bg p-3 text-[13px] text-watch-fg">
            <p>You've left {blank.length} question{blank.length > 1 ? 's' : ''} blank. That's fine: you can come back to {blank.length > 1 ? 'them' : 'it'} any time.</p>
            <button type="button" className="mt-1 min-h-[44px] font-medium underline underline-offset-2" onClick={() => scrollTo(blank[0]?.id)}>Show me</button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => { save(false); nav('/home'); }}>Save & exit</Button>
          <Button size="lg" className="flex-1" onClick={advance}>{check === 'blanks' ? 'Continue anyway' : nextSec ? 'Next section' : 'Finish intake'}</Button>
        </div>
      </div>
    </div>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={clsx('inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-left text-[14px]', selected ? 'border-plum-700 bg-plum-700 text-paper' : 'border-line bg-paper text-plum-900')}>
      {selected && <Check size={14} aria-hidden className="shrink-0" />}{children}
    </button>
  );
}

// One row of equal-width choices (Yes / No, Rarely … 5+). Real radios, so arrow keys move between them.
function Segmented({ name, options, labels, value, onChange, srSuffix }: { name: string; options: string[]; labels?: string[]; value: string | undefined; onChange: (v: string) => void; srSuffix?: string }) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-cream-100 p-1">
      {options.map((o, i) => (
        <label key={o} className="flex-1">
          <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="peer sr-only" />
          <span className={clsx('flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-lg px-1.5 text-center text-[14px] leading-tight peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-500',
            value === o ? 'bg-plum-700 font-medium text-paper' : 'text-plum-900')}>
            {value === o && <Check size={14} aria-hidden className="shrink-0" />}{labels?.[i] ?? o}{srSuffix && <span className="sr-only"> {srSuffix}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

// Full-width radio rows for choices too long to sit side by side.
function OptionList({ name, options, value, onChange }: { name: string; options: string[]; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o} className="block">
          <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="peer sr-only" />
          <span className={clsx('flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-500',
            value === o ? 'border-plum-700 bg-plum-100 text-plum-900' : 'border-line bg-paper text-plum-900')}>
            <span aria-hidden className={clsx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', value === o ? 'border-plum-700 bg-plum-700 text-paper' : 'border-muted')}>{value === o && <Check size={12} strokeWidth={3} />}</span>
            {o}
          </span>
        </label>
      ))}
    </div>
  );
}

// An accessible slider over ordered stops. Every stop has a visible label; until she picks, no thumb shows and nothing is saved.
function StepSlider({ id, stops, index, onPick, valueText, ends }: { id: string; stops: string[]; index: number | undefined; onPick: (i: number) => void; valueText: (i: number) => string; ends?: [string, string] }) {
  const n = stops.length;
  const empty = index === undefined;
  const pct = empty ? 0 : (index / (n - 1)) * 100;
  // Inset the track so each stop's thumb position sits over the centre of its label column.
  const inset = `calc(100% / ${2 * n} - 14px)`;
  const commit = (e: { currentTarget: HTMLInputElement }) => onPick(Number(e.currentTarget.value));
  return (
    <div>
      <p id={`${id}-val`} aria-hidden className={clsx('mb-1 min-h-[24px] text-[16px]', empty ? 'text-muted' : 'font-semibold text-plum-700')}>
        {empty ? 'Slide or tap to answer' : valueText(index)}
      </p>
      <input id={`${id}-in`} type="range" min={0} max={n - 1} step={1} value={empty ? 0 : index}
        aria-labelledby={`${id}-label`} aria-valuetext={empty ? 'Not answered yet' : valueText(index)}
        data-empty={empty || undefined} onChange={commit} onClick={commit}
        className="vy-range block" style={{ marginInline: inset, width: `calc(100% - 2 * (${inset}))`, '--fill': `${pct}%` } as CSSProperties} />
      <div aria-hidden className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {stops.map((s, i) => (
          <div key={i} onClick={() => onPick(i)} className={clsx('flex min-h-[44px] cursor-pointer justify-center px-0.5 pt-1 text-center text-[12px] leading-tight', index === i ? 'font-semibold text-plum-700' : 'text-muted')}>{s}</div>
        ))}
      </div>
      {ends && <div aria-hidden className="flex justify-between text-[12px] text-muted"><span>{ends[0]}</span><span>{ends[1]}</span></div>}
    </div>
  );
}

// An optional free-text box inside a question's card ("Add details", "How did it go?"). Never counts as blank.
type Extra = { key: string; label: string; hint: string; value: IntakeValue | undefined; onChange: (v: string) => void };
function QuestionInput({ q, value, onChange, flag, pos, followUp, extras = [] }: { q: IntakeQuestion; value: IntakeValue | undefined; onChange: (v: IntakeValue) => void; flag?: string; pos?: string; followUp?: boolean; extras?: Extra[] }) {
  const labelId = `q-${q.id}-label`;
  const box = (c: ReactNode, asGroup = true) => {
    const Wrap = asGroup ? 'fieldset' : 'div';
    return (
      <Wrap id={`q-${q.id}`} {...(asGroup ? { 'aria-labelledby': labelId } : {})} className={clsx('scroll-mt-20 rounded-mcard bg-paper p-4 shadow-card', followUp && 'ml-4 border-l-4 border-plum-100', flag && 'ring-2 ring-watch-fg')}>
        {pos && <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">{pos}{followUp ? ' · follow-up' : ''}</p>}
        {asGroup ? <p id={labelId} className="mb-3 text-[15px] font-medium text-plum-900">{q.text}</p> : <label id={labelId} htmlFor={`q-${q.id}-in`} className="mb-3 block text-[15px] font-medium text-plum-900">{q.text}</label>}
        {c}
        {extras.map((x) => (
          <div key={x.key} className="mt-4">
            <label htmlFor={`q-${x.key}`} className="block text-[14px] font-medium text-plum-900">{x.label} <span className="font-normal text-muted">(optional)</span></label>
            <p id={`q-${x.key}-hint`} className="mb-1.5 text-[13px] text-muted">{x.hint}</p>
            <textarea id={`q-${x.key}`} aria-describedby={`q-${x.key}-hint`} rows={2} autoCapitalize="sentences" autoComplete="off" className={clsx(inputCls, 'text-[16px]')}
              value={typeof x.value === 'string' ? x.value : ''} onChange={(e) => x.onChange(e.target.value)} />
          </div>
        ))}
        {flag && <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-watch-fg"><AlertCircle size={14} aria-hidden />{flag}</p>}
      </Wrap>
    );
  };
  const opts = (q.options ?? []).map(String);
  const str = typeof value === 'string' ? value : undefined;
  if (q.type === 'single') {
    if (ORDERED_SINGLE.has(q.id)) {
      const i = str === undefined ? -1 : opts.indexOf(str);
      return box(<StepSlider id={`q-${q.id}`} stops={opts.map(stopLabel)} index={i < 0 ? undefined : i} onPick={(k) => onChange(opts[k])} valueText={(k) => opts[k]} />, false);
    }
    if (opts.length <= 3 && opts.every((o) => o.length <= 14)) return box(<Segmented name={q.id} options={opts} value={str} onChange={onChange} />);
    return box(<OptionList name={q.id} options={opts} value={str} onChange={onChange} />);
  }
  if (q.type === 'multi') {
    const arr = Array.isArray(value) ? value : [];
    return box(<>
      {!/choose/i.test(q.text) && <p className="-mt-2 mb-2 text-[13px] text-muted">Choose all that apply</p>}
      <div className="flex flex-wrap gap-2">{opts.map((v) => <Pill key={v} selected={arr.includes(v)} onClick={() => onChange(toggleMulti(arr, v))}>{v}</Pill>)}</div>
    </>);
  }
  if (q.type === 'scale') {
    const [lo, hi] = q.options as number[];
    const nums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const i = typeof value === 'number' ? nums.indexOf(value) : -1;
    return box(<StepSlider id={`q-${q.id}`} stops={nums.map(String)} index={i < 0 ? undefined : i} onPick={(k) => onChange(nums[k])} valueText={(k) => `${nums[k]} out of ${hi}`} ends={['Low', 'High']} />, false);
  }
  if (q.type === 'grid') {
    const obj = (value && typeof value === 'object' && !Array.isArray(value)) ? value as Record<string, string> : {};
    return box(<>
      <p className="-mt-2 mb-3 text-[13px] text-muted">Days a week, for each</p>
      <div className="space-y-3">{(q.options as string[]).map((row, r) => (
        <fieldset key={row}>
          <legend className="mb-1.5 text-[14px] text-plum-900">{row}</legend>
          <Segmented name={`${q.id}-${r}`} options={GRID_OPTIONS} labels={GRID_SHORT} value={obj[row]} onChange={(o) => onChange({ ...obj, [row]: o })} srSuffix="days a week" />
        </fieldset>
      ))}</div>
    </>);
  }
  if (q.type === 'date') return box(<input id={`q-${q.id}-in`} type="date" max={new Date().toISOString().slice(0, 10)} className={clsx(inputCls, 'h-12 text-[16px]')} value={str ?? ''} onChange={(e) => onChange(e.target.value)} />, false);
  const h = TEXT_HINTS[q.id] ?? {};
  const common = { id: `q-${q.id}-in`, placeholder: h.placeholder, autoComplete: h.autoComplete ?? 'off', value: str ?? '', className: clsx(inputCls, 'text-[16px]') };
  return box(h.line
    ? <input type="text" enterKeyHint="next" autoCapitalize="sentences" {...common} className={clsx(common.className, 'h-12')} onChange={(e) => onChange(e.target.value)} />
    : <textarea rows={h.rows ?? 2} autoCapitalize="sentences" {...common} onChange={(e) => onChange(e.target.value)} />, false);
}

function BloodDraw() {
  const { s, m, draw } = useMember();
  const [changeOpen, setChangeOpen] = useState(false);
  const guide = STAFF.find((x) => x.id === m.guideId)!;
  const canChange = !!draw && ops.canRescheduleVisit(s, draw);
  return (
    <div className="pb-6">
      <Top title="Blood draw" back="/home" />
      {!draw ? <Locked title="" body="Your Guide is booking this." bare /> : (
        <div className="space-y-4 p-4">
          <section className="rounded-mcard bg-paper p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-[26px] font-semibold leading-tight text-plum-700">{fmtDate(draw.at)}</p>
                <p className="text-[15px] text-plum-900">{fmtTime(draw.at)} · {draw.location}</p>
              </div>
              {draw.status === 'done' ? <Chip tone="ok">Done</Chip> : draw.status === 'confirmed' ? <Chip tone="ok">Confirmed</Chip> : <Chip tone="info">Booked</Chip>}
            </div>
            {draw.status === 'done' && <p className="mt-3 text-[14px] text-plum-900">{draw.labsReceivedAt ? 'Your results are in. Your care team is preparing your report.' : "Thanks. Your sample is at the lab. Results usually take 3–5 days, and we'll let you know."}</p>}
            {draw.status !== 'done' && (
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => s.run((d) => ops.addToCalendar(d, draw.id), 'Added to your calendar')}>Add to calendar</Button>
                {canChange && <Button variant="ghost" className="flex-1" aria-expanded={changeOpen} onClick={() => setChangeOpen((o) => !o)}>Change time</Button>}
              </div>
            )}
            {changeOpen && canChange && (
              <ChangeTime
                kind="blood_draw" current={draw.at} guideFirst={guide.name.split(' ')[0]} onCancel={() => setChangeOpen(false)}
                onConfirm={(at) => { s.run((d) => ops.rescheduleVisit(d, draw.id, at, 'member'), `Blood draw moved to ${fmtDateTime(at)}`); setChangeOpen(false); }}
              />
            )}
          </section>
          {draw.status !== 'done' && (
            <section className="rounded-mcard bg-paper p-4 shadow-card">
              <h2 className="mb-3 text-[15px] font-semibold text-plum-900">How to prepare</h2>
              <ul className="space-y-3 text-[14px] text-plum-900">{BLOOD_DRAW_PREP.map((p) => <li key={p} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-terracotta-700" />{p}</li>)}</ul>
              <p className="mt-3 text-[12px] text-muted">We'll remind you 3 days before and the day before.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Pick a new time, then confirm it. The clinic's phone number stays as the fallback.
function ChangeTime({ kind, current, guideFirst, onConfirm, onCancel }: { kind: SlotKind; current: string; guideFirst: string; onConfirm: (at: string) => void; onCancel: () => void }) {
  const now = useDemo((x) => x.now);
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const slots = nextSlots(now, kind, current);
  const days = [...new Set(slots.map((x) => x.day))];
  if (confirming && picked) return (
    <div className="mt-3 rounded-lg bg-cream-100 p-3" role="group" aria-label="Confirm the new time">
      <p className="text-[14px] text-plum-900">Move from <span className="font-medium">{fmtDateTime(current)}</span> to</p>
      <p className="font-display text-[22px] font-semibold text-plum-700">{fmtDateTime(picked)}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="h-11 flex-1" onClick={() => setConfirming(false)}>Back</Button>
        <Button className="h-11 flex-1" onClick={() => onConfirm(picked)}>Confirm new time</Button>
      </div>
    </div>
  );
  return (
    <div className="mt-3 rounded-lg bg-cream-100 p-3">
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold text-plum-900">Choose a new time</legend>
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day}>
              <p className="mb-1.5 text-[13px] text-muted">{day}</p>
              <div className="flex flex-wrap gap-2">
                {slots.filter((x) => x.day === day).map((x) => (
                  <button key={x.at} type="button" aria-pressed={picked === x.at} onClick={() => setPicked(x.at)}
                    className={clsx('flex min-h-[44px] min-w-[88px] items-center justify-center gap-1 rounded-full border px-4 text-[14px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500',
                      picked === x.at ? 'border-plum-700 bg-plum-700 text-paper' : 'border-line bg-paper text-plum-900')}>
                    {picked === x.at && <Check size={14} aria-hidden="true" />}{fmtTime(x.at)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="h-11 flex-1" onClick={onCancel}>Keep current time</Button>
        <Button className="h-11 flex-1" disabled={!picked} onClick={() => setConfirming(true)}>Next</Button>
      </div>
      <p className="mt-3 text-[13px] text-plum-900">
        Can't find a time? Call the clinic on <a href="tel:+18015550142" className="font-medium text-terracotta-700 underline underline-offset-2">(801) 555-0142</a>, or tell {guideFirst}, your Guide.
      </p>
    </div>
  );
}

function Status() {
  const { s, m, consents, intake, draw } = useMember();
  const [changeOpen, setChangeOpen] = useState(false);
  const guide = STAFF.find((x) => x.id === m.guideId)!;
  const vytaDayShown = !!m.vytaDayAt && !!draw?.labsReceivedAt;
  const steps = [
    { label: 'Consents signed', done: consents.length > 0 && consents.every((c) => c.status === 'signed') },
    { label: 'Intake complete', done: intake?.status === 'signed' },
    { label: 'Blood drawn', done: draw?.status === 'done' },
    { label: 'Lab results in', done: !!draw?.labsReceivedAt },
    { label: 'Report being prepared by your care team', done: false },
    { label: `Your Vyta Day${vytaDayShown ? ` · ${fmtDate(m.vytaDayAt!)}` : ''}`, done: false },
  ];
  const lastDone = steps.map((x) => x.done).lastIndexOf(true);
  const current = steps.findIndex((x, i) => !x.done && i > lastDone);
  return (
    <div className="pb-6">
      <Top title="Where things are" back="/home" />
      <ol className="m-4 rounded-mcard bg-paper p-5 shadow-card">
        {steps.map((st, i) => (
          <li key={st.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className={clsx('absolute left-[11px] top-6 h-full w-0.5', st.done ? 'bg-plum-700' : 'bg-line')} aria-hidden="true" />}
            <span className={clsx('relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', st.done ? 'border-plum-700 bg-plum-700 text-paper' : i === current || i < lastDone ? 'border-terracotta-500 bg-paper' : 'border-line bg-paper')}>{st.done && <Check size={13} />}</span>
            <span className={clsx('text-[15px]', st.done ? 'text-muted' : i === current ? 'font-semibold text-plum-900' : 'text-plum-900')}>{st.label}{i === current && <span className="block text-[12px] font-normal text-terracotta-700">Up next</span>}{!st.done && i < lastDone && <span className="block text-[12px] font-normal text-terracotta-700">Still to do</span>}</span>
          </li>
        ))}
      </ol>
      {vytaDayShown && (
        <section className="mx-4 mb-4 rounded-mcard bg-paper p-4 shadow-card" aria-label="Your Vyta Day">
          <h2 className="text-[15px] font-semibold text-plum-900">Your Vyta Day</h2>
          <p className="font-display text-[22px] font-semibold leading-tight text-plum-700">{fmtDate(m.vytaDayAt!)}</p>
          <p className="text-[14px] text-plum-900">{fmtTime(m.vytaDayAt!)} · tests, results and your plan</p>
          {ops.canRescheduleVytaDay(s, m) && !changeOpen && <Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => setChangeOpen(true)}>Change time</Button>}
          {changeOpen && ops.canRescheduleVytaDay(s, m) && (
            <ChangeTime
              kind="vyta_day" current={m.vytaDayAt!} guideFirst={guide.name.split(' ')[0]} onCancel={() => setChangeOpen(false)}
              onConfirm={(at) => { s.run((d) => ops.rescheduleVytaDay(d, MEMBER_ID, at, 'member'), `Your Vyta Day moved to ${fmtDateTime(at)}`); setChangeOpen(false); }}
            />
          )}
        </section>
      )}
      <section className="mx-4 rounded-mcard bg-paper p-4 shadow-card" aria-label="Your care team">
        <h2 className="mb-3 text-[15px] font-semibold text-plum-900">Your care team</h2>
        <ul className="space-y-3">
          {[m.guideId, m.npId, m.coachId].map((id) => {
            const p = STAFF.find((x) => x.id === id)!;
            return <li key={id} className="flex items-center gap-3"><Avatar name={p.name} size={40} /><span className="text-[14px] text-plum-900"><span className="block font-semibold">{p.name}</span><span className="text-muted">{p.title}</span></span></li>;
          })}
        </ul>
      </section>
    </div>
  );
}

function Locked({ title, body, bare }: { title: string; body: string; bare?: boolean }) {
  return (
    <div className="pb-6">
      {!bare && <Top title={title} />}
      <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
        <img src="/assets/botanical-clover.png" alt="" className="h-28 w-28 object-contain mix-blend-multiply" />
        <Lock size={18} className="text-muted" />
        <p className="text-[15px] text-plum-900">{body}</p>
      </div>
    </div>
  );
}

function Sage() {
  return (
    <div className="pb-6">
      <Top title="SAGE" />
      <div className="m-4 rounded-mcard border border-line bg-paper p-4 text-[14px] text-plum-900 shadow-card">
        <p><span className="mr-2 rounded bg-plum-100 px-1.5 py-0.5 text-xs font-semibold text-plum-700">AI</span>I'm SAGE, an AI. I can explain your report once it's ready. I can't give medical advice.</p>
        <p className="mt-2 font-semibold text-danger-fg">Not for emergencies: call 911.</p>
      </div>
      <p className="px-6 text-center text-[13px] text-muted">Your report arrives on Your Vyta Day. Then you can ask me anything about it.</p>
    </div>
  );
}

function More() {
  const nav = useNavigate();
  const { signOut, toast } = useDemo();
  const items: [string, string][] = [['Your journey', '/journey'], ['Your goals and milestones', '/goals'], ['Forms', '/forms'], ['Intake', '/intake'], ['Blood draw', '/blood-draw'], ['Where things are', '/status']];
  return (
    <div>
      <Top title="More" />
      <ul className="m-4 divide-y divide-line rounded-mcard bg-paper shadow-card">
        {items.map(([l, to]) => <li key={to}><button onClick={() => nav(to)} className="flex min-h-[56px] w-full items-center justify-between px-4 text-left text-[15px] text-plum-900">{l}<ChevronRight size={18} className="text-muted" /></button></li>)}
      </ul>
      <button onClick={() => { nav('/home'); signOut('member'); toast("You're signed out"); }} className="mx-4 flex min-h-[56px] w-[calc(100%-2rem)] items-center gap-3 rounded-mcard bg-paper px-4 text-left text-[15px] text-terracotta-700 shadow-card"><LogOut size={18} /> Sign out</button>
    </div>
  );
}

// Peak moments get a screen of their own, not just a toast (BRAND_UI §5, peak-end).
const staffFirst = (id: string) => STAFF.find((x) => x.id === id)?.name.split(' ')[0] ?? 'Your care team';

function Thanks({ kind }: { kind?: string }) {
  const { m, intake, draw } = useMember();
  const nav = useNavigate();
  const first = m.name.split(' ')[0];
  const copy = kind === 'consents'
    ? { title: `Thank you, ${first}`, body: 'All your consents are signed. Your care team can see them now.', next: intake?.status === 'signed' ? undefined : { label: 'Start your intake', to: '/intake' } }
    : { title: `Thank you, ${first}`, body: `Your intake is complete. ${staffFirst(m.guideId)} and ${staffFirst(m.npId)} will read it before your visit, so your time with them goes on what matters to you.`,
      next: draw && draw.status !== 'done' ? { label: 'See your blood draw', to: '/blood-draw' } : { label: 'See where things are', to: '/status' } };
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-plum-700 text-paper"><Check size={32} aria-hidden="true" /></span>
      <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">{copy.title}</h1>
      <p className="text-[15px] text-plum-900">{copy.body}</p>
      <div className="mt-2 w-full space-y-2">
        {copy.next && <Button size="lg" className="w-full" onClick={() => nav(copy.next!.to)}>{copy.next.label}</Button>}
        <Button size="lg" variant={copy.next ? 'ghost' : 'primary'} className="w-full" onClick={() => nav('/home')}>Back to home</Button>
      </div>
    </div>
  );
}

function MemberNotFound({ back = '/home' }: { back?: string }) {
  const nav = useNavigate();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <img src="/assets/botanical-clover.png" alt="" className="h-24 w-24 object-contain mix-blend-multiply" />
      <h1 className="font-display text-[26px] font-semibold text-plum-700">We couldn't find that</h1>
      <p className="text-[15px] text-plum-900">It may have moved, or it isn't ready yet.</p>
      <Button size="lg" className="mt-2 w-full" onClick={() => nav(back)}>Go back</Button>
    </div>
  );
}

// Presenter-only shortcuts, styled so they read as demo controls rather than product UI.
function DemoControls({ onFill, onSkip }: { onFill?: () => void; onSkip: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-muted/40 px-2 py-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Demo</span>
      {onFill && <button type="button" onClick={onFill} className="min-h-[44px] rounded-md px-2 text-[13px] text-plum-700 underline">Fill the rest of this section</button>}
      <button type="button" onClick={onSkip} className="min-h-[44px] rounded-md px-2 text-[13px] text-plum-700 underline">Skip to the end</button>
    </div>
  );
}
