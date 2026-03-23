'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';

export default function SignupPage() {
  const router = useRouter();
  const {session, signUp} = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState('general');
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
      await signUp({email, password, displayName, goal});
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Création impossible.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-5">
          <SectionLabel>New athlete</SectionLabel>
          <h1 className="font-display text-[3.4rem] leading-[0.95] text-ivory md:text-[5rem]">
            Ouvre ton espace web pour l’analyse, le coaching et la nutrition.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-mist/65">
            La version web reprend le backend existant et y ajoute un front studio premium.
          </p>
        </div>

        <LabCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Inscription</p>
              <h2 className="mt-2 text-2xl text-ivory">Create access</h2>
            </div>

            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Nom affiché"
              className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
            />
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
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none"
            >
              <option value="general" className="bg-graphite">
                General
              </option>
              <option value="muscle_gain" className="bg-graphite">
                Muscle gain
              </option>
              <option value="fat_loss" className="bg-graphite">
                Fat loss
              </option>
              <option value="endurance" className="bg-graphite">
                Endurance
              </option>
            </select>

            {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3.5 text-sm font-medium text-white"
            >
              Créer le compte
            </button>

            <p className="text-sm text-mist/55">
              Déjà inscrit ?{' '}
              <Link href="/auth/login" className="text-amber">
                Connexion
              </Link>
            </p>
          </form>
        </LabCard>
      </div>
    </main>
  );
}
