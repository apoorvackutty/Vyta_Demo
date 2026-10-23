import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { ops } from './state/store';
import { DemoBar, StaffShell, PhoneFrame, Toasts, useStaffRole } from './components/shell';
import { ErrorBoundary } from './ErrorBoundary';
import { useDemo } from './state/store';
import Today from './screens/staff/Today';
import Members from './screens/staff/Members';
import MemberRecord from './screens/staff/MemberRecord';
import Onboard from './screens/staff/Onboard';
import PreReview from './screens/staff/PreReview';
import NotFound from './screens/staff/NotFound';
import { StaffSignIn } from './screens/SignIn';
import MemberApp from './screens/member/MemberApp';

function StaffRoutes() {
  const { pathname } = useLocation();
  const urlRole = useStaffRole();
  const { role, setRole } = useDemo();
  useEffect(() => { if (role !== 'member' && role !== urlRole) setRole(urlRole); }, [urlRole, role, setRole]);
  return (
    <StaffShell>
      <ErrorBoundary key={pathname}>
        <Routes>
          <Route path="/staff/:role/today" element={<Today />} />
          <Route path="/staff/:role/members" element={<Members />} />
          <Route path="/staff/:role/member/:id" element={<MemberRecord />} />
          <Route path="/staff/:role/onboard/:id" element={<Onboard />} />
          <Route path="/staff/:role/pre-review/:id" element={<PreReview />} />
          <Route path="/" element={<Navigate to={`/staff/${urlRole}/today`} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </StaffShell>
  );
}

function Stage() {
  const { role, split, staffSignedIn, setSplit } = useDemo();
  if (role === 'member') {
    return (
      <div id="main-content" tabIndex={-1} className="flex min-h-[calc(100vh-48px)] items-start justify-center bg-cream-100 focus:outline-none sm:py-8">
        <ErrorBoundary><PhoneFrame><MemberApp /></PhoneFrame></ErrorBoundary>
      </div>
    );
  }
  if (!staffSignedIn) return <StaffSignIn />;
  if (split) {
    return (
      <div className="flex">
        <div className="min-w-0 flex-1"><StaffRoutes /></div>
        {/* Wide screens: a column beside the staff view. Narrower: slides in over the right side so it always shows. */}
        <aside aria-label="Member's phone" className="fixed bottom-0 right-0 z-30 max-h-[calc(100vh-96px)] max-w-full shrink-0 max-sm:hidden overflow-y-auto border-l border-line bg-cream-100 px-6 pb-6 pt-3 shadow-card xl:sticky xl:top-[44px] xl:z-auto xl:h-[calc(100vh-44px)] xl:max-h-none xl:shadow-none">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">Testelle's phone, live</p>
            <button onClick={() => setSplit(false)} className="flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs font-medium text-plum-700 hover:bg-plum-100"><X size={14} aria-hidden="true" /> Hide phone</button>
          </div>
          <ErrorBoundary><PhoneFrame><MemberApp /></PhoneFrame></ErrorBoundary>
        </aside>
      </div>
    );
  }
  return <StaffRoutes />;
}

// Simulated draft engine (TRD §4): 2.5 s for a new draft, 1.5 s for a rebuild after send back.
function DraftBuilder() {
  const { reports, run } = useDemo();
  const building = reports.filter((r) => r.status === 'building').map((r) => `${r.id}|${r.building?.kind}`).join(',');
  useEffect(() => {
    if (!building) return;
    const timers = building.split(',').map((key) => {
      const [rid, kind] = key.split('|');
      return setTimeout(() => run((d) => ops.finishDraft(d, rid), kind === 'rebuild' ? 'Draft rebuilt · back for pre-review' : 'Draft HEAL plan ready for NP pre-review'), kind === 'rebuild' ? 1500 : 2500);
    });
    return () => timers.forEach(clearTimeout);
  }, [building, run]);
  return null;
}

// Full-screen member app for a real phone (TRD §5: 360–430 px, no demo chrome).
function MemberFullScreen() {
  return (
    <div id="main-content" tabIndex={-1} className="mx-auto flex h-[100dvh] max-w-[430px] flex-col bg-cream-200 focus:outline-none sm:border-x sm:border-line">
      {/* TRD §5 data hygiene: every screen says it's a demo */}
      <p className="bg-plum-900 py-1 text-center text-xs text-cream-100">Demo · fictional data</p>
      <div className="min-h-0 flex-1"><ErrorBoundary><MemberApp /></ErrorBoundary></div>
    </div>
  );
}

function Shell() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/member')) return <MemberFullScreen />;
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-plum-700 focus:shadow-card">Skip to content</a>
      <DemoBar />
      <Stage />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DraftBuilder />
      <Shell />
      <Toasts />
    </BrowserRouter>
  );
}
