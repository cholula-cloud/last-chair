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

const EXIT_MS = 180;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.11; // px per ms
const VELOCITY_WINDOW_MS = 90;

/** Apple progressive boundary damping past the top resting position. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

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
  focusClose = false,
  modal = false,
  footer,
  children,
  z = "z-40",
  wide = false,
  compact = false,
  aside,
  titleHidden = false,
  mood,
  dataMarker,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  /** Move focus to Close after opening from another sheet. */
  focusClose?: boolean;
  /** Dim the scene behind the sheet (night recap, founder pick, review). */
  modal?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  z?: string;
  /** Widen on short landscape screens so the body can use two columns. */
  wide?: boolean;
  /** Reduce the maximum width for a short detail sheet. */
  compact?: boolean;
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
  /** Extra data attribute on the dialog (e.g. build sheet camera framing). */
  dataMarker?: string;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [state, setState] = useState<SheetState>("enter");

  useEffect(() => {
    if (focusClose) closeButtonRef.current?.focus({ preventScroll: true });
  }, [focusClose]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

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
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setState("closing");
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, EXIT_MS);
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
    baseY: number;
    dy: number;
    samples: Array<{ y: number; t: number }>;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onClose || drag.current) return; // ignore extra fingers
    if ((e.target as HTMLElement).closest("button")) return;
    const el = sheetRef.current;
    if (!el) return;

    let baseY = 0;
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      baseY = Number.isFinite(matrix.m42) ? Math.max(0, matrix.m42) : 0;
      setState("open");
      el.setAttribute("data-state", "open");
      if (scrimRef.current) scrimRef.current.style.opacity = "";
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    drag.current = {
      id: e.pointerId,
      y0: e.clientY,
      baseY,
      dy: baseY,
      samples: [{ y: baseY, t: now }],
    };
    el.setAttribute("data-dragging", "");
    el.style.transform = `translateY(${baseY}px)`;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || d.id !== e.pointerId || !el) return;
    const raw = d.baseY + (e.clientY - d.y0);
    const height = el.offsetHeight || 420;
    // Rubber-band softly when pulled upward past resting position.
    d.dy = raw >= 0 ? raw : -rubberband(-raw, height, 0.25);
    el.style.transform = `translateY(${d.dy}px)`;

    if (scrimRef.current) {
      const progress = Math.max(0, Math.min(1, d.dy / Math.max(220, height * 0.8)));
      scrimRef.current.style.transition = "none";
      scrimRef.current.style.opacity = String(1 - progress);
    }

    const now = performance.now();
    d.samples.push({ y: d.dy, t: now });
    while (d.samples.length > 2 && now - d.samples[0]!.t > VELOCITY_WINDOW_MS) {
      d.samples.shift();
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = sheetRef.current;
    if (!el) return;

    const now = performance.now();
    const oldest = d.samples[0] ?? { y: d.dy, t: now };
    const dt = Math.max(1, now - oldest.t);
    const velocity = (d.dy - oldest.y) / dt;
    const shouldDismiss = d.dy > DISMISS_DISTANCE || (d.dy > 16 && velocity > DISMISS_VELOCITY);

    el.removeAttribute("data-dragging");
    if (scrimRef.current) {
      scrimRef.current.style.transition = "";
      scrimRef.current.style.opacity = "";
    }

    if (shouldDismiss) {
      // Flip DOM state before clearing inline transform so exit transition starts from d.dy.
      el.setAttribute("data-state", "closing");
      void el.offsetHeight;
      el.style.transform = "";
      close();
    } else {
      el.style.transform = "";
    }
  };

  return (
    <div
      className={`fixed inset-0 ${z} pointer-events-none flex items-end justify-center`}
    >
      {modal && (
        <div
          ref={scrimRef}
          data-state={state}
          className="scrim pointer-events-auto absolute inset-0 bg-ink/55"
          aria-hidden="true"
        />
      )}
      <SheetTitleId.Provider value={titleId}>
      <section
        ref={sheetRef}
        {...(dataMarker ? { [`data-${dataMarker}`]: true } : {})}
        data-state={state}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={titleId}
        data-mood={mood}
        className={`sheet pointer-events-auto relative flex max-h-[min(88dvh,820px)] w-full ${compact ? "max-w-sm" : "max-w-xl"} ${!compact && !wide ? "md:max-w-2xl" : ""} flex-col border-x-[3px] border-b-0 border-ink sm:mb-3 sm:rounded-b-sheet sm:border-b-[3px] short:mb-0 short:max-h-[calc(100dvh-2.5rem)] short:rounded-b-none short:border-b-0 ${wide ? "short:max-w-[min(54rem,calc(100vw-2rem))] md:max-w-[min(54rem,calc(100vw-2rem))]" : ""} ${aside ? "short:grid short:h-[calc(100dvh-2.5rem)] short:grid-cols-2 short:grid-rows-[auto_minmax(0,1fr)_auto] md:grid md:h-[min(86dvh,820px)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:grid-rows-[auto_minmax(0,1fr)_auto]" : ""}`}
      >
        <Ridge />
        <div
          className={`select-none ${aside ? "short:col-span-2 md:col-span-2" : ""} ${onClose ? "cursor-grab touch-pan-x" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {onClose && (
            <div
              className="flex justify-center pt-2 short:pt-1.5"
              aria-hidden="true"
            >
              <span className="h-1.5 w-11 rounded-full bg-ink/35" />
            </div>
          )}
          {(!titleHidden || onClose) && (
            <header className="flex items-start gap-3 px-4 pb-2 pt-1.5 sm:px-5 short:pb-1 short:pt-0.5">
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
                  ref={closeButtonRef}
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
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 ${titleHidden && !onClose ? "pt-4 short:pt-0" : ""} ${aside ? "short:contents md:contents" : ""}`}
        >
          {aside ? (
            <>
              <div className={`short:col-start-1 short:row-span-2 short:row-start-2 short:min-h-0 short:overflow-y-auto short:overscroll-contain short:px-5 short:pb-4 md:col-start-1 md:row-span-2 md:row-start-2 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:px-5 md:pb-4 ${titleHidden && !onClose ? "short:pt-6" : ""}`}>
                {children}
              </div>
              <div className={`mt-3 short:col-start-2 short:row-start-2 short:mt-0 short:min-h-0 short:overflow-y-auto short:overscroll-contain short:px-5 short:pb-2 md:col-start-2 md:row-start-2 md:mt-0 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:border-l-2 md:border-ink/15 md:px-5 md:pb-2 ${titleHidden && !onClose ? "short:pt-6" : ""}`}>
                {aside}
              </div>
            </>
          ) : (
            children
          )}
        </div>
        {footer && (
          <footer className={`px-5 ${aside ? "short:col-start-2 short:row-start-3 md:col-start-2 md:row-start-3 md:border-l-2 md:border-ink/15" : ""} pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 short:pb-[max(0.6rem,env(safe-area-inset-bottom))] short:pt-2`}>
            {footer}
          </footer>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </section>
      </SheetTitleId.Provider>
    </div>
  );
}
