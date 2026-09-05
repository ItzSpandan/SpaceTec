'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';

const inputWrapStyle = { marginBottom: '1.1rem', textAlign: 'left' };
const labelStyle = {
  display: 'block', color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px',
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

function friendlyAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('password') && (msg.includes('at least') || msg.includes('weak') || msg.includes('short'))) {
    return 'Password is too weak — use at least 6 characters.';
  }
  if (msg.includes('rate limit')) return 'Too many attempts — please wait a moment and try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error — please try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

export default function AuthModal() {
  const {
    authModalOpen, authModalMode, closeAuthModal, handleAuthSuccess,
    signIn, signUp, signOut, user, profile,
  } = useAuth();

  const [mode, setMode] = useState(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // 'loading' | 'success' | null

  useEffect(() => {
    if (authModalOpen) {
      setMode(authModalMode);
      setError(null);
      setStatus(null);
      setPassword('');
    }
  }, [authModalOpen, authModalMode]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }

    setStatus('loading');
    const { error: authError } = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, displayName.trim());

    if (authError) {
      setError(friendlyAuthError(authError));
      setStatus(null);
      return;
    }

    setStatus('success');
    setTimeout(() => handleAuthSuccess(), 450);
  };

  return (
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

          {mode === 'account' ? (
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
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff', padding: '0.85rem', fontSize: '0.7rem', letterSpacing: '2px',
                  textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
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
                    <label style={labelStyle}>Display Name</label>
                    <input
                      style={inputStyle} type="text" value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)} required
                    />
                  </div>
                )}
                <div style={inputWrapStyle}>
                  <label style={labelStyle}>Email</label>
                  <input
                    style={inputStyle} type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  />
                </div>
                <div style={inputWrapStyle}>
                  <label style={labelStyle}>Password</label>
                  <input
                    style={inputStyle} type="password" value={password}
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

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    width: '100%', background: '#ffffff', border: 'none', color: '#000',
                    padding: '0.9rem', fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase',
                    fontWeight: 800, cursor: status === 'loading' ? 'default' : 'pointer',
                    opacity: status === 'loading' ? 0.6 : 1,
                  }}
                >
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
  );
}
