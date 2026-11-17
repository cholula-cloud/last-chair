"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CloseIcon } from "@/ui/kit/icons";

type SheetState = "enter" | "open" | "closing";

const SheetTitleId = createContext<string | undefined>(undefined);

/** The dialog's accessible name, for sheets that draw their own header (`titleHidden`). */
export function SheetTitle({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const id = useContext(SheetTitleId);
  return (
    <h2 id={id} className={className}>
      {children}
    </h2>
  );
}

const EXIT_MS = 200;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.11; // px per ms

/** Jagged snow ridgeline that caps the sheet; stretches with its width. */
function Ridge() {
  const line =
    "M1.5 34 L1.5 22 L40 8 L70 20 L110 2 L150 22 L190 10 L230 24 L270 4 L310 20 L350 8 L388.5 22 L388.5 34";
  return (
    <svg
      viewBox="0 0 390 34"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -left-[3px] -top-[31px] h-[34px] w-[calc(100%+6px)]"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${line} Z`} fill="var(--snow-2)" />
      <path
        d={line}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Sky-blue sheet that rises from the bottom edge. The body scrolls; an
 * optional footer stays pinned so the primary action is always in reach.
 * Dismissible sheets close from the X, Escape, or a downward drag / flick on
 * the handle.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  closeLabel,
  modal = false,
  footer,
  children,
  z = "z-40",
  wide = false,
  aside,
  titleHidden = false,
  mood,
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
  /**
   * Second column on short landscape screens, beside `children`, with the footer pinned under it;
   * each column scrolls on its own. On portrait it simply follows `children` in the one scrolling body.
   */
  aside?: ReactNode;
  /**
   * The sheet does not draw its own title; the body renders a `SheetTitle` (inside a road sign,
   * say). The dialog is still named by it.
   */
  titleHidden?: boolean;
  /** "night" warms the palette (see globals.css) for the night recap. */
  mood?: "night";
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
          className="scrim pointer-events-auto absolute inset-0 bg-ink/55"
          aria-hidden="true"
        />
      )}
      <SheetTitleId.Provider value={titleId}>
      <section
        ref={sheetRef}
        data-state={state}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={titleId}
        data-mood={mood}
        className={`sheet pointer-events-auto relative flex max-h-[min(88dvh,820px)] w-full max-w-xl flex-col border-x-[3px] border-b-0 border-ink sm:mb-3 sm:rounded-b-sheet sm:border-b-[3px] short:mb-0 short:max-h-[calc(100dvh-2.5rem)] short:rounded-b-none short:border-b-0 ${wide ? "short:max-w-[min(54rem,calc(100vw-2rem))]" : ""} ${aside ? "short:grid short:h-[calc(100dvh-2.5rem)] short:grid-cols-2 short:grid-rows-[auto_minmax(0,1fr)_auto]" : ""}`}
      >
        <Ridge />
        <div
          className={`select-none ${aside ? "short:col-span-2" : ""} ${onClose ? "cursor-grab touch-none" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {onClose && (
            <div
              className="flex justify-center pt-2.5 short:pt-1.5"
              aria-hidden="true"
            >
              <span className="h-1.5 w-11 rounded-full bg-ink/35" />
            </div>
          )}
          {(!titleHidden || onClose) && (
            <header className="flex items-start gap-3 px-5 pb-2 pt-2 short:pb-1 short:pt-0.5">
              <div className="min-w-0 flex-1">
                {!titleHidden && (
                  <>
                    <h2
                      id={titleId}
                      className="display display-lg text-[1.9rem] text-ink short:text-[1.55rem]"
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="mt-1 text-[0.95rem] font-bold leading-snug text-ink">
                        {subtitle}
                      </p>
                    )}
                  </>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={close}
                  aria-label={closeLabel ?? "Close"}
                  className="key key-sm press flex size-11 shrink-0 items-center justify-center text-ink"
                >
                  <CloseIcon />
                </button>
              )}
            </header>
          )}
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 ${titleHidden && !onClose ? "pt-4 short:pt-0" : ""} ${aside ? "short:contents" : ""}`}
        >
          {aside ? (
            <>
              <div className={`short:col-start-1 short:row-span-2 short:row-start-2 short:min-h-0 short:overflow-y-auto short:overscroll-contain short:px-5 short:pb-4 ${titleHidden && !onClose ? "short:pt-6" : ""}`}>
                {children}
              </div>
              <div className={`mt-3 short:col-start-2 short:row-start-2 short:mt-0 short:min-h-0 short:overflow-y-auto short:overscroll-contain short:px-5 short:pb-2 ${titleHidden && !onClose ? "short:pt-6" : ""}`}>
                {aside}
              </div>
            </>
          ) : (
            children
          )}
        </div>
        {footer && (
          <footer className={`px-5 ${aside ? "short:col-start-2 short:row-start-3" : ""} pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 short:pb-[max(0.6rem,env(safe-area-inset-bottom))] short:pt-2`}>
            {footer}
          </footer>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </section>
      </SheetTitleId.Provider>
    </div>
  );
}
