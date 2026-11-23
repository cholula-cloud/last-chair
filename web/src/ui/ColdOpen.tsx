"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio as sound } from "@/audio/engine";
import { sliderGain } from "@/audio/mix";
import { OPERATOR_NAME_MAX, sanitizeOperatorName } from "@/game/content";
import { useGameStore } from "@/game/store";
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

/** Deterministic slight offsets so hand-punched ride holes feel tactile rather than stamped on a ruler. */
const PUNCH_OFFSETS = [
  "translate-x-[1px] -translate-y-[1px]",
  "-translate-x-[1px] translate-y-[1px]",
  "translate-x-[0.5px] translate-y-[1px]",
  "-translate-x-[1px] -translate-y-[0.5px]",
  "translate-x-[1px] translate-y-0",
  "-translate-x-[0.5px] -translate-y-[1px]",
  "translate-x-0 translate-y-[1px]",
  "translate-x-[1px] -translate-y-[0.5px]",
  "-translate-x-[1px] translate-y-[0.5px]",
  "translate-x-[0.5px] -translate-y-[1px]",
  "-translate-x-[0.5px] translate-y-[1px]",
] as const;

function TicketWicketHole() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-2 z-10 size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-[#15293e] shadow-[inset_0_2px_2px_rgba(0,0,0,0.65)] ring-2 ring-[#f8efd4]/85"
    />
  );
}

function TicketStub({ left, right }: { left: string; right: string }) {
  return (
    <div className="relative mt-auto flex items-center justify-between border-t-2 border-dashed border-ink/40 bg-[#f2e3bc] px-4 py-2.5 text-xs">
      <span
        aria-hidden="true"
        className="absolute -left-2.5 -top-2.5 size-4 rounded-full border-[3px] border-ink bg-[#15293e]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-2.5 -top-2.5 size-4 rounded-full border-[3px] border-ink bg-[#15293e]"
      />
      <span className="font-bold text-ink-soft tabular-nums">{left}</span>
      <span className="font-extrabold text-ink">{right}</span>
    </div>
  );
}

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
          <button
            type="button"
            onClick={() => (cardFlipped ? advance() : setCardFlipped(true))}
            aria-label={cardFlipped ? "One ride left on the punch card. Tap to continue." : "Tap Grammy Dot's 1984-85 punch card to turn it over."}
            className="punch-card-scene press-scale pointer-events-auto w-full max-w-xs text-left text-ink"
          >
            <div
              data-flipped={cardFlipped ? "true" : "false"}
              className="punch-card-inner grid"
            >
              {/* Front face */}
              <div className="punch-card-face col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#f8efd4] shadow-[0_6px_0_var(--ink)]">
                <TicketWicketHole />
                <div className="flex items-center justify-between border-b-[3px] border-ink bg-sign-green px-4 pb-2.5 pt-6 text-white">
                  <span className="text-[0.82rem] font-extrabold text-sign-green-ink">
                    Dutch Hill Ski Area
                  </span>
                  <span className="rounded-md border-2 border-ink bg-sign-yellow px-2 py-0.5 text-[0.72rem] font-extrabold text-ink tabular-nums">
                    1984-85
                  </span>
                </div>
                <div className="px-4 pb-3 pt-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="display text-[1.22rem] leading-none text-ink">
                      Season Punch Card
                    </p>
                    <span className="text-xs font-extrabold text-ink-soft">
                      12 rides
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 12 }, (_, i) => {
                      const unpunched = i === 11;
                      if (unpunched) {
                        return (
                          <span
                            key={i}
                            className="flex h-11 flex-col items-center justify-center rounded-md border-2 border-ink bg-sign-yellow-soft px-1 py-1"
                          >
                            <span className="flex size-6 items-center justify-center rounded-full border-2 border-ink bg-sign-yellow text-[0.7rem] font-extrabold leading-none text-ink shadow-[0_1px_0_var(--ink)] tabular-nums">
                              12
                            </span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={i}
                          className="relative flex h-11 flex-col items-center justify-between rounded-md border border-ink/25 bg-[#f3e4bd] py-1"
                        >
                          <span className="text-[0.58rem] font-extrabold leading-none text-ink-soft/85 tabular-nums">
                            {i + 1}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`size-[18px] rounded-full border-2 border-ink bg-[#15293e] shadow-[inset_0_2px_2px_rgba(0,0,0,0.65)] ${PUNCH_OFFSETS[i]}`}
                          />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <TicketStub left="No. 01985" right="Tap to turn over" />
              </div>

              {/* Back face */}
              <div className="punch-card-face punch-card-back col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#f8efd4] shadow-[0_6px_0_var(--ink)]">
                <TicketWicketHole />
                <div className="flex items-center justify-between border-b-[3px] border-ink bg-[#efe0b5] px-4 pb-2.5 pt-6 text-xs font-extrabold">
                  <span className="text-sign-brown">Grammy Dot’s ticket box</span>
                  <span className="text-ink-soft tabular-nums">March 1985</span>
                </div>
                <div className="flex flex-1 flex-col justify-between px-4 pb-3 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="display flex size-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sign-yellow text-base text-ink shadow-[0_2px_0_var(--ink)]">
                      12
                    </span>
                    <div className="min-w-0">
                      <p className="display text-[1.2rem] leading-tight text-ink">
                        One ride left
                      </p>
                      <p className="mt-0.5 text-xs font-bold leading-snug text-ink-soft">
                        Eleven punched. Number twelve is still whole.
                      </p>
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-3 flex items-center justify-between gap-1 rounded-lg border border-ink/25 bg-[#f2e3bc] px-2.5 py-2"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-sign-yellow text-[0.52rem] font-extrabold leading-none text-ink">
                      12
                    </span>
                    {Array.from({ length: 11 }, (_, i) => (
                      <span
                        key={i}
                        className="size-3 rounded-full border-[1.5px] border-ink bg-[#15293e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.65)]"
                      />
                    ))}
                  </div>
                </div>
                <TicketStub left="Keep till closing" right="Tap to continue." />
              </div>
            </div>
          </button>
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
