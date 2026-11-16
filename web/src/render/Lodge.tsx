"use client";

import { LODGE, terrainHeight } from "./guestPaths";

export function Lodge() {
  const y = terrainHeight(LODGE.x, LODGE.z);

  return (
    <group position={[LODGE.x, y, LODGE.z]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.35, 0.9, 1.05]} />
        <meshStandardMaterial color="#6b4428" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.05, 0.75, 4]} />
        <meshStandardMaterial color="#3d2914" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 0.42, 0.53]}>
        <planeGeometry args={[0.22, 0.28]} />
        <meshBasicMaterial color="#f97316" toneMapped={false} />
      </mesh>
      <mesh position={[0.28, 0.42, 0.53]}>
        <planeGeometry args={[0.22, 0.28]} />
        <meshBasicMaterial color="#fb923c" toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, 0.6, 0.8]}
        color="#f97316"
        intensity={0.35}
        distance={3}
      />
    </group>
  );
}