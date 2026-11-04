import type { ReactNode } from "react";

/** Moldura 9:16 com rótulo explícito de ilustração. */
export function PhoneFrame({
  children,
  label = "Ilustração",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <figure className={`relative ${className}`}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-line-strong bg-fg p-1.5 shadow-[var(--shadow-lift)]">
        <div className="relative h-full w-full overflow-hidden rounded-[22px]">
          {children}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 font-mono text-xs uppercase tracking-wider text-white/80 backdrop-blur">
            <span className="anim-pulse h-1.5 w-1.5 rounded-full bg-brand" />
            9:16
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center font-mono text-xs uppercase tracking-wider text-subtle">
        {label}
      </figcaption>
    </figure>
  );
}
