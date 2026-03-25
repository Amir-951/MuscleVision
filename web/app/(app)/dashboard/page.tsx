'use client';

import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {useEffect, useState} from 'react';

import {SectionLabel} from '@/components/shared/section-label';
import {useAuth} from '@/components/providers/auth-provider';
import {getWorkoutHistory} from '@/lib/api';
import type {WorkoutHistoryItem} from '@/lib/types';

export default function DashboardPage() {
  const {user} = useAuth();
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void getWorkoutHistory(user.id)
      .then((payload) => {
        setHistory(payload);
        setError(null);
      })
      .catch((loadError) => {
        setHistory([]);
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
      });
  }, [user?.id]);

  const averageScore = history.length
    ? Math.round(
        history.reduce((sum, session) => sum + (session.correctnessScore ?? 0), 0) /
          history.length,
      )
    : 0;
  const latest = history[0];
  const stats = [
    {label: 'Sessions', value: String(history.length).padStart(2, '0')},
    {label: 'Score moyen', value: `${averageScore}/100`},
    {label: 'Dernière source', value: latest?.source ?? '—'},
    {label: 'Dernier bloc', value: latest?.repCount ? `${latest.repCount} reps` : '—'},
  ];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1.24fr)_320px]">
      <section className="space-y-10">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <SectionLabel>Control deck</SectionLabel>
            <h1 className="max-w-4xl font-display text-[3rem] leading-[0.9] text-ivory md:text-[4.2rem]">
              Une lecture nette de ta progression, sans bruit d’interface.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-mist/60">
              Les dernières séances, les métriques utiles et les prochaines actions sont regroupées ici pour éviter l’effet dashboard générique.
            </p>
          </div>

          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-5 py-3 text-sm font-medium text-white"
          >
            Nouvelle analyse
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-0 border-y border-white/10 md:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className="border-b border-white/10 py-6 md:border-b-0 md:px-5 md:py-0 md:first:pl-0 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-white/10"
            >
              <p className="text-[11px] uppercase tracking-[0.34em] text-mist/42">{item.label}</p>
              <p className="mt-4 font-display text-[2.4rem] leading-none text-ivory">{item.value}</p>
              <div
                className="mt-5 h-px bg-[linear-gradient(90deg,rgba(245,162,70,0.45),transparent)]"
                aria-hidden="true"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">Historique</p>
                <h2 className="mt-3 text-2xl text-ivory">Dernières sessions</h2>
              </div>
              <p className="text-sm text-mist/50">{history.length} entrées</p>
            </div>

            {error ? (
              <div className="mt-5 border border-[#ff8d8d]/30 bg-[#ff8d8d]/8 px-4 py-4 text-sm text-[#ffb0b0]">
                {error}
              </div>
            ) : null}

            <div className="mt-3">
              {history.map((session) => (
                <Link
                  key={session.id}
                  href={`/results/${session.id}`}
                  className="grid gap-3 border-b border-white/10 py-5 transition hover:bg-white/[0.02] md:grid-cols-[minmax(0,1fr)_150px_180px]"
                >
                  <div>
                    <p className="text-lg text-ivory">{session.exerciseType ?? 'unknown'}</p>
                    <p className="mt-2 text-sm text-mist/58">
                      {session.feedback ?? 'Artefacts biomécaniques disponibles pour revue.'}
                    </p>
                  </div>
                  <div className="text-sm text-mist/58">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-mist/42">Source</p>
                    <p className="mt-2 text-ivory">{session.source}</p>
                  </div>
                  <div className="text-sm text-mist/58">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-mist/42">Lecture</p>
                    <p className="mt-2 text-ivory">
                      {session.correctnessScore ?? 0}/100 · {session.repCount ?? 0} reps
                    </p>
                    <p className="mt-1">
                      {Math.round((session.symmetryScore ?? 0) * 100)}% symétrie
                    </p>
                  </div>
                </Link>
              ))}

              {!history.length ? (
                <div className="border-b border-white/10 py-10 text-sm text-mist/55">
                  Aucune séance disponible. Lance une première analyse pour alimenter le laboratoire.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-8">
            <div className="border-t border-white/10 pt-5">
              <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">Dernier signal</p>
              <h3 className="mt-3 text-2xl text-ivory">
                {latest?.exerciseType ?? 'Aucune session récente'}
              </h3>
              <p className="mt-4 text-sm leading-7 text-mist/60">
                {latest
                  ? `Dernier score ${latest.correctnessScore ?? 0}/100, ${latest.repCount ?? 0} répétitions et ${Math.round((latest.symmetryScore ?? 0) * 100)}% de symétrie.`
                  : 'Dès qu’une analyse est traitée, son résumé compact apparaît ici.'}
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">Actions</p>
              <div className="mt-4 space-y-4">
                <Link href="/coach" className="block border-b border-white/10 pb-4 transition hover:text-amber">
                  <p className="text-lg text-ivory">Ouvrir le coach</p>
                  <p className="mt-2 text-sm leading-7 text-mist/58">
                    Interroger une séance via son `analysis.txt`.
                  </p>
                </Link>
                <Link
                  href="/nutrition"
                  className="block border-b border-white/10 pb-4 transition hover:text-amber"
                >
                  <p className="text-lg text-ivory">Nutrition</p>
                  <p className="mt-2 text-sm leading-7 text-mist/58">
                    Ajouter une photo repas et alimenter le journal du jour.
                  </p>
                </Link>
                <Link href="/analyse" className="block transition hover:text-amber">
                  <p className="text-lg text-ivory">Capture</p>
                  <p className="mt-2 text-sm leading-7 text-mist/58">
                    Envoyer une nouvelle vidéo ou démarrer la webcam.
                  </p>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <aside className="space-y-8 border-t border-white/10 pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">Méthode</p>
          <h2 className="font-display text-[2.3rem] leading-[0.92] text-ivory">
            Le texte résume. Le mouvement décide.
          </h2>
          <p className="text-sm leading-7 text-mist/60">
            La logique du produit reste visible: extraction, dérivation, compression, restitution.
          </p>
        </div>

        <div className="space-y-5 border-t border-white/10 pt-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-mist/42">Artifact set</p>
            <p className="mt-2 text-sm leading-7 text-mist/60">
              `keypoints.json` pour l’audit, `analysis.txt` pour le modèle texte, métriques dérivées pour l’interface.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-mist/42">Budget IA</p>
            <p className="mt-2 text-sm leading-7 text-mist/60">
              La vidéo brute ne nourrit pas le coaching. Le coût reste concentré sur la dernière couche.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-mist/42">Objectif</p>
            <p className="mt-2 text-sm leading-7 text-mist/60">
              Donner une lecture rapide et crédible sans masquer le fonctionnement derrière une esthétique générique.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
