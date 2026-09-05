'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';

const inputWrapStyle = { marginBottom: '1.1rem', textAlign: 'left' };
const labelStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px',
  textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 700,
};
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', padding: '0.75rem 0.9rem', fontSize: '0.85rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const linkBtnStyle = {
  background: 'none', border: 'none', color: '#fff', textDecoration: 'underline',
  cursor: 'pointer', fontSize: 'inherit', padding: 0, fontFamily: 'inherit',
};
const showToggleStyle = {
  background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
  fontSize: '0.62rem', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase',
  padding: 0, fontFamily: 'inherit',
};
const primaryBtnStyle = {
  width: '100%', background: '#ffffff', border: 'none', color: '#000',
  padding: '0.9rem', fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase',
  fontWeight: 800, cursor: 'pointer',
};
const secondaryBtnStyle = {
  width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff', padding: '0.85rem', fontSize: '0.7rem', letterSpacing: '2px',
  textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
};

// Maps raw Supabase error text to a short SpaceTec-toned message. Two cases
// (email-not-confirmed, and any signup 422 that actually just means
// "already registered") are handled as their own dedicated screens/states
// rather than through this generic mapper — see handleSubmit below.
function friendlyAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('password') && (msg.includes('at least') || msg.includes('weak') || msg.includes('short'))) {
    return 'Password is too weak — use at least 6 characters.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment and try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error — please try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

function isEmailNotConfirmedError(error) {
  return (error?.message || '').toLowerCase().includes('email not confirmed');
}

export default function AuthModal() {
  const {
    authModalOpen, authModalMode, closeAuthModal, handleAuthSuccess,
    signIn, signUp, signOut, resendConfirmation, user, profile,
  } = useAuth();

  // 'signin' | 'signup' | 'account' | 'confirm-pending' | 'email-not-confirmed'
  const [mode, setMode] = useState(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // 'loading' | 'success' | null
  const [pendingEmail, setPendingEmail] = useState(''); // email shown on the confirm-pending / not-confirmed screens
  const [resendState, setResendState] = useState(null); // 'sending' | 'sent' | error string | null
  const resendCooldownRef = useRef(null);

  useEffect(() => {
    if (authModalOpen) {
      setMode(authModalMode);
      setError(null);
      setStatus(null);
      setPassword('');
      setShowPassword(false);
      setResendState(null);
    }
  }, [authModalOpen, authModalMode]);

  useEffect(() => () => clearTimeout(resendCooldownRef.current), []);

  // Cross-tab safety net: confirmation links are usually opened in a new
  // tab, and Supabase syncs the resulting session back to this tab via
  // localStorage automatically. If that happens while this modal is stuck
  // showing "waiting on you" screens, resolve it immediately instead of
  // leaving the visitor looking at a stale confirm-pending/not-confirmed
  // message after they've already confirmed.
  useEffect(() => {
    if (authModalOpen && user && (mode === 'confirm-pending' || mode === 'email-not-confirmed')) {
      handleAuthSuccess();
    }
  }, [authModalOpen, user, mode, handleAuthSuccess]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }

    setStatus('loading');
    const trimmedEmail = email.trim();

    if (mode === 'signin') {
      const { error: authError } = await signIn(trimmedEmail, password);
      if (authError) {
        setStatus(null);
        if (isEmailNotConfirmedError(authError)) {
          setPendingEmail(trimmedEmail);
          setResendState(null);
          setMode('email-not-confirmed');
          return;
        }
        setError(friendlyAuthError(authError));
        return;
      }
      // A real authenticated session now exists (signIn() only returns
      // without error once Supabase has actually issued one) — safe to
      // resume whatever the visitor was trying to do.
      setStatus('success');
      setTimeout(() => handleAuthSuccess(), 450);
      return;
    }

    // mode === 'signup'
    const { error: authError, session } = await signUp(trimmedEmail, password, displayName.trim());
    if (authError) {
      setStatus(null);
      setError(friendlyAuthError(authError));
      return;
    }

    if (!session) {
      // This is the fix for the core bug: signUp() succeeding does NOT
      // mean the visitor is authenticated while email confirmation is
      // enabled. Show the confirmation-pending screen and stop here —
      // do NOT call handleAuthSuccess(), so any pending protected action
      // stays parked until a real session exists.
      setStatus(null);
      setPendingEmail(trimmedEmail);
      setMode('confirm-pending');
      return;
    }

    // Only reachable if the project has email confirmation disabled, in
    // which case signUp() already returns a real session.
    setStatus('success');
    setTimeout(() => handleAuthSuccess(), 450);
  };

  const handleResend = async () => {
    setResendState('sending');
    const { error: resendError } = await resendConfirmation(pendingEmail);
    if (resendError) {
      setResendState(friendlyAuthError(resendError));
      return;
    }
    setResendState('sent');
    // Simple client-side cooldown so the button can't be hammered — on top
    // of whatever rate limiting Supabase itself applies server-side.
    clearTimeout(resendCooldownRef.current);
    resendCooldownRef.current = setTimeout(() => setResendState(null), 30000);
  };

  const resendButton = (
    <button
      type="button"
      onClick={handleResend}
      disabled={resendState === 'sending' || resendState === 'sent'}
      style={{
        ...secondaryBtnStyle,
        marginTop: '0.9rem',
        cursor: resendState === 'sending' || resendState === 'sent' ? 'default' : 'pointer',
        opacity: resendState === 'sending' ? 0.6 : 1,
      }}
    >
      {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Sent' : 'Resend Confirmation Email'}
    </button>
  );

  const resendStatusLine = (() => {
    if (resendState === 'sent') {
      return (
        <p style={{ color: '#4ade80', fontSize: '0.72rem', margin: '0.8rem 0 0' }}>
          CONFIRMATION EMAIL SENT — check your inbox.
        </p>
      );
    }
    if (resendState && resendState !== 'sending') {
      return <p style={{ color: '#f87171', fontSize: '0.72rem', margin: '0.8rem 0 0' }}>{resendState}</p>;
    }
    return null;
  })();

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
        <motion.div
          key="auth-modal-panel"
          className="spacetec-auth-card"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: 'min(400px, 100%)',
            background: '#050505',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '2.5rem 2rem',
            boxSizing: 'border-box',
            textAlign: 'center',
            fontFamily: '"Space Grotesk", -apple-system, sans-serif',
          }}
        >
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#71717a', fontSize: '1rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>

          <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '6px', color: '#fff' }}>SPACETEC</span>

          {mode === 'account' && (
            <>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '1.2rem 0 0.3rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Account
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '0.95rem', margin: '0 0 0.3rem', fontWeight: 700 }}>
                {profile?.display_name || 'SpaceTec Member'}
              </p>
              <p style={{ color: '#71717a', fontSize: '0.75rem', margin: '0 0 1.8rem' }}>{user?.email}</p>
              <button
                type="button"
                onClick={async () => { await signOut(); closeAuthModal(); }}
                style={secondaryBtnStyle}
              >
                Sign Out
              </button>
            </>
          )}

          {mode === 'confirm-pending' && (
            <>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '1.2rem 0 0.3rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Account Created
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
                Check your email to confirm your SpaceTec account.
              </p>
              <p style={{ color: '#71717a', fontSize: '0.72rem', margin: '0 0 0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                We sent a confirmation link to
              </p>
              <p style={{ color: '#fff', fontSize: '0.85rem', margin: '0 0 1.6rem', wordBreak: 'break-word' }}>
                {pendingEmail}
              </p>
              <p style={{ color: '#71717a', fontSize: '0.78rem', margin: '0 0 1.2rem', lineHeight: 1.6 }}>
                Confirm your email before continuing.
              </p>

              {resendButton}
              {resendStatusLine}

              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setResendState(null); }}
                style={{ ...linkBtnStyle, display: 'block', margin: '1.4rem auto 0', fontSize: '0.72rem' }}
              >
                Back to Sign In
              </button>
            </>
          )}

          {mode === 'email-not-confirmed' && (
            <>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '1.2rem 0 0.3rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Email Not Confirmed
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '0.85rem', margin: '0 0 1.6rem', lineHeight: 1.6 }}>
                Please confirm your email address before signing in.
              </p>

              {resendButton}
              {resendStatusLine}

              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setResendState(null); }}
                style={{ ...linkBtnStyle, display: 'block', margin: '1.4rem auto 0', fontSize: '0.72rem' }}
              >
                Back to Sign In
              </button>
            </>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: '1.2rem 0 0.3rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p style={{ color: '#71717a', fontSize: '0.75rem', margin: '0 0 1.8rem' }}>
                {mode === 'signin' ? 'Access the full SpaceTec experience.' : 'Create your SpaceTec account.'}
              </p>

              <form onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div style={inputWrapStyle}>
                    <label style={labelStyle}><span>Display Name</span></label>
                    <input
                      style={inputStyle} type="text" value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)} required
                    />
                  </div>
                )}
                <div style={inputWrapStyle}>
                  <label style={labelStyle}><span>Email</span></label>
                  <input
                    style={inputStyle} type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  />
                </div>
                <div style={inputWrapStyle}>
                  <label style={labelStyle} htmlFor="spacetec-auth-password">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={showToggleStyle}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <input
                    id="spacetec-auth-password"
                    style={inputStyle} type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                {error && (
                  <p style={{ color: '#f87171', fontSize: '0.72rem', margin: '0 0 1rem', textAlign: 'left' }}>{error}</p>
                )}
                {status === 'success' && (
                  <p style={{ color: '#4ade80', fontSize: '0.72rem', margin: '0 0 1rem', textAlign: 'left' }}>
                    {mode === 'signin' ? 'Signed in.' : 'Account created.'}
                  </p>
                )}

                <button type="submit" disabled={status === 'loading'} style={{ ...primaryBtnStyle, cursor: status === 'loading' ? 'default' : 'pointer', opacity: status === 'loading' ? 0.6 : 1 }}>
                  {status === 'loading' ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p style={{ color: '#71717a', fontSize: '0.72rem', marginTop: '1.5rem' }}>
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null); }} style={linkBtnStyle}>
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('signin'); setError(null); }} style={linkBtnStyle}>
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
      </AnimatePresence>

      <style jsx global>{`
        @property --spacetec-auth-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes spacetec-auth-border-trace {
          to { --spacetec-auth-angle: 360deg; }
        }
        /* Restrained, slow-moving white trace around the auth card's
           perimeter — off entirely under prefers-reduced-motion, leaving
           just the card's normal static border. */
        @media (prefers-reduced-motion: no-preference) {
          .spacetec-auth-card::before {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            padding: 1px;
            background: conic-gradient(
              from var(--spacetec-auth-angle, 0deg),
              transparent 0%,
              rgba(255, 255, 255, 0.9) 4%,
              transparent 14%,
              transparent 100%
            );
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: spacetec-auth-border-trace 7s linear infinite;
            pointer-events: none;
          }
        }
      `}</style>
    </>
  );
}
