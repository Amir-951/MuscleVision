'use client';

import * as ScrollArea from '@radix-ui/react-scroll-area';
import Link from 'next/link';
import {Download, Orbit, PlayCircle, RefreshCw} from 'lucide-react';
import {useEffect, useState} from 'react';

import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {getWorkoutResult} from '@/lib/api';
import type {WorkoutResult} from '@/lib/types';
import {WorkoutMotionReplay} from '@/components/workouts/workout-motion-replay';

function humanizeMuscleName(name: string) {
  return name
    .replaceAll('_', ' ')
    .replace(/\bleft\b/g, 'gauche')
    .replace(/\bright\b/g, 'droite')
    .replace(/\babs\b/g, 'abdos')
    .replace(/\bglute\b/g, 'fessier')
    .replace(/\bquad\b/g, 'quadriceps')
    .replace(/\bcalf\b/g, 'mollet')
    .replace(/\bbicep\b/g, 'biceps')
    .replace(/\btricep\b/g, 'triceps')
    .replace(/\bdeltoid\b/g, 'deltoide')
    .replace(/\boblique\b/g, 'oblique')
    .replace(/\blats\b/g, 'dorsal')
    .replace(/\bhamstring\b/g, 'ischio')
    .replace(/\bforearm\b/g, 'avant-bras')
    .replace(/\btrapezius\b/g, 'trapèze');
}

export function WorkoutResultView({sessionId}: {sessionId: string}) {
  const [result, setResult] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkoutResult(sessionId)
      .then((payload) => {
        setResult(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger le résultat.');
      });
  }, [sessionId]);

  if (error) {
    return (
      <LabCard className="p-6">
        <p className="text-sm text-[#ff8f8f]">{error}</p>
      </LabCard>
    );
  }

  if (!result) {
    return (
      <LabCard className="p-6">
        <p className="text-sm text-mist/60">Chargement des artefacts biomécaniques…</p>
      </LabCard>
    );
  }

  const stats = [
    {label: 'Score', value: `${result.correctnessScore}/100`},
    {label: 'Tempo', value: result.tempo},
    {label: 'Symétrie', value: `${Math.round(result.symmetryScore * 100)}%`},
    {label: 'Stabilité', value: `${Math.round(result.stabilityScore * 100)}%`},
    {label: 'Reps', value: String(result.repCount)},
  ];
  const topTargets = Object.entries(result.muscleEngagement)
    .map(([muscle, value]) => [muscle, value ?? 0] as const)
    .sort((left, right) => right[1] - left[1])
    .filter(([, value]) => value > 0.08)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionLabel>Result capsule</SectionLabel>
          <h2 className="font-display text-4xl text-ivory md:text-5xl">
            {result.exerciseType.replaceAll('_', ' ')}
          </h2>
          <p className="max-w-2xl text-base text-mist/60">
            {result.source === 'webcam' ? 'Capture webcam.' : 'Vidéo importée.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {result.analysisArtifactUrl ? (
            <Link
              href={result.analysisArtifactUrl}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory"
            >
              <Download className="h-4 w-4" />
              analysis.txt
            </Link>
          ) : null}
          {result.keypointsArtifactUrl ? (
            <Link
              href={result.keypointsArtifactUrl}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory"
            >
              <Download className="h-4 w-4" />
              keypoints.json
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_460px]">
        <LabCard className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-mist/45">{stat.label}</p>
                    <p className="mt-3 text-2xl text-ivory">{stat.value}</p>
                  </div>
                ))}
              </div>

              <LabCard className="p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-amber" />
                  <div>
                    <p className="text-sm text-ivory">Feedback</p>
                    <p className="text-sm text-mist/65">{result.feedback ?? 'Aucun feedback.'}</p>
                  </div>
                </div>
              </LabCard>

              {result.videoUrl ? (
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.28em] text-mist/45">
                    <PlayCircle className="h-4 w-4" />
                    Source vidéo
                  </div>
                  <video src={result.videoUrl} controls className="aspect-video w-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-mist/45">
                <Orbit className="h-4 w-4 text-amber" />
                Zones ciblées
              </div>
              <p className="mb-4 max-w-[260px] text-sm text-mist/58">
                Play rejoue le geste et fait monter la tension sur les zones visées.
              </p>
              <WorkoutMotionReplay
                exerciseType={result.exerciseType}
                keypointsArtifactUrl={result.keypointsArtifactUrl}
                muscleEngagement={result.muscleEngagement}
              />
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-mist/42">
                  Muscles dominants
                </p>
                <div className="mt-3 space-y-3">
                  {topTargets.length ? (
                    topTargets.map(([muscle, value]) => (
                      <div
                        key={muscle}
                        className="flex items-center justify-between border-b border-white/8 pb-3 text-sm last:border-b-0 last:pb-0"
                      >
                        <span className="text-mist/68">{humanizeMuscleName(muscle)}</span>
                        <span className="font-medium text-[#ff6b5f]">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-mist/55">
                      Aucune zone dominante assez nette pour être mise en avant.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </LabCard>

        <LabCard className="p-0">
          <div className="border-b border-white/10 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.32em] text-mist/45">analysis.txt</p>
            <h3 className="mt-2 text-xl text-ivory">Résumé</h3>
          </div>

          <ScrollArea.Root className="h-[520px] overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full px-6 py-5">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-mist/70">
                {result.analysisText}
              </pre>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2.5 touch-none select-none p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/15" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </LabCard>
      </div>
    </div>
  );
}
