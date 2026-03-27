'use client';

import {motion} from 'framer-motion';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Activity, Dumbbell, Salad, Sparkles, User2} from 'lucide-react';
import {type ReactNode, useEffect} from 'react';

import {cn} from '@/lib/cn';
import {useAuth} from '@/components/providers/auth-provider';

const navigation = [
  {
    href: '/dashboard',
    label: 'Pulse',
    cue: 'Overview',
    icon: Sparkles,
    eyebrow: 'Overview',
    summary: 'Dernier signal et prochaines actions.',
    accent: '#ff9a3d',
    glow: 'radial-gradient(circle at 78% 28%, rgba(255,154,61,0.24), transparent 28%)',
  },
  {
    href: '/analyse',
    label: 'Analyse',
    cue: 'Capture',
    icon: Activity,
    eyebrow: 'Capture',
    summary: 'Importer, enregistrer, suivre le traitement.',
    accent: '#89d1ff',
    glow: 'radial-gradient(circle at 72% 30%, rgba(137,209,255,0.22), transparent 30%)',
  },
  {
    href: '/coach',
    label: 'Coach',
    cue: 'Dialogue',
    icon: Dumbbell,
    eyebrow: 'Dialogue',
    summary: 'Choisir un coach et reprendre une séance.',
    accent: '#ff8dc0',
    glow: 'radial-gradient(circle at 78% 26%, rgba(255,141,192,0.22), transparent 28%)',
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    cue: 'Food log',
    icon: Salad,
    eyebrow: 'Food log',
    summary: 'Photo, macros, journal du jour.',
    accent: '#c4ff73',
    glow: 'radial-gradient(circle at 74% 30%, rgba(196,255,115,0.2), transparent 28%)',
  },
  {
    href: '/profile',
    label: 'Profil',
    cue: 'Identity',
    icon: User2,
    eyebrow: 'Identity',
    summary: 'Identité et objectif actif.',
    accent: '#f4eee1',
    glow: 'radial-gradient(circle at 76% 28%, rgba(244,238,225,0.16), transparent 28%)',
  },
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
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="relative flex flex-col border-b border-white/8 bg-[linear-gradient(180deg,rgba(9,11,15,0.98),rgba(9,11,15,0.84))] lg:border-b-0 lg:border-r lg:border-white/8">
          <div className="border-b border-white/8 px-6 py-7">
            <p className="text-[11px] uppercase tracking-[0.42em] text-mist/38">MuscleVision</p>
            <div className="mt-3 flex items-center justify-between">
              <h1 className="font-display text-[2rem] leading-none text-ivory">Operator</h1>
              <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_20px_rgba(245,162,70,0.8)]" />
            </div>
            <p className="mt-4 max-w-[190px] text-sm text-mist/52">Studio d’analyse et de suivi.</p>
          </div>

          <nav className="flex-1 px-3 py-5">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative grid gap-1 border-b border-white/8 px-4 py-4 text-sm transition last:border-b-0',
                    active ? 'text-ivory' : 'text-mist/58 hover:text-ivory',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active-rail"
                      className="absolute left-0 top-3 bottom-3 w-px rounded-full"
                      style={{background: item.accent}}
                    />
                  ) : null}
                  <div className="flex items-center gap-4">
                    <span className="w-5 text-[11px] uppercase tracking-[0.28em] text-mist/28">
                      0{index + 1}
                    </span>
                    <Icon
                      className="h-4 w-4 transition"
                      style={{color: active ? item.accent : undefined}}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-current">{item.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-mist/34">
                        {item.cue}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/8 px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.36em] text-mist/38">Profil actif</p>
            <p className="mt-3 text-lg text-ivory">
              {user?.displayName ?? user?.email ?? 'Athlete'}
            </p>
            <p className="mt-1 text-sm text-mist/52">{user?.goal ?? 'general'}</p>
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
          <header className="relative overflow-hidden border-b border-white/8 px-5 py-6 lg:px-8 lg:py-8">
            <div className="absolute inset-0 opacity-90" style={{background: currentItem.glow}} />
            <div className="absolute inset-y-0 right-[8%] w-[38%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_64%)] blur-2xl" />
            <motion.div
              key={currentItem.href}
              initial={{opacity: 0, y: 16}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.38, ease: 'easeOut'}}
              className="relative flex flex-col gap-5"
            >
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.38em] text-mist/38">{currentItem.eyebrow}</p>
                <h2 className="font-display text-[3.2rem] leading-[0.88] text-ivory md:text-[4.4rem]">
                  {currentItem.label}
                </h2>
                <p className="max-w-2xl text-base text-mist/62">{currentItem.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-5 border-t border-white/10 pt-4 text-sm">
                <span className="text-[11px] uppercase tracking-[0.28em] text-mist/40">Profil</span>
                <span className="text-mist/70">{user?.displayName ?? user?.email ?? 'Athlete'}</span>
              </div>
            </motion.div>
          </header>

          <main className="min-w-0 px-5 py-8 lg:px-8 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
