'use client';

import {LoaderCircle, Pause, Play, RotateCcw} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {getWorkoutKeypointsArtifact} from '@/lib/api';
import type {MuscleEngagement, WorkoutPoseFrame} from '@/lib/types';
import {MuscleMannequin} from '@/components/workouts/muscle-mannequin';

function computeSignal(frame: WorkoutPoseFrame, exerciseType: string) {
  const metrics = frame.metrics ?? {};
  const leftShoulder = frame.keypoints.left_shoulder;
  const rightShoulder = frame.keypoints.right_shoulder;

  if (!leftShoulder || !rightShoulder) {
    return 0;
  }

  if (exerciseType === 'pull_up') {
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const shoulderLift = (1 - shoulderMidY) * 100;
    const elbowFlexion =
      180 - (((metrics.elbow_left ?? 180) + (metrics.elbow_right ?? 180)) / 2);
    return (shoulderLift * 0.62) + (elbowFlexion * 0.38);
  }

  if (exerciseType === 'squat' || exerciseType === 'deadlift') {
    return 180 - (((metrics.knee_left ?? 180) + (metrics.knee_right ?? 180)) / 2);
  }

  if (exerciseType === 'push_up') {
    const elbowBend =
      180 - (((metrics.elbow_left ?? 180) + (metrics.elbow_right ?? 180)) / 2);
    const trunkLean = Math.min(40, (metrics.trunk_lean ?? 0) * 100);
    return (elbowBend * 0.78) + (trunkLean * 0.22);
  }

  return 180 - (((metrics.elbow_left ?? 180) + (metrics.elbow_right ?? 180)) / 2);
}

function normalizeSignals(frames: WorkoutPoseFrame[], exerciseType: string) {
  const values = frames.map((frame) => computeSignal(frame, exerciseType));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  return values.map((value) => Math.max(0, Math.min(1, (value - min) / span)));
}

function frameIndexAtTime(frames: WorkoutPoseFrame[], playbackTime: number) {
  if (!frames.length) {
    return -1;
  }

  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    if (playbackTime >= current.timestamp && playbackTime < next.timestamp) {
      return index;
    }
  }

  return frames.length - 1;
}

function applyTension(
  muscleEngagement: MuscleEngagement,
  tension: number,
): MuscleEngagement {
  const next: MuscleEngagement = {};

  Object.entries(muscleEngagement).forEach(([muscle, value]) => {
    if (typeof value !== 'number') {
      return;
    }

    next[muscle] = Math.min(1, value * (0.48 + tension * 0.92));
  });

  return next;
}

export function WorkoutMotionReplay({
  exerciseType,
  keypointsArtifactUrl,
  muscleEngagement,
}: {
  exerciseType: string;
  keypointsArtifactUrl?: string | null;
  muscleEngagement: MuscleEngagement;
}) {
  const [frames, setFrames] = useState<WorkoutPoseFrame[]>([]);
  const [tensions, setTensions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!keypointsArtifactUrl) {
      setFrames([]);
      setTensions([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadFrames = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const payload = await getWorkoutKeypointsArtifact(keypointsArtifactUrl);
        if (cancelled) {
          return;
        }

        setFrames(payload.frames);
        setTensions(normalizeSignals(payload.frames, exerciseType));
        setPlaybackTime(0);
        setIsPlaying(false);
      } catch (loadError) {
        if (!cancelled) {
          setFrames([]);
          setTensions([]);
          setError(loadError instanceof Error ? loadError.message : 'Replay indisponible.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFrames();

    return () => {
      cancelled = true;
    };
  }, [exerciseType, keypointsArtifactUrl]);

  const duration = frames.at(-1)?.timestamp ?? 0;
  const currentFrameIndex = frameIndexAtTime(frames, playbackTime);
  const currentFrame =
    currentFrameIndex >= 0 ? frames[currentFrameIndex] : null;
  const currentTension =
    currentFrameIndex >= 0 ? tensions[currentFrameIndex] ?? 0 : 0;

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      return;
    }

    startTimeRef.current = performance.now() - playbackTime * 1000;
    let frameHandle = 0;

    const tick = () => {
      const nextPlaybackTime = (performance.now() - startTimeRef.current) / 1000;

      if (nextPlaybackTime >= duration) {
        setPlaybackTime(duration);
        setIsPlaying(false);
        return;
      }

      setPlaybackTime(nextPlaybackTime);
      frameHandle = window.requestAnimationFrame(tick);
    };

    frameHandle = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  }, [duration, isPlaying, playbackTime]);

  const progress = duration > 0 ? Math.min(1, playbackTime / duration) : 0;
  const displayEngagement =
    currentFrame && frames.length
      ? applyTension(muscleEngagement, currentTension)
      : muscleEngagement;

  function handleTogglePlay() {
    if (!frames.length) {
      return;
    }

    if (playbackTime >= duration) {
      setPlaybackTime(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((current) => !current);
  }

  function handleRestart() {
    setPlaybackTime(0);
    setIsPlaying(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Movement replay</p>
          <p className="mt-2 text-sm text-mist/60">
            {frames.length ? 'Lecture issue de keypoints.json' : 'Replay indisponible'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!frames.length || isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={!frames.length}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Rejouer
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#ff8f8f]">{error}</p> : null}

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
        <MuscleMannequin
          muscleEngagement={displayEngagement}
          className="h-[440px] w-full"
          renderMode="targeted"
          poseFrame={currentFrame}
          tension={currentTension}
        />
      </div>

      <div className="space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5a46,#ffb15f)] transition-all"
            style={{width: `${progress * 100}%`}}
          />
        </div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-mist/42">
          <span>{playbackTime.toFixed(1)}s</span>
          <span>Tension {Math.round(currentTension * 100)}%</span>
          <span>{duration.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}
