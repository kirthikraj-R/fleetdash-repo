import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Mail, Lock, User, Eye, EyeOff, ArrowRight, Radar, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    // Tiny artificial delay so the submit state reads as intentional rather than instant/fake.
    setTimeout(() => {
      const result = login(email, password);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(redirectTo, { replace: true });
    }, 350);
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setTimeout(() => {
      const result = register({ name, email: regEmail, password: regPassword, confirmPassword });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(redirectTo, { replace: true });
    }, 350);
  }

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-deep md:grid-cols-2">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      {/* Left — brand / visual panel */}
      <div className="relative hidden overflow-hidden bg-panel md:flex md:flex-col md:justify-between md:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(79,216,224,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,176,32,0.08), transparent 40%)',
          }}
        />
        {/* decorative radar rings */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 animate-sweep rounded-full border border-cyan/20">
          <div className="absolute left-1/2 top-1/2 h-[100px] w-px origin-top bg-gradient-to-b from-cyan/60 to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-panel shadow-clay-xs">
            <Truck size={18} className="text-cyan" />
          </div>
          <span className="font-display text-[15px] font-700 tracking-wide text-ink">FLEETDASH</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-3xl font-600 leading-tight text-ink">
            Track every vehicle.
            <br />
            Miss nothing.
          </h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-muted">
            Real-time positions for thousands of vehicles, instant geofence breach alerts, and a
            live console built to stay smooth under pressure.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 font-body text-xs text-muted">
              <Zap size={14} className="text-cyan" />
              3,000+ telemetry points/sec, zero UI lag
            </div>
            <div className="flex items-center gap-3 font-body text-xs text-muted">
              <Radar size={14} className="text-cyan" />
              Live geofence breach detection
            </div>
            <div className="flex items-center gap-3 font-body text-xs text-muted">
              <ShieldCheck size={14} className="text-cyan" />
              Built for high-throughput logistics ops
            </div>
          </div>
        </div>

        <p className="relative z-10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Infotact Logistics · Fleet Ops Console
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-panel shadow-clay-xs">
              <Truck size={18} className="text-cyan" />
            </div>
            <span className="font-display text-[15px] font-700 tracking-wide text-ink">FLEETDASH</span>
          </div>

          {/* Sign In / Register tab switcher */}
          <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-panel2 p-1.5 shadow-clay-inset">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-xl py-2 font-display text-sm font-600 transition-all ${
                mode === 'login' ? 'bg-cyan text-ink0 shadow-clay-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-xl py-2 font-display text-sm font-600 transition-all ${
                mode === 'register' ? 'bg-cyan text-ink0 shadow-clay-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="font-display text-2xl font-600 text-ink">Sign in</h2>
              <p className="mt-1.5 font-body text-sm text-muted">Welcome back. Your fleet has been moving without you.</p>

              <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Email</label>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-3 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Password</label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-9 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red/10 px-3 py-2.5 font-body text-xs text-red shadow-clay-xs">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 font-display text-sm font-600 text-ink0 shadow-clay-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </form>

              <p className="mt-6 text-center font-body text-xs text-muted">
                Don't have an account?{' '}
                <button onClick={() => switchMode('register')} className="text-cyan hover:underline">
                  Register
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-600 text-ink">Create an account</h2>
              <p className="mt-1.5 font-body text-sm text-muted">Set up access to your fleet ops console.</p>

              <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Full name</label>
                  <div className="relative">
                    <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Smith"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-3 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Email</label>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-3 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Password</label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-9 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">Confirm password</label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-2xl bg-panel2 py-2.5 pl-9 pr-9 font-body text-sm text-ink shadow-clay-inset placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-cyan/30"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red/10 px-3 py-2.5 font-body text-xs text-red shadow-clay-xs">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 font-display text-sm font-600 text-ink0 shadow-clay-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? 'Creating account…' : 'Create account'}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </form>

              <p className="mt-6 text-center font-body text-xs text-muted">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="text-cyan hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
