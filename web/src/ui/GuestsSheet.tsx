"use client";

import { useGameStore } from "@/game/store";

export function GuestsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const setFollowId = useGameStore((s) => s.setFollowId);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-3xl border border-white/10 bg-[#0f1d33]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Guests</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-full text-slate-400"
        >
          ✕
        </button>
      </div>
      <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
        {guests.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{g.label}</p>
              <p className="text-xs capitalize text-slate-400">{g.state}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFollowId(followId === g.id ? null : g.id);
                onClose();
              }}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold ${
                followId === g.id
                  ? "bg-sky-500 text-white"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {followId === g.id ? "Following" : "Follow"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
