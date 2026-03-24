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
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    displayName: string;
    goal: string;
  }) => Promise<{needsEmailConfirmation: boolean}>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const {data, error} = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

function normalizeAuthError(error: unknown) {
  const fallback = 'Une erreur est survenue.';
  const message = error instanceof Error ? error.message : fallback;

  if (message === 'Load failed' || message === 'Failed to fetch') {
    return 'Connexion Supabase impossible. Vérifie la connexion réseau et la configuration des clés.';
  }

  if (message.toLowerCase().includes('password')) {
    return 'Mot de passe invalide ou trop court.';
  }

  return message;
}

async function ensureProfileRow(session: Session) {
  const supabase = getSupabaseBrowserClient();
  const metadata = session.user.user_metadata ?? {};

  const {error} = await supabase.from('users').upsert({
    id: session.user.id,
    display_name: metadata.display_name ?? metadata.full_name ?? null,
    goal: metadata.goal ?? 'general',
  });

  if (error) {
    throw error;
  }
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setUser(null);
      setAuthError(null);
      return;
    }

    try {
      const profile = await readProfile(session.user.id);
      if (!profile) {
        await ensureProfileRow(session);
        const hydratedProfile = await readProfile(session.user.id);
        if (hydratedProfile) {
          setUser({
            id: hydratedProfile.id,
            email: session.user.email ?? '',
            displayName: hydratedProfile.display_name,
            avatarUrl: hydratedProfile.avatar_url,
            heightCm: hydratedProfile.height_cm,
            weightKg: hydratedProfile.weight_kg,
            goal: hydratedProfile.goal,
          });
          setAuthError(null);
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          displayName:
            session.user.user_metadata?.display_name ??
            session.user.user_metadata?.full_name ??
            null,
          goal: session.user.user_metadata?.goal ?? 'general',
        });
        setAuthError(null);
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
      setAuthError(null);
    } catch (error) {
      setUser({
        id: session.user.id,
        email: session.user.email ?? '',
        displayName:
          session.user.user_metadata?.display_name ??
          session.user.user_metadata?.full_name ??
          null,
        goal: session.user.user_metadata?.goal ?? 'general',
      });
      setAuthError(normalizeAuthError(error));
    }
  }, [session]);

  async function signIn(email: string, password: string) {
    const supabase = getSupabaseBrowserClient();
    setAuthError(null);
    const {error} = await supabase.auth.signInWithPassword({email, password});
    if (error) {
      throw new Error(normalizeAuthError(error));
    }
  }

  async function signUp(payload: {
    email: string;
    password: string;
    displayName: string;
    goal: string;
  }) {
    const supabase = getSupabaseBrowserClient();
    setAuthError(null);
    const {data, error} = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          display_name: payload.displayName,
          goal: payload.goal,
        },
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : undefined,
      },
    });

    if (error) {
      throw new Error(normalizeAuthError(error));
    }

    if (data.session) {
      await ensureProfileRow(data.session);
      return {needsEmailConfirmation: false};
    }

    if (data.user) {
      return {needsEmailConfirmation: true};
    }

    return {needsEmailConfirmation: false};
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthError(null);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({data}) => {
        startTransition(() => {
          setSession(data.session);
          setIsLoading(false);
          setAuthError(null);
        });
      })
      .catch((error) => {
        startTransition(() => {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setAuthError(normalizeAuthError(error));
        });
      });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => {
        setSession(nextSession);
        setAuthError(null);
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
        authError,
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
