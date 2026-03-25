'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {AuthStage} from '@/components/auth/auth-stage';
import {useAuth} from '@/components/providers/auth-provider';

export default function SignupPage() {
  const router = useRouter();
  const {session, signUp, authError} = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState('general');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [router, session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setError('Remplis tous les champs.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp({email, password, displayName, goal});
      if (result.needsEmailConfirmation) {
        setSuccess('Compte créé. Confirme l’email reçu, puis connecte-toi pour activer ton espace.');
      } else {
        router.replace('/dashboard');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Création impossible.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthStage
      label="New athlete"
      title="Ouvre un studio personnel pour analyser le corps en mouvement."
      description="La version web rassemble capture, lecture biomécanique, coaching texte et nutrition dans une scène cohérente et professionnelle."
      detailHeading="Dès l’ouverture"
      detailItems={[
        'Vidéo uploadée ou webcam envoyée vers le backend existant.',
        'Résumé biomécanique compact utilisable par un modèle texte moins coûteux.',
        'Espace privé pour résultats, historique, coach et journal nutrition.',
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-b border-white/10 pb-5">
          <p className="text-[11px] uppercase tracking-[0.36em] text-mist/45">Inscription</p>
          <h2 className="mt-3 font-display text-[2.4rem] leading-none text-ivory">Create access</h2>
        </div>

        <div className="space-y-4">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nom affiché"
            className="w-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
          />
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
          <select
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="w-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-ivory outline-none"
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
        </div>

        {error ? <p className="text-sm text-[#ff9d9d]">{error}</p> : null}
        {!error && authError ? <p className="text-sm text-[#ff9d9d]">{authError}</p> : null}
        {success ? <p className="text-sm text-[#c8f4b4]">{success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-5 py-3.5 text-sm font-medium text-white"
        >
          {isSubmitting ? 'Création…' : 'Créer le compte'}
        </button>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm text-mist/55">
          <span>Déjà inscrit ?</span>
          <Link href="/auth/login" className="text-amber">
            Connexion
          </Link>
        </div>
      </form>
    </AuthStage>
  );
}
