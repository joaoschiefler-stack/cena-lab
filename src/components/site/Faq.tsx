import { Plus } from "lucide-react";
import { FAQ } from "@/data/faq";

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {FAQ.map((item) => (
        <details key={item.q} className="group px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-fg [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus className="h-4 w-4 shrink-0 text-subtle transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="pb-5 pr-8 text-sm leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
