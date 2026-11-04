import type { TimingPlan } from "@/lib/engine";

const SHADES = ["bg-brand", "bg-brand/75", "bg-brand/55", "bg-brand/40", "bg-brand/28", "bg-brand/18"];

function tc(frame: number, fps: number) {
  const total = Math.floor(frame / fps);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:${pad(frame % fps)}`;
}

/** Visualização dos trechos narrativos do plano de tempo, com timecode. */
export function TimelineBar({ plan, animated = false, compact = false }: { plan: TimingPlan; animated?: boolean; compact?: boolean }) {
  return (
    <div>
      <div className="relative flex h-9 gap-[2px] overflow-hidden rounded-lg" role="img" aria-label={`Linha do tempo de ${plan.durationSec} segundos com ${plan.beats.length} trechos: ${plan.beats.map((b) => b.name).join(", ")}`}>
        {plan.beats.map((b, i) => {
          const decision = b.key === "decisao";
          return (
            <div
              key={b.key}
              className={`${decision ? "bg-pink" : SHADES[i % SHADES.length]} flex min-w-0 items-end px-1.5 pb-1`}
              style={{ flexGrow: b.endFrame - b.startFrame, flexBasis: 0, minWidth: decision ? 30 : undefined }}
            >
              {decision ? (
                <span className="font-mono text-xs font-bold text-fg">A/B</span>
              ) : (
                !compact && <span className={`truncate text-xs font-medium ${i < 2 ? "text-white" : "text-fg"}`}>{b.name}</span>
              )}
            </div>
          );
        })}
        {animated && (
          <div className="anim-playhead pointer-events-none absolute inset-y-0 w-0.5 bg-fg" aria-hidden="true" />
        )}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-xs text-subtle" aria-hidden="true">
        <span>{tc(0, plan.fps)}</span>
        <span>{plan.fps} fps · {plan.totalFrames} frames</span>
        <span>{tc(plan.totalFrames, plan.fps)}</span>
      </div>
    </div>
  );
}
