"use client";

import type { Guest } from "@/game/types";
import type { LiftAnchor } from "@/game/descent";
import { guestWorldPosition } from "./guestPaths";

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

function GuestMesh({
  index,
  guest,
  liftAnchor,
  followed,
}: {
  index: number;
  guest: Guest;
  liftAnchor: LiftAnchor;
  followed: boolean;
}) {
  const pos = guestWorldPosition(
    index,
    guest.state,
    guest.progress,
    liftAnchor,
  );
  const scale = followed ? 1.28 : 1;
  const jacket = guestColor(guest.state);

  return (
    <group position={[pos.x, pos.y, pos.z]} scale={scale}>
      {followed && (
        <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.3, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} />
        </mesh>
      )}
      <mesh position={[0, 0.28, 0]}>
        <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
        <meshStandardMaterial
          color={jacket}
          emissive={followed ? "#fbbf24" : "#000000"}
          emissiveIntensity={followed ? 0.25 : 0}
          roughness={0.65}
        />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#fde8d0" roughness={0.7} />
      </mesh>
      <mesh position={[-0.12, 0.12, 0.04]} rotation={[0.2, 0, 0.15]}>
        <boxGeometry args={[0.03, 0.55, 0.03]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0.12, 0.12, 0.04]} rotation={[0.2, 0, -0.15]}>
        <boxGeometry args={[0.03, 0.55, 0.03]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

export function Guests({
  guests,
  followId,
  liftAnchor,
}: {
  guests: Guest[];
  followId: string | null;
  liftAnchor: LiftAnchor;
}) {
  return (
    <>
      {guests.map((g, i) => (
        <GuestMesh
          key={g.id}
          index={i}
          guest={g}
          liftAnchor={liftAnchor}
          followed={g.id === followId}
        />
      ))}
    </>
  );
}

export function followedGuestPosition(
  guests: Guest[],
  followId: string | null,
  liftAnchor: LiftAnchor,
): { x: number; y: number; z: number } | null {
  if (!followId) return null;
  const idx = guests.findIndex((g) => g.id === followId);
  if (idx < 0) return null;
  const g = guests[idx];
  return guestWorldPosition(idx, g.state, g.progress, liftAnchor);
}