import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string | null;
  plan: string;
  subscription_status: string;
  trial_started_at: string;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (user: User | null) => {
    if (!user || !supabase) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, plan, subscription_status, trial_started_at')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      refreshProfile(data.session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      (async () => {
        await refreshProfile(newSession?.user ?? null);
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/#reset` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  return { session, profile, loading, signUp, signIn, signOut, resetPassword, updatePassword, refreshProfile };
}
