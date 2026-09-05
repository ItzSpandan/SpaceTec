'use client';

// Central SpaceTec authentication context — built on Supabase Auth only
// (no custom password system, no service-role key on the client). This is
// the single source of truth for "authenticated / unauthenticated / still
// checking" used across the site, per the "centralize authorization"
// requirement: components call useAuth() rather than each re-implementing
// session checks.
//
// requireAuth(action) is the gate used by "account-required" features
// (full agency exploration, launchpad directory, satellite database, ...):
// if the visitor is already signed in it just runs `action` immediately;
// otherwise it opens the auth modal and remembers `action`, running it
// automatically the moment sign-in succeeds — so a gated click resumes
// exactly where the visitor left off instead of dumping them back at the
// homepage.

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

// Production confirmation-link target. Supabase requires this URL to be
// present in the project's Auth → URL Configuration allow list. Localhost
// is only used as a fallback while actually running the dev server, so a
// developer testing signup locally still gets redirected back to
// localhost instead of the production domain.
function getEmailRedirectTo() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  return 'https://spacetec.vercel.app';
}

// The email-confirmation link always causes a full page reload (it's a
// plain browser navigation, not a client-side route change), which wipes
// any in-memory `pendingAction`. So the "return to what I was trying to
// do" behavior also needs a durable copy of the intent that survives that
// reload — sessionStorage, cleared the moment it's actually consumed.
const RESUME_INTENT_KEY = 'spacetec:pendingIntent';

function readResumeIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(RESUME_INTENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeResumeIntent(intent) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(RESUME_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage can throw in locked-down/private-browsing contexts —
    // the in-memory pendingAction still covers the same-tab, no-reload case.
  }
}

function clearStoredResumeIntent() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(RESUME_INTENT_KEY);
  } catch {
    // no-op
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup' | 'account'
  const [pendingAction, setPendingAction] = useState(null);
  // Populated once, at startup, only if a real session already exists AND a
  // durable intent was left behind by a previous requireAuth()/RequireAuth
  // gate — this is what a returning-from-email-confirmation page load reads.
  const [resumeIntent, setResumeIntent] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (!error) setProfile(data || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) {
        const storedIntent = readResumeIntent();
        if (storedIntent) setResumeIntent(storedIntent);
      }
      loadProfile(data.session?.user?.id).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const user = session?.user || null;

  // Best-effort activity logging — never blocks or fails the actual auth
  // flow if the insert has trouble (e.g. a transient network hiccup).
  const logActivity = useCallback(async (eventType, userId) => {
    const id = userId || session?.user?.id;
    if (!id) return;
    try {
      await supabase.from('account_activity').insert({ user_id: id, event_type: eventType });
    } catch (err) {
      console.error('SpaceTec activity log failed:', err);
    }
  }, [session]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    await logActivity('signin');
    return { error: null };
  }, [logActivity]);

  const signUp = useCallback(async (email, password, displayName) => {
    // Profile row + the 'signup' activity record are handled server-side
    // by a Postgres trigger on auth.users — see supabase/schema.sql — so
    // no service-role key is ever needed here.
    //
    // IMPORTANT: with Supabase email confirmation enabled, a successful
    // signUp() call returns `data.user` but `data.session` is null until
    // the confirmation link is clicked. Callers MUST check `session` here
    // — not just the absence of an error — before treating this as an
    // authenticated login. This context's own `session`/`user` state is
    // never touched by this call; it only ever updates from a real
    // getSession()/onAuthStateChange() result, so the hamburger and any
    // requireAuth() gate stay correctly locked out until confirmation.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: getEmailRedirectTo(),
      },
    });
    if (error) return { error, session: null, user: null };
    return { error: null, session: data.session || null, user: data.user || null };
  }, []);

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getEmailRedirectTo() },
    });
    return { error: error || null };
  }, []);

  const signOut = useCallback(async () => {
    await logActivity('signout');
    await supabase.auth.signOut();
  }, [logActivity]);

  const requireAuth = useCallback((action, intent) => {
    if (session?.user) {
      if (action) action();
      return true;
    }
    setPendingAction(() => action || null);
    if (intent) writeResumeIntent(intent);
    setAuthModalMode('signin');
    setAuthModalOpen(true);
    return false;
  }, [session]);

  // Used by <RequireAuth> (full-page gates) which has no in-memory action
  // to run — only a route to come back to after email confirmation.
  const rememberIntent = useCallback((intent) => {
    writeResumeIntent(intent);
  }, []);

  const clearResumeIntent = useCallback(() => {
    clearStoredResumeIntent();
    setResumeIntent(null);
  }, []);

  const openAuthModal = useCallback((mode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setPendingAction(null);
  }, []);

  // Called by AuthModal right after a successful sign-in/sign-up.
  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    clearStoredResumeIntent();
    setPendingAction((current) => {
      if (current) current();
      return null;
    });
  }, []);

  const value = useMemo(() => ({
    session, user, profile, loading,
    authModalOpen, authModalMode, pendingAction,
    resumeIntent, rememberIntent, clearResumeIntent,
    openAuthModal, closeAuthModal, handleAuthSuccess, requireAuth,
    signIn, signUp, signOut, resendConfirmation,
  }), [
    session, user, profile, loading,
    authModalOpen, authModalMode, pendingAction,
    resumeIntent, rememberIntent, clearResumeIntent,
    openAuthModal, closeAuthModal, handleAuthSuccess, requireAuth,
    signIn, signUp, signOut, resendConfirmation,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>');
  return ctx;
}
