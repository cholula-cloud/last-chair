"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio as sound } from "@/audio/engine";
import { sliderGain } from "@/audio/mix";
import { useSettings } from "@/ui/settingsStore";
import { COLD_OPEN_AUDIO, COLD_OPEN_CARDS, cardAtTime, cueOf, silentHoldSeconds } from "@/ui/coldOpenCards";

/** How long the voice clock may stand still before the cards run on timers instead. */
const STALL_MS = 2000;

/**
 * Four still cards with a voice-over, shown once after New winter and before the founder pick.
 * Captions remain visible when audio is unavailable. The voice starts from the New winter tap; if the browser refuses it,
 * or Voice is off in Settings, the cards run on timers.
 */
export function ColdOpen({ onDone }: { onDone: () => void }) {
  // The voice is heard when Sound, Voice and both volumes are up. It runs through the voice bus.
  const captions = useSettings(s => s.captions);
  const voiceLevel = useSettings(s => s.voiceOn && !s.muted ? sliderGain(s.masterVolume) * sliderGain(s.voiceVolume) : 0);
  const [index, setIndex] = useState(0);
  // True while the recording is actually playing; the cards then follow its clock.
  const [voiceLive, setVoiceLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // True when the voice element feeds the voice bus, so the bus sets its level and the element stays at full.
  const routedRef = useRef(false);
  const indexRef = useRef(0);
  const doneRef = useRef(onDone);
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = COLD_OPEN_CARDS.length - 1;

  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const stopVoice = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audioRef.current = null;
    setVoiceLive(false);
  }, []);

  // Start the voice-over. A rejected play() (autoplay blocked) leaves the cards on timers.
  useEffect(() => {
    nextRef.current?.focus();
    if (!sound.voiceAudible()) return;
    const voice = new Audio((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + COLD_OPEN_AUDIO);
    routedRef.current = sound.routeVoice(voice);
    voice.volume = routedRef.current ? 1 : sound.voiceFallbackVolume();
    audioRef.current = voice;
    let cancelled = false;
    voice.play().then(
      () => {
        if (!cancelled) setVoiceLive(true);
      },
      () => {
        if (audioRef.current === voice) audioRef.current = null;
      },
    );
    const onEnded = () => {
      if (audioRef.current === voice) setVoiceLive(false);
    };
    voice.addEventListener("ended", onEnded);
    return () => {
      cancelled = true;
      voice.removeEventListener("ended", onEnded);
      voice.pause();
      if (audioRef.current === voice) audioRef.current = null;
    };
  }, []);

  // Settings changes made while it plays: muting stops the voice. A routed voice follows its bus on its own.
  useEffect(() => {
    if (!voiceLevel) stopVoice();
    else if (audioRef.current && !routedRef.current) audioRef.current.volume = voiceLevel;
  }, [voiceLevel, stopVoice]);

  // With the voice playing, follow its clock. Only a card change sets state.
  useEffect(() => {
    if (!voiceLive) return;
    let frame = 0;
    let lastTime = -1;
    let movedAt = performance.now();
    const follow = () => {
      const audio = audioRef.current;
      if (audio) {
        const now = performance.now();
        if (audio.currentTime !== lastTime) {
          lastTime = audio.currentTime;
          movedAt = now;
        } else if (now - movedAt > STALL_MS && !audio.ended) {
          // The clock is not moving (no audio output, or the tab is throttled): fall back to timers.
          audio.pause();
          audioRef.current = null;
          setVoiceLive(false);
          return;
        }
        const at = cardAtTime(audio.currentTime);
        if (at > indexRef.current) setIndex(at);
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [voiceLive]);

  // Without the voice, each card holds until the next cue.
  useEffect(() => {
    if (voiceLive) return;
    const hold = silentHoldSeconds(index);
    if (hold === null) return;
    const timer = window.setTimeout(() => setIndex((i) => Math.min(last, i + 1)), hold * 1000);
    return () => window.clearTimeout(timer);
  }, [index, voiceLive, last]);

  const finish = useCallback(() => {
    stopVoice();
    doneRef.current();
  }, [stopVoice]);

  const advance = useCallback(() => {
    const at = indexRef.current;
    if (at >= last) {
      finish();
      return;
    }
    const audio = audioRef.current;
    if (audio) audio.currentTime = cueOf(at + 1);
    setIndex(at + 1);
  }, [finish, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, finish]);

  const card = COLD_OPEN_CARDS[index] ?? COLD_OPEN_CARDS[0];

  return (
    <div role="dialog" aria-modal="true" aria-label="Dutch Hill story" className="fixed inset-0 z-[90] overflow-hidden bg-ink text-white">
      {COLD_OPEN_CARDS.map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c.id}
          src={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + c.image}
          alt=""
          draggable={false}
          className="cold-card absolute inset-0 h-full w-full object-cover"
          data-active={i === index ? "true" : "false"}
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink via-ink/70 to-transparent" aria-hidden="true" />
      <button
        ref={nextRef}
        type="button"
        onClick={advance}
        aria-label={index >= last ? "End of story" : "Next card"}
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent outline-none"
      />
      <button
        type="button"
        onClick={finish}
        className="key key-sm press absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] min-h-11 px-4 text-[0.95rem] font-extrabold text-ink"
      >
        Skip
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
        {(captions || !voiceLive) && <p
          key={card.id}
          role="status"
          aria-live="polite"
          className="cold-caption display max-w-xl text-center text-[clamp(1.35rem,5.4vw,2rem)] leading-tight"
        >
          {card.caption}
        </p>}
        <p className="text-[0.85rem] font-extrabold text-white/80">
          Card {index + 1} of {COLD_OPEN_CARDS.length}.{index < last ? " Tap or press Space for the next one." : ""}
        </p>
        {index >= last && (
          <button
            type="button"
            onClick={finish}
            className="key key-solid press pointer-events-auto min-h-12 px-6 text-[1.05rem] font-extrabold [--key-fill:var(--sign-green)] [--key-ink:#fff]"
          >
            Choose a founder
          </button>
        )}
      </div>
    </div>
  );
}
