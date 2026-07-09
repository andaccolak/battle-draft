"use client";

import { useEffect, useState } from "react";

export default function TimerBar({ deadline, totalMs }: { deadline: number | null; totalMs: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const remaining = Math.max(0, deadline - now);
  const pct = Math.min(100, (remaining / totalMs) * 100);
  const urgent = remaining < 8000;

  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-200 ${urgent ? "bg-rose-500" : "bg-gradient-to-r from-indigo-400 to-fuchsia-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`mt-1 text-right text-xs font-bold tabular-nums ${urgent ? "text-rose-400" : "text-slate-400"}`}>
        {Math.ceil(remaining / 1000)}s
      </div>
    </div>
  );
}
