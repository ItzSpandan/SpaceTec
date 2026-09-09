'use client';

// Central SpaceTec authentication context — built on Supabase Auth only
// (no custom password system, no service-role key on the client). This is
// the single source of truth for "authenticated / unauthenticated / still
// checking" used across the site, per the "centralize authorization"
// requirement: components call useAuth() rather than each re-implementing
// session checks.
//
// LIFECYCLE (see the two effects below):
//   1. AUTH INITIALIZING  — one getSession() call, once, on mount.
//   2. SESSION RESOLVED   — `loading` becomes false the moment Supabase
//      tells us whether a session exists. onAuthStateChange keeps this in
//      sync afterwards but never does anything beyond updating state —
//      no database calls happen inside that callback, because Supabase
//      Auth callbacks can deadlock if another Supabase-async call is made
//      directly inside them.
//   3. PROFILE LOADING    — a second, independent effect watches the
//      resolved user id and loads the profile row. It is keyed on the id
//      itself, so switching users (or signing out) cancels any in-flight
//      request for the previous id instead of letting it overwrite newer
//      state, and a failed/slow profile fetch can never block `loading`
//      or leave the rest of the site stuck.
//   4. READY              — `loading` is false; `profileLoading` tracks
//      the profile fetch on its own.
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
  // Whether "is there a Supabase session?" is known and whether the
  // (separate, secondary) profile row has finished loading are two
  // different questions. `loading` answers only the first one, so
  // protected pages resolve their "LOADING SESSION..." gate the moment
  // Supabase's session state is known, instead of waiting on the profile
  // fetch too.
  const [profileLoading, setProfileLoading] = useState(true);
  // A genuine, terminal failure to resolve the session (e.g. Supabase
  // unreachable). Distinct from `loading`: once this is set, we are done
  // trying and the UI should say so rather than sit on a spinner forever.
  const [authError, setAuthError] = useState(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup' | 'account'
  const [pendingAction, setPendingAction] = useState(null);
  // Populated once, at startup, only if a real session already exists AND a
  // durable intent was left behind by a previous requireAuth()/RequireAuth
  // gate — this is what a returning-from-email-confirmation page load reads.
  const [resumeIntent, setResumeIntent] = useState(null);

  // ---- 1. Auth initialization + auth-state subscription -----------------
  // Exactly one getSession() call on mount, exactly one onAuthStateChange
  // subscription. Neither of them ever calls into the database — they only
  // ever set `session`/`loading`/`authError`. Profile loading lives in its
  // own effect below, keyed off the resolved user id.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('SpaceTec getSession failed:', error);
          setAuthError(error);
          setSession(null);
          setLoading(false);
          return;
        }
        setSession(data?.session || null);
        setLoading(false);
        if (data?.session?.user) {
          const storedIntent = readResumeIntent();
          if (storedIntent) setResumeIntent(storedIntent);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('SpaceTec getSession failed:', err);
        setAuthError(err);
        setSession(null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      // Lightweight only: update auth state and nothing else. No database
      // reads/writes happen here — see the profile effect below.
      setSession(newSession);
      setLoading(false);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ---- 2. Profile loading, independent of the auth callback -------------
  // Re-runs whenever the resolved user id changes (sign-in, sign-out,
  // switching accounts). The `active` flag guards against a slow request
  // for a previous id resolving after a newer one has already started —
  // it simply won't be applied.
  const userId = session?.user?.id || null;

  useEffect(() => {
    let active = true;

    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return () => {
        active = false;
      };
    }

    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('SpaceTec loadProfile failed:', error);
          setProfile(null);
          return;
        }
        setProfile(data || null);
      })
      .catch((err) => {
        if (!active) return;
        console.error('SpaceTec loadProfile failed:', err);
        setProfile(null);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const user = session?.user || null;

  // Best-effort activity logging — secondary telemetry. Never allowed to
  // block or fail the actual auth flow: any error here is swallowed after
  // being logged to the console.
  const logActivity = useCallback(async (eventType, userIdOverride) => {
    const id = userIdOverride || session?.user?.id;
    if (!id) return;
    try {
      await supabase.from('account_activity').insert({ user_id: id, event_type: eventType });
    } catch (err) {
      console.error('SpaceTec activity log failed:', err);
    }
  }, [session]);

  const signIn = useCallback(async (email, password) => {
    // 1. Authenticate. 2. Auth state updates via onAuthStateChange above.
    // 3. Log activity — best-effort, never blocks or reverses a successful
    // sign-in even if this insert fails.
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
    // Logging is attempted but never allowed to prevent sign-out: it's
    // wrapped in try/catch inside logActivity, and we sign out regardless
    // of whether it succeeded.
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
    session, user, profile, loading, profileLoading, authError,
    authModalOpen, authModalMode, pendingAction,
    resumeIntent, rememberIntent, clearResumeIntent,
    openAuthModal, closeAuthModal, handleAuthSuccess, requireAuth,
    signIn, signUp, signOut, resendConfirmation,
  }), [
    session, user, profile, loading, profileLoading, authError,
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
