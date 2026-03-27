'use client';

import {OrbitControls} from '@react-three/drei';
import {Canvas} from '@react-three/fiber';

import type {MuscleEngagement, PoseKeypoint, WorkoutPoseFrame} from '@/lib/types';

type ScenePoint = [number, number, number];

type PosePoints = {
  left_shoulder: ScenePoint;
  right_shoulder: ScenePoint;
  left_elbow: ScenePoint;
  right_elbow: ScenePoint;
  left_wrist: ScenePoint;
  right_wrist: ScenePoint;
  left_hip: ScenePoint;
  right_hip: ScenePoint;
  left_knee: ScenePoint;
  right_knee: ScenePoint;
  left_ankle: ScenePoint;
  right_ankle: ScenePoint;
};

type MaterialPreset = {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  roughness: number;
  metalness: number;
};

type MuscleSegment = {
  id: string;
  muscles: string[];
  start: ScenePoint;
  end: ScenePoint;
  radius: number;
};

type MuscleOrb = {
  id: string;
  muscles: string[];
  center: ScenePoint;
  radius: number;
};

type RenderMode = 'ambient' | 'targeted';

const defaultPose: PosePoints = {
  left_shoulder: [-0.74, 1.16, 0.04],
  right_shoulder: [0.74, 1.16, 0.04],
  left_elbow: [-1.08, 0.4, 0.08],
  right_elbow: [1.08, 0.4, 0.08],
  left_wrist: [-1.12, -0.44, 0.12],
  right_wrist: [1.12, -0.44, 0.12],
  left_hip: [-0.42, -0.04, 0.02],
  right_hip: [0.42, -0.04, 0.02],
  left_knee: [-0.32, -1.62, 0.04],
  right_knee: [0.32, -1.62, 0.04],
  left_ankle: [-0.28, -3.08, 0.08],
  right_ankle: [0.28, -3.08, 0.08],
};

function blendChannel(from: number, to: number, intensity: number) {
  return Math.round(from + ((to - from) * intensity));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shift(point: ScenePoint, x = 0, y = 0, z = 0): ScenePoint {
  return [point[0] + x, point[1] + y, point[2] + z];
}

function addPoint(a: ScenePoint, b: ScenePoint): ScenePoint {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractPoint(a: ScenePoint, b: ScenePoint): ScenePoint {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scalePoint(point: ScenePoint, factor: number): ScenePoint {
  return [point[0] * factor, point[1] * factor, point[2] * factor];
}

function midpoint(a: ScenePoint, b: ScenePoint): ScenePoint {
  return [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];
}

function mixPoint(a: ScenePoint, b: ScenePoint, amount: number): ScenePoint {
  return [
    a[0] + ((b[0] - a[0]) * amount),
    a[1] + ((b[1] - a[1]) * amount),
    a[2] + ((b[2] - a[2]) * amount),
  ];
}

function magnitude(point: ScenePoint) {
  return Math.sqrt((point[0] ** 2) + (point[1] ** 2) + (point[2] ** 2));
}

function normalizePoint(point: ScenePoint, fallback: ScenePoint): ScenePoint {
  const length = magnitude(point);
  if (length < 0.0001) {
    const fallbackLength = magnitude(fallback);
    if (fallbackLength < 0.0001) {
      return [0, 1, 0];
    }
    return [
      fallback[0] / fallbackLength,
      fallback[1] / fallbackLength,
      fallback[2] / fallbackLength,
    ];
  }

  return [point[0] / length, point[1] / length, point[2] / length];
}

function distance(a: ScenePoint, b: ScenePoint) {
  return magnitude(subtractPoint(b, a));
}

function segmentRotation(a: ScenePoint, b: ScenePoint): [number, number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const yaw = Math.atan2(dx, dz === 0 ? 0.0001 : dz);
  const pitch = Math.atan2(Math.sqrt((dx ** 2) + (dz ** 2)), dy === 0 ? 0.0001 : dy);
  return [0, -yaw, pitch];
}

const defaultShoulderMid = midpoint(defaultPose.left_shoulder, defaultPose.right_shoulder);
const defaultHipMid = midpoint(defaultPose.left_hip, defaultPose.right_hip);
const defaultMeasurements = {
  shoulderWidth: distance(defaultPose.left_shoulder, defaultPose.right_shoulder),
  hipWidth: distance(defaultPose.left_hip, defaultPose.right_hip),
  torsoHeight: distance(defaultShoulderMid, defaultHipMid),
  upperArmLeft: distance(defaultPose.left_shoulder, defaultPose.left_elbow),
  upperArmRight: distance(defaultPose.right_shoulder, defaultPose.right_elbow),
  forearmLeft: distance(defaultPose.left_elbow, defaultPose.left_wrist),
  forearmRight: distance(defaultPose.right_elbow, defaultPose.right_wrist),
  thighLeft: distance(defaultPose.left_hip, defaultPose.left_knee),
  thighRight: distance(defaultPose.right_hip, defaultPose.right_knee),
  shinLeft: distance(defaultPose.left_knee, defaultPose.left_ankle),
  shinRight: distance(defaultPose.right_knee, defaultPose.right_ankle),
};

const defaultDirections = {
  shoulders: subtractPoint(defaultPose.right_shoulder, defaultPose.left_shoulder),
  hips: subtractPoint(defaultPose.right_hip, defaultPose.left_hip),
  torso: subtractPoint(defaultHipMid, defaultShoulderMid),
  upperArmLeft: subtractPoint(defaultPose.left_elbow, defaultPose.left_shoulder),
  upperArmRight: subtractPoint(defaultPose.right_elbow, defaultPose.right_shoulder),
  forearmLeft: subtractPoint(defaultPose.left_wrist, defaultPose.left_elbow),
  forearmRight: subtractPoint(defaultPose.right_wrist, defaultPose.right_elbow),
  thighLeft: subtractPoint(defaultPose.left_knee, defaultPose.left_hip),
  thighRight: subtractPoint(defaultPose.right_knee, defaultPose.right_hip),
  shinLeft: subtractPoint(defaultPose.left_ankle, defaultPose.left_knee),
  shinRight: subtractPoint(defaultPose.right_ankle, defaultPose.right_knee),
};

function zoneIntensity(muscleEngagement: MuscleEngagement, muscles: string[]) {
  if (!muscles.length) {
    return 0;
  }

  const total = muscles.reduce((sum, muscle) => sum + (muscleEngagement[muscle] ?? 0), 0);
  return Math.min(1, total / muscles.length);
}

function heatColor(intensity: number) {
  const cool = [242, 236, 226];
  const ember = [255, 154, 61];
  const hot = [233, 75, 53];
  const threshold = Math.min(1, intensity);
  const from = threshold < 0.58 ? cool : ember;
  const to = threshold < 0.58 ? ember : hot;
  const local = threshold < 0.58 ? threshold / 0.58 : (threshold - 0.58) / 0.42;
  return `rgb(${blendChannel(from[0], to[0], local)}, ${blendChannel(from[1], to[1], local)}, ${blendChannel(from[2], to[2], local)})`;
}

function targetedColor(intensity: number) {
  const dormant = [54, 37, 40];
  const live = [158, 28, 34];
  const peak = [255, 92, 64];

  if (intensity < 0.05) {
    return `rgb(${dormant[0]}, ${dormant[1]}, ${dormant[2]})`;
  }

  const local = Math.min(1, (intensity - 0.05) / 0.95);
  const from = local < 0.62 ? dormant : live;
  const to = local < 0.62 ? live : peak;
  const eased = local < 0.62 ? local / 0.62 : (local - 0.62) / 0.38;
  return `rgb(${blendChannel(from[0], to[0], eased)}, ${blendChannel(from[1], to[1], eased)}, ${blendChannel(from[2], to[2], eased)})`;
}

function toScenePoint(point: PoseKeypoint): ScenePoint {
  return [
    (0.5 - point.x) * 5.0,
    ((0.54 - point.y) * 5.35) - 0.72,
    -point.z * 1.8,
  ];
}

function constrainChild(
  parent: ScenePoint,
  rawChild: ScenePoint,
  targetLength: number,
  fallbackDirection: ScenePoint,
) {
  const direction = normalizePoint(
    subtractPoint(rawChild, parent),
    fallbackDirection,
  );
  return addPoint(parent, scalePoint(direction, targetLength));
}

function stabilizePose(rawPose: PosePoints): PosePoints {
  const rawShoulderMid = midpoint(rawPose.left_shoulder, rawPose.right_shoulder);
  const rawHipMid = midpoint(rawPose.left_hip, rawPose.right_hip);

  const shoulderScale = clamp(
    distance(rawPose.left_shoulder, rawPose.right_shoulder) / defaultMeasurements.shoulderWidth,
    0.86,
    1.18,
  );
  const hipScale = clamp(
    distance(rawPose.left_hip, rawPose.right_hip) / defaultMeasurements.hipWidth,
    0.88,
    1.18,
  );
  const torsoScale = clamp(
    distance(rawShoulderMid, rawHipMid) / defaultMeasurements.torsoHeight,
    0.9,
    1.18,
  );
  const limbScale = clamp((shoulderScale + hipScale + torsoScale) / 3, 0.92, 1.16);

  const shoulderAxis = normalizePoint(
    subtractPoint(rawPose.right_shoulder, rawPose.left_shoulder),
    defaultDirections.shoulders,
  );
  const hipAxis = normalizePoint(
    subtractPoint(rawPose.right_hip, rawPose.left_hip),
    defaultDirections.hips,
  );
  const torsoAxis = normalizePoint(
    subtractPoint(rawHipMid, rawShoulderMid),
    defaultDirections.torso,
  );

  const shoulderMid = rawShoulderMid;
  const hipMid = addPoint(
    shoulderMid,
    scalePoint(torsoAxis, defaultMeasurements.torsoHeight * torsoScale),
  );

  const left_shoulder = addPoint(
    shoulderMid,
    scalePoint(shoulderAxis, -(defaultMeasurements.shoulderWidth * shoulderScale) / 2),
  );
  const right_shoulder = addPoint(
    shoulderMid,
    scalePoint(shoulderAxis, (defaultMeasurements.shoulderWidth * shoulderScale) / 2),
  );
  const left_hip = addPoint(
    hipMid,
    scalePoint(hipAxis, -(defaultMeasurements.hipWidth * hipScale) / 2),
  );
  const right_hip = addPoint(
    hipMid,
    scalePoint(hipAxis, (defaultMeasurements.hipWidth * hipScale) / 2),
  );

  const left_elbow = constrainChild(
    left_shoulder,
    rawPose.left_elbow,
    defaultMeasurements.upperArmLeft * limbScale,
    defaultDirections.upperArmLeft,
  );
  const right_elbow = constrainChild(
    right_shoulder,
    rawPose.right_elbow,
    defaultMeasurements.upperArmRight * limbScale,
    defaultDirections.upperArmRight,
  );
  const left_wrist = constrainChild(
    left_elbow,
    rawPose.left_wrist,
    defaultMeasurements.forearmLeft * limbScale,
    defaultDirections.forearmLeft,
  );
  const right_wrist = constrainChild(
    right_elbow,
    rawPose.right_wrist,
    defaultMeasurements.forearmRight * limbScale,
    defaultDirections.forearmRight,
  );
  const left_knee = constrainChild(
    left_hip,
    rawPose.left_knee,
    defaultMeasurements.thighLeft * limbScale,
    defaultDirections.thighLeft,
  );
  const right_knee = constrainChild(
    right_hip,
    rawPose.right_knee,
    defaultMeasurements.thighRight * limbScale,
    defaultDirections.thighRight,
  );
  const left_ankle = constrainChild(
    left_knee,
    rawPose.left_ankle,
    defaultMeasurements.shinLeft * limbScale,
    defaultDirections.shinLeft,
  );
  const right_ankle = constrainChild(
    right_knee,
    rawPose.right_ankle,
    defaultMeasurements.shinRight * limbScale,
    defaultDirections.shinRight,
  );

  return {
    left_shoulder,
    right_shoulder,
    left_elbow,
    right_elbow,
    left_wrist,
    right_wrist,
    left_hip,
    right_hip,
    left_knee,
    right_knee,
    left_ankle,
    right_ankle,
  };
}

function resolvePose(poseFrame?: WorkoutPoseFrame | null): PosePoints {
  if (!poseFrame) {
    return defaultPose;
  }

  const required = [
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ] as const;

  for (const key of required) {
    if (!poseFrame.keypoints[key]) {
      return defaultPose;
    }
  }

  return stabilizePose({
    left_shoulder: toScenePoint(poseFrame.keypoints.left_shoulder),
    right_shoulder: toScenePoint(poseFrame.keypoints.right_shoulder),
    left_elbow: toScenePoint(poseFrame.keypoints.left_elbow),
    right_elbow: toScenePoint(poseFrame.keypoints.right_elbow),
    left_wrist: toScenePoint(poseFrame.keypoints.left_wrist),
    right_wrist: toScenePoint(poseFrame.keypoints.right_wrist),
    left_hip: toScenePoint(poseFrame.keypoints.left_hip),
    right_hip: toScenePoint(poseFrame.keypoints.right_hip),
    left_knee: toScenePoint(poseFrame.keypoints.left_knee),
    right_knee: toScenePoint(poseFrame.keypoints.right_knee),
    left_ankle: toScenePoint(poseFrame.keypoints.left_ankle),
    right_ankle: toScenePoint(poseFrame.keypoints.right_ankle),
  });
}

function shellMaterial(tension: number, targeted: boolean): MaterialPreset {
  return {
    color: targeted ? '#dccfc6' : '#efe6dc',
    emissive: targeted ? '#8f6955' : '#665246',
    emissiveIntensity: targeted ? 0.08 + (tension * 0.1) : 0.05,
    opacity: targeted ? 0.28 : 0.62,
    roughness: 0.58,
    metalness: 0.04,
  };
}

function muscleMaterial(
  intensity: number,
  tension: number,
  targeted: boolean,
): MaterialPreset {
  const effective = targeted
    ? Math.min(1, (intensity * 0.52) + (intensity * tension * 1.4) + (intensity > 0.08 ? tension * 0.18 : 0))
    : intensity;
  const color = targeted ? targetedColor(effective) : heatColor(effective);

  return {
    color,
    emissive: color,
    emissiveIntensity: targeted
      ? 0.12 + (effective * 1.45) + (tension * 0.28)
      : 0.14 + (effective * 0.52),
    opacity: targeted ? 0.16 + (effective * 0.84) : 0.84,
    roughness: targeted ? 0.28 : 0.22,
    metalness: targeted ? 0.05 : 0.1,
  };
}

function SegmentPart({
  start,
  end,
  radius,
  material,
}: {
  start: ScenePoint;
  end: ScenePoint;
  radius: number;
  material: MaterialPreset;
}) {
  const length = Math.max(0.001, distance(start, end) - (radius * 2));

  return (
    <mesh position={midpoint(start, end)} rotation={segmentRotation(start, end)}>
      <capsuleGeometry args={[radius, length, 10, 18]} />
      <meshStandardMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        roughness={material.roughness}
        metalness={material.metalness}
        transparent
        opacity={material.opacity}
      />
    </mesh>
  );
}

function OrbPart({
  center,
  radius,
  material,
}: {
  center: ScenePoint;
  radius: number;
  material: MaterialPreset;
}) {
  return (
    <mesh position={center}>
      <sphereGeometry args={[radius, 28, 28]} />
      <meshStandardMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        roughness={material.roughness}
        metalness={material.metalness}
        transparent
        opacity={material.opacity}
      />
    </mesh>
  );
}

export function MuscleMannequin({
  muscleEngagement,
  className,
  renderMode = 'ambient',
  poseFrame,
  tension = 0,
}: {
  muscleEngagement: MuscleEngagement;
  className?: string;
  renderMode?: RenderMode;
  poseFrame?: WorkoutPoseFrame | null;
  tension?: number;
}) {
  const targeted = renderMode === 'targeted';
  const pose = resolvePose(poseFrame);

  const shoulderMid = midpoint(pose.left_shoulder, pose.right_shoulder);
  const hipMid = midpoint(pose.left_hip, pose.right_hip);
  const shoulderWidth = distance(pose.left_shoulder, pose.right_shoulder);
  const hipWidth = distance(pose.left_hip, pose.right_hip);
  const torsoHeight = distance(shoulderMid, hipMid);
  const armRadius = Math.max(0.12, shoulderWidth * 0.115);
  const forearmRadius = armRadius * 0.82;
  const thighRadius = Math.max(0.15, hipWidth * 0.235);
  const shinRadius = thighRadius * 0.72;
  const shell = shellMaterial(tension, targeted);

  const neckTop = shift(shoulderMid, 0, shoulderWidth * 0.38, 0.02);
  const headCenter = shift(shoulderMid, 0, shoulderWidth * 0.7, 0.02);
  const ribTop = shift(mixPoint(shoulderMid, hipMid, 0.17), 0, 0.04, 0.03);
  const ribBottom = shift(mixPoint(shoulderMid, hipMid, 0.44), 0, -0.02, 0.02);
  const abdomenTop = shift(mixPoint(shoulderMid, hipMid, 0.48), 0, 0, 0.02);
  const abdomenBottom = shift(mixPoint(shoulderMid, hipMid, 0.82), 0, -0.02, 0.02);
  const pelvisCenter = shift(hipMid, 0, -0.05, -0.01);

  const shellJoints: MuscleOrb[] = [
    {id: 'shell_head', muscles: [], center: headCenter, radius: shoulderWidth * 0.27},
    {id: 'shell_left_shoulder', muscles: [], center: pose.left_shoulder, radius: armRadius * 0.9},
    {id: 'shell_right_shoulder', muscles: [], center: pose.right_shoulder, radius: armRadius * 0.9},
    {id: 'shell_left_elbow', muscles: [], center: pose.left_elbow, radius: armRadius * 0.42},
    {id: 'shell_right_elbow', muscles: [], center: pose.right_elbow, radius: armRadius * 0.42},
    {id: 'shell_left_wrist', muscles: [], center: pose.left_wrist, radius: forearmRadius * 0.36},
    {id: 'shell_right_wrist', muscles: [], center: pose.right_wrist, radius: forearmRadius * 0.36},
    {id: 'shell_pelvis', muscles: [], center: pelvisCenter, radius: hipWidth * 0.26},
    {id: 'shell_left_hip', muscles: [], center: pose.left_hip, radius: thighRadius * 0.68},
    {id: 'shell_right_hip', muscles: [], center: pose.right_hip, radius: thighRadius * 0.68},
    {id: 'shell_left_knee', muscles: [], center: pose.left_knee, radius: thighRadius * 0.42},
    {id: 'shell_right_knee', muscles: [], center: pose.right_knee, radius: thighRadius * 0.42},
    {id: 'shell_left_ankle', muscles: [], center: pose.left_ankle, radius: shinRadius * 0.34},
    {id: 'shell_right_ankle', muscles: [], center: pose.right_ankle, radius: shinRadius * 0.34},
  ];

  const absUpperLeft = shift(mixPoint(ribTop, ribBottom, 0.35), -shoulderWidth * 0.07, 0, 0.18);
  const absUpperRight = shift(mixPoint(ribTop, ribBottom, 0.35), shoulderWidth * 0.07, 0, 0.18);
  const absMidLeft = shift(mixPoint(ribBottom, abdomenTop, 0.45), -shoulderWidth * 0.07, 0, 0.17);
  const absMidRight = shift(mixPoint(ribBottom, abdomenTop, 0.45), shoulderWidth * 0.07, 0, 0.17);
  const absLowerLeft = shift(mixPoint(abdomenTop, abdomenBottom, 0.52), -shoulderWidth * 0.07, 0, 0.14);
  const absLowerRight = shift(mixPoint(abdomenTop, abdomenBottom, 0.52), shoulderWidth * 0.07, 0, 0.14);

  const muscleSegments: MuscleSegment[] = [
    {
      id: 'chest_upper_left',
      muscles: ['chest_left', 'deltoid_left'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.15), -shoulderWidth * 0.24, 0.04, 0.18),
      end: shift(mixPoint(shoulderMid, hipMid, 0.28), -shoulderWidth * 0.11, -0.02, 0.2),
      radius: shoulderWidth * 0.078,
    },
    {
      id: 'chest_lower_left',
      muscles: ['chest_left'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.28), -shoulderWidth * 0.12, -0.01, 0.18),
      end: shift(mixPoint(shoulderMid, hipMid, 0.42), -shoulderWidth * 0.09, -0.03, 0.16),
      radius: shoulderWidth * 0.07,
    },
    {
      id: 'chest_upper_right',
      muscles: ['chest_right', 'deltoid_right'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.15), shoulderWidth * 0.24, 0.04, 0.18),
      end: shift(mixPoint(shoulderMid, hipMid, 0.28), shoulderWidth * 0.11, -0.02, 0.2),
      radius: shoulderWidth * 0.078,
    },
    {
      id: 'chest_lower_right',
      muscles: ['chest_right'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.28), shoulderWidth * 0.12, -0.01, 0.18),
      end: shift(mixPoint(shoulderMid, hipMid, 0.42), shoulderWidth * 0.09, -0.03, 0.16),
      radius: shoulderWidth * 0.07,
    },
    {
      id: 'serratus_left',
      muscles: ['oblique_left', 'lats_left', 'chest_left'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.31), -shoulderWidth * 0.22, 0.01, 0.08),
      end: shift(mixPoint(shoulderMid, hipMid, 0.53), -shoulderWidth * 0.18, -0.02, 0.06),
      radius: shoulderWidth * 0.05,
    },
    {
      id: 'serratus_right',
      muscles: ['oblique_right', 'lats_right', 'chest_right'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.31), shoulderWidth * 0.22, 0.01, 0.08),
      end: shift(mixPoint(shoulderMid, hipMid, 0.53), shoulderWidth * 0.18, -0.02, 0.06),
      radius: shoulderWidth * 0.05,
    },
    {
      id: 'oblique_left',
      muscles: ['oblique_left', 'abs_lower'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.4), -shoulderWidth * 0.19, 0.02, 0.04),
      end: shift(mixPoint(shoulderMid, hipMid, 0.76), -hipWidth * 0.25, -0.03, 0.02),
      radius: shoulderWidth * 0.054,
    },
    {
      id: 'oblique_right',
      muscles: ['oblique_right', 'abs_lower'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.4), shoulderWidth * 0.19, 0.02, 0.04),
      end: shift(mixPoint(shoulderMid, hipMid, 0.76), hipWidth * 0.25, -0.03, 0.02),
      radius: shoulderWidth * 0.054,
    },
    {
      id: 'lat_upper_left',
      muscles: ['lats_left', 'trapezius_left'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.18), -shoulderWidth * 0.29, 0.03, -0.05),
      end: shift(mixPoint(shoulderMid, hipMid, 0.46), -shoulderWidth * 0.27, -0.02, -0.1),
      radius: shoulderWidth * 0.06,
    },
    {
      id: 'lat_lower_left',
      muscles: ['lats_left', 'oblique_left'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.46), -hipWidth * 0.29, 0.02, -0.08),
      end: shift(mixPoint(shoulderMid, hipMid, 0.78), -hipWidth * 0.23, -0.03, -0.12),
      radius: shoulderWidth * 0.058,
    },
    {
      id: 'lat_upper_right',
      muscles: ['lats_right', 'trapezius_right'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.18), shoulderWidth * 0.29, 0.03, -0.05),
      end: shift(mixPoint(shoulderMid, hipMid, 0.46), shoulderWidth * 0.27, -0.02, -0.1),
      radius: shoulderWidth * 0.06,
    },
    {
      id: 'lat_lower_right',
      muscles: ['lats_right', 'oblique_right'],
      start: shift(mixPoint(shoulderMid, hipMid, 0.46), hipWidth * 0.29, 0.02, -0.08),
      end: shift(mixPoint(shoulderMid, hipMid, 0.78), hipWidth * 0.23, -0.03, -0.12),
      radius: shoulderWidth * 0.058,
    },
    {
      id: 'trapezius_left',
      muscles: ['trapezius_left', 'deltoid_left'],
      start: shift(neckTop, -shoulderWidth * 0.08, -0.04, -0.02),
      end: shift(pose.left_shoulder, -0.03, 0.02, -0.03),
      radius: shoulderWidth * 0.046,
    },
    {
      id: 'trapezius_right',
      muscles: ['trapezius_right', 'deltoid_right'],
      start: shift(neckTop, shoulderWidth * 0.08, -0.04, -0.02),
      end: shift(pose.right_shoulder, 0.03, 0.02, -0.03),
      radius: shoulderWidth * 0.046,
    },
    {
      id: 'bicep_left',
      muscles: ['bicep_left'],
      start: shift(pose.left_shoulder, 0.01, -0.06, 0.08),
      end: shift(pose.left_elbow, 0.01, 0.04, 0.1),
      radius: armRadius * 0.54,
    },
    {
      id: 'tricep_left',
      muscles: ['tricep_left'],
      start: shift(pose.left_shoulder, 0.01, -0.04, -0.06),
      end: shift(pose.left_elbow, 0.01, 0.03, -0.08),
      radius: armRadius * 0.46,
    },
    {
      id: 'brachialis_left',
      muscles: ['bicep_left', 'forearm_left'],
      start: shift(mixPoint(pose.left_shoulder, pose.left_elbow, 0.24), -0.04, 0, 0.02),
      end: shift(mixPoint(pose.left_shoulder, pose.left_elbow, 0.82), -0.05, 0, 0.03),
      radius: armRadius * 0.26,
    },
    {
      id: 'bicep_right',
      muscles: ['bicep_right'],
      start: shift(pose.right_shoulder, -0.01, -0.06, 0.08),
      end: shift(pose.right_elbow, -0.01, 0.04, 0.1),
      radius: armRadius * 0.54,
    },
    {
      id: 'tricep_right',
      muscles: ['tricep_right'],
      start: shift(pose.right_shoulder, -0.01, -0.04, -0.06),
      end: shift(pose.right_elbow, -0.01, 0.03, -0.08),
      radius: armRadius * 0.46,
    },
    {
      id: 'brachialis_right',
      muscles: ['bicep_right', 'forearm_right'],
      start: shift(mixPoint(pose.right_shoulder, pose.right_elbow, 0.24), 0.04, 0, 0.02),
      end: shift(mixPoint(pose.right_shoulder, pose.right_elbow, 0.82), 0.05, 0, 0.03),
      radius: armRadius * 0.26,
    },
    {
      id: 'forearm_flexor_left',
      muscles: ['forearm_left'],
      start: shift(pose.left_elbow, 0.01, -0.02, 0.07),
      end: shift(pose.left_wrist, 0.01, 0.03, 0.09),
      radius: forearmRadius * 0.44,
    },
    {
      id: 'forearm_extensor_left',
      muscles: ['forearm_left', 'tricep_left'],
      start: shift(pose.left_elbow, 0.01, -0.02, -0.04),
      end: shift(pose.left_wrist, 0.01, 0.03, -0.05),
      radius: forearmRadius * 0.34,
    },
    {
      id: 'forearm_flexor_right',
      muscles: ['forearm_right'],
      start: shift(pose.right_elbow, -0.01, -0.02, 0.07),
      end: shift(pose.right_wrist, -0.01, 0.03, 0.09),
      radius: forearmRadius * 0.44,
    },
    {
      id: 'forearm_extensor_right',
      muscles: ['forearm_right', 'tricep_right'],
      start: shift(pose.right_elbow, -0.01, -0.02, -0.04),
      end: shift(pose.right_wrist, -0.01, 0.03, -0.05),
      radius: forearmRadius * 0.34,
    },
    {
      id: 'glute_left',
      muscles: ['glute_left', 'hamstring_left'],
      start: shift(pose.left_hip, 0.04, -0.02, -0.08),
      end: shift(mixPoint(pose.left_hip, pose.left_knee, 0.24), 0.05, 0.02, -0.1),
      radius: thighRadius * 0.56,
    },
    {
      id: 'glute_right',
      muscles: ['glute_right', 'hamstring_right'],
      start: shift(pose.right_hip, -0.04, -0.02, -0.08),
      end: shift(mixPoint(pose.right_hip, pose.right_knee, 0.24), -0.05, 0.02, -0.1),
      radius: thighRadius * 0.56,
    },
    {
      id: 'adductor_left',
      muscles: ['quad_left', 'hamstring_left', 'glute_left'],
      start: shift(pose.left_hip, shoulderWidth * 0.04, -0.08, 0.04),
      end: shift(pose.left_knee, shoulderWidth * 0.06, 0.08, 0.02),
      radius: thighRadius * 0.28,
    },
    {
      id: 'adductor_right',
      muscles: ['quad_right', 'hamstring_right', 'glute_right'],
      start: shift(pose.right_hip, -shoulderWidth * 0.04, -0.08, 0.04),
      end: shift(pose.right_knee, -shoulderWidth * 0.06, 0.08, 0.02),
      radius: thighRadius * 0.28,
    },
    {
      id: 'quad_outer_left',
      muscles: ['quad_left'],
      start: shift(pose.left_hip, -0.04, -0.08, 0.12),
      end: shift(pose.left_knee, -0.05, 0.08, 0.1),
      radius: thighRadius * 0.38,
    },
    {
      id: 'quad_inner_left',
      muscles: ['quad_left', 'glute_left'],
      start: shift(pose.left_hip, 0.03, -0.08, 0.11),
      end: shift(pose.left_knee, 0.03, 0.08, 0.09),
      radius: thighRadius * 0.34,
    },
    {
      id: 'quad_outer_right',
      muscles: ['quad_right'],
      start: shift(pose.right_hip, 0.04, -0.08, 0.12),
      end: shift(pose.right_knee, 0.05, 0.08, 0.1),
      radius: thighRadius * 0.38,
    },
    {
      id: 'quad_inner_right',
      muscles: ['quad_right', 'glute_right'],
      start: shift(pose.right_hip, -0.03, -0.08, 0.11),
      end: shift(pose.right_knee, -0.03, 0.08, 0.09),
      radius: thighRadius * 0.34,
    },
    {
      id: 'hamstring_left',
      muscles: ['hamstring_left', 'glute_left'],
      start: shift(pose.left_hip, 0, -0.08, -0.08),
      end: shift(pose.left_knee, 0, 0.03, -0.1),
      radius: thighRadius * 0.36,
    },
    {
      id: 'hamstring_right',
      muscles: ['hamstring_right', 'glute_right'],
      start: shift(pose.right_hip, 0, -0.08, -0.08),
      end: shift(pose.right_knee, 0, 0.03, -0.1),
      radius: thighRadius * 0.36,
    },
    {
      id: 'calf_outer_left',
      muscles: ['calf_left'],
      start: shift(pose.left_knee, -0.03, -0.08, -0.03),
      end: shift(pose.left_ankle, -0.02, 0.1, -0.05),
      radius: shinRadius * 0.34,
    },
    {
      id: 'calf_inner_left',
      muscles: ['calf_left'],
      start: shift(pose.left_knee, 0.03, -0.08, -0.02),
      end: shift(pose.left_ankle, 0.02, 0.1, -0.04),
      radius: shinRadius * 0.28,
    },
    {
      id: 'tibialis_left',
      muscles: ['calf_left', 'quad_left'],
      start: shift(pose.left_knee, 0, -0.1, 0.08),
      end: shift(pose.left_ankle, 0, 0.12, 0.12),
      radius: shinRadius * 0.18,
    },
    {
      id: 'calf_outer_right',
      muscles: ['calf_right'],
      start: shift(pose.right_knee, 0.03, -0.08, -0.03),
      end: shift(pose.right_ankle, 0.02, 0.1, -0.05),
      radius: shinRadius * 0.34,
    },
    {
      id: 'calf_inner_right',
      muscles: ['calf_right'],
      start: shift(pose.right_knee, -0.03, -0.08, -0.02),
      end: shift(pose.right_ankle, -0.02, 0.1, -0.04),
      radius: shinRadius * 0.28,
    },
    {
      id: 'tibialis_right',
      muscles: ['calf_right', 'quad_right'],
      start: shift(pose.right_knee, 0, -0.1, 0.08),
      end: shift(pose.right_ankle, 0, 0.12, 0.12),
      radius: shinRadius * 0.18,
    },
  ];

  const muscleOrbs: MuscleOrb[] = [
    {id: 'neck', muscles: ['neck', 'trapezius_left', 'trapezius_right'], center: shift(shoulderMid, 0, shoulderWidth * 0.46, 0.04), radius: shoulderWidth * 0.08},
    {id: 'deltoid_left', muscles: ['deltoid_left', 'trapezius_left'], center: shift(pose.left_shoulder, 0.01, 0, 0.05), radius: armRadius * 0.72},
    {id: 'deltoid_right', muscles: ['deltoid_right', 'trapezius_right'], center: shift(pose.right_shoulder, -0.01, 0, 0.05), radius: armRadius * 0.72},
    {id: 'abs_upper_left', muscles: ['abs_upper', 'oblique_left'], center: absUpperLeft, radius: shoulderWidth * 0.052},
    {id: 'abs_upper_right', muscles: ['abs_upper', 'oblique_right'], center: absUpperRight, radius: shoulderWidth * 0.052},
    {id: 'abs_mid_left', muscles: ['abs_upper', 'abs_lower', 'oblique_left'], center: absMidLeft, radius: shoulderWidth * 0.05},
    {id: 'abs_mid_right', muscles: ['abs_upper', 'abs_lower', 'oblique_right'], center: absMidRight, radius: shoulderWidth * 0.05},
    {id: 'abs_lower_left', muscles: ['abs_lower', 'oblique_left'], center: absLowerLeft, radius: shoulderWidth * 0.046},
    {id: 'abs_lower_right', muscles: ['abs_lower', 'oblique_right'], center: absLowerRight, radius: shoulderWidth * 0.046},
    {id: 'glute_cap_left', muscles: ['glute_left'], center: shift(pose.left_hip, 0.04, -0.02, -0.08), radius: thighRadius * 0.34},
    {id: 'glute_cap_right', muscles: ['glute_right'], center: shift(pose.right_hip, -0.04, -0.02, -0.08), radius: thighRadius * 0.34},
  ];

  return (
    <div className={className ?? 'h-[480px] w-full'}>
      <Canvas camera={{position: [0, 0.52, 6.1], fov: 29}}>
        <ambientLight intensity={targeted ? 1.0 : 1.22} />
        <directionalLight
          position={[5.4, 7.2, 6.2]}
          intensity={targeted ? 1.88 : 2.08}
          color={targeted ? '#ffd4c7' : '#ffe4bb'}
        />
        <directionalLight
          position={[-4.2, -3.2, 3.2]}
          intensity={targeted ? 0.78 : 0.96}
          color="#efe6dc"
        />

        <group rotation={[0.06, 0.22, 0]}>
          <SegmentPart start={midpoint(pose.left_shoulder, pose.right_shoulder)} end={neckTop} radius={shoulderWidth * 0.08} material={shell} />
          <SegmentPart start={shift(pose.left_shoulder, 0.08, -0.02, 0.02)} end={shift(pose.right_shoulder, -0.08, -0.02, 0.02)} radius={shoulderWidth * 0.06} material={shell} />
          <SegmentPart start={ribTop} end={ribBottom} radius={shoulderWidth * 0.31} material={shell} />
          <SegmentPart start={abdomenTop} end={abdomenBottom} radius={hipWidth * 0.28} material={shell} />
          <SegmentPart start={pose.left_shoulder} end={pose.left_elbow} radius={armRadius} material={shell} />
          <SegmentPart start={pose.right_shoulder} end={pose.right_elbow} radius={armRadius} material={shell} />
          <SegmentPart start={pose.left_elbow} end={pose.left_wrist} radius={forearmRadius} material={shell} />
          <SegmentPart start={pose.right_elbow} end={pose.right_wrist} radius={forearmRadius} material={shell} />
          <SegmentPart start={pose.left_hip} end={pose.left_knee} radius={thighRadius} material={shell} />
          <SegmentPart start={pose.right_hip} end={pose.right_knee} radius={thighRadius} material={shell} />
          <SegmentPart start={pose.left_knee} end={pose.left_ankle} radius={shinRadius} material={shell} />
          <SegmentPart start={pose.right_knee} end={pose.right_ankle} radius={shinRadius} material={shell} />

          {shellJoints.map((joint) => (
            <OrbPart
              key={joint.id}
              center={joint.center}
              radius={joint.radius}
              material={shell}
            />
          ))}

          {muscleSegments.map((segment) => {
            const material = muscleMaterial(
              zoneIntensity(muscleEngagement, segment.muscles),
              tension,
              targeted,
            );
            return (
              <SegmentPart
                key={segment.id}
                start={segment.start}
                end={segment.end}
                radius={segment.radius}
                material={material}
              />
            );
          })}

          {muscleOrbs.map((orb) => {
            const material = muscleMaterial(
              zoneIntensity(muscleEngagement, orb.muscles),
              tension,
              targeted,
            );
            return (
              <OrbPart
                key={orb.id}
                center={orb.center}
                radius={orb.radius}
                material={material}
              />
            );
          })}

          <mesh position={[0, -3.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.82, 2.58, 64]} />
            <meshStandardMaterial
              color={targeted ? '#ff5d49' : '#ff9a3d'}
              emissive={targeted ? '#ff5d49' : '#ff9a3d'}
              emissiveIntensity={targeted ? 0.36 + (tension * 0.46) : 0.22}
              transparent
              opacity={targeted ? 0.42 + (tension * 0.18) : 0.28}
            />
          </mesh>
        </group>

        <OrbitControls enablePan={false} minDistance={4.4} maxDistance={8.2} />
      </Canvas>
    </div>
  );
}
