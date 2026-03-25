'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {AuthStage} from '@/components/auth/auth-stage';
import {useAuth} from '@/components/providers/auth-provider';

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
    <AuthStage
      label="Access node"
      title="Reviens dans la salle de contrôle biomécanique."
      description="Retrouve tes sessions, tes métriques compactes, ton coach et la lecture musculaire 3D sans quitter le même espace."
      detailHeading="Ce que tu retrouves"
      detailItems={[
        'Historique des analyses et résultats dérivés depuis les keypoints.',
        'Dialogue coach appuyé sur `analysis.txt` plutôt que sur la vidéo brute.',
        'Journal nutrition et surfaces de suivi dans une même interface.',
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-b border-white/10 pb-5">
          <p className="text-[11px] uppercase tracking-[0.36em] text-mist/45">Connexion</p>
          <h2 className="mt-3 font-display text-[2.4rem] leading-none text-ivory">Enter the lab</h2>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="w-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
          />
        </div>

        {error ? <p className="text-sm text-[#ff9d9d]">{error}</p> : null}
        {!error && authError ? <p className="text-sm text-[#ff9d9d]">{authError}</p> : null}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-5 py-3.5 text-sm font-medium text-white"
        >
          Entrer
        </button>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm text-mist/55">
          <span>Pas encore de compte ?</span>
          <Link href="/auth/signup" className="text-amber">
            Créer un accès
          </Link>
        </div>
      </form>
    </AuthStage>
  );
}
