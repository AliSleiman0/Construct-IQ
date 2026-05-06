'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { ROLES, ROLE_PREFIX } from '@/config/roles';
import styles from './login.module.css';

const C = {
  navy: '#0E1726',
  navyLine: '#1A2435',
  cyan: '#3FA7D6',
  amber: '#FFB400',
  amberDark: '#E6A100',
  white: '#F5F7FA',
  gray: '#8A99B0',
  grayDim: '#5C6A80',
  red: '#F04E4E',
  black: '#0A0F18',
} as const;

const FONT_HEADING = '"Archivo", "Space Grotesk", sans-serif';
const FONT_BODY = '"Inter", sans-serif';
const FONT_MONO = '"JetBrains Mono", monospace';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS: { email: string; role: string; password: string }[] = [
  { email: 'admin@constructiq.com',       role: 'SUPER_ADMIN',   password: 'Admin@1234' },
  { email: 'support@constructiq.com',     role: 'SUPPORT_AGENT', password: 'Demo@1234' },
  { email: 'orgadmin@constructiq.com',    role: 'ORG_ADMIN',     password: 'Demo@1234' },
  { email: 'pm@constructiq.com',          role: 'PM',            password: 'Demo@1234' },
  { email: 'procurement@constructiq.com', role: 'PROCUREMENT',   password: 'Demo@1234' },
  { email: 'qs@constructiq.com',          role: 'SURVEYOR',      password: 'Demo@1234' },
  { email: 'engineer@constructiq.com',    role: 'SITE_ENG',      password: 'Demo@1234' },
  { email: 'client@constructiq.com',      role: 'CLIENT',        password: 'Demo@1234' },
];

const hasPathPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`);

const isAllowedRedirect = (path: string, home: string): boolean => {
  // Reject protocol-relative or absolute URLs ("//evil.com", "https://...")
  // that would otherwise pass startsWith('/').
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (hasPathPrefix(path, '/profile') || hasPathPrefix(path, '/settings')) {
    return true;
  }
  for (const r of ROLES) {
    if (hasPathPrefix(path, ROLE_PREFIX[r])) {
      return hasPathPrefix(home, ROLE_PREFIX[r]);
    }
  }
  return false;
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  return (
    <div className={styles.shell}>
      <PhotoPane />
      <FormPane />
    </div>
  );
}

function PhotoPane() {
  return (
    <div className={styles.photoPane}>
      <JobsitePhoto />
      <div style={{ position: 'absolute', top: 36, left: 40, zIndex: 2 }}>
        <Wordmark size={20} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 40,
          zIndex: 2,
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: C.cyan,
          opacity: 0.6,
          letterSpacing: '0.1em',
        }}
      >
        N 47.6062° · W 122.3321°
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 56,
          left: 40,
          right: 40,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <HazardStripe width={80} height={6} idSuffix="hero" />
        <h2
          style={{
            margin: 0,
            fontFamily: FONT_HEADING,
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 44px)',
            color: C.white,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            maxWidth: 520,
          }}
        >
          Built for the people
          <br />
          who build.
        </h2>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: C.cyan,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          JOBSITE · 06:42 · GOLDEN HOUR
        </div>
      </div>
    </div>
  );
}

function FormPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useLogin();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Locked from click → through router.replace navigation. Only error paths
  // reset it; on success the page unmounts before we'd need to.
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  const onSubmit = async (data: LoginFormValues) => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const home = await login(data);
      const from = searchParams.get('from');
      const target = from && isAllowedRedirect(from, home) ? from : home;
      router.replace(target);
      // Intentionally NOT clearing `submitting` — the page is navigating
      // away. Clearing here would flicker the button back to "SIGN IN"
      // between mutation success and the new route taking over.
    } catch (err) {
      setSubmitting(false);
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setSubmitError('That email and password don’t match.');
        } else if (status === 429) {
          setLockedOut(true);
          setSubmitError(null);
        } else if (!err.response) {
          setSubmitError('Connection failed. Is the backend running?');
        } else {
          setSubmitError('Login failed. Please try again.');
        }
      } else {
        setSubmitError('Login failed. Please try again.');
      }
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setSubmitError(null);
  };

  const isDev = process.env.NODE_ENV === 'development';

  const emailRegister = register('email');
  const passwordRegister = register('password');

  const emailFieldState = lockedOut
    ? 'disabled'
    : errors.email
    ? 'error'
    : emailFocused
    ? 'focus'
    : emailValue
    ? 'filled'
    : 'default';

  const passwordFieldState = lockedOut
    ? 'disabled'
    : errors.password || (submitError && !lockedOut)
    ? 'error'
    : passwordFocused
    ? 'focus'
    : passwordValue
    ? 'filled'
    : 'default';

  return (
    <div className={styles.formPane}>
      <div className={styles.formBgGrid} aria-hidden="true" />
      <div className={styles.regMark}>[SECURE · TLS 1.3]</div>

      <div className={styles.formPaneInner}>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Hazard stripe */}
          <div style={{ width: 64 }}>
            <HazardStripe width={64} height={6} idSuffix="form" />
          </div>

          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT_HEADING,
                fontWeight: 800,
                fontSize: 30,
                color: C.white,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Sign in to ConstructIQ
            </h1>
            <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 15, color: C.gray, fontWeight: 400 }}>
              Pick up where you left off.
            </p>
          </div>

          {/* Locked-out banner */}
          {lockedOut && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(240,78,78,0.08)',
                border: `1px solid ${C.red}`,
                borderLeft: `4px solid ${C.red}`,
                borderRadius: 4,
              }}
            >
              <div style={{ marginTop: 2 }}>
                <LockIcon color={C.red} />
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13, color: C.white, marginBottom: 2 }}>
                  Account temporarily locked
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.gray, lineHeight: 1.45 }}>
                  Too many attempts. Try again in a minute or contact your org admin.
                </div>
              </div>
            </div>
          )}

          {/* Top-level submit error (non-locked) */}
          {submitError && !lockedOut && !errors.email && !errors.password && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'rgba(240,78,78,0.08)',
                border: `1px solid ${C.red}`,
                borderRadius: 4,
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.white,
              }}
            >
              <AlertIcon color={C.red} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field
              label="Work email"
              state={emailFieldState}
              helper={errors.email?.message}
            >
              <input
                {...emailRegister}
                type="email"
                placeholder="you@yourcompany.com"
                autoFocus
                autoComplete="email"
                disabled={lockedOut}
                onFocus={() => setEmailFocused(true)}
                onBlur={(e) => {
                  emailRegister.onBlur(e);
                  setEmailFocused(false);
                }}
                style={inputElementStyle(emailFieldState)}
              />
            </Field>

            <Field
              label="Password"
              state={passwordFieldState}
              helper={errors.password?.message ?? (submitError && !lockedOut ? submitError : undefined)}
            >
              <input
                {...passwordRegister}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={lockedOut}
                onFocus={() => setPasswordFocused(true)}
                onBlur={(e) => {
                  passwordRegister.onBlur(e);
                  setPasswordFocused(false);
                }}
                style={inputElementStyle(passwordFieldState)}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 14px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <EyeIcon open={showPassword} color={passwordFocused ? C.white : C.gray} />
              </button>
            </Field>
          </div>

          {/* Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: -4,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.gray,
                fontWeight: 500,
              }}
            >
              Sessions stay signed in for 7 days
            </span>
            <a
              href="mailto:support@constructiq.com?subject=Password%20reset%20request"
              style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: C.cyan, textDecoration: 'none' }}
            >
              Forgot password?
            </a>
          </div>

          {/* CTA */}
          <PrimaryButton disabled={lockedOut} loading={submitting} />

          {/* Dev demo accounts */}
          {isDev && (
            <div style={{ marginTop: 4, paddingTop: 16, borderTop: `1px solid ${C.navyLine}` }}>
              <button
                type="button"
                onClick={() => setShowDemo((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: C.grayDim,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                <span>Demo accounts (dev only)</span>
                <span style={{ fontSize: 14 }}>{showDemo ? '−' : '+'}</span>
              </button>
              {showDemo && (
                <div style={{ marginTop: 12, display: 'grid', gap: 4 }}>
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillDemo(a.email, a.password)}
                      style={{
                        textAlign: 'left',
                        background: 'transparent',
                        border: `1px solid ${C.navyLine}`,
                        borderRadius: 4,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: C.gray,
                        letterSpacing: '0.02em',
                      }}
                    >
                      <span style={{ color: C.cyan, display: 'inline-block', minWidth: 110 }}>{a.role}</span>
                      <span>{a.email}</span>
                    </button>
                  ))}
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.grayDim, marginTop: 4 }}>
                    Click a row to fill the form. Demo@1234 (Admin@1234 for SUPER_ADMIN).
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.gray, textAlign: 'center' }}>
              New to ConstructIQ?{' '}
              <a
                href="mailto:support@constructiq.com?subject=Request%20access"
                style={{ color: C.cyan, textDecoration: 'none', fontWeight: 500 }}
              >
                Request access
              </a>
            </div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 11,
                color: C.grayDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>© 2026 ConstructIQ</span>
              <span>·</span>
              <a href="#" style={{ color: C.grayDim, textDecoration: 'none' }}>Privacy</a>
              <span>·</span>
              <a href="#" style={{ color: C.grayDim, textDecoration: 'none' }}>Terms</a>
              <span>·</span>
              <span style={{ fontFamily: FONT_MONO, color: C.grayDim }}>v1.4.2</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reusable visual primitives ─────────────────────────────────────────────

type FieldState = 'default' | 'focus' | 'filled' | 'error' | 'disabled';

function inputElementStyle(state: FieldState): React.CSSProperties {
  const isDisabled = state === 'disabled';
  const isFilled = state === 'filled';
  return {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    height: '100%',
    padding: '0 14px',
    color: isDisabled ? C.grayDim : isFilled || state === 'focus' || state === 'error' ? C.white : C.gray,
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 400,
  };
}

function Field({
  label,
  state,
  helper,
  children,
}: {
  label: string;
  state: FieldState;
  helper?: string | null;
  children: React.ReactNode;
}) {
  const isFocus = state === 'focus';
  const isError = state === 'error';
  const isDisabled = state === 'disabled';
  const border = isError ? C.red : isFocus ? C.amber : '#2a3548';
  const ring = isFocus
    ? `0 0 0 2px ${C.amber}`
    : isError
    ? '0 0 0 2px rgba(240,78,78,0.25)'
    : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, opacity: isDisabled ? 0.5 : 1 }}>
      <label
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 500,
          fontSize: 12,
          color: C.gray,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: 48,
          background: isDisabled ? '#0a1220' : '#101c30',
          border: `1px solid ${border}`,
          borderRadius: 6,
          boxShadow: ring,
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        {children}
      </div>
      {helper && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 500,
            color: isError ? C.red : C.gray,
            marginTop: 2,
          }}
        >
          {isError && <AlertIcon color={C.red} />}
          <span>{helper}</span>
        </div>
      )}
    </div>
  );
}

function PrimaryButton({ disabled, loading }: { disabled: boolean; loading: boolean }) {
  const isInactive = disabled || loading;
  return (
    <button
      type="submit"
      disabled={isInactive}
      style={{
        width: '100%',
        height: 48,
        background: disabled ? '#3a3320' : C.amber,
        color: disabled ? '#5a4f30' : C.black,
        border: 'none',
        borderRadius: 6,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.04em',
        cursor: isInactive ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'all .12s',
      }}
      onMouseEnter={(e) => {
        if (!isInactive) e.currentTarget.style.background = C.amberDark;
      }}
      onMouseLeave={(e) => {
        if (!isInactive) e.currentTarget.style.background = C.amber;
      }}
    >
      {loading ? (
        <>
          <Spinner />
          <span>SIGNING IN…</span>
        </>
      ) : (
        <span>SIGN IN</span>
      )}
    </button>
  );
}

// ── SVG primitives ─────────────────────────────────────────────────────────

function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: C.white,
        fontFamily: FONT_HEADING,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: '-0.01em',
      }}
    >
      <svg width={size + 4} height={size + 4} viewBox="0 0 28 28" fill="none">
        <rect x="2" y="2" width="24" height="24" stroke={C.amber} strokeWidth="2.5" />
        <path d="M2 14 L14 2 L26 14 L14 26 Z" stroke={C.white} strokeWidth="2" fill="none" />
        <circle cx="14" cy="14" r="3" fill={C.amber} />
      </svg>
      <span>ConstructIQ</span>
    </div>
  );
}

function HazardStripe({
  width = 64,
  height = 8,
  idSuffix = 'a',
}: {
  width?: number;
  height?: number;
  idSuffix?: string;
}) {
  const id = `ciq-hz-${idSuffix}-${width}-${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="14" height={height} patternTransform="skewX(-45)">
          <rect width="7" height={height} fill={C.amber} />
          <rect x="7" width="7" height={height} fill={C.black} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id})`} />
    </svg>
  );
}

function EyeIcon({ open, color }: { open: boolean; color: string }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="square">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="square">
      <path d="M2 12s3.5-7 10-7c2.4 0 4.4.9 6 2.1M22 12s-3.5 7-10 7c-2.4 0-4.4-.9-6-2.1" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={styles.spinner}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={C.black} strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={C.black} strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square">
      <rect x="4" y="11" width="16" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="square">
      <path d="M12 3 L22 21 L2 21 Z" />
      <path d="M12 10 V14" />
      <circle cx="12" cy="17.5" r="0.8" fill={color} stroke="none" />
    </svg>
  );
}

// ── Jobsite illustration (duotone SVG, self-contained) ────────────────────

function JobsitePhoto() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #1a2940 0%, #0E1726 60%, #050a14 100%)',
      }}
    >
      {/* sun glow */}
      <div
        style={{
          position: 'absolute',
          right: '18%',
          top: '22%',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,180,0,0.1) 40%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '23%',
          top: '28%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255,200,80,0.85)',
          filter: 'blur(2px)',
        }}
      />

      <svg
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <g fill="#0a1426" opacity="0.85">
          <rect x="0" y="420" width="80" height="380" />
          <rect x="70" y="380" width="50" height="420" />
          <rect x="115" y="450" width="70" height="350" />
          <rect x="500" y="430" width="100" height="370" />
          <rect x="430" y="460" width="80" height="340" />
        </g>
        <g stroke="#0a1426" strokeWidth="3" fill="#0a1426">
          <line x1="180" y1="800" x2="180" y2="180" stroke="#0a1426" strokeWidth="6" />
          <line x1="180" y1="180" x2="380" y2="180" strokeWidth="5" />
          <line x1="180" y1="180" x2="120" y2="180" strokeWidth="5" />
          <line x1="180" y1="180" x2="180" y2="220" strokeWidth="2" />
          <line x1="280" y1="180" x2="280" y2="240" strokeWidth="2" />
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={i}
              x1={172}
              y1={780 - i * 30}
              x2={188}
              y2={760 - i * 30}
              stroke="#0a1426"
              strokeWidth="2"
            />
          ))}
          <rect x="110" y="170" width="20" height="20" />
        </g>
        <g stroke="#1a2940" strokeWidth="2" fill="none">
          <rect x="280" y="520" width="220" height="280" fill="#0d1828" />
          <line x1="280" y1="580" x2="500" y2="580" stroke="#1a2940" />
          <line x1="280" y1="660" x2="500" y2="660" stroke="#1a2940" />
          <line x1="280" y1="740" x2="500" y2="740" stroke="#1a2940" />
          <line x1="340" y1="520" x2="340" y2="800" />
          <line x1="400" y1="520" x2="400" y2="800" />
          <line x1="460" y1="520" x2="460" y2="800" />
          <line x1="280" y1="520" x2="340" y2="580" />
          <line x1="340" y1="520" x2="400" y2="580" />
          <line x1="400" y1="520" x2="460" y2="580" />
          <line x1="460" y1="520" x2="500" y2="560" />
        </g>
        <g fill="#050a14">
          <circle cx="120" cy="640" r="14" />
          <rect x="106" y="652" width="28" height="60" />
          <rect x="98" y="660" width="44" height="14" />
          <rect x="106" y="710" width="10" height="40" />
          <rect x="124" y="710" width="10" height="40" />
          <ellipse cx="120" cy="628" rx="18" ry="4" />

          <circle cx="220" cy="660" r="13" />
          <ellipse cx="220" cy="650" rx="17" ry="3.5" />
          <rect x="208" y="672" width="24" height="55" />
          <rect x="232" y="678" width="30" height="6" />
          <rect x="208" y="725" width="9" height="38" />
          <rect x="223" y="725" width="9" height="38" />
        </g>
        <g stroke="#FFB400" strokeOpacity="0.15">
          <line x1="0" y1="350" x2="600" y2="350" strokeWidth="1" />
          <line x1="0" y1="420" x2="600" y2="420" strokeWidth="0.5" />
        </g>
      </svg>

      {/* duotone overlays on the SVG base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(14,23,38,0.45) 0%, rgba(14,23,38,0.35) 50%, rgba(14,23,38,0.85) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(63,167,214,0.18) 0%, transparent 50%, rgba(14,23,38,0.6) 100%)',
        }}
      />

      {/* Real jobsite photo as full-bleed banner with bottom fade mask
          so the SVG blueprint background shows through behind the caption. */}
      <div className={styles.photoBanner}>
        <img
          src="/images/jobsite.jpg"
          alt="Two workers in hard hats and hi-vis vests reviewing blueprints on-site"
          className={styles.photoBannerImg}
        />
        <div className={styles.photoBannerNavy} />
        <div className={styles.photoBannerCyan} />
      </div>
    </div>
  );
}
