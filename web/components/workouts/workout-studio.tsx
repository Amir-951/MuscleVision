'use client';

import * as Tabs from '@radix-ui/react-tabs';
import {motion} from 'framer-motion';
import {startTransition, useEffect, useState} from 'react';
import {ArrowUpToLine, LoaderCircle, ScanSearch, Sparkles, Video} from 'lucide-react';
import {useRouter} from 'next/navigation';

import {useAuth} from '@/components/providers/auth-provider';
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
    <div className="space-y-8">
      <motion.div
        initial={{opacity: 0, y: 18}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.4, ease: 'easeOut'}}
        className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="space-y-4">
          <SectionLabel>Motion intake</SectionLabel>
          <h1 className="max-w-4xl font-display text-[3.1rem] leading-[0.88] text-ivory md:text-[4.8rem]">
            Importe ou enregistre.
          </h1>
          <p className="max-w-2xl text-base text-mist/62">Une entrée. Un résultat.</p>
        </div>

        <div className="border-t border-white/10 pt-4 lg:max-w-[320px] lg:border-t-0 lg:pt-0">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Pipeline</p>
          <p className="mt-3 text-sm text-mist/58">Extraction, métriques, résultat.</p>
        </div>
      </motion.div>

      <Tabs.Root defaultValue="upload" className="space-y-8">
        <div className="flex justify-end">
          <Tabs.List className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <Tabs.Trigger
              value="upload"
              className="rounded-full px-4 py-2 text-sm text-mist/60 data-[state=active]:bg-white/10 data-[state=active]:text-ivory"
            >
              Import vidéo
            </Tabs.Trigger>
            <Tabs.Trigger
              value="webcam"
              className="rounded-full px-4 py-2 text-sm text-mist/60 data-[state=active]:bg-white/10 data-[state=active]:text-ivory"
            >
              Webcam
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="upload">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.18fr)_320px]">
            <motion.label
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.42, ease: 'easeOut'}}
              className="group relative flex min-h-[560px] cursor-pointer overflow-hidden rounded-[36px] border border-white/10"
            >
              {previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(245,162,70,0.18),transparent_24%),radial-gradient(circle_at_84%_16%,rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,#12151a_0%,#090b0f_100%)]" />
                  <div className="absolute inset-0 lab-grid opacity-60" />
                  <div className="absolute inset-x-[12%] top-[18%] h-[1px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]" />
                  <div className="absolute left-1/2 top-[22%] h-40 w-40 -translate-x-1/2 rounded-full border border-white/10" />
                  <div className="absolute left-1/2 top-[30%] h-24 w-24 -translate-x-1/2 rounded-full border border-white/10" />
                  <div className="absolute inset-x-[14%] bottom-[14%] h-[30%] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06))]" />
                </>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,11,0.05),rgba(7,8,11,0.7))]" />
              <div className="relative flex w-full flex-col justify-between p-8 md:p-10">
                <div className="max-w-[420px] space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Upload controlled</p>
                  <h2 className="font-display text-[2.6rem] leading-[0.9] text-ivory md:text-[3.6rem]">
                    Dépose une vidéo plein corps.
                  </h2>
                  <p className="text-base text-mist/64">Cadre net. Sujet entier.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-5 py-3 text-sm text-ivory">
                    <ArrowUpToLine className="h-4 w-4 text-amber" />
                    {previewUrl ? 'Remplacer la vidéo' : 'Choisir un fichier'}
                  </span>
                  <span className="text-sm text-mist/55">mp4, mov ou webm · cadrage plein corps</span>
                </div>
              </div>

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
            </motion.label>

            <motion.aside
              initial={{opacity: 0, x: 18}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.45, delay: 0.08, ease: 'easeOut'}}
              className="space-y-8 border-t border-white/10 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ScanSearch className="h-5 w-5 text-amber" />
                  <div>
                    <p className="text-sm text-ivory">État de l’analyse</p>
                    <p className="text-sm text-mist/55">
                      {jobStatus?.message ?? 'En attente d’une nouvelle capture'}
                    </p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#e94b35,#ff9a3d)] transition-all"
                    style={{width: `${Math.max(6, (jobStatus?.progress ?? 0) * 100)}%`}}
                  />
                </div>

                {jobStatus?.status === 'processing' ? (
                  <div className="inline-flex items-center gap-2 text-sm text-mist/60">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Extraction biomécanique en cours
                  </div>
                ) : null}

                {error ? <p className="text-sm text-[#ff7a7a]">{error}</p> : null}
              </div>

              <div className="space-y-4 border-t border-white/10 pt-6">
                <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Flow</p>
                {[
                  'Entrée vidéo.',
                  'Extraction de pose.',
                  'Résultat et coach.',
                ].map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <span className="w-6 text-[11px] uppercase tracking-[0.26em] text-mist/34">
                      0{index + 1}
                    </span>
                    <p className="text-sm text-mist/58">{step}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t border-white/10 pt-6">
                <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Budget IA</p>
                <div className="inline-flex items-center gap-2 text-sm text-mist/60">
                  <Sparkles className="h-4 w-4 text-amber" />
                  `analysis.txt` → coach
                </div>
              </div>
            </motion.aside>
          </div>
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
