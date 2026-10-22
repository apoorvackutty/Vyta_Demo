import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { DemoBar, StaffShell, PhoneFrame, Toasts, useStaffRole } from './components/shell';
import { ErrorBoundary } from './ErrorBoundary';
import { useDemo } from './state/store';
import Today from './screens/staff/Today';
import Members from './screens/staff/Members';
import MemberRecord from './screens/staff/MemberRecord';
import Onboard from './screens/staff/Onboard';
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
          <Route path="*" element={<Navigate to="/staff/guide/today" replace />} />
        </Routes>
      </ErrorBoundary>
    </StaffShell>
  );
}

function Stage() {
  const { role, split } = useDemo();
  if (role === 'member') {
    return (
      <div className="flex min-h-[calc(100vh-44px)] items-start justify-center bg-cream-100 py-8">
        <ErrorBoundary><PhoneFrame><MemberApp /></PhoneFrame></ErrorBoundary>
      </div>
    );
  }
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

export default function App() {
  return (
    <BrowserRouter>
      <DemoBar />
      <Stage />
      <Toasts />
    </BrowserRouter>
  );
}
