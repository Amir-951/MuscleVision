'use client';

import {Gauge, LoaderCircle, Pause, Play, RotateCcw} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {getWorkoutKeypointsArtifact} from '@/lib/api';
import type {MuscleEngagement, WorkoutPoseFrame} from '@/lib/types';
import {MuscleMannequin} from '@/components/workouts/muscle-mannequin';

function interpolateNumeric(start: number, end: number, amount: number) {
  return start + ((end - start) * amount);
}

function smoothFrames(frames: WorkoutPoseFrame[]) {
  return frames.map((frame, index) => {
    const smoothedKeypoints: WorkoutPoseFrame['keypoints'] = {};
    const smoothedMetrics: WorkoutPoseFrame['metrics'] = {};
    const keyNames = Object.keys(frame.keypoints);
    const metricNames = Object.keys(frame.metrics ?? {});

    keyNames.forEach((name) => {
      let x = 0;
      let y = 0;
      let z = 0;
      let visibility = 0;
      let weightTotal = 0;

      for (let offset = -2; offset <= 2; offset += 1) {
        const candidate = frames[index + offset]?.keypoints[name];
        if (!candidate) {
          continue;
        }

        const weight = offset === 0 ? 0.42 : Math.abs(offset) === 1 ? 0.22 : 0.07;
        x += candidate.x * weight;
        y += candidate.y * weight;
        z += candidate.z * weight;
        visibility += (candidate.visibility ?? 1) * weight;
        weightTotal += weight;
      }

      if (weightTotal <= 0) {
        smoothedKeypoints[name] = frame.keypoints[name];
        return;
      }

      smoothedKeypoints[name] = {
        x: x / weightTotal,
        y: y / weightTotal,
        z: z / weightTotal,
        visibility: visibility / weightTotal,
      };
    });

    metricNames.forEach((name) => {
      let total = 0;
      let weightTotal = 0;

      for (let offset = -2; offset <= 2; offset += 1) {
        const candidate = frames[index + offset]?.metrics?.[name];
        if (typeof candidate !== 'number') {
          continue;
        }

        const weight = offset === 0 ? 0.42 : Math.abs(offset) === 1 ? 0.22 : 0.07;
        total += candidate * weight;
        weightTotal += weight;
      }

      smoothedMetrics[name] = weightTotal > 0 ? total / weightTotal : frame.metrics?.[name] ?? 0;
    });

    return {
      timestamp: frame.timestamp,
      keypoints: smoothedKeypoints,
      metrics: smoothedMetrics,
    };
  });
}

function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

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

function smoothValues(values: number[]) {
  return values.map((_, index) => {
    let total = 0;
    let weightTotal = 0;

    for (let offset = -2; offset <= 2; offset += 1) {
      const target = values[index + offset];
      if (typeof target !== 'number') {
        continue;
      }

      const weight = offset === 0 ? 0.42 : Math.abs(offset) === 1 ? 0.22 : 0.07;
      total += target * weight;
      weightTotal += weight;
    }

    return weightTotal > 0 ? total / weightTotal : values[index];
  });
}

function normalizeSignals(frames: WorkoutPoseFrame[], exerciseType: string) {
  const values = smoothValues(frames.map((frame) => computeSignal(frame, exerciseType)));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  return values.map((value) => Math.max(0, Math.min(1, (value - min) / span)));
}

function frameWindowAtTime(frames: WorkoutPoseFrame[], playbackTime: number) {
  if (!frames.length) {
    return null;
  }

  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    if (playbackTime >= current.timestamp && playbackTime < next.timestamp) {
      const span = Math.max(0.0001, next.timestamp - current.timestamp);
      return {
        index,
        nextIndex: index + 1,
        progress: Math.max(0, Math.min(1, (playbackTime - current.timestamp) / span)),
      };
    }
  }

  return {
    index: frames.length - 1,
    nextIndex: frames.length - 1,
    progress: 0,
  };
}

function interpolateFrame(
  frames: WorkoutPoseFrame[],
  playbackTime: number,
) {
  const window = frameWindowAtTime(frames, playbackTime);
  if (!window) {
    return {frame: null, window: null};
  }

  const current = frames[window.index];
  const next = frames[window.nextIndex];

  if (!next || window.index === window.nextIndex) {
    return {frame: current, window};
  }

  const keypoints: WorkoutPoseFrame['keypoints'] = {};
  const metrics: WorkoutPoseFrame['metrics'] = {};
  const names = new Set([
    ...Object.keys(current.keypoints),
    ...Object.keys(next.keypoints),
  ]);

  names.forEach((name) => {
    const start = current.keypoints[name];
    const end = next.keypoints[name] ?? start;
    if (!start) {
      return;
    }

    keypoints[name] = {
      x: interpolateNumeric(start.x, end.x, window.progress),
      y: interpolateNumeric(start.y, end.y, window.progress),
      z: interpolateNumeric(start.z, end.z, window.progress),
      visibility: interpolateNumeric(start.visibility ?? 1, end.visibility ?? start.visibility ?? 1, window.progress),
    };
  });

  const metricNames = new Set([
    ...Object.keys(current.metrics ?? {}),
    ...Object.keys(next.metrics ?? {}),
  ]);

  metricNames.forEach((name) => {
    const start = current.metrics?.[name];
    const end = next.metrics?.[name];
    if (typeof start !== 'number') {
      return;
    }

    metrics[name] = interpolateNumeric(start, typeof end === 'number' ? end : start, window.progress);
  });

  return {
    frame: {
      timestamp: playbackTime,
      keypoints,
      metrics,
    },
    window,
  };
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

    next[muscle] = Math.min(
      1,
      (value * 0.42) + (value * tension * 1.48) + (value > 0.08 ? tension * 0.16 : 0),
    );
  });

  return next;
}

export function WorkoutMotionReplay({
  exerciseType,
  keypointsArtifactUrl,
  muscleEngagement,
  viewportClassName,
}: {
  exerciseType: string;
  keypointsArtifactUrl?: string | null;
  muscleEngagement: MuscleEngagement;
  viewportClassName?: string;
}) {
  const [frames, setFrames] = useState<WorkoutPoseFrame[]>([]);
  const [tensions, setTensions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const startTimeRef = useRef(0);
  const originTimeRef = useRef(0);
  const resumeAfterSeekRef = useRef(false);
  const rateOptions = [0.5, 1, 1.5, 2];

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

        const smoothedFrames = smoothFrames(payload.frames);
        setFrames(smoothedFrames);
        setTensions(normalizeSignals(smoothedFrames, exerciseType));
        setPlaybackTime(0);
        setPlaybackRate(1);
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
  const {frame: currentFrame, window: currentWindow} = interpolateFrame(frames, playbackTime);
  const currentTension = currentWindow
    ? interpolateNumeric(
      tensions[currentWindow.index] ?? 0,
      tensions[currentWindow.nextIndex] ?? tensions[currentWindow.index] ?? 0,
      currentWindow.progress,
    )
    : 0;

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      return;
    }

    startTimeRef.current = performance.now();
    originTimeRef.current = playbackTime;
    let frameHandle = 0;

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const nextPlaybackTime = originTimeRef.current + (elapsed * playbackRate);

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
  }, [duration, isPlaying, playbackRate, playbackTime]);

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
    originTimeRef.current = 0;
  }

  function handleSeek(nextValue: number) {
    const clamped = Math.max(0, Math.min(duration, nextValue));
    setPlaybackTime(clamped);
    originTimeRef.current = clamped;
    startTimeRef.current = performance.now();
  }

  function handleSeekStart() {
    resumeAfterSeekRef.current = isPlaying;
    setIsPlaying(false);
  }

  function handleSeekEnd() {
    if (resumeAfterSeekRef.current && playbackTime < duration) {
      startTimeRef.current = performance.now();
      originTimeRef.current = playbackTime;
      setIsPlaying(true);
    }
    resumeAfterSeekRef.current = false;
  }

  function handleCycleSpeed() {
    const currentIndex = rateOptions.indexOf(playbackRate);
    const nextRate = rateOptions[(currentIndex + 1) % rateOptions.length];
    setPlaybackRate(nextRate);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Movement replay</p>
          <p className="mt-2 text-sm text-mist/60">
            {frames.length ? 'Lecture issue de keypoints.json' : 'Replay indisponible'}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-[#ff8f8f]">{error}</p> : null}

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
        <MuscleMannequin
          muscleEngagement={displayEngagement}
          className={viewportClassName ?? 'h-[440px] w-full'}
          renderMode="targeted"
          poseFrame={currentFrame}
          tension={currentTension}
        />
      </div>

      <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={handleCycleSpeed}
            disabled={!frames.length}
            className="inline-flex min-w-[86px] items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory disabled:opacity-50"
          >
            <Gauge className="h-4 w-4" />
            {playbackRate}x
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={playbackTime}
          onPointerDown={handleSeekStart}
          onPointerUp={handleSeekEnd}
          onChange={(event) => {
            handleSeek(Number(event.target.value));
          }}
          disabled={!frames.length}
          aria-label="Contrôle du replay"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/8 accent-[#ff7a50] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5a46,#ffb15f)] transition-all"
            style={{width: `${progress * 100}%`}}
          />
        </div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-mist/42">
          <span>{formatTime(playbackTime)}</span>
          <span>Tension {Math.round(currentTension * 100)}%</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
