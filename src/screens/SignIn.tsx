// Cosmetic sign-in for staff and the member (TRD §6: no real auth, no passwords in the demo).
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { useDemo } from '../state/store';
import { STAFF } from '../data/seed';
import { Avatar, Button, inputCls } from '../components/ui';
import type { StaffRole } from '../types';

const ROLE_OF: Record<string, StaffRole> = { 's-guide': 'guide', 's-ma': 'ma', 's-np': 'np', 's-coach': 'coach', 's-admin': 'admin' };

export function StaffSignIn() {
  const { signInStaff, setRole, toast } = useDemo();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const enter = (role: StaffRole, name: string) => {
    signInStaff(role);
    // Keep a deep link if it belongs to this role; otherwise start on Today.
    if (!pathname.startsWith(`/staff/${role}/`)) nav(`/staff/${role}/today`);
    toast(`Signed in as ${name}`);
  };
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-cream-100 px-4 py-10 focus:outline-none">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-card border border-line bg-paper shadow-card md:grid-cols-5">
        <div className="relative hidden flex-col justify-between bg-plum-800 p-8 text-cream-100 md:col-span-2 md:flex">
          <img src="/assets/logo-lotus-wordmark.png" alt="Vyta MenoClinic" className="h-20 w-auto self-start invert" />
          <div>
            <p className="font-display text-[32px] font-semibold leading-tight">Care that keeps up with her.</p>
            <p className="mt-2 text-sm opacity-80">Vyta Care · staff workspace</p>
          </div>
        </div>
        <div className="p-8 md:col-span-3">
          <h1 className="font-display text-[32px] font-semibold text-plum-700">Welcome back</h1>
          <p className="mb-5 text-sm text-muted">Choose who you are. In the demo there's no password; real sign-in with your clinic account comes with production.</p>
          <ul className="space-y-2">
            {STAFF.map((p) => (
              <li key={p.id}>
                <button onClick={() => enter(ROLE_OF[p.id], p.name)}
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-plum-700 hover:bg-plum-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500">
                  <Avatar name={p.name} size={36} />
                  <span className="flex-1"><span className="block text-sm font-semibold text-plum-900">{p.name}</span><span className="text-xs text-muted">{p.title}</span></span>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-line pt-4">
            <button onClick={() => setRole('member')} className="inline-flex items-center gap-2 text-sm font-medium text-terracotta-700 underline-offset-2 hover:underline">
              <Smartphone size={16} /> Showing the member's side? Open Testelle's app
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

const DEMO_CODE = '482913';

export function MemberSignIn({ name }: { name: string }) {
  const { signInMember, toast } = useDemo();
  const [step, setStep] = useState<'welcome' | 'code'>('welcome');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (code.length < 6) { setError('Enter all 6 digits from the text.'); return; }
    if (code === '000000') { setError("That code didn't work. Check your texts and try again, or send a new code."); return; }
    signInMember();
    toast(`Welcome back, ${name.split(' ')[0]}`);
  };

  if (step === 'welcome') {
    return (
      <div className="flex h-full flex-col items-center justify-between px-8 pb-10 pt-14 text-center">
        <img src="/assets/logo-lotus-wordmark.png" alt="Vyta MenoClinic" className="h-14 w-auto" />
        <div className="flex flex-col items-center gap-3">
          <img src="/assets/cover-figure.png" alt="" className="h-52 w-auto rounded-mcard" />
          <h1 className="font-display text-[34px] font-semibold leading-tight text-plum-700">Welcome to Vyta</h1>
          <p className="text-[15px] text-plum-900">Your menopause care, your plan and your care team, in one place.</p>
        </div>
        <div className="w-full space-y-3">
          <Button size="lg" className="w-full" onClick={() => setStep('code')}>Sign in</Button>
          <p className="text-[13px] text-muted">New here? Your Guide sends you an invite after your discovery call.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col px-6 pb-10 pt-4">
      <button aria-label="Back" onClick={() => { setStep('welcome'); setError(''); }} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-plum-700"><ChevronLeft size={22} /></button>
      <h1 className="mt-4 font-display text-[30px] font-semibold leading-tight text-plum-700">Check your texts</h1>
      <p className="mt-1 text-[15px] text-plum-900">We sent a 6-digit code to the phone ending 0142.</p>
      <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <label htmlFor="otp" className="block text-[13px] font-medium text-plum-900">Your code</label>
        {/* Demo: Tab or → on the empty field fills a code, like the phone's suggested code */}
        <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="••••••"
          aria-invalid={!!error} aria-describedby={error ? 'otp-error' : 'otp-hint'}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          onKeyDown={(e) => { if (!code && ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight')) { e.preventDefault(); setCode(DEMO_CODE); } }}
          className={clsx(inputCls, 'h-14 text-center text-[22px] tracking-[0.5em] tabular-nums', error && 'border-danger-fg')} />
        {error
          ? <p id="otp-error" role="alert" className="text-[13px] text-danger-fg">{error}</p>
          : !code && <p id="otp-hint" className="flex min-h-[44px] items-center gap-1 text-[13px] text-muted">Press Tab or <button type="button" className="inline-flex min-h-[44px] items-center font-medium text-terracotta-700 underline underline-offset-2" onClick={() => setCode(DEMO_CODE)}>tap here</button> to use the code from the text</p>}
        <Button size="lg" type="submit" className="w-full">Sign in</Button>
      </form>
      <button onClick={() => { setCode(''); setError(''); toast('New code sent'); }} className="mt-4 min-h-[44px] self-center text-[14px] font-medium text-terracotta-700 underline underline-offset-2">Send a new code</button>
      <p className="mt-auto text-center text-[12px] text-muted">Demo: any 6 digits work, except 000000, which shows the error.</p>
    </div>
  );
}
