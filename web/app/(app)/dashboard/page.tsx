'use client';

import Link from 'next/link';
import {Activity, ArrowRight, Camera, Clock3, TrendingUp} from 'lucide-react';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionLabel>Control Deck</SectionLabel>
          <h2 className="font-display text-4xl text-ivory md:text-5xl">
            Vue d’ensemble de ton moteur de progression.
          </h2>
          <p className="max-w-2xl text-base text-mist/60">
            Accède à tes derniers signaux biomécaniques, à la prochaine analyse et au coach branché sur tes sessions.
          </p>
        </div>
        <Link
          href="/analyse"
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
        >
          Nouvelle analyse
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          {label: 'Sessions', value: String(history.length), icon: Activity},
          {label: 'Score moyen', value: `${averageScore}/100`, icon: TrendingUp},
          {label: 'Dernier tempo', value: latest?.repCount ? `${latest.repCount} reps` : '—', icon: Clock3},
          {label: 'Source récente', value: latest?.source ?? '—', icon: Camera},
        ].map((item) => {
          const Icon = item.icon;
          return (
            <LabCard key={item.label} className="p-5">
              <Icon className="h-5 w-5 text-amber" />
              <p className="mt-4 text-xs uppercase tracking-[0.28em] text-mist/45">{item.label}</p>
              <p className="mt-3 text-3xl text-ivory">{item.value}</p>
            </LabCard>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LabCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Historique</p>
            <h3 className="mt-2 text-2xl text-ivory">Dernières sessions</h3>
          </div>

          <div className="space-y-3">
            {error ? (
              <div className="rounded-[24px] border border-[#ff8d8d]/30 bg-[#ff8d8d]/8 p-4 text-sm text-[#ffb0b0]">
                {error}
              </div>
            ) : null}
            {history.map((session) => (
              <Link
                key={session.id}
                href={`/results/${session.id}`}
                className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg text-ivory">{session.exerciseType ?? 'unknown'}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-mist/55">
                    {session.source}
                  </span>
                </div>
                <p className="text-sm text-mist/60">
                  Score {session.correctnessScore ?? 0}/100 · {session.repCount ?? 0} reps ·{' '}
                  {Math.round((session.symmetryScore ?? 0) * 100)}% symétrie
                </p>
              </Link>
            ))}

            {!history.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-mist/55">
                Aucune séance disponible. Lance une première analyse.
              </div>
            ) : null}
          </div>
        </LabCard>

        <LabCard className="space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Quick actions</p>
          <Link href="/coach" className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20">
            <p className="text-lg text-ivory">Ouvrir le coach</p>
            <p className="mt-2 text-sm text-mist/60">Interroger une séance depuis son résumé compact.</p>
          </Link>
          <Link href="/nutrition" className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20">
            <p className="text-lg text-ivory">Journal nutrition</p>
            <p className="mt-2 text-sm text-mist/60">Analyser une photo et alimenter le journal du jour.</p>
          </Link>
        </LabCard>
      </div>
    </div>
  );
}
