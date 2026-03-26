'use client';

import {motion} from 'framer-motion';
import Link from 'next/link';
import {ArrowRight, MoveUpRight} from 'lucide-react';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {SectionLabel} from '@/components/shared/section-label';
import {getWorkoutHistory} from '@/lib/api';
import type {WorkoutHistoryItem} from '@/lib/types';

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

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
  const metrics = [
    {label: 'Sessions', value: String(history.length).padStart(2, '0')},
    {label: 'Score moyen', value: `${averageScore}/100`},
    {label: 'Dernier bloc', value: latest?.repCount ? `${latest.repCount} reps` : '—'},
  ];

  return (
    <div className="grid gap-14 xl:grid-cols-[minmax(0,1.22fr)_320px]">
      <section className="space-y-10">
        <motion.div
          initial={{opacity: 0, y: 18}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.42, ease: 'easeOut'}}
          className="grid gap-10 border-b border-white/10 pb-10 xl:grid-cols-[minmax(0,1fr)_260px]"
        >
          <div className="space-y-6">
            <SectionLabel>Latest signal</SectionLabel>
            <div className="space-y-4">
              <h1 className="max-w-[10ch] font-display text-[3.8rem] leading-[0.86] text-ivory md:text-[5.8rem]">
                {latest?.exerciseType ?? 'Première session'}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-mist/62">
                {latest
                  ? `Dernière lecture ${latest.correctnessScore ?? 0}/100, ${latest.repCount ?? 0} répétitions et ${Math.round((latest.symmetryScore ?? 0) * 100)}% de symétrie.`
                  : 'Lance une première analyse pour remplir la trajectoire et faire apparaître les signaux utiles.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-5 py-3 text-sm font-medium text-white"
              >
                Nouvelle analyse
                <ArrowRight className="h-4 w-4" />
              </Link>
              {latest ? (
                <Link
                  href={`/results/${latest.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-mist/72 transition hover:border-white/20 hover:text-ivory"
                >
                  Ouvrir le résultat
                  <MoveUpRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            <div className="grid gap-4 border-t border-white/10 pt-6 md:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-mist/38">{metric.label}</p>
                  <p className="font-display text-[2.6rem] leading-none text-ivory">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-end border-t border-white/10 pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-mist/38">Trajectory</p>
            <div className="mt-5 h-[220px]">
              <div className="flex h-full items-end gap-3">
                {history.slice(0, 6).reverse().map((session) => {
                  const score = Math.max(8, session.correctnessScore ?? 0);
                  return (
                    <div key={session.id} className="flex flex-1 flex-col items-center gap-3">
                      <div
                        className="w-full rounded-t-full bg-[linear-gradient(180deg,rgba(245,162,70,0.95),rgba(233,75,53,0.35))]"
                        style={{height: `${score}%`}}
                      />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-mist/34">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.45, delay: 0.08, ease: 'easeOut'}}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-mist/38">Recent sessions</p>
              <h2 className="mt-3 text-2xl text-ivory">Lecture rapide</h2>
            </div>
            <p className="text-sm text-mist/48">{history.length} entrées</p>
          </div>

          {error ? (
            <div className="border border-[#ff8d8d]/30 bg-[#ff8d8d]/8 px-4 py-4 text-sm text-[#ffb0b0]">
              {error}
            </div>
          ) : null}

          <div className="space-y-1">
            {history.map((session) => {
              const score = Math.max(4, session.correctnessScore ?? 0);
              return (
                <Link
                  key={session.id}
                  href={`/results/${session.id}`}
                  className="grid gap-4 border-b border-white/10 py-5 transition hover:bg-white/[0.02] lg:grid-cols-[minmax(0,1fr)_140px_200px]"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xl text-ivory">{session.exerciseType ?? 'unknown'}</p>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-mist/34">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-mist/56">
                      {session.feedback ?? 'Artefacts biomécaniques disponibles pour revue.'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-mist/56">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-mist/34">Source</p>
                    <p className="text-ivory">{session.source}</p>
                    <p>{session.repCount ?? 0} reps</p>
                  </div>

                  <div className="space-y-3 text-sm text-mist/56">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-mist/34">Score</p>
                      <p className="text-ivory">{session.correctnessScore ?? 0}/100</p>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#d14f38,#f5a246)]"
                        style={{width: `${score}%`}}
                      />
                    </div>
                    <p>{Math.round((session.symmetryScore ?? 0) * 100)}% symétrie</p>
                  </div>
                </Link>
              );
            })}

            {!history.length ? (
              <div className="border-b border-white/10 py-10 text-sm text-mist/52">
                Aucune séance disponible. Lance une première analyse pour remplir le tableau.
              </div>
            ) : null}
          </div>
        </motion.div>
      </section>

      <aside className="space-y-10 border-t border-white/10 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.34em] text-mist/38">Next moves</p>
          <div className="space-y-5">
            <Link href="/analyse" className="block border-b border-white/10 pb-5 transition hover:text-amber">
              <p className="text-lg text-ivory">Lancer une capture</p>
              <p className="mt-2 text-sm leading-7 text-mist/56">
                Vidéo uploadée ou webcam. Le pipeline compact repart ici.
              </p>
            </Link>
            <Link href="/coach" className="block border-b border-white/10 pb-5 transition hover:text-amber">
              <p className="text-lg text-ivory">Ouvrir le coach</p>
              <p className="mt-2 text-sm leading-7 text-mist/56">
                Reprendre une séance via son résumé biomécanique.
              </p>
            </Link>
            <Link href="/nutrition" className="block transition hover:text-amber">
              <p className="text-lg text-ivory">Tenir le journal</p>
              <p className="mt-2 text-sm leading-7 text-mist/56">
                Ajouter une photo repas et continuer le suivi quotidien.
              </p>
            </Link>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.34em] text-mist/38">Method</p>
          <p className="text-sm leading-7 text-mist/58">
            `keypoints.json` alimente l’audit, `analysis.txt` alimente le coach, l’interface reste centrée sur la décision utile.
          </p>
          <p className="text-sm leading-7 text-mist/58">
            La vidéo brute ne nourrit pas le texte. Le produit doit rester rapide à lire et crédible à opérer.
          </p>
        </div>
      </aside>
    </div>
  );
}
