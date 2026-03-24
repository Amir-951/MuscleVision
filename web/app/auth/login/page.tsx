'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';

export default function LoginPage() {
  const router = useRouter();
  const {session, signIn, authError} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [router, session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await signIn(email, password);
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Connexion impossible.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-5">
          <SectionLabel>Access node</SectionLabel>
          <h1 className="font-display text-[3.4rem] leading-[0.95] text-ivory md:text-[5rem]">
            Reprends la main sur ton laboratoire d’analyse.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-mist/65">
            Connecte-toi pour accéder à tes vidéos, tes résultats 3D, ton coach et ton journal nutrition.
          </p>
        </div>

        <LabCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Connexion</p>
              <h2 className="mt-2 text-2xl text-ivory">Sign in</h2>
            </div>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
            />

            {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}
            {!error && authError ? <p className="text-sm text-[#ff8d8d]">{authError}</p> : null}

            <button
              type="submit"
              className="w-full rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3.5 text-sm font-medium text-white"
            >
              Entrer
            </button>

            <p className="text-sm text-mist/55">
              Pas encore de compte ?{' '}
              <Link href="/auth/signup" className="text-amber">
                Créer un accès
              </Link>
            </p>
          </form>
        </LabCard>
      </div>
    </main>
  );
}
