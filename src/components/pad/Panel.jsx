import React from "react";

export default function Panel({ title, hint, action, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-white/[0.025] p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-sm font-semibold tracking-wide text-neutral-100">{title}</h2>
          {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}