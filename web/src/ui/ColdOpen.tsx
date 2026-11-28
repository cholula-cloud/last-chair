"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio as sound } from "@/audio/engine";
import { sliderGain } from "@/audio/mix";
import { OPERATOR_NAME_MAX, sanitizeOperatorName } from "@/game/content";
import { useGameStore } from "@/game/store";
import { ticketPunched } from "@/ui/feel";
import { PunchCard } from "@/ui/kit/PunchCard";
import { useSettings } from "@/ui/settingsStore";
import {
  COLD_OPEN_AUDIO,
  COLD_OPEN_AUDIO_STOP_SEC,
  COLD_OPEN_CARDS,
  cardAtTime,
  cueOf,
  silentHoldSeconds,
} from "@/ui/coldOpenCards";

/** How long the voice clock may stand still before the cards run on timers instead. */
const STALL_MS = 2000;

/**
 * Six story cards with Maris Shaw voice-over on cards 1-2, Grammy Dot's punch-card flip on card 3,
 * and optional lease signing on card 5. Captions remain visible when audio is unavailable.
 */
export function ColdOpen({ onDone }: { onDone: () => void }) {
  const captions = useSettings(s => s.captions);
  const voiceLevel = useSettings(s => s.voiceOn && !s.muted ? sliderGain(s.masterVolume) * sliderGain(s.voiceVolume) : 0);
  const [index, setIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [leaseDraft, setLeaseDraft] = useState("");
  const [voiceLive, setVoiceLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  useEffect(() => {
    if (!voiceLevel) stopVoice();
    else if (audioRef.current && !routedRef.current) audioRef.current.volume = voiceLevel;
  }, [voiceLevel, stopVoice]);

  useEffect(() => {
    if (!voiceLive) return;
    let frame = 0;
    let lastTime = -1;
    let movedAt = performance.now();
    const follow = () => {
      const audio = audioRef.current;
      if (audio) {
        const now = performance.now();
        if (audio.currentTime >= COLD_OPEN_AUDIO_STOP_SEC) {
          audio.pause();
          audioRef.current = null;
          setVoiceLive(false);
          if (indexRef.current < 2) setIndex(2);
          return;
        }
        if (audio.currentTime !== lastTime) {
          lastTime = audio.currentTime;
          movedAt = now;
        } else if (now - movedAt > STALL_MS && !audio.ended) {
          audio.pause();
          audioRef.current = null;
          setVoiceLive(false);
          return;
        }
        const at = cardAtTime(audio.currentTime);
        if (at > indexRef.current && at <= 2) setIndex(at);
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [voiceLive]);

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
    const current = COLD_OPEN_CARDS[at];
    if (current?.interactive === "punchcard" && !cardFlipped) {
      setCardFlipped(true);
      return;
    }
    if (current?.interactive === "lease") return;
    if (at >= last) {
      finish();
      return;
    }
    const audio = audioRef.current;
    if (audio) {
      const nextCue = cueOf(at + 1);
      if (nextCue >= COLD_OPEN_AUDIO_STOP_SEC) stopVoice();
      else audio.currentTime = nextCue;
    }
    setIndex(at + 1);
  }, [cardFlipped, finish, last, stopVoice]);

  const signLease = useCallback((useDefault: boolean) => {
    const name = useDefault ? null : sanitizeOperatorName(leaseDraft);
    useGameStore.getState().setOperatorName(name);
    setIndex((i) => Math.min(last, i + 1));
  }, [last, leaseDraft]);

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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/75 to-transparent" aria-hidden="true" />
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
        className="key key-sm press absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 min-h-11 px-4 text-[0.95rem] font-extrabold text-ink"
      >
        Skip
      </button>

      {card.interactive === "punchcard" && (
        <div className="pointer-events-none absolute inset-x-0 top-[11%] flex flex-col items-center px-5">
          <PunchCard
            mode="cold-open"
            flipped={cardFlipped}
            onToggleFlip={() => {
              if (cardFlipped) {
                advance();
              } else {
                ticketPunched();
                setCardFlipped(true);
              }
            }}
          />
          {cardFlipped && (
            <p className="pop display mt-4 text-center text-[clamp(2rem,8vw,3rem)] tracking-tight text-sign-yellow drop-shadow-[0_4px_0_#1B3A57]">
              Last Chair
            </p>
          )}
        </div>
      )}

      {card.interactive === "lease" && (
        <div className="pointer-events-none absolute inset-x-0 top-[10%] flex justify-center px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signLease(false);
            }}
            className="panel beat-swap pointer-events-auto w-full max-w-sm px-5 py-4 text-ink"
          >
            <p className="text-xs font-extrabold text-ink-soft">Town of Heartwellville, VT</p>
            <p className="display mt-0.5 text-[1.35rem]">One-Winter Mountain Lease</p>
            <label htmlFor="lease-operator-name" className="mt-3 block text-sm font-extrabold">
              Your name, if you want it on the lease
            </label>
            <input
              id="lease-operator-name"
              type="text"
              autoComplete="name"
              enterKeyHint="done"
              maxLength={OPERATOR_NAME_MAX}
              value={leaseDraft}
              onChange={(e) => setLeaseDraft(e.target.value)}
              placeholder="Optional (max 24 chars)"
              className="mt-1.5 min-h-11 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-base font-bold text-ink placeholder:text-ink-soft/70"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="key key-solid press min-h-11 flex-1 px-4 text-sm font-extrabold [--key-fill:var(--sign-green)] [--key-ink:#fff]"
              >
                Sign it
              </button>
              <button
                type="button"
                onClick={() => signLease(true)}
                className="key press min-h-11 px-4 text-sm font-extrabold text-ink"
              >
                Just write &apos;the operator&apos;
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3.5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
        <div key={card.id} className="beat-swap flex flex-col items-center gap-3">
          {card.speaker && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sign-yellow px-3 py-1 text-xs font-extrabold text-ink shadow-sm">
              {card.speaker}
            </span>
          )}
          {(captions || !voiceLive) && (
            <p
              role="status"
              aria-live="polite"
              className="cold-caption display max-w-xl text-center text-[clamp(1.25rem,5vw,1.85rem)] leading-tight"
            >
              {card.caption}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {COLD_OPEN_CARDS.map((c, i) => (
            <span
              key={c.id}
              className={`h-2 rounded-full transition-[width,background-color] duration-200 ease-out ${
                i === index ? "w-6 bg-sign-yellow" : "w-2 bg-white/45"
              }`}
            />
          ))}
        </div>
        <p className="sr-only">
          Card {index + 1} of {COLD_OPEN_CARDS.length}.
        </p>
        {index < last && !card.interactive && (
          <p className="text-xs font-bold text-white/75">
            Tap anywhere to continue
          </p>
        )}
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
