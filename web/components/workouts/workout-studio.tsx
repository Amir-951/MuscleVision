'use client';

import * as Tabs from '@radix-ui/react-tabs';
import {startTransition, useEffect, useState} from 'react';
import {ArrowUpToLine, LoaderCircle, ScanSearch, Sparkles} from 'lucide-react';
import {useRouter} from 'next/navigation';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {getJobStatus, uploadWorkoutFile} from '@/lib/api';
import type {WorkoutJobStatus} from '@/lib/types';
import {WebcamRecorder} from '@/components/workouts/webcam-recorder';

export function WorkoutStudio() {
  const router = useRouter();
  const {user} = useAuth();
  const [job, setJob] = useState<{jobId: string; sessionId: string} | null>(null);
  const [jobStatus, setJobStatus] = useState<WorkoutJobStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  async function launchAnalysis(file: File, source: 'upload' | 'webcam') {
    if (!user?.id) {
      setError('Connexion requise pour lancer une analyse.');
      return;
    }

    try {
      setError(null);
      setSelectedFile(file);
      setJobStatus({
        status: 'pending',
        progress: 0.03,
        message: 'Mise en file de l’analyse…',
      });

      const payload = await uploadWorkoutFile({
        userId: user.id,
        source,
        file,
      });

      setJob({
        jobId: payload.job_id,
        sessionId: payload.session_id,
      });
    } catch (launchError) {
      setJob(null);
      setJobStatus(null);
      setError(launchError instanceof Error ? launchError.message : 'Lancement impossible.');
    }
  }

  useEffect(() => {
    if (!job) {
      return;
    }

    let cancelled = false;
    const pollJob = async () => {
      try {
        const status = await getJobStatus(job.jobId);
        if (cancelled) {
          return;
        }

        setJobStatus(status);

        if (status.status === 'done') {
          startTransition(() => {
            router.push(`/results/${job.sessionId}`);
          });
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error ? pollError.message : 'Le suivi du job a échoué.',
          );
        }
      }
    };

    void pollJob();
    const interval = window.setInterval(() => {
      void pollJob();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [job, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionLabel>Workout Lab</SectionLabel>
          <h2 className="font-display text-4xl leading-none text-ivory md:text-5xl">
            Détecte le mouvement brut, puis analyse le texte compact.
          </h2>
          <p className="max-w-2xl text-base text-mist/65">
            Le moteur extrait les points du corps, génère un résumé biomécanique compact,
            puis réserve l’IA aux conseils textuels les moins coûteux.
          </p>
        </div>

        <LabCard className="min-w-[260px] p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Pipeline actif</p>
          <div className="mt-3 flex items-center gap-3 text-sm text-mist/75">
            <Sparkles className="h-4 w-4 text-amber" />
            Pose extraction → analysis.txt → low-cost coach
          </div>
        </LabCard>
      </div>

      <Tabs.Root defaultValue="upload" className="space-y-6">
        <Tabs.List className="flex w-fit rounded-full border border-white/10 bg-white/5 p-1">
          <Tabs.Trigger
            value="upload"
            className="rounded-full px-4 py-2 text-sm text-mist/70 data-[state=active]:bg-white/10 data-[state=active]:text-ivory"
          >
            Import vidéo
          </Tabs.Trigger>
          <Tabs.Trigger
            value="webcam"
            className="rounded-full px-4 py-2 text-sm text-mist/70 data-[state=active]:bg-white/10 data-[state=active]:text-ivory"
          >
            Webcam
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="upload">
          <LabCard className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Upload contrôlé</p>
              <label className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-black/20 text-center transition hover:border-white/25 hover:bg-black/30">
                <ArrowUpToLine className="h-10 w-10 text-amber" />
                <span className="mt-5 text-xl text-ivory">Dépose une vidéo d’exercice</span>
                <span className="mt-2 text-sm text-mist/55">mp4, mov ou webm, cadrage plein corps</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void launchAnalysis(file, 'upload');
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-4">
              <LabCard className="p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Prévisualisation</p>
                {previewUrl ? (
                  <video src={previewUrl} controls className="mt-4 aspect-video w-full rounded-[20px] border border-white/10 object-cover" />
                ) : (
                  <div className="mt-4 flex aspect-video items-center justify-center rounded-[20px] border border-white/10 bg-black/20 text-sm text-mist/55">
                    La dernière source vidéo apparaîtra ici.
                  </div>
                )}
              </LabCard>

              <LabCard className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <ScanSearch className="h-5 w-5 text-amber" />
                  <div>
                    <p className="text-sm text-ivory">État de l’analyse</p>
                    <p className="text-xs text-mist/55">
                      {jobStatus?.message ?? 'En attente d’une nouvelle capture'}
                    </p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#e94b35,#ff9a3d)] transition-all"
                    style={{width: `${Math.max(6, (jobStatus?.progress ?? 0) * 100)}%`}}
                  />
                </div>

                {jobStatus?.status === 'processing' ? (
                  <div className="inline-flex items-center gap-2 text-sm text-mist/65">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Extraction biomécanique en cours
                  </div>
                ) : null}
                {error ? <p className="text-sm text-[#ff7a7a]">{error}</p> : null}
              </LabCard>
            </div>
          </LabCard>
        </Tabs.Content>

        <Tabs.Content value="webcam">
          <WebcamRecorder
            onCapture={(file) => {
              void launchAnalysis(file, 'webcam');
            }}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
