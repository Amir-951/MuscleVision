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
  const currentItem =
    navigation.find(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
    ) ?? navigation[0];

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/auth/login');
    }
  }, [isLoading, router, session]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite text-ivory">
        <div className="space-y-3 text-center">
          <div className="border border-white/10 px-5 py-3 text-sm uppercase tracking-[0.34em] text-mist/70">
            Initialisation du laboratoire
          </div>
          {authError ? <p className="text-sm text-[#ff8d8d]">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-graphite text-ivory">
      <div className="mx-auto max-w-[1720px] px-3 py-3 md:px-5 md:py-5">
        <div className="soft-vignette grid min-h-[calc(100svh-24px)] overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,25,0.88),rgba(7,8,11,0.96))] lg:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="relative flex flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="border-b border-white/10 px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.42em] text-mist/45">MuscleVision</p>
              <div className="mt-2 flex items-center justify-between">
                <h1 className="font-display text-[1.9rem] text-ivory">Control Room</h1>
                <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_18px_rgba(245,162,70,0.7)]" />
              </div>
              <p className="mt-4 max-w-[210px] text-sm leading-7 text-mist/58">
                Une scène de travail dense, calme et lisible pour piloter l’analyse.
              </p>
            </div>

            <nav className="flex-1 px-4 py-5">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-4 border-b border-white/8 px-3 py-4 text-sm transition last:border-b-0',
                      active ? 'text-ivory' : 'text-mist/58 hover:text-ivory',
                    )}
                  >
                    <span className="w-5 text-[11px] uppercase tracking-[0.28em] text-mist/34">
                      0{index + 1}
                    </span>
                    <Icon
                      className={cn(
                        'h-4 w-4 transition',
                        active ? 'text-amber' : 'text-mist/45 group-hover:text-amber',
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    <span
                      className={cn(
                        'h-px w-10 transition',
                        active ? 'bg-amber/60' : 'bg-white/8 group-hover:bg-white/16',
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/10 px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">Profil actif</p>
              <p className="mt-3 text-lg text-ivory">
                {user?.displayName ?? user?.email ?? 'Athlete'}
              </p>
              <p className="mt-1 text-sm text-mist/58">{user?.goal ?? 'general'}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-5 inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-mist/62 transition hover:border-white/20 hover:text-ivory"
              >
                Déconnexion
              </button>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 md:flex-row md:items-end md:justify-between lg:px-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.38em] text-mist/42">Workspace</p>
                <h2 className="mt-2 font-display text-[2.2rem] text-ivory">{currentItem.label}</h2>
              </div>
              <div className="grid gap-3 text-sm text-mist/58 md:grid-cols-2 md:text-right">
                <p>Backend FastAPI, queue Redis et surface web synchronisés autour du même contexte utilisateur.</p>
                <p className="border-l border-white/10 pl-4 md:max-w-[320px]">
                  Le signal biomécanique guide la lecture avant toute génération de texte.
                </p>
              </div>
            </header>

            <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
