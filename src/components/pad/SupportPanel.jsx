import React, { useState } from "react";
import { Coffee, QrCode, Heart } from "lucide-react";
import Panel from "@/components/pad/Panel";
import ThankYouModal from "@/components/pad/ThankYouModal";

export const KOFI_URL = "https://ko-fi.com/parker7293";

/* 👇 REPLACE THIS LINK with your own uploaded Ko-fi QR code image.
   Example: "https://media.base44.com/images/public/xxxx/kofi-qr.png" */
const KOFI_QR_SRC =
  "https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=https%3A%2F%2Fko-fi.com%2Fparker7293";

export default function SupportPanel() {
  const [showQr, setShowQr] = useState(false);
  const [thanks, setThanks] = useState(false);

  return (
    <>
      <Panel
        title="Support HavenScape Pads"
        hint="Free forever — supported by people like you"
        action={
          <span className="flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-400/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-pink-300">
            <Heart className="h-3 w-3" /> Ko-fi
          </span>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs leading-relaxed text-neutral-500">
            If these pads help your worship team, you can buy me a coffee. Every bit keeps the
            sound engine alive and free.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <QrCode className="h-3.5 w-3.5" />
              {showQr ? "Hide Donation QR Code" : "Show Donation QR Code"}
            </button>

            <button
              type="button"
              onClick={() => setThanks(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#120a02] shadow-[0_0_24px_-8px_rgba(251,146,60,0.95)] transition hover:brightness-110"
            >
              <Coffee className="h-3.5 w-3.5" />
              Buy Me a Coffee
            </button>
          </div>
        </div>

        {showQr && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-5">
            <img
              /* 👇 swap KOFI_QR_SRC above with your uploaded QR image link */
              src={KOFI_QR_SRC}
              alt="Ko-fi donation QR code for HavenScape"
              className="h-48 w-48 rounded-xl bg-white p-2"
              loading="lazy"
            />
            <p className="text-center text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Scan to support · {KOFI_URL.replace("https://", "")}
            </p>
          </div>
        )}
      </Panel>

      <ThankYouModal open={thanks} onClose={() => setThanks(false)} />
    </>
  );
}