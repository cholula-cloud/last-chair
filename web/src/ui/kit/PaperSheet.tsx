"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CloseIcon } from "@/ui/kit/icons";

type SheetState = "enter" | "open" | "closing";

const EXIT_MS = 200;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.11; // px per ms

/**
 * Cream paper card that rises from the bottom edge. The body scrolls; an
 * optional footer stays pinned so the primary action is always in reach.
 * Dismissible sheets close from the X, Escape, or a downward drag / flick on
 * the handle.
 */
export function PaperSheet({
  title,
  subtitle,
  onClose,
  closeLabel,
  modal = false,
  footer,
  children,
  z = "z-40",
  wide = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  /** Dim the scene behind the sheet (night recap, founder pick, review). */
  modal?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  z?: string;
  /** Widen on short landscape screens so the body can use two columns. */
  wide?: boolean;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<SheetState>("enter");

  // data-state fallback for browsers without @starting-style: render off
  // screen, then flip to "open" on the next frame so the transition runs.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setState((s) => (s === "enter" ? "open" : s)),
      ),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const close = useCallback(() => {
    if (!onClose) return;
    setState("closing");
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, close]);

  const drag = useRef<{
    id: number;
    y0: number;
    t0: number;
    dy: number;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onClose || drag.current) return; // ignore extra fingers
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      y0: e.clientY,
      t0: performance.now(),
      dy: 0,
    };
    sheetRef.current?.setAttribute("data-dragging", "");
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !sheetRef.current) return;
    const raw = e.clientY - d.y0;
    // Damped when pulled upward past the resting position.
    d.dy = raw >= 0 ? raw : -Math.sqrt(-raw) * 2;
    sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = sheetRef.current;
    if (!el) return;
    el.removeAttribute("data-dragging");
    el.style.transform = "";
    const velocity = d.dy / Math.max(1, performance.now() - d.t0);
    if (d.dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) close();
  };

  return (
    <div
      className={`fixed inset-0 ${z} pointer-events-none flex items-end justify-center`}
    >
      {modal && (
        <div
          data-state={state}
          className="scrim pointer-events-auto absolute inset-0 bg-navy/55"
          aria-hidden="true"
        />
      )}
      <section
        ref={sheetRef}
        data-state={state}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={titleId}
        className={`paper sheet pointer-events-auto relative flex max-h-[min(88dvh,820px)] w-full max-w-xl flex-col short:max-h-[calc(100dvh-0.75rem)] ${wide ? "short:max-w-[min(54rem,calc(100vw-2rem))]" : ""} rounded-t-[22px] sm:mb-3 sm:rounded-[22px] short:mb-0 short:rounded-b-none`}
      >
        <div
          className={`select-none ${onClose ? "cursor-grab touch-none" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="flex justify-center pt-2.5 short:pt-1.5"
            aria-hidden="true"
          >
            <span className="h-1.5 w-11 rounded-full bg-ink/20" />
          </div>
          <header className="flex items-start gap-3 px-5 pb-2 pt-2 short:pb-1 short:pt-0.5">
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="serif text-[1.65rem] font-semibold leading-tight text-ink short:text-[1.35rem]"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={close}
                aria-label={closeLabel ?? "Close"}
                className="press -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 active:bg-ink/10"
              >
                <CloseIcon />
              </button>
            )}
          </header>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <footer className="stitch px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 short:pb-[max(0.6rem,env(safe-area-inset-bottom))] short:pt-2">
            {footer}
          </footer>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </section>
    </div>
  );
}
