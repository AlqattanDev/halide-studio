import { useEffect, useRef } from "react";
import { Aperture, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { wordDiff } from "@/lib/studio/anatomy";
import { selectImagineReady, selectIsStale, useStudio } from "@/lib/studio/store";
import { ANATOMY_META, QUICK_CHANGES, STARTERS } from "@/lib/studio/types";

export function PromptPanel() {
  const prompt = useStudio((s) => s.prompt);
  const change = useStudio((s) => s.change);
  const status = useStudio((s) => s.status);
  const anatomy = useStudio((s) => s.anatomy);
  const flashToken = useStudio((s) => s.flashToken);
  const lastSummary = useStudio((s) => s.lastSummary);
  const committedPrompt = useStudio((s) => s.committedPrompt);
  const stale = useStudio(selectIsStale);
  const imagineReady = useStudio(selectImagineReady);
  const setPrompt = useStudio((s) => s.setPrompt);
  const setChange = useStudio((s) => s.setChange);
  const editAnatomy = useStudio((s) => s.editAnatomy);
  const generate = useStudio((s) => s.generate);
  const applyChange = useStudio((s) => s.applyChange);
  const busy = status !== "idle";
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!flashToken) return;
    const el = areaRef.current;
    if (!el) return;
    el.classList.remove("ring-2", "ring-warn/40");
    void el.offsetWidth;
    el.classList.add("ring-2", "ring-warn/40");
    const t = window.setTimeout(
      () => el.classList.remove("ring-2", "ring-warn/40"),
      900,
    );
    return () => window.clearTimeout(t);
  }, [flashToken]);

  const diff =
    flashToken > 0 && committedPrompt
      ? wordDiff(committedPrompt, prompt)
      : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            Master prompt
          </p>
          <p className="mt-1 text-sm text-muted">
            Open a photo on the plate — the prompt is read from it. Or write
            one here.
          </p>
        </div>
        {stale ? <Badge variant="warn">Prompt ahead</Badge> : null}
      </div>

      <div className="relative">
        <Textarea
          ref={areaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void generate();
            }
          }}
          placeholder="A still of…"
          className="min-h-40 bg-inset font-display text-lg leading-snug tracking-tight transition-[box-shadow] duration-300 sm:min-h-48"
          disabled={busy}
        />
        {diff && status === "translating" ? (
          <p className="pointer-events-none absolute inset-0 overflow-hidden px-4 py-3 font-display text-lg leading-snug tracking-tight text-fg/80">
            {diff.map((part, i) => (
              <span
                key={`${i}-${part.word}`}
                className={part.added ? "text-warn" : undefined}
              >
                {part.word}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Live translation
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ANATOMY_META.map((field) => (
            <label
              key={field.key}
              className="flex flex-col gap-1 rounded-md bg-raised px-3 py-2 shadow-[var(--shadow-border)]"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
                {field.label}
              </span>
              <input
                value={anatomy[field.key]}
                onChange={(e) => editAnatomy(field.key, e.target.value)}
                disabled={busy}
                placeholder="—"
                className="bg-transparent text-sm text-fg outline-none placeholder:text-subtle/70"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">
          Edit a field and the prompt rewrites itself.
        </p>
      </div>

      {!prompt.trim() ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            Or start from a written plate
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="rounded-md bg-raised px-3 py-2.5 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="block font-display text-sm italic">
                  {s.title}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {s.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto space-y-3 rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            Request a change
          </p>
          {lastSummary ? (
            <span className="truncate text-xs text-muted">{lastSummary}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input
            value={change}
            onChange={(e) => setChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void applyChange();
              }
            }}
            placeholder="Make the sky violet, pull back, add fog…"
            disabled={busy}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void applyChange()}
            disabled={busy || !imagineReady}
            className="shrink-0"
          >
            Apply
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHANGES.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy || !imagineReady}
              onClick={() => void applyChange(q)}
              className="h-8 rounded-full bg-raised px-3 text-xs text-muted shadow-[var(--shadow-border)] transition-colors duration-150 hover:text-fg disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
        <p className="text-xs text-subtle">
          Applies rewrite the prompt, then edit the plate you started with.
          The frame keeps the same shape.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={busy || !prompt.trim() || !imagineReady}
        onClick={() => void generate()}
        className="w-full"
      >
        <Aperture className="size-4" />
        {status === "generating"
          ? "Imagine…"
          : imagineReady
            ? "Generate with Imagine"
            : "Connect Imagine first"}
        <span className="ml-auto hidden text-xs opacity-70 sm:inline">
          ⌘↵
        </span>
      </Button>
    </section>
  );
}
