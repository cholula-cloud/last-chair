"use client";

import { useState } from "react";
import { exportSessionReplay } from "@/game/store";

export function ReplayNotes() {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function exportNotes(share: boolean) {
    const file = new File([JSON.stringify({ ...exportSessionReplay(), notes })], "last-chair-replay.json", { type: "application/json" });
    if (share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "Last Chair playtest", files: [file] });
        setMessage("Replay shared.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(share ? "Notes and replay downloaded. Attach the file to your feedback." : "Replay downloaded.");
  }

  return <details className="panel p-3">
    <summary className="min-h-11 cursor-pointer font-bold">Playtest notes</summary>
    <label className="block">What happened?
      <textarea className="block w-full rounded border p-2" value={notes} onChange={event => setNotes(event.target.value)} />
    </label>
    <div className="mt-2 flex flex-wrap gap-2">
      <button className="key min-h-11 px-3" onClick={() => void exportNotes(false)}>Export replay</button>
      <button className="key min-h-11 px-3" onClick={() => void exportNotes(true)}>Send notes</button>
    </div>
    <p role="status">{message}</p>
  </details>;
}
