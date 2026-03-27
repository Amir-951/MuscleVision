'use client';

import {Canvas} from '@react-three/fiber';
import {Line, OrbitControls} from '@react-three/drei';

import type {MuscleEngagement, PoseKeypoint, WorkoutPoseFrame} from '@/lib/types';

type Zone = {
  id: string;
  muscles: string[];
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
};

const zones: Zone[] = [
  {id: 'head', muscles: ['neck'], position: [0, 1.82, 0], scale: [0.42, 0.42, 0.42]},
  {id: 'chest', muscles: ['chest_left', 'chest_right'], position: [0, 1.18, 0], scale: [1.02, 0.86, 0.42]},
  {id: 'core', muscles: ['abs_upper', 'abs_lower', 'oblique_left', 'oblique_right'], position: [0, 0.36, 0], scale: [0.8, 1.32, 0.34]},
  {id: 'shoulder_left', muscles: ['deltoid_left', 'trapezius_left'], position: [-0.84, 1.24, 0], scale: [0.42, 0.46, 0.36]},
  {id: 'shoulder_right', muscles: ['deltoid_right', 'trapezius_right'], position: [0.84, 1.24, 0], scale: [0.42, 0.46, 0.36]},
  {id: 'bicep_left', muscles: ['bicep_left', 'tricep_left', 'forearm_left'], position: [-1.1, 0.52, 0], scale: [0.36, 1.3, 0.3], rotation: [0, 0, -0.22]},
  {id: 'bicep_right', muscles: ['bicep_right', 'tricep_right', 'forearm_right'], position: [1.1, 0.52, 0], scale: [0.36, 1.3, 0.3], rotation: [0, 0, 0.22]},
  {id: 'glute_left', muscles: ['glute_left', 'hamstring_left'], position: [-0.34, -0.76, 0], scale: [0.42, 0.82, 0.38]},
  {id: 'glute_right', muscles: ['glute_right', 'hamstring_right'], position: [0.34, -0.76, 0], scale: [0.42, 0.82, 0.38]},
  {id: 'quad_left', muscles: ['quad_left', 'calf_left'], position: [-0.34, -2.18, 0], scale: [0.44, 1.84, 0.32]},
  {id: 'quad_right', muscles: ['quad_right', 'calf_right'], position: [0.34, -2.18, 0], scale: [0.44, 1.84, 0.32]},
  {id: 'lats_left', muscles: ['lats_left'], position: [-0.6, 0.74, -0.16], scale: [0.38, 1.08, 0.28]},
  {id: 'lats_right', muscles: ['lats_right'], position: [0.6, 0.74, -0.16], scale: [0.38, 1.08, 0.28]},
];

const poseConnections: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

function blendChannel(from: number, to: number, intensity: number) {
  return Math.round(from + (to - from) * intensity);
}

function zoneIntensity(muscleEngagement: MuscleEngagement, muscles: string[]) {
  if (!muscles.length) {
    return 0;
  }

  const total = muscles.reduce((sum, muscle) => sum + (muscleEngagement[muscle] ?? 0), 0);
  return Math.min(1, total / muscles.length);
}

function heatColor(intensity: number) {
  const cool = [242, 236, 226];
  const hot = [233, 75, 53];
  const ember = [255, 154, 61];
  const threshold = Math.min(1, intensity * 1.2);
  const from = intensity < 0.5 ? cool : ember;
  const to = intensity < 0.5 ? ember : hot;
  const local = intensity < 0.5 ? threshold : (threshold - 0.5) * 2;
  const color = `rgb(${blendChannel(from[0], to[0], local)}, ${blendChannel(from[1], to[1], local)}, ${blendChannel(from[2], to[2], local)})`;
  return color;
}

function targetedColor(intensity: number) {
  const dormant = [34, 25, 27];
  const live = [142, 18, 25];
  const peak = [255, 59, 48];

  if (intensity < 0.22) {
    return `rgb(${dormant[0]}, ${dormant[1]}, ${dormant[2]})`;
  }

  const local = Math.min(1, (intensity - 0.22) / 0.78);
  const from = local < 0.62 ? dormant : live;
  const to = local < 0.62 ? live : peak;
  const eased = local < 0.62 ? local / 0.62 : (local - 0.62) / 0.38;
  return `rgb(${blendChannel(from[0], to[0], eased)}, ${blendChannel(from[1], to[1], eased)}, ${blendChannel(from[2], to[2], eased)})`;
}

type RenderMode = 'ambient' | 'targeted';

type ScenePoint = [number, number, number];

function toScenePoint(point: PoseKeypoint): ScenePoint {
  return [
    (0.5 - point.x) * 5.2,
    ((0.52 - point.y) * 5.6) - 0.8,
    -point.z * 2.35,
  ];
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

function distance(a: ScenePoint, b: ScenePoint) {
  return Math.sqrt(
    ((b[0] - a[0]) ** 2) +
      ((b[1] - a[1]) ** 2) +
      ((b[2] - a[2]) ** 2),
  );
}

function segmentRotation(a: ScenePoint, b: ScenePoint): [number, number, number] {
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return [
    -Math.atan2(dz, Math.abs(dy) + 0.001) * 0.72,
    0,
    Math.atan2(b[0] - a[0], dy + 0.001),
  ];
}

function posePoints(poseFrame?: WorkoutPoseFrame | null) {
  if (!poseFrame) {
    return null;
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
      return null;
    }
  }

  return {
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
}

function resolveAnimatedZone(
  zone: Zone,
  poseFrame?: WorkoutPoseFrame | null,
): Zone {
  const points = posePoints(poseFrame);
  if (!points) {
    return zone;
  }

  const shoulderMid = midpoint(points.left_shoulder, points.right_shoulder);
  const hipMid = midpoint(points.left_hip, points.right_hip);
  const shoulderWidth = distance(points.left_shoulder, points.right_shoulder);
  const torsoHeight = distance(shoulderMid, hipMid);
  const torsoRotation = segmentRotation(shoulderMid, hipMid);

  switch (zone.id) {
    case 'head':
      return {
        ...zone,
        position: [
          shoulderMid[0],
          shoulderMid[1] + shoulderWidth * 0.82,
          shoulderMid[2] - 0.02,
        ] as [number, number, number],
        scale: [
          Math.max(0.32, shoulderWidth * 0.72),
          Math.max(0.32, shoulderWidth * 0.72),
          0.4,
        ] as [number, number, number],
        rotation: torsoRotation,
      };
    case 'chest':
      return {
        ...zone,
        position: mixPoint(shoulderMid, hipMid, 0.28),
        scale: [
          Math.max(0.86, shoulderWidth * 1.28),
          Math.max(0.58, torsoHeight * 0.34),
          0.42,
        ] as [number, number, number],
        rotation: torsoRotation,
      };
    case 'core':
      return {
        ...zone,
        position: mixPoint(shoulderMid, hipMid, 0.64),
        scale: [
          Math.max(0.66, shoulderWidth),
          Math.max(0.9, torsoHeight * 0.7),
          0.34,
        ] as [number, number, number],
        rotation: torsoRotation,
      };
    case 'shoulder_left':
      return {
        ...zone,
        position: points.left_shoulder,
        scale: [0.36, 0.4, 0.32] as [number, number, number],
        rotation: segmentRotation(points.left_shoulder, points.left_elbow),
      };
    case 'shoulder_right':
      return {
        ...zone,
        position: points.right_shoulder,
        scale: [0.36, 0.4, 0.32] as [number, number, number],
        rotation: segmentRotation(points.right_shoulder, points.right_elbow),
      };
    case 'bicep_left':
      return {
        ...zone,
        position: midpoint(points.left_shoulder, points.left_wrist),
        scale: [
          0.3,
          Math.max(0.92, distance(points.left_shoulder, points.left_wrist)),
          0.28,
        ] as [number, number, number],
        rotation: segmentRotation(points.left_shoulder, points.left_wrist),
      };
    case 'bicep_right':
      return {
        ...zone,
        position: midpoint(points.right_shoulder, points.right_wrist),
        scale: [
          0.3,
          Math.max(0.92, distance(points.right_shoulder, points.right_wrist)),
          0.28,
        ] as [number, number, number],
        rotation: segmentRotation(points.right_shoulder, points.right_wrist),
      };
    case 'glute_left':
      return {
        ...zone,
        position: mixPoint(points.left_hip, points.left_knee, 0.36),
        scale: [
          0.38,
          Math.max(0.52, distance(points.left_hip, points.left_knee) * 0.72),
          0.34,
        ] as [number, number, number],
        rotation: segmentRotation(points.left_hip, points.left_knee),
      };
    case 'glute_right':
      return {
        ...zone,
        position: mixPoint(points.right_hip, points.right_knee, 0.36),
        scale: [
          0.38,
          Math.max(0.52, distance(points.right_hip, points.right_knee) * 0.72),
          0.34,
        ] as [number, number, number],
        rotation: segmentRotation(points.right_hip, points.right_knee),
      };
    case 'quad_left':
      return {
        ...zone,
        position: midpoint(points.left_knee, points.left_ankle),
        scale: [
          0.34,
          Math.max(0.82, distance(points.left_knee, points.left_ankle)),
          0.28,
        ] as [number, number, number],
        rotation: segmentRotation(points.left_knee, points.left_ankle),
      };
    case 'quad_right':
      return {
        ...zone,
        position: midpoint(points.right_knee, points.right_ankle),
        scale: [
          0.34,
          Math.max(0.82, distance(points.right_knee, points.right_ankle)),
          0.28,
        ] as [number, number, number],
        rotation: segmentRotation(points.right_knee, points.right_ankle),
      };
    case 'lats_left': {
      const base = mixPoint(points.left_shoulder, points.left_hip, 0.46);
      return {
        ...zone,
        position: [
          base[0] - (shoulderWidth * 0.16),
          base[1],
          base[2] - 0.24,
        ] as [number, number, number],
        scale: [0.32, Math.max(0.8, torsoHeight * 0.72), 0.26] as [number, number, number],
        rotation: torsoRotation,
      };
    }
    case 'lats_right': {
      const base = mixPoint(points.right_shoulder, points.right_hip, 0.46);
      return {
        ...zone,
        position: [
          base[0] + (shoulderWidth * 0.16),
          base[1],
          base[2] - 0.24,
        ] as [number, number, number],
        scale: [0.32, Math.max(0.8, torsoHeight * 0.72), 0.26] as [number, number, number],
        rotation: torsoRotation,
      };
    }
    default:
      return zone;
  }
}

function skeletonPoints(poseFrame?: WorkoutPoseFrame | null) {
  const points = posePoints(poseFrame);
  if (!points) {
    return null;
  }

  return poseConnections
    .map(([start, end]) => {
      const startPoint = points[start as keyof typeof points];
      const endPoint = points[end as keyof typeof points];
      if (!startPoint || !endPoint) {
        return null;
      }
      return [startPoint, endPoint] as const;
    })
    .filter(Boolean) as ReadonlyArray<readonly [ScenePoint, ScenePoint]>;
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
  const zoneEntries = zones.map((zone) => ({
    zone: resolveAnimatedZone(zone, poseFrame),
    rawIntensity: zoneIntensity(muscleEngagement, zone.muscles),
  }));
  const maxIntensity = Math.max(...zoneEntries.map((entry) => entry.rawIntensity), 0);
  const skeleton = skeletonPoints(poseFrame);

  return (
    <div className={className ?? 'h-[480px] w-full'}>
      <Canvas camera={{position: [0, 0.8, 6], fov: 32}}>
        <ambientLight intensity={renderMode === 'targeted' ? 1.1 : 1.4} />
        <directionalLight
          position={[6, 6, 5]}
          intensity={renderMode === 'targeted' ? 1.85 : 2.2}
          color={renderMode === 'targeted' ? '#ffb7aa' : '#ffd7a6'}
        />
        <directionalLight
          position={[-5, -2, 2]}
          intensity={renderMode === 'targeted' ? 0.95 : 1.2}
          color="#f4eee1"
        />

        <group rotation={[0.18, 0.62, 0]}>
          {zoneEntries.map(({zone, rawIntensity}) => {
            const normalizedIntensity =
              renderMode === 'targeted' && maxIntensity > 0
                ? Math.min(1, rawIntensity / maxIntensity)
                : rawIntensity;
            const color =
              renderMode === 'targeted'
                ? targetedColor(normalizedIntensity)
                : heatColor(normalizedIntensity);
            const emissiveIntensity =
              renderMode === 'targeted'
                ? normalizedIntensity < 0.22
                  ? 0.04
                  : 0.22 + normalizedIntensity * 0.92
                : 0.18 + normalizedIntensity * 0.45;
            return (
              <mesh
                key={zone.id}
                position={zone.position}
                scale={zone.scale}
                rotation={zone.rotation ?? [0, 0, 0]}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                  color={color}
                  roughness={renderMode === 'targeted' ? 0.28 : 0.2}
                  metalness={renderMode === 'targeted' ? 0.08 : 0.12}
                  emissive={color}
                  emissiveIntensity={emissiveIntensity + (tension * 0.35)}
                  transparent={renderMode === 'targeted'}
                  opacity={renderMode === 'targeted' ? 0.66 + normalizedIntensity * 0.34 : 1}
                />
              </mesh>
            );
          })}

          {skeleton?.map(([start, end], index) => (
            <Line
              key={`${start.join('-')}-${end.join('-')}-${index}`}
              points={[start, end]}
              color={renderMode === 'targeted' ? '#ffe1d9' : '#f4eee1'}
              lineWidth={2}
              transparent
              opacity={0.55 + (tension * 0.25)}
            />
          ))}

          <mesh position={[0, -3.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.7, 2.45, 48]} />
            <meshStandardMaterial
              color={renderMode === 'targeted' ? '#ff4b3c' : '#ff9a3d'}
              emissive={renderMode === 'targeted' ? '#ff4b3c' : '#ff9a3d'}
              emissiveIntensity={renderMode === 'targeted' ? 0.45 + (tension * 0.45) : 0.25}
              transparent
              opacity={renderMode === 'targeted' ? 0.5 + (tension * 0.15) : 0.4}
            />
          </mesh>
        </group>

        <OrbitControls enablePan={false} minDistance={4} maxDistance={8} />
      </Canvas>
    </div>
  );
}
