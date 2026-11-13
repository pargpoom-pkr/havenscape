import React from "react";
import { Heart } from "lucide-react";

export default function ThankYouModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in-0 duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thanks-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#0d1218] p-7 text-center shadow-[0_0_60px_-12px_rgba(52,211,153,0.7)] ring-1 ring-inset ring-emerald-400/35 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-inset ring-emerald-400/40">
          <Heart className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 id="thanks-title" className="mt-4 font-heading text-lg font-bold text-neutral-100">
          Thank You
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Thank you for your support! Let&apos;s go and make a change for a better world. May
          Faith, Hope, Love, and Peace be with you.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-emerald-400 px-6 py-3 font-heading text-sm font-bold uppercase tracking-[0.16em] text-[#07110d] transition hover:brightness-110 active:scale-[0.99]"
        >
          Close
        </button>
      </div>
    </div>
  );
}