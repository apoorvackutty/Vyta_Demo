import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
  const { role, split, staffSignedIn } = useDemo();
  if (role === 'member') {
    return (
      <div id="main-content" tabIndex={-1} className="flex min-h-[calc(100vh-44px)] items-start justify-center bg-cream-100 py-8 focus:outline-none">
        <ErrorBoundary><PhoneFrame><MemberApp /></PhoneFrame></ErrorBoundary>
      </div>
    );
  }
  if (!staffSignedIn) return <StaffSignIn />;
  if (split) {
    return (
      <div className="flex">
        <div className="min-w-0 flex-1"><StaffRoutes /></div>
        <aside aria-label="Member's phone" className="sticky top-[44px] hidden h-[calc(100vh-44px)] shrink-0 overflow-y-auto border-l border-line bg-cream-100 px-6 py-6 xl:block">
          <p className="mb-3 text-center text-xs font-medium text-muted">Testelle's phone, live</p>
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
    <div id="main-content" tabIndex={-1} className="mx-auto h-[100dvh] max-w-[430px] bg-cream-200 focus:outline-none sm:border-x sm:border-line">
      <ErrorBoundary><MemberApp /></ErrorBoundary>
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
