'use client';

import {Camera, LoaderCircle, Mic, MicOff, Phone, PhoneOff, Radar, Sparkles} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {CoachAvatarScene} from '@/components/coach/coach-avatar-scene';
import type {CoachPersona} from '@/components/coach/coach-personas';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {MuscleMannequin} from '@/components/workouts/muscle-mannequin';
import {getLiveCoachFeedback} from '@/lib/api';
import {formatScore10From100, formatScore10FromUnit} from '@/lib/score';
import type {
  CoachId,
  LiveCoachFeedback,
  LiveCoachSample,
  LiveExerciseHint,
  MuscleEngagement,
} from '@/lib/types';

const exerciseOptions: Array<{value: LiveExerciseHint; label: string}> = [
  {value: 'auto', label: 'Auto'},
  {value: 'pull_up', label: 'Traction'},
  {value: 'push_up', label: 'Pompe'},
  {value: 'squat', label: 'Squat'},
  {value: 'deadlift', label: 'Deadlift'},
  {value: 'bicep_curl', label: 'Curl'},
  {value: 'overhead_press', label: 'Press'},
];

function averageTopTension(muscleEngagement: MuscleEngagement) {
  const values = Object.values(muscleEngagement).filter((value): value is number => typeof value === 'number');
  if (!values.length) {
    return 0;
  }

  const top = values.sort((a, b) => b - a).slice(0, 6);
  return Math.max(0, Math.min(1, top.reduce((sum, value) => sum + value, 0) / top.length));
}

function exerciseLabel(value?: string) {
  return {
    pull_up: 'Traction',
    push_up: 'Pompe',
    squat: 'Squat',
    deadlift: 'Deadlift',
    bicep_curl: 'Curl',
    overhead_press: 'Press',
    auto: 'Auto',
    unknown: 'Mouvement',
  }[value ?? 'unknown'] ?? value ?? 'Mouvement';
}

async function captureFrameBlob(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
) {
  const width = video.videoWidth || 960;
  const height = video.videoHeight || 540;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas indisponible.');
  }

  context.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.84);
  });

  if (!blob) {
    throw new Error('Capture webcam impossible.');
  }

  return blob;
}

export function CoachLiveSession({
  coachId,
  persona,
  userId,
}: {
  coachId: CoachId;
  persona: CoachPersona;
  userId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const samplesRef = useRef<LiveCoachSample[]>([]);
  const repCountRef = useRef(0);
  const voiceEnabledRef = useRef(true);
  const startedAtRef = useRef(0);
  const lastVoiceRef = useRef('');
  const liveRef = useRef(false);

  const [isLive, setIsLive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [exerciseHint, setExerciseHint] = useState<LiveExerciseHint>('auto');
  const [samples, setSamples] = useState<LiveCoachSample[]>([]);
  const [feedback, setFeedback] = useState<LiveCoachFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    liveRef.current = isLive;
  }, [isLive]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  useEffect(() => {
    repCountRef.current = feedback?.repCount ?? 0;
  }, [feedback?.repCount]);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearLoop() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function speak(text: string) {
    if (!voiceEnabledRef.current || !text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (lastVoiceRef.current === text) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = coachId === 'sergeant' ? 1.04 : coachId === 'bro' ? 1.02 : 0.98;
    utterance.pitch = coachId === 'max' ? 1.03 : 0.96;
    window.speechSynthesis.speak(utterance);
    lastVoiceRef.current = text;
  }

  function stopLiveSession() {
    clearLoop();
    setIsLive(false);
    setIsAnalyzing(false);
    stopTracks();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  async function analyzeNextFrame() {
    if (!userId || !videoRef.current || !canvasRef.current || !liveRef.current) {
      return;
    }

    try {
      setIsAnalyzing(true);
      const frame = await captureFrameBlob(videoRef.current, canvasRef.current);
      const elapsedSeconds = Math.max(0, (performance.now() - startedAtRef.current) / 1000);

      const nextFeedback = await getLiveCoachFeedback({
        coachId,
        userId,
        frame,
        timestampSeconds: elapsedSeconds,
        exerciseHint,
        lastRepCount: repCountRef.current,
        samples: samplesRef.current.slice(-18),
      });

      if (!liveRef.current) {
        return;
      }

      setFeedback(nextFeedback);
      setSamples(nextFeedback.samples);
      setError(null);
      if (nextFeedback.voice) {
        speak(nextFeedback.voice);
      }
    } catch (analysisError) {
      if (liveRef.current) {
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : 'Analyse live indisponible.',
        );
      }
    } finally {
      if (liveRef.current) {
        setIsAnalyzing(false);
        timerRef.current = window.setTimeout(() => {
          void analyzeNextFrame();
        }, 1350);
      }
    }
  }

  async function startLiveSession() {
    if (!userId) {
      setError('Connexion requise pour lancer le coach live.');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {ideal: 1280},
          height: {ideal: 720},
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      lastVoiceRef.current = '';
      startedAtRef.current = performance.now();
      setFeedback(null);
      setSamples([]);
      setIsLive(true);
      timerRef.current = window.setTimeout(() => {
        void analyzeNextFrame();
      }, 420);
    } catch (startError) {
      stopTracks();
      setError(
        startError instanceof Error
          ? startError.message
          : 'Impossible de lancer la visio coach.',
      );
    }
  }

  useEffect(() => {
    return () => {
      clearLoop();
      stopTracks();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const tension = averageTopTension(feedback?.muscleEngagement ?? {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <SectionLabel>Live Call</SectionLabel>
          <h3 className="font-display text-3xl text-ivory md:text-4xl">Coach en visio.</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={exerciseHint}
            onChange={(event) => setExerciseHint(event.target.value as LiveExerciseHint)}
            className="rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-ivory outline-none"
          >
            {exerciseOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-graphite">
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setVoiceEnabled((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-mist/72 transition hover:border-white/20 hover:text-ivory"
          >
            {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {voiceEnabled ? 'Voix on' : 'Voix off'}
          </button>

          {!isLive ? (
            <button
              type="button"
              onClick={() => void startLiveSession()}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white"
              style={{
                background: `linear-gradient(135deg, ${persona.palette.accent}, ${persona.palette.glow})`,
              }}
            >
              <Phone className="h-4 w-4" />
              Lancer l’appel
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLiveSession}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-ivory"
            >
              <PhoneOff className="h-4 w-4" />
              Couper
            </button>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <LabCard className="p-0">
          <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(180deg,#10141a_0%,#090b0f_100%)]">
            <div className="absolute inset-0 lab-grid opacity-40" />
            <video
              ref={videoRef}
              muted
              playsInline
              className="relative aspect-video w-full min-h-[520px] object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-mist/60">
                {isLive ? 'Analyse live' : 'Visio prête'}
              </div>
              <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-mist/60">
                {exerciseLabel(feedback?.exerciseType || exerciseHint)}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(5,6,9,0.88))] p-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.34em] text-mist/46">
                    {feedback?.headline ?? 'Le coach attend le mouvement.'}
                  </p>
                  <p className="max-w-2xl text-lg text-ivory md:text-[1.45rem]">
                    {feedback?.body ?? 'Lance l’appel, garde le corps entier dans le cadre, puis bouge.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-mist/45">Reps</p>
                    <p className="mt-2 text-3xl text-ivory">{feedback?.repCount ?? 0}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-mist/45">Note</p>
                    <p className="mt-2 text-3xl text-ivory">{formatScore10From100(feedback?.correctnessScore)}</p>
                  </div>
                </div>
              </div>
            </div>

            {!isLive ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm text-mist/70">
                  Cadre-toi puis lance l’appel.
                </div>
              </div>
            ) : null}
          </div>
        </LabCard>

        <div className="space-y-5">
          <LabCard className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.32em] text-mist/45">Coach live</p>
                <p className="text-xl text-ivory">{persona.name}</p>
                <p className="text-sm text-mist/60">{persona.role}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-mist/48">
                {feedback?.phase ? feedback.phase : 'setup'}
              </div>
            </div>

            <CoachAvatarScene persona={persona} compact showMeta className="h-48" />
          </LabCard>

          <LabCard className="space-y-4 p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Live mannequin</p>
                  <p className="mt-1 text-sm text-mist/62">Pose et tension en direct.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-mist/52">
                  {isAnalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                  {isAnalyzing ? 'Analyse' : 'Sync'}
                </div>
              </div>
            </div>
            <MuscleMannequin
              className="h-[420px] w-full"
              renderMode="targeted"
              poseFrame={feedback?.poseFrame}
              muscleEngagement={feedback?.muscleEngagement ?? {}}
              tension={tension}
            />
          </LabCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))]">
        <LabCard className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Symétrie</p>
          <p className="text-2xl text-ivory">{formatScore10FromUnit(feedback?.symmetryScore)}</p>
        </LabCard>
        <LabCard className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Stabilité</p>
          <p className="text-2xl text-ivory">{formatScore10FromUnit(feedback?.stabilityScore)}</p>
        </LabCard>
        <LabCard className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Amplitude</p>
          <p className="text-2xl text-ivory">{formatScore10FromUnit(feedback?.amplitudeScore)}</p>
        </LabCard>
        <LabCard className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Tempo</p>
          <p className="text-2xl text-ivory">{feedback?.tempoLabel ?? '--'}</p>
        </LabCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LabCard className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Cue actif</p>
          </div>
          <p className="text-xl text-ivory">{feedback?.headline ?? 'En attente de mouvement.'}</p>
          <p className="text-sm text-mist/68">{feedback?.body ?? 'Le coach donnera une correction courte et immédiate.'}</p>
        </LabCard>

        <LabCard className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-amber" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-mist/45">Focus</p>
          </div>
          {(feedback?.alerts?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {feedback?.alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-mist/72"
                >
                  {alert.replaceAll('_', ' ')}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mist/62">Aucune alerte majeure. Continue propre.</p>
          )}
        </LabCard>
      </div>
    </div>
  );
}
