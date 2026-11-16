"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { LIFT_PREVIEW_SLOTS, checkDescentValid } from "@/game/descent";
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
  followed,
}: {
  index: number;
  state: string;
  progress: number;
  followed: boolean;
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

  const scale = followed ? 1.35 : 1;
  return (
    <group position={[x, y, z]} scale={scale}>
      {followed && (
        <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.28, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
        </mesh>
      )}
      <mesh>
        <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
        <meshStandardMaterial
          color={guestColor(state)}
          emissive={followed ? "#fbbf24" : "#000000"}
          emissiveIntensity={followed ? 0.35 : 0}
        />
      </mesh>
    </group>
  );
}

export function MountainScene() {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const lifts = useGameStore((s) => s.lifts);
  const buildMode = useGameStore((s) => s.buildMode);
  const selectedSlotIndex = useGameStore((s) => s.selectedSlotIndex);
  const selectedLiftType = useGameStore((s) => s.selectedLiftType);
  const buildings = useGameStore((s) => s.buildings);
  const gunsVisible = useGameStore((s) => s.gunsVisible);
  const groomVisible = useGameStore((s) => s.groomVisible);
  const weather = useGameStore((s) => s.weather);
  const previewSlot =
    LIFT_PREVIEW_SLOTS[selectedSlotIndex] ?? LIFT_PREVIEW_SLOTS[0];
  const previewValid = previewSlot ? checkDescentValid(previewSlot) : false;
  const snowRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const lightBoost = weather === "snow" ? 0.15 : weather === "thaw" ? -0.08 : 0;
  const snowColor = `hsl(210, 35%, ${68 + snowQuality * 18 + snowDepth * 6}%)`;

  return (
    <>
      <color attach="background" args={["#0b1628"]} />
      <ambientLight intensity={0.55 + lightBoost} />
      <directionalLight position={[5, 8, 4]} intensity={1.1 + lightBoost} />
      <mesh ref={snowRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[14, 12, 32, 32]} />
        <meshStandardMaterial color={snowColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, -1]} rotation={[0.2, 0.3, 0]}>
        <boxGeometry args={[4, 1.6, 3]} />
        <meshStandardMaterial color="#2d5a4a" />
      </mesh>

      {groomVisible && (
        <>
          <mesh position={[0.8, 0.02, 1.2]} rotation={[-Math.PI / 2.15, 0, 0.35]}>
            <planeGeometry args={[0.45, 3.2]} />
            <meshBasicMaterial color="#dbeafe" transparent opacity={0.35} />
          </mesh>
          <mesh position={[1.4, 0.02, 1.0]} rotation={[-Math.PI / 2.15, 0, 0.35]}>
            <planeGeometry args={[0.45, 2.8]} />
            <meshBasicMaterial color="#bfdbfe" transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {(gunsVisible || buildings.includes("snow_guns")) && (
        <>
          <mesh position={[-2.2, 0.55, 0.2]}>
            <cylinderGeometry args={[0.08, 0.12, 1.1, 8]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[-2.2, 1.15, 0.2]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial
              color="#e2e8f0"
              emissive="#93c5fd"
              emissiveIntensity={gunsVisible ? 0.55 : 0.15}
            />
          </mesh>
          <mesh position={[1.6, 0.55, -0.4]}>
            <cylinderGeometry args={[0.08, 0.12, 1.1, 8]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[1.6, 1.15, -0.4]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial
              color="#e2e8f0"
              emissive="#93c5fd"
              emissiveIntensity={gunsVisible ? 0.55 : 0.15}
            />
          </mesh>
        </>
      )}

      {lifts
        .filter((l) => l.confirmed)
        .map((lift, i) => (
          <group
            key={`lift-${i}-${lift.type}`}
            position={[lift.anchor.x, 0, lift.anchor.z]}
          >
            <mesh position={[0, lift.type === "chair" ? 1.8 : 1.5, 0]}>
              <boxGeometry
                args={[0.15, lift.type === "chair" ? 3.6 : 3.2, 0.15]}
              />
              <meshStandardMaterial
                color={lift.type === "chair" ? "#475569" : "#64748b"}
              />
            </mesh>
            <mesh position={[0, lift.type === "chair" ? 3.6 : 3.2, 1.8]}>
              <boxGeometry args={[0.12, 0.12, 3.6]} />
              <meshStandardMaterial
                color={lift.type === "chair" ? "#64748b" : "#94a3b8"}
              />
            </mesh>
            {lift.type === "chair" && (
              <mesh position={[0.25, 2.2, 1.2]}>
                <boxGeometry args={[0.35, 0.12, 0.35]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
            )}
          </group>
        ))}

      {buildMode && previewSlot && (
        <group position={[previewSlot.x, 0, previewSlot.z]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.15, 3.2, 0.15]} />
            <meshStandardMaterial color={previewValid ? "#4ade80" : "#f87171"} />
          </mesh>
          <mesh position={[0, 0.05, 1.5]} rotation={[-Math.PI / 2, 0, 0.4]}>
            <planeGeometry args={[0.35, 2.2]} />
            <meshBasicMaterial
              color={previewValid ? "#4ade80" : "#f87171"}
              transparent
              opacity={0.55}
            />
          </mesh>
          <mesh position={[0.4, 0.4, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial
              color={selectedLiftType === "chair" ? "#38bdf8" : "#fbbf24"}
            />
          </mesh>
        </group>
      )}

      <mesh position={[2.2, buildings.includes("lodge") ? 0.65 : 0.4, 2.4]}>
        <boxGeometry
          args={
            buildings.includes("lodge") ? [1.6, 1.2, 1.2] : [1.2, 0.8, 1]
          }
        />
        <meshStandardMaterial
          color={buildings.includes("lodge") ? "#8b5a3c" : "#7c4a2e"}
          emissive="#f97316"
          emissiveIntensity={0.15}
        />
      </mesh>

      {buildings.includes("cafe") && (
        <mesh position={[3.4, 0.35, 2.0]}>
          <boxGeometry args={[0.9, 0.7, 0.8]} />
          <meshStandardMaterial
            color="#b45309"
            emissive="#fbbf24"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}

      {buildings.includes("shop") && (
        <mesh position={[3.2, 0.3, 3.1]}>
          <boxGeometry args={[0.8, 0.6, 0.7]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      )}

      {guests.map((g, i) => (
        <GuestDot
          key={g.id}
          index={i}
          state={g.state}
          progress={g.progress}
          followed={g.id === followId}
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
