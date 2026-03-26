'use client';

import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';

import type {MuscleEngagement} from '@/lib/types';

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

export function MuscleMannequin({
  muscleEngagement,
  className,
  renderMode = 'ambient',
}: {
  muscleEngagement: MuscleEngagement;
  className?: string;
  renderMode?: RenderMode;
}) {
  const zoneEntries = zones.map((zone) => ({
    zone,
    rawIntensity: zoneIntensity(muscleEngagement, zone.muscles),
  }));
  const maxIntensity = Math.max(...zoneEntries.map((entry) => entry.rawIntensity), 0);

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
                  emissiveIntensity={emissiveIntensity}
                  transparent={renderMode === 'targeted'}
                  opacity={renderMode === 'targeted' ? 0.66 + normalizedIntensity * 0.34 : 1}
                />
              </mesh>
            );
          })}

          <mesh position={[0, -3.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.7, 2.45, 48]} />
            <meshStandardMaterial
              color={renderMode === 'targeted' ? '#ff4b3c' : '#ff9a3d'}
              emissive={renderMode === 'targeted' ? '#ff4b3c' : '#ff9a3d'}
              emissiveIntensity={renderMode === 'targeted' ? 0.45 : 0.25}
              transparent
              opacity={renderMode === 'targeted' ? 0.5 : 0.4}
            />
          </mesh>
        </group>

        <OrbitControls enablePan={false} minDistance={4} maxDistance={8} />
      </Canvas>
    </div>
  );
}
