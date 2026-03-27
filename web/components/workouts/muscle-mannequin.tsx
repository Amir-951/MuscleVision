'use client';

import {OrbitControls} from '@react-three/drei';
import {Canvas} from '@react-three/fiber';
import {Euler, Matrix4, Quaternion, Vector3} from 'three';

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

type PoseRig = PosePoints & {
  shoulderMid: ScenePoint;
  hipMid: ScenePoint;
  shoulderAxis: ScenePoint;
  hipAxis: ScenePoint;
  torsoAxis: ScenePoint;
  frontAxis: ScenePoint;
};

type MaterialPreset = {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
};

type LocalEllipsoid = {
  id: string;
  muscles: string[];
  position: ScenePoint;
  scale: [number, number, number];
  rotation?: [number, number, number];
};

type LocalOrb = {
  id: string;
  muscles: string[];
  position: ScenePoint;
  radius: number;
};

type RenderMode = 'ambient' | 'targeted';

const defaultPose: PosePoints = {
  left_shoulder: [-0.72, 1.2, 0.02],
  right_shoulder: [0.72, 1.2, 0.02],
  left_elbow: [-1.04, 0.42, 0.06],
  right_elbow: [1.04, 0.42, 0.06],
  left_wrist: [-1.08, -0.42, 0.08],
  right_wrist: [1.08, -0.42, 0.08],
  left_hip: [-0.4, -0.08, 0.01],
  right_hip: [0.4, -0.08, 0.01],
  left_knee: [-0.31, -1.56, 0.02],
  right_knee: [0.31, -1.56, 0.02],
  left_ankle: [-0.24, -3.0, 0.04],
  right_ankle: [0.24, -3.0, 0.04],
};

function blendChannel(from: number, to: number, amount: number) {
  return Math.round(from + ((to - from) * amount));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function shift(point: ScenePoint, x = 0, y = 0, z = 0): ScenePoint {
  return [point[0] + x, point[1] + y, point[2] + z];
}

function magnitude(point: ScenePoint) {
  return Math.sqrt((point[0] ** 2) + (point[1] ** 2) + (point[2] ** 2));
}

function distance(a: ScenePoint, b: ScenePoint) {
  return magnitude(subtractPoint(b, a));
}

function dotPoint(a: ScenePoint, b: ScenePoint) {
  return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
}

function crossPoint(a: ScenePoint, b: ScenePoint): ScenePoint {
  return [
    (a[1] * b[2]) - (a[2] * b[1]),
    (a[2] * b[0]) - (a[0] * b[2]),
    (a[0] * b[1]) - (a[1] * b[0]),
  ];
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

function blendPoints(a: ScenePoint, b: ScenePoint, aWeight: number, bWeight: number): ScenePoint {
  return [
    (a[0] * aWeight) + (b[0] * bWeight),
    (a[1] * aWeight) + (b[1] * bWeight),
    (a[2] * aWeight) + (b[2] * bWeight),
  ];
}

function projectToPlane(axis: ScenePoint, planeNormal: ScenePoint): ScenePoint {
  const normal = normalizePoint(planeNormal, [0, 1, 0]);
  return subtractPoint(axis, scalePoint(normal, dotPoint(axis, normal)));
}

function stableDirection(
  raw: ScenePoint,
  fallback: ScenePoint,
  rawWeight: number,
  depthClamp = 0.48,
): ScenePoint {
  const mixed = blendPoints(raw, fallback, rawWeight, 1 - rawWeight);
  const clamped: ScenePoint = [mixed[0], mixed[1], clamp(mixed[2], -depthClamp, depthClamp)];
  return normalizePoint(clamped, fallback);
}

const defaultShoulderMid = midpoint(defaultPose.left_shoulder, defaultPose.right_shoulder);
const defaultHipMid = midpoint(defaultPose.left_hip, defaultPose.right_hip);
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
const defaultFrontAxis = normalizePoint(
  crossPoint(defaultDirections.shoulders, defaultDirections.torso),
  [0, 0, 1],
);

function toScenePoint(point: PoseKeypoint): ScenePoint {
  return [
    (0.5 - point.x) * 4.85,
    ((0.53 - point.y) * 5.15) - 0.74,
    clamp(-point.z * 0.66, -0.34, 0.34),
  ];
}

function constrainChild(
  parent: ScenePoint,
  rawChild: ScenePoint,
  targetLength: number,
  fallbackDirection: ScenePoint,
  rawWeight: number,
  depthClamp = 0.48,
) {
  const direction = stableDirection(
    subtractPoint(rawChild, parent),
    fallbackDirection,
    rawWeight,
    depthClamp,
  );
  return addPoint(parent, scalePoint(direction, targetLength));
}

function resolvePose(poseFrame?: WorkoutPoseFrame | null): PoseRig {
  if (!poseFrame) {
    const shoulderMid = defaultShoulderMid;
    const hipMid = defaultHipMid;
    return {
      ...defaultPose,
      shoulderMid,
      hipMid,
      shoulderAxis: normalizePoint(defaultDirections.shoulders, [1, 0, 0]),
      hipAxis: normalizePoint(defaultDirections.hips, [1, 0, 0]),
      torsoAxis: normalizePoint(defaultDirections.torso, [0, -1, 0]),
      frontAxis: defaultFrontAxis,
    };
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
      return resolvePose(null);
    }
  }

  const rawPose: PosePoints = {
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
  };

  const rawShoulderMid = midpoint(rawPose.left_shoulder, rawPose.right_shoulder);
  const rawHipMid = midpoint(rawPose.left_hip, rawPose.right_hip);

  const shoulderScale = clamp(
    distance(rawPose.left_shoulder, rawPose.right_shoulder) / defaultMeasurements.shoulderWidth,
    0.9,
    1.14,
  );
  const hipScale = clamp(
    distance(rawPose.left_hip, rawPose.right_hip) / defaultMeasurements.hipWidth,
    0.92,
    1.12,
  );
  const torsoScale = clamp(
    distance(rawShoulderMid, rawHipMid) / defaultMeasurements.torsoHeight,
    0.92,
    1.12,
  );
  const limbScale = clamp((shoulderScale + hipScale + torsoScale) / 3, 0.94, 1.12);

  const shoulderAxis = stableDirection(
    subtractPoint(rawPose.right_shoulder, rawPose.left_shoulder),
    defaultDirections.shoulders,
    0.64,
    0.18,
  );
  const hipAxis = stableDirection(
    subtractPoint(rawPose.right_hip, rawPose.left_hip),
    defaultDirections.hips,
    0.7,
    0.14,
  );
  const torsoAxis = stableDirection(
    subtractPoint(rawHipMid, rawShoulderMid),
    defaultDirections.torso,
    0.6,
    0.16,
  );
  const frontAxis = stableDirection(
    crossPoint(shoulderAxis, torsoAxis),
    defaultFrontAxis,
    0.48,
    0.52,
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
    0.72,
    0.34,
  );
  const right_elbow = constrainChild(
    right_shoulder,
    rawPose.right_elbow,
    defaultMeasurements.upperArmRight * limbScale,
    defaultDirections.upperArmRight,
    0.72,
    0.34,
  );
  const left_wrist = constrainChild(
    left_elbow,
    rawPose.left_wrist,
    defaultMeasurements.forearmLeft * limbScale,
    defaultDirections.forearmLeft,
    0.74,
    0.36,
  );
  const right_wrist = constrainChild(
    right_elbow,
    rawPose.right_wrist,
    defaultMeasurements.forearmRight * limbScale,
    defaultDirections.forearmRight,
    0.74,
    0.36,
  );
  const left_knee = constrainChild(
    left_hip,
    rawPose.left_knee,
    defaultMeasurements.thighLeft * limbScale,
    defaultDirections.thighLeft,
    0.76,
    0.18,
  );
  const right_knee = constrainChild(
    right_hip,
    rawPose.right_knee,
    defaultMeasurements.thighRight * limbScale,
    defaultDirections.thighRight,
    0.76,
    0.18,
  );
  const left_ankle = constrainChild(
    left_knee,
    rawPose.left_ankle,
    defaultMeasurements.shinLeft * limbScale,
    defaultDirections.shinLeft,
    0.78,
    0.16,
  );
  const right_ankle = constrainChild(
    right_knee,
    rawPose.right_ankle,
    defaultMeasurements.shinRight * limbScale,
    defaultDirections.shinRight,
    0.78,
    0.16,
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
    shoulderMid,
    hipMid,
    shoulderAxis,
    hipAxis,
    torsoAxis,
    frontAxis,
  };
}

function zoneIntensity(muscleEngagement: MuscleEngagement, muscles: string[]) {
  if (!muscles.length) {
    return 0;
  }

  const total = muscles.reduce((sum, muscle) => sum + (muscleEngagement[muscle] ?? 0), 0);
  return clamp(total / muscles.length, 0, 1);
}

function targetedColor(intensity: number) {
  const dormant = [55, 38, 42];
  const live = [164, 34, 40];
  const peak = [255, 96, 65];

  if (intensity < 0.05) {
    return `rgb(${dormant[0]}, ${dormant[1]}, ${dormant[2]})`;
  }

  const local = clamp((intensity - 0.05) / 0.95, 0, 1);
  const from = local < 0.62 ? dormant : live;
  const to = local < 0.62 ? live : peak;
  const eased = local < 0.62 ? local / 0.62 : (local - 0.62) / 0.38;
  return `rgb(${blendChannel(from[0], to[0], eased)}, ${blendChannel(from[1], to[1], eased)}, ${blendChannel(from[2], to[2], eased)})`;
}

function shellMaterial(tension: number, targeted: boolean): MaterialPreset {
  return {
    color: targeted ? '#e4d8cf' : '#efe6dc',
    emissive: targeted ? '#7d5c4d' : '#5c493f',
    emissiveIntensity: targeted ? 0.05 + (tension * 0.04) : 0.02,
    opacity: targeted ? 0.72 : 0.84,
    roughness: 0.6,
    metalness: 0.01,
    clearcoat: 0.12,
    clearcoatRoughness: 0.76,
  };
}

function muscleMaterial(
  intensity: number,
  tension: number,
  targeted: boolean,
): MaterialPreset {
  const effective = targeted
    ? clamp((intensity * 0.46) + (intensity * tension * 1.26) + (tension * 0.1), 0, 1)
    : intensity;
  const color = targeted ? targetedColor(effective) : '#ff824e';

  return {
    color,
    emissive: color,
    emissiveIntensity: targeted ? 0.08 + (effective * 0.95) + (tension * 0.12) : 0.2,
    opacity: targeted ? 0.12 + (effective * 0.58) : 0.82,
    roughness: targeted ? 0.38 : 0.25,
    metalness: 0.02,
    clearcoat: 0.04,
    clearcoatRoughness: 0.84,
  };
}

function PhysicalCapsule({
  position,
  radius,
  length,
  material,
}: {
  position: ScenePoint;
  radius: number;
  length: number;
  material: MaterialPreset;
}) {
  return (
    <mesh position={position}>
      <capsuleGeometry args={[radius, Math.max(0.001, length - (radius * 2)), 10, 18]} />
      <meshPhysicalMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        roughness={material.roughness}
        metalness={material.metalness}
        clearcoat={material.clearcoat}
        clearcoatRoughness={material.clearcoatRoughness}
        transparent
        opacity={material.opacity}
      />
    </mesh>
  );
}

function PhysicalSphere({
  position,
  radius,
  material,
}: {
  position: ScenePoint;
  radius: number;
  material: MaterialPreset;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 28, 28]} />
      <meshPhysicalMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        roughness={material.roughness}
        metalness={material.metalness}
        clearcoat={material.clearcoat}
        clearcoatRoughness={material.clearcoatRoughness}
        transparent
        opacity={material.opacity}
      />
    </mesh>
  );
}

function PhysicalEllipsoid({
  position,
  scale,
  rotation = [0, 0, 0],
  material,
}: {
  position: ScenePoint;
  scale: [number, number, number];
  rotation?: [number, number, number];
  material: MaterialPreset;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhysicalMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        roughness={material.roughness}
        metalness={material.metalness}
        clearcoat={material.clearcoat}
        clearcoatRoughness={material.clearcoatRoughness}
        transparent
        opacity={material.opacity}
      />
    </mesh>
  );
}

function orientationFromSegment(
  start: ScenePoint,
  end: ScenePoint,
  sideHint: ScenePoint,
  frontHint: ScenePoint,
): [number, number, number] {
  const yAxis = normalizePoint(subtractPoint(end, start), [0, 1, 0]);
  let xAxis = projectToPlane(sideHint, yAxis);
  if (magnitude(xAxis) < 0.0001) {
    xAxis = projectToPlane(crossPoint(frontHint, yAxis), yAxis);
  }
  xAxis = normalizePoint(xAxis, [1, 0, 0]);

  let zAxis = normalizePoint(crossPoint(xAxis, yAxis), frontHint);
  if (dotPoint(zAxis, frontHint) < 0) {
    zAxis = scalePoint(zAxis, -1);
  }
  xAxis = normalizePoint(crossPoint(yAxis, zAxis), xAxis);

  const basis = new Matrix4();
  basis.makeBasis(
    new Vector3(xAxis[0], xAxis[1], xAxis[2]),
    new Vector3(yAxis[0], yAxis[1], yAxis[2]),
    new Vector3(zAxis[0], zAxis[1], zAxis[2]),
  );
  const quaternion = new Quaternion().setFromRotationMatrix(basis);
  const euler = new Euler().setFromQuaternion(quaternion);
  return [euler.x, euler.y, euler.z];
}

function SegmentCluster({
  start,
  end,
  shellRadius,
  shell,
  sideHint,
  frontHint,
  ellipsoids,
  orbs = [],
}: {
  start: ScenePoint;
  end: ScenePoint;
  shellRadius: number;
  shell: MaterialPreset;
  sideHint: ScenePoint;
  frontHint: ScenePoint;
  ellipsoids: Array<LocalEllipsoid & {material: MaterialPreset}>;
  orbs?: Array<LocalOrb & {material: MaterialPreset}>;
}) {
  const length = distance(start, end);
  const rotation = orientationFromSegment(start, end, sideHint, frontHint);

  return (
    <group position={start} rotation={rotation}>
      <PhysicalCapsule
        position={[0, length / 2, 0]}
        radius={shellRadius}
        length={length}
        material={shell}
      />
      <PhysicalSphere position={[0, 0, 0]} radius={shellRadius * 0.94} material={shell} />
      <PhysicalSphere position={[0, length, 0]} radius={shellRadius * 0.9} material={shell} />

      {ellipsoids.map((shape) => (
        <PhysicalEllipsoid
          key={shape.id}
          position={shape.position}
          scale={shape.scale}
          rotation={shape.rotation}
          material={shape.material}
        />
      ))}

      {orbs.map((shape) => (
        <PhysicalSphere
          key={shape.id}
          position={shape.position}
          radius={shape.radius}
          material={shape.material}
        />
      ))}
    </group>
  );
}

function TorsoCluster({
  pose,
  shell,
  muscleEngagement,
  tension,
  targeted,
}: {
  pose: PoseRig;
  shell: MaterialPreset;
  muscleEngagement: MuscleEngagement;
  tension: number;
  targeted: boolean;
}) {
  const torsoHeight = distance(pose.shoulderMid, pose.hipMid);
  const shoulderWidth = distance(pose.left_shoulder, pose.right_shoulder);
  const hipWidth = distance(pose.left_hip, pose.right_hip);
  const rotation = orientationFromSegment(pose.shoulderMid, pose.hipMid, pose.shoulderAxis, pose.frontAxis);

  const torsoMuscles: LocalEllipsoid[] = [
    {id: 'chest_left_upper', muscles: ['chest_left', 'deltoid_left'], position: [-shoulderWidth * 0.18, torsoHeight * 0.18, shoulderWidth * 0.17], scale: [shoulderWidth * 0.11, torsoHeight * 0.11, shoulderWidth * 0.09], rotation: [0.08, 0, -0.24]},
    {id: 'chest_left_lower', muscles: ['chest_left'], position: [-shoulderWidth * 0.15, torsoHeight * 0.29, shoulderWidth * 0.16], scale: [shoulderWidth * 0.1, torsoHeight * 0.1, shoulderWidth * 0.08], rotation: [0.14, 0, -0.1]},
    {id: 'chest_right_upper', muscles: ['chest_right', 'deltoid_right'], position: [shoulderWidth * 0.18, torsoHeight * 0.18, shoulderWidth * 0.17], scale: [shoulderWidth * 0.11, torsoHeight * 0.11, shoulderWidth * 0.09], rotation: [0.08, 0, 0.24]},
    {id: 'chest_right_lower', muscles: ['chest_right'], position: [shoulderWidth * 0.15, torsoHeight * 0.29, shoulderWidth * 0.16], scale: [shoulderWidth * 0.1, torsoHeight * 0.1, shoulderWidth * 0.08], rotation: [0.14, 0, 0.1]},
    {id: 'abs_left_upper', muscles: ['abs_upper', 'oblique_left'], position: [-shoulderWidth * 0.06, torsoHeight * 0.42, shoulderWidth * 0.13], scale: [shoulderWidth * 0.045, torsoHeight * 0.065, shoulderWidth * 0.036]},
    {id: 'abs_right_upper', muscles: ['abs_upper', 'oblique_right'], position: [shoulderWidth * 0.06, torsoHeight * 0.42, shoulderWidth * 0.13], scale: [shoulderWidth * 0.045, torsoHeight * 0.065, shoulderWidth * 0.036]},
    {id: 'abs_left_mid', muscles: ['abs_upper', 'abs_lower', 'oblique_left'], position: [-shoulderWidth * 0.06, torsoHeight * 0.56, shoulderWidth * 0.12], scale: [shoulderWidth * 0.042, torsoHeight * 0.06, shoulderWidth * 0.034]},
    {id: 'abs_right_mid', muscles: ['abs_upper', 'abs_lower', 'oblique_right'], position: [shoulderWidth * 0.06, torsoHeight * 0.56, shoulderWidth * 0.12], scale: [shoulderWidth * 0.042, torsoHeight * 0.06, shoulderWidth * 0.034]},
    {id: 'abs_left_lower', muscles: ['abs_lower', 'oblique_left'], position: [-shoulderWidth * 0.055, torsoHeight * 0.7, shoulderWidth * 0.1], scale: [shoulderWidth * 0.04, torsoHeight * 0.055, shoulderWidth * 0.03]},
    {id: 'abs_right_lower', muscles: ['abs_lower', 'oblique_right'], position: [shoulderWidth * 0.055, torsoHeight * 0.7, shoulderWidth * 0.1], scale: [shoulderWidth * 0.04, torsoHeight * 0.055, shoulderWidth * 0.03]},
    {id: 'oblique_left', muscles: ['oblique_left', 'abs_lower'], position: [-shoulderWidth * 0.19, torsoHeight * 0.58, shoulderWidth * 0.05], scale: [shoulderWidth * 0.07, torsoHeight * 0.14, shoulderWidth * 0.045], rotation: [0.06, 0.08, -0.2]},
    {id: 'oblique_right', muscles: ['oblique_right', 'abs_lower'], position: [shoulderWidth * 0.19, torsoHeight * 0.58, shoulderWidth * 0.05], scale: [shoulderWidth * 0.07, torsoHeight * 0.14, shoulderWidth * 0.045], rotation: [0.06, -0.08, 0.2]},
    {id: 'serratus_left', muscles: ['oblique_left', 'lats_left', 'chest_left'], position: [-shoulderWidth * 0.22, torsoHeight * 0.38, shoulderWidth * 0.08], scale: [shoulderWidth * 0.05, torsoHeight * 0.11, shoulderWidth * 0.034], rotation: [0.08, 0.14, -0.24]},
    {id: 'serratus_right', muscles: ['oblique_right', 'lats_right', 'chest_right'], position: [shoulderWidth * 0.22, torsoHeight * 0.38, shoulderWidth * 0.08], scale: [shoulderWidth * 0.05, torsoHeight * 0.11, shoulderWidth * 0.034], rotation: [0.08, -0.14, 0.24]},
    {id: 'lat_left', muscles: ['lats_left', 'trapezius_left'], position: [-shoulderWidth * 0.27, torsoHeight * 0.42, -shoulderWidth * 0.03], scale: [shoulderWidth * 0.09, torsoHeight * 0.21, shoulderWidth * 0.05], rotation: [0.02, 0.12, -0.16]},
    {id: 'lat_right', muscles: ['lats_right', 'trapezius_right'], position: [shoulderWidth * 0.27, torsoHeight * 0.42, -shoulderWidth * 0.03], scale: [shoulderWidth * 0.09, torsoHeight * 0.21, shoulderWidth * 0.05], rotation: [0.02, -0.12, 0.16]},
    {id: 'trap_left', muscles: ['trapezius_left', 'neck'], position: [-shoulderWidth * 0.11, torsoHeight * 0.04, -shoulderWidth * 0.05], scale: [shoulderWidth * 0.08, torsoHeight * 0.11, shoulderWidth * 0.04], rotation: [0.06, 0.08, -0.18]},
    {id: 'trap_right', muscles: ['trapezius_right', 'neck'], position: [shoulderWidth * 0.11, torsoHeight * 0.04, -shoulderWidth * 0.05], scale: [shoulderWidth * 0.08, torsoHeight * 0.11, shoulderWidth * 0.04], rotation: [0.06, -0.08, 0.18]},
    {id: 'glute_left', muscles: ['glute_left', 'hamstring_left'], position: [-hipWidth * 0.16, torsoHeight * 0.95, -hipWidth * 0.08], scale: [hipWidth * 0.11, hipWidth * 0.09, hipWidth * 0.08], rotation: [0.14, 0.02, -0.18]},
    {id: 'glute_right', muscles: ['glute_right', 'hamstring_right'], position: [hipWidth * 0.16, torsoHeight * 0.95, -hipWidth * 0.08], scale: [hipWidth * 0.11, hipWidth * 0.09, hipWidth * 0.08], rotation: [0.14, -0.02, 0.18]},
  ];

  const torsoOrbs: LocalOrb[] = [
    {id: 'deltoid_left', muscles: ['deltoid_left', 'trapezius_left'], position: [-shoulderWidth * 0.36, torsoHeight * 0.06, shoulderWidth * 0.05], radius: shoulderWidth * 0.09},
    {id: 'deltoid_right', muscles: ['deltoid_right', 'trapezius_right'], position: [shoulderWidth * 0.36, torsoHeight * 0.06, shoulderWidth * 0.05], radius: shoulderWidth * 0.09},
    {id: 'neck_left', muscles: ['neck', 'trapezius_left'], position: [-shoulderWidth * 0.05, -shoulderWidth * 0.12, shoulderWidth * 0.04], radius: shoulderWidth * 0.04},
    {id: 'neck_right', muscles: ['neck', 'trapezius_right'], position: [shoulderWidth * 0.05, -shoulderWidth * 0.12, shoulderWidth * 0.04], radius: shoulderWidth * 0.04},
  ];

  return (
    <group position={pose.shoulderMid} rotation={rotation}>
      <PhysicalCapsule position={[0, torsoHeight * 0.28, 0]} radius={shoulderWidth * 0.17} length={torsoHeight * 0.46} material={shell} />
      <PhysicalEllipsoid position={[0, torsoHeight * 0.24, 0.01]} scale={[shoulderWidth * 0.4, torsoHeight * 0.3, shoulderWidth * 0.25]} material={shell} />
      <PhysicalEllipsoid position={[0, torsoHeight * 0.58, 0.01]} scale={[hipWidth * 0.42, torsoHeight * 0.19, hipWidth * 0.2]} material={shell} />
      <PhysicalEllipsoid position={[0, torsoHeight * 0.9, -0.01]} scale={[hipWidth * 0.5, hipWidth * 0.2, hipWidth * 0.24]} rotation={[0.12, 0, 0]} material={shell} />
      <PhysicalEllipsoid position={[-shoulderWidth * 0.18, torsoHeight * 0.26, 0.02]} scale={[shoulderWidth * 0.16, torsoHeight * 0.22, shoulderWidth * 0.11]} rotation={[0.02, 0.06, -0.12]} material={shell} />
      <PhysicalEllipsoid position={[shoulderWidth * 0.18, torsoHeight * 0.26, 0.02]} scale={[shoulderWidth * 0.16, torsoHeight * 0.22, shoulderWidth * 0.11]} rotation={[0.02, -0.06, 0.12]} material={shell} />
      <PhysicalCapsule position={[0, -shoulderWidth * 0.14, 0.03]} radius={shoulderWidth * 0.055} length={shoulderWidth * 0.22} material={shell} />
      <PhysicalEllipsoid position={[0, -shoulderWidth * 0.44, 0.03]} scale={[shoulderWidth * 0.18, shoulderWidth * 0.24, shoulderWidth * 0.17]} material={shell} />
      <PhysicalEllipsoid position={[0, -shoulderWidth * 0.23, shoulderWidth * 0.07]} scale={[shoulderWidth * 0.11, shoulderWidth * 0.09, shoulderWidth * 0.1]} material={shell} />
      <PhysicalEllipsoid position={[0, shoulderWidth * 0.07, 0.1]} scale={[shoulderWidth * 0.3, shoulderWidth * 0.04, shoulderWidth * 0.08]} material={shell} />
      <PhysicalEllipsoid position={[-shoulderWidth * 0.33, shoulderWidth * 0.06, 0.04]} scale={[shoulderWidth * 0.13, shoulderWidth * 0.06, shoulderWidth * 0.08]} rotation={[0.02, 0.04, -0.24]} material={shell} />
      <PhysicalEllipsoid position={[shoulderWidth * 0.33, shoulderWidth * 0.06, 0.04]} scale={[shoulderWidth * 0.13, shoulderWidth * 0.06, shoulderWidth * 0.08]} rotation={[0.02, -0.04, 0.24]} material={shell} />

      {torsoMuscles.map((shape) => (
        <PhysicalEllipsoid
          key={shape.id}
          position={shape.position}
          scale={shape.scale}
          rotation={shape.rotation}
          material={muscleMaterial(zoneIntensity(muscleEngagement, shape.muscles), tension, targeted)}
        />
      ))}

      {torsoOrbs.map((shape) => (
        <PhysicalSphere
          key={shape.id}
          position={shape.position}
          radius={shape.radius}
          material={muscleMaterial(zoneIntensity(muscleEngagement, shape.muscles), tension, targeted)}
        />
      ))}
    </group>
  );
}

function limbMuscleMaterial(
  muscleEngagement: MuscleEngagement,
  muscles: string[],
  tension: number,
  targeted: boolean,
) {
  return muscleMaterial(zoneIntensity(muscleEngagement, muscles), tension, targeted);
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
  const shoulderWidth = distance(pose.left_shoulder, pose.right_shoulder);
  const hipWidth = distance(pose.left_hip, pose.right_hip);
  const armRadius = Math.max(0.12, shoulderWidth * 0.118);
  const forearmRadius = armRadius * 0.8;
  const thighRadius = Math.max(0.16, hipWidth * 0.28);
  const shinRadius = thighRadius * 0.66;
  const shell = shellMaterial(tension, targeted);

  const upperArmLeftLength = distance(pose.left_shoulder, pose.left_elbow);
  const upperArmRightLength = distance(pose.right_shoulder, pose.right_elbow);
  const forearmLeftLength = distance(pose.left_elbow, pose.left_wrist);
  const forearmRightLength = distance(pose.right_elbow, pose.right_wrist);
  const thighLeftLength = distance(pose.left_hip, pose.left_knee);
  const thighRightLength = distance(pose.right_hip, pose.right_knee);
  const shinLeftLength = distance(pose.left_knee, pose.left_ankle);
  const shinRightLength = distance(pose.right_knee, pose.right_ankle);

  const armFront = pose.frontAxis;
  const legFront = pose.frontAxis;

  return (
    <div className={className ?? 'h-[480px] w-full'}>
      <Canvas camera={{position: [0, 0.48, 6], fov: 28}}>
        <ambientLight intensity={targeted ? 0.98 : 1.15} />
        <directionalLight position={[5.6, 7.5, 6.2]} intensity={targeted ? 1.7 : 1.95} color={targeted ? '#ffd7c8' : '#ffe3bd'} />
        <directionalLight position={[-4.8, -3.4, 3.1]} intensity={0.74} color="#efe6dc" />

        <group rotation={[0.04, 0.16, 0]}>
          <TorsoCluster
            pose={pose}
            shell={shell}
            muscleEngagement={muscleEngagement}
            tension={tension}
            targeted={targeted}
          />

          <SegmentCluster
            start={pose.left_shoulder}
            end={pose.left_elbow}
            shellRadius={armRadius}
            shell={shell}
            sideHint={pose.shoulderAxis}
            frontHint={armFront}
            ellipsoids={[
              {id: 'left_bicep', muscles: ['bicep_left'], position: [0, upperArmLeftLength * 0.48, armRadius * 0.22], scale: [armRadius * 0.76, upperArmLeftLength * 0.34, armRadius * 0.62], material: limbMuscleMaterial(muscleEngagement, ['bicep_left'], tension, targeted)},
              {id: 'left_tricep', muscles: ['tricep_left'], position: [0, upperArmLeftLength * 0.44, -armRadius * 0.16], scale: [armRadius * 0.68, upperArmLeftLength * 0.32, armRadius * 0.52], material: limbMuscleMaterial(muscleEngagement, ['tricep_left'], tension, targeted)},
              {id: 'left_brachialis', muscles: ['bicep_left', 'forearm_left'], position: [-armRadius * 0.24, upperArmLeftLength * 0.58, armRadius * 0.04], scale: [armRadius * 0.24, upperArmLeftLength * 0.24, armRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['bicep_left', 'forearm_left'], tension, targeted)},
            ]}
            orbs={[
              {id: 'left_shoulder_cap', muscles: ['deltoid_left'], position: [0, armRadius * 0.18, armRadius * 0.04], radius: armRadius * 0.72, material: limbMuscleMaterial(muscleEngagement, ['deltoid_left'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.right_shoulder}
            end={pose.right_elbow}
            shellRadius={armRadius}
            shell={shell}
            sideHint={pose.shoulderAxis}
            frontHint={armFront}
            ellipsoids={[
              {id: 'right_bicep', muscles: ['bicep_right'], position: [0, upperArmRightLength * 0.48, armRadius * 0.22], scale: [armRadius * 0.76, upperArmRightLength * 0.34, armRadius * 0.62], material: limbMuscleMaterial(muscleEngagement, ['bicep_right'], tension, targeted)},
              {id: 'right_tricep', muscles: ['tricep_right'], position: [0, upperArmRightLength * 0.44, -armRadius * 0.16], scale: [armRadius * 0.68, upperArmRightLength * 0.32, armRadius * 0.52], material: limbMuscleMaterial(muscleEngagement, ['tricep_right'], tension, targeted)},
              {id: 'right_brachialis', muscles: ['bicep_right', 'forearm_right'], position: [armRadius * 0.24, upperArmRightLength * 0.58, armRadius * 0.04], scale: [armRadius * 0.24, upperArmRightLength * 0.24, armRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['bicep_right', 'forearm_right'], tension, targeted)},
            ]}
            orbs={[
              {id: 'right_shoulder_cap', muscles: ['deltoid_right'], position: [0, armRadius * 0.18, armRadius * 0.04], radius: armRadius * 0.72, material: limbMuscleMaterial(muscleEngagement, ['deltoid_right'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.left_elbow}
            end={pose.left_wrist}
            shellRadius={forearmRadius}
            shell={shell}
            sideHint={pose.shoulderAxis}
            frontHint={armFront}
            ellipsoids={[
              {id: 'left_flexor', muscles: ['forearm_left'], position: [0, forearmLeftLength * 0.44, forearmRadius * 0.16], scale: [forearmRadius * 0.56, forearmLeftLength * 0.32, forearmRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['forearm_left'], tension, targeted)},
              {id: 'left_extensor', muscles: ['forearm_left', 'tricep_left'], position: [0, forearmLeftLength * 0.44, -forearmRadius * 0.12], scale: [forearmRadius * 0.48, forearmLeftLength * 0.28, forearmRadius * 0.34], material: limbMuscleMaterial(muscleEngagement, ['forearm_left', 'tricep_left'], tension, targeted)},
              {id: 'left_brachioradialis', muscles: ['forearm_left', 'bicep_left'], position: [-forearmRadius * 0.18, forearmLeftLength * 0.36, forearmRadius * 0.08], scale: [forearmRadius * 0.22, forearmLeftLength * 0.24, forearmRadius * 0.18], material: limbMuscleMaterial(muscleEngagement, ['forearm_left', 'bicep_left'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.right_elbow}
            end={pose.right_wrist}
            shellRadius={forearmRadius}
            shell={shell}
            sideHint={pose.shoulderAxis}
            frontHint={armFront}
            ellipsoids={[
              {id: 'right_flexor', muscles: ['forearm_right'], position: [0, forearmRightLength * 0.44, forearmRadius * 0.16], scale: [forearmRadius * 0.56, forearmRightLength * 0.32, forearmRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['forearm_right'], tension, targeted)},
              {id: 'right_extensor', muscles: ['forearm_right', 'tricep_right'], position: [0, forearmRightLength * 0.44, -forearmRadius * 0.12], scale: [forearmRadius * 0.48, forearmRightLength * 0.28, forearmRadius * 0.34], material: limbMuscleMaterial(muscleEngagement, ['forearm_right', 'tricep_right'], tension, targeted)},
              {id: 'right_brachioradialis', muscles: ['forearm_right', 'bicep_right'], position: [forearmRadius * 0.18, forearmRightLength * 0.36, forearmRadius * 0.08], scale: [forearmRadius * 0.22, forearmRightLength * 0.24, forearmRadius * 0.18], material: limbMuscleMaterial(muscleEngagement, ['forearm_right', 'bicep_right'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.left_hip}
            end={pose.left_knee}
            shellRadius={thighRadius}
            shell={shell}
            sideHint={pose.hipAxis}
            frontHint={legFront}
            ellipsoids={[
              {id: 'left_quad_outer', muscles: ['quad_left'], position: [-thighRadius * 0.16, thighLeftLength * 0.42, thighRadius * 0.2], scale: [thighRadius * 0.64, thighLeftLength * 0.34, thighRadius * 0.5], material: limbMuscleMaterial(muscleEngagement, ['quad_left'], tension, targeted)},
              {id: 'left_quad_inner', muscles: ['quad_left', 'glute_left'], position: [thighRadius * 0.14, thighLeftLength * 0.5, thighRadius * 0.16], scale: [thighRadius * 0.54, thighLeftLength * 0.3, thighRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['quad_left', 'glute_left'], tension, targeted)},
              {id: 'left_hamstring', muscles: ['hamstring_left', 'glute_left'], position: [0, thighLeftLength * 0.48, -thighRadius * 0.18], scale: [thighRadius * 0.58, thighLeftLength * 0.28, thighRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['hamstring_left', 'glute_left'], tension, targeted)},
              {id: 'left_adductor', muscles: ['quad_left', 'hamstring_left'], position: [thighRadius * 0.1, thighLeftLength * 0.58, 0], scale: [thighRadius * 0.26, thighLeftLength * 0.24, thighRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['quad_left', 'hamstring_left'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.right_hip}
            end={pose.right_knee}
            shellRadius={thighRadius}
            shell={shell}
            sideHint={pose.hipAxis}
            frontHint={legFront}
            ellipsoids={[
              {id: 'right_quad_outer', muscles: ['quad_right'], position: [thighRadius * 0.16, thighRightLength * 0.42, thighRadius * 0.2], scale: [thighRadius * 0.64, thighRightLength * 0.34, thighRadius * 0.5], material: limbMuscleMaterial(muscleEngagement, ['quad_right'], tension, targeted)},
              {id: 'right_quad_inner', muscles: ['quad_right', 'glute_right'], position: [-thighRadius * 0.14, thighRightLength * 0.5, thighRadius * 0.16], scale: [thighRadius * 0.54, thighRightLength * 0.3, thighRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['quad_right', 'glute_right'], tension, targeted)},
              {id: 'right_hamstring', muscles: ['hamstring_right', 'glute_right'], position: [0, thighRightLength * 0.48, -thighRadius * 0.18], scale: [thighRadius * 0.58, thighRightLength * 0.28, thighRadius * 0.42], material: limbMuscleMaterial(muscleEngagement, ['hamstring_right', 'glute_right'], tension, targeted)},
              {id: 'right_adductor', muscles: ['quad_right', 'hamstring_right'], position: [-thighRadius * 0.1, thighRightLength * 0.58, 0], scale: [thighRadius * 0.26, thighRightLength * 0.24, thighRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['quad_right', 'hamstring_right'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.left_knee}
            end={pose.left_ankle}
            shellRadius={shinRadius}
            shell={shell}
            sideHint={pose.hipAxis}
            frontHint={legFront}
            ellipsoids={[
              {id: 'left_calf_outer', muscles: ['calf_left'], position: [-shinRadius * 0.1, shinLeftLength * 0.36, -shinRadius * 0.1], scale: [shinRadius * 0.44, shinLeftLength * 0.24, shinRadius * 0.32], material: limbMuscleMaterial(muscleEngagement, ['calf_left'], tension, targeted)},
              {id: 'left_calf_inner', muscles: ['calf_left'], position: [shinRadius * 0.08, shinLeftLength * 0.4, -shinRadius * 0.08], scale: [shinRadius * 0.34, shinLeftLength * 0.2, shinRadius * 0.26], material: limbMuscleMaterial(muscleEngagement, ['calf_left'], tension, targeted)},
              {id: 'left_tibialis', muscles: ['calf_left', 'quad_left'], position: [0, shinLeftLength * 0.5, shinRadius * 0.12], scale: [shinRadius * 0.18, shinLeftLength * 0.28, shinRadius * 0.16], material: limbMuscleMaterial(muscleEngagement, ['calf_left', 'quad_left'], tension, targeted)},
              {id: 'left_soleus', muscles: ['calf_left'], position: [0, shinLeftLength * 0.58, -shinRadius * 0.05], scale: [shinRadius * 0.26, shinLeftLength * 0.18, shinRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['calf_left'], tension, targeted)},
            ]}
          />

          <SegmentCluster
            start={pose.right_knee}
            end={pose.right_ankle}
            shellRadius={shinRadius}
            shell={shell}
            sideHint={pose.hipAxis}
            frontHint={legFront}
            ellipsoids={[
              {id: 'right_calf_outer', muscles: ['calf_right'], position: [shinRadius * 0.1, shinRightLength * 0.36, -shinRadius * 0.1], scale: [shinRadius * 0.44, shinRightLength * 0.24, shinRadius * 0.32], material: limbMuscleMaterial(muscleEngagement, ['calf_right'], tension, targeted)},
              {id: 'right_calf_inner', muscles: ['calf_right'], position: [-shinRadius * 0.08, shinRightLength * 0.4, -shinRadius * 0.08], scale: [shinRadius * 0.34, shinRightLength * 0.2, shinRadius * 0.26], material: limbMuscleMaterial(muscleEngagement, ['calf_right'], tension, targeted)},
              {id: 'right_tibialis', muscles: ['calf_right', 'quad_right'], position: [0, shinRightLength * 0.5, shinRadius * 0.12], scale: [shinRadius * 0.18, shinRightLength * 0.28, shinRadius * 0.16], material: limbMuscleMaterial(muscleEngagement, ['calf_right', 'quad_right'], tension, targeted)},
              {id: 'right_soleus', muscles: ['calf_right'], position: [0, shinRightLength * 0.58, -shinRadius * 0.05], scale: [shinRadius * 0.26, shinRightLength * 0.18, shinRadius * 0.2], material: limbMuscleMaterial(muscleEngagement, ['calf_right'], tension, targeted)},
            ]}
          />

          <group position={pose.left_wrist} rotation={orientationFromSegment(pose.left_elbow, pose.left_wrist, pose.shoulderAxis, armFront)}>
            <PhysicalEllipsoid position={[0, forearmLeftLength * 1.03, forearmRadius * 0.08]} scale={[forearmRadius * 0.66, forearmRadius * 0.3, forearmRadius * 0.5]} rotation={[0.24, 0, -0.08]} material={shell} />
          </group>
          <group position={pose.right_wrist} rotation={orientationFromSegment(pose.right_elbow, pose.right_wrist, pose.shoulderAxis, armFront)}>
            <PhysicalEllipsoid position={[0, forearmRightLength * 1.03, forearmRadius * 0.08]} scale={[forearmRadius * 0.66, forearmRadius * 0.3, forearmRadius * 0.5]} rotation={[0.24, 0, 0.08]} material={shell} />
          </group>
          <group position={pose.left_ankle} rotation={orientationFromSegment(pose.left_knee, pose.left_ankle, pose.hipAxis, legFront)}>
            <PhysicalEllipsoid position={[0, shinLeftLength * 1.02, shinRadius * 0.2]} scale={[shinRadius * 0.68, shinRadius * 0.2, shinRadius * 1.02]} rotation={[0.26, 0, -0.02]} material={shell} />
          </group>
          <group position={pose.right_ankle} rotation={orientationFromSegment(pose.right_knee, pose.right_ankle, pose.hipAxis, legFront)}>
            <PhysicalEllipsoid position={[0, shinRightLength * 1.02, shinRadius * 0.2]} scale={[shinRadius * 0.68, shinRadius * 0.2, shinRadius * 1.02]} rotation={[0.26, 0, 0.02]} material={shell} />
          </group>

          <mesh position={[0, -3.88, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.8, 2.55, 64]} />
            <meshStandardMaterial
              color={targeted ? '#ff5d49' : '#ff9a3d'}
              emissive={targeted ? '#ff5d49' : '#ff9a3d'}
              emissiveIntensity={targeted ? 0.3 + (tension * 0.36) : 0.18}
              transparent
              opacity={targeted ? 0.34 + (tension * 0.16) : 0.24}
            />
          </mesh>
        </group>

        <OrbitControls enablePan={false} minDistance={4.6} maxDistance={8.2} />
      </Canvas>
    </div>
  );
}
