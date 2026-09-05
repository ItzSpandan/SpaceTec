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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup' | 'account'
  const [pendingAction, setPendingAction] = useState(null);

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
    // Signup itself (profile row + the 'signup' activity record) is handled
    // server-side by a Postgres trigger on auth.users — see
    // supabase/schema.sql — so no service-role key is ever needed here.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await logActivity('signout');
    await supabase.auth.signOut();
  }, [logActivity]);

  const requireAuth = useCallback((action) => {
    if (session?.user) {
      if (action) action();
      return true;
    }
    setPendingAction(() => action || null);
    setAuthModalMode('signin');
    setAuthModalOpen(true);
    return false;
  }, [session]);

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
    setPendingAction((current) => {
      if (current) current();
      return null;
    });
  }, []);

  const value = useMemo(() => ({
    session, user, profile, loading,
    authModalOpen, authModalMode, pendingAction,
    openAuthModal, closeAuthModal, handleAuthSuccess, requireAuth,
    signIn, signUp, signOut,
  }), [
    session, user, profile, loading,
    authModalOpen, authModalMode, pendingAction,
    openAuthModal, closeAuthModal, handleAuthSuccess, requireAuth,
    signIn, signUp, signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>');
  return ctx;
}
