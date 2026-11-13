import React, { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

const STORAGE_KEY = "nx_prelive_snooze_until";
const DAY_MS = 24 * 60 * 60 * 1000;

const CHECKLIST = [
  {
    en: "Always Plug in the Power Cable",
    th: "เสียบสายชาร์จ (Power) เสมอ",
    noteEn: "Prevents hardware throttling and audio stuttering during live sessions.",
    noteTh: "ป้องกันการลดสปีดฮาร์ดแวร์และเสียงสะดุดระหว่างเล่นสด",
  },
  {
    en: "Set Power Mode to Best Performance",
    th: "ปรับ Power Mode เป็น Best Performance",
  },
  {
    en: "Use Google Chrome Browser",
    th: "ใช้เบราว์เซอร์ Google Chrome",
  },
];

/* shown once per 24h unless the user suppressed it */
const isSuppressed = () => {
  if (typeof window === "undefined") return false;
  const until = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
  return until > Date.now();
};

export default function PreLiveModal() {
  const [open, setOpen] = useState(() => !isSuppressed());
  const [suppress, setSuppress] = useState(false);

  if (!open) return null;

  const dismiss = () => {
    if (suppress) {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now() + DAY_MS));
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-in fade-in-0 duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prelive-title"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[#0d1218] p-6 shadow-[0_0_70px_-12px_rgba(251,146,60,0.85)] ring-2 ring-inset ring-amber-400/70 animate-in fade-in-0 zoom-in-95 duration-300 md:p-8">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />

        <div className="relative flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-inset ring-amber-400/50">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-400/80">
              Pre-Live Optimization
            </div>
            <h2 id="prelive-title" className="mt-1 font-heading text-xl font-bold text-amber-50">
              Before You Go Live <span className="text-amber-400/60">/</span>{" "}
              <span className="text-amber-100/90">ก่อนเริ่มเล่นสด</span>
            </h2>
          </div>
        </div>

        <ul className="relative mt-6 space-y-3">
          {CHECKLIST.map((item) => (
            <li
              key={item.en}
              className="rounded-2xl border border-amber-400/20 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-neutral-100">{item.en}</p>
                  <p className="text-sm text-amber-200/80">{item.th}</p>
                  {item.noteEn && (
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                      {item.noteEn} {item.noteTh}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setSuppress((v) => !v)}
          className="relative mt-5 flex w-full items-start gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition ${
              suppress
                ? "bg-amber-400 text-[#0d1218] ring-amber-400"
                : "bg-black/40 text-transparent ring-white/25"
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="text-[11px] leading-relaxed text-neutral-400">
            Don&apos;t show this message again for the next 24 hours
            <span className="block text-neutral-500">
              ไม่ต้องแสดงข้อความนี้อีกใน 24 ชม.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="relative mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3.5 font-heading text-sm font-bold uppercase tracking-[0.16em] text-[#120a02] shadow-[0_0_28px_-6px_rgba(251,146,60,0.95)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Got it! / รับทราบ
        </button>
      </div>
    </div>
  );
}