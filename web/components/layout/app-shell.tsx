'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Activity, Dumbbell, Salad, Sparkles, User2} from 'lucide-react';
import {type ReactNode, useEffect} from 'react';

import {cn} from '@/lib/cn';
import {useAuth} from '@/components/providers/auth-provider';

const navigation = [
  {href: '/dashboard', label: 'Pulse', icon: Sparkles},
  {href: '/analyse', label: 'Analyse', icon: Activity},
  {href: '/coach', label: 'Coach', icon: Dumbbell},
  {href: '/nutrition', label: 'Nutrition', icon: Salad},
  {href: '/profile', label: 'Profil', icon: User2},
];

export function AppShell({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const {session, user, isLoading, authError, signOut} = useAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/auth/login');
    }
  }, [isLoading, router, session]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite text-ivory">
        <div className="space-y-3 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.3em] text-mist/70">
            Initialisation du laboratoire
          </div>
          {authError ? <p className="text-sm text-[#ff8d8d]">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-graphite text-ivory">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-lab backdrop-blur-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-mist/50">MuscleVision</p>
              <h1 className="font-display text-2xl text-ivory">Biomechanics Lab</h1>
            </div>
            <div className="h-3 w-3 rounded-full bg-amber shadow-[0_0_24px_rgba(255,154,61,0.75)]" />
          </div>

          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                    active
                      ? 'bg-[linear-gradient(135deg,rgba(233,75,53,0.32),rgba(255,154,61,0.18))] text-ivory'
                      : 'text-mist/70 hover:bg-white/5 hover:text-ivory',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-10 rounded-[26px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Profil actif</p>
            <p className="mt-3 text-lg font-medium text-ivory">
              {user?.displayName ?? user?.email ?? 'Athlete'}
            </p>
            <p className="mt-1 text-sm text-mist/60">{user?.goal ?? 'general'}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-mist/70 transition hover:border-white/20 hover:text-ivory"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="min-w-0 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,154,61,0.08),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-lab backdrop-blur-xl lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
