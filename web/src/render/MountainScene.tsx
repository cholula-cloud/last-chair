"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { useGameStore } from "@/game/store";

function guestColor(state: string): string {
  switch (state) {
    case "queue":
      return "#f59e0b";
    case "ride":
      return "#38bdf8";
    case "ski":
      return "#4ade80";
    default:
      return "#e2e8f0";
  }
}

function GuestDot({
  index,
  state,
  progress,
}: {
  index: number;
  state: string;
  progress: number;
}) {
  const baseX = -3 + (index % 6) * 1.1;
  const baseZ = 2 + Math.floor(index / 6) * 0.8;
  let x = baseX;
  let y = 0.35;
  let z = baseZ;

  if (state === "queue") {
    z = 1.2 - progress * 0.5;
  } else if (state === "ride") {
    y = 0.5 + progress * 2.5;
    x = -1.2;
    z = 0.5 + progress * 1.5;
  } else if (state === "ski") {
    y = 2.2 - progress * 1.8;
    x = 0.5 + progress * 2;
    z = 2.5 - progress * 1.5;
  }

  return (
    <mesh position={[x, y, z]}>
      <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
      <meshStandardMaterial color={guestColor(state)} />
    </mesh>
  );
}

export function MountainScene() {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const snowColor = `hsl(210, 35%, ${72 + snowQuality * 18}%)`;

  return (
    <>
      <color attach="background" args={["#0b1628"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} />
      <mesh ref={snowRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[14, 12, 32, 32]} />
        <meshStandardMaterial color={snowColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, -1]} rotation={[0.2, 0.3, 0]}>
        <boxGeometry args={[4, 1.6, 3]} />
        <meshStandardMaterial color="#2d5a4a" />
      </mesh>
      <group position={[-1.2, 0, 0.2]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.15, 3.2, 0.15]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        <mesh position={[0, 3.2, 1.8]}>
          <boxGeometry args={[0.12, 0.12, 3.6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
      <mesh position={[2.2, 0.4, 2.4]}>
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color="#7c4a2e" emissive="#f97316" emissiveIntensity={0.15} />
      </mesh>
      {guests.map((g, i) => (
        <GuestDot
          key={g.id}
          index={i}
          state={g.state}
          progress={g.progress}
        />
      ))}
      <OrbitControls
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={16}
        target={followId ? [0, 1, 1] : [0, 0.5, 1]}
      />
    </>
  );
}
