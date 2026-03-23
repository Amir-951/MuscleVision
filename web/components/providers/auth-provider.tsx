'use client';

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {Session} from '@supabase/supabase-js';

import {getSupabaseBrowserClient} from '@/lib/supabase';
import type {AppUser} from '@/lib/types';

type AuthContextValue = {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    displayName: string;
    goal: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const {data} = await supabase.from('users').select('*').eq('id', userId).single();
  return data;
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setUser(null);
      return;
    }

    const profile = await readProfile(session.user.id);
    if (!profile) {
      setUser({
        id: session.user.id,
        email: session.user.email ?? '',
      });
      return;
    }

    setUser({
      id: profile.id,
      email: session.user.email ?? '',
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      goal: profile.goal,
    });
  }, [session]);

  async function signIn(email: string, password: string) {
    const supabase = getSupabaseBrowserClient();
    const {error} = await supabase.auth.signInWithPassword({email, password});
    if (error) {
      throw error;
    }
  }

  async function signUp(payload: {
    email: string;
    password: string;
    displayName: string;
    goal: string;
  }) {
    const supabase = getSupabaseBrowserClient();
    const {data, error} = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        display_name: payload.displayName,
        goal: payload.goal,
      });
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({data}) => {
      startTransition(() => {
        setSession(data.session);
        setIsLoading(false);
      });
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => {
        setSession(nextSession);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
