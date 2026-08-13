import { useStudio } from "@/lib/studio/store";
import { cn } from "@/lib/utils";

export function HistoryStrip() {
  const frames = useStudio((s) => s.frames);
  const activeId = useStudio((s) => s.activeId);
  const restore = useStudio((s) => s.restore);

  if (frames.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border bg-surface/80 px-4 py-3 sm:px-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Iterations
        </p>
        <p className="text-xs text-subtle">Click a plate to restore prompt and image</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {frames.map((frame, i) => {
          const active = frame.id === activeId;
          return (
            <button
              key={frame.id}
              type="button"
              onClick={() => restore(frame.id)}
              className={cn(
                "group relative h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-inset transition-[box-shadow,opacity] duration-150",
                active
                  ? "shadow-[0_0_0_1px_var(--color-accent)]"
                  : "shadow-[var(--shadow-border)] opacity-80 hover:opacity-100",
              )}
            >
              <img
                src={frame.imageDataUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 font-mono text-[10px] tabular-nums text-fg">
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
