'use client';

import * as ScrollArea from '@radix-ui/react-scroll-area';
import Link from 'next/link';
import {Download, Orbit, PlayCircle, RefreshCw} from 'lucide-react';
import {useEffect, useState} from 'react';

import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {getWorkoutResult} from '@/lib/api';
import type {WorkoutResult} from '@/lib/types';
import {MuscleMannequin} from '@/components/workouts/muscle-mannequin';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionLabel>Result capsule</SectionLabel>
          <h2 className="font-display text-4xl text-ivory md:text-5xl">
            {result.exerciseType.replaceAll('_', ' ')}
          </h2>
          <p className="max-w-2xl text-base text-mist/60">
            Séance {result.source === 'webcam' ? 'capturée en direct' : 'importée'} et résumée en
            biomécanique compacte.
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
                    <p className="text-sm text-ivory">Feedback coach low-cost</p>
                    <p className="text-sm text-mist/65">{result.feedback ?? 'Aucun feedback généré.'}</p>
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
                Muscular heat sculpture
              </div>
              <MuscleMannequin muscleEngagement={result.muscleEngagement} className="h-[420px] w-full" />
            </div>
          </div>
        </LabCard>

        <LabCard className="p-0">
          <div className="border-b border-white/10 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.32em] text-mist/45">analysis.txt</p>
            <h3 className="mt-2 text-xl text-ivory">Résumé biomécanique compact</h3>
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
