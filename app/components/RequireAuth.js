'use client';

// Wrap any account-required page's content in <RequireAuth> to gate it.
// Because it reads session state from the shared AuthContext (which starts
// in `loading`), it never flashes the logged-out gate to an already-signed-in
// visitor before the session check finishes.
//
// No navigation happens here — once sign-in succeeds inside the modal, this
// component simply re-renders its children in place, which is what makes
// "return the visitor to the feature they wanted" work for free.

import { useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';

const primaryBtnStyle = {
  background: '#ffffff', border: 'none', color: '#000',
  padding: '0.85rem 1.8rem', fontSize: '0.72rem', letterSpacing: '2px',
  textTransform: 'uppercase', fontWeight: 800, cursor: 'pointer',
};
const secondaryBtnStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
  padding: '0.85rem 1.8rem', fontSize: '0.72rem', letterSpacing: '2px',
  textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
};

export default function RequireAuth({ children }) {
  const { user, loading, openAuthModal, rememberIntent } = useAuth();

  // Remember which route this was so that, if the visitor goes on to
  // create an account (email confirmation redirects here via the
  // homepage), SpaceTecHub can send them back to this exact page once a
  // real session exists — see AuthContext's resumeIntent.
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      rememberIntent({ type: 'route', path: window.location.pathname });
    }
  }, [loading, user, rememberIntent]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh', width: '100%', backgroundColor: '#000000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ color: '#71717a', fontSize: '0.72rem', letterSpacing: '3px', textTransform: 'uppercase', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
          Loading session…
        </span>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh', width: '100%', backgroundColor: '#000000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', boxSizing: 'border-box',
          fontFamily: '"Space Grotesk", -apple-system, sans-serif',
        }}
      >
        <span style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '6px', color: '#fff' }}>SPACETEC</span>
        <h1 style={{ color: '#fff', fontSize: '1.7rem', margin: '1.4rem 0 0.6rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
          Sign In To Continue
        </h1>
        <p style={{ color: '#9ca3af', maxWidth: '420px', margin: '0 0 2rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
          Create a SpaceTec account to explore this feature.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={primaryBtnStyle} onClick={() => openAuthModal('signin')}>Sign In</button>
          <button style={secondaryBtnStyle} onClick={() => openAuthModal('signup')}>Create Account</button>
        </div>
      </main>
    );
  }

  return children;
}
