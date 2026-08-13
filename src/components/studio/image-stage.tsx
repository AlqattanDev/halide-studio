import { useRef, useState } from "react";
import { Download, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cssAspect } from "@/lib/studio/aspect";
import { selectActiveFrame, useStudio } from "@/lib/studio/store";
import { cn } from "@/lib/utils";

export function ImageStage() {
  const frame = useStudio(selectActiveFrame);
  const status = useStudio((s) => s.status);
  const quality = useStudio((s) => s.quality);
  const setQuality = useStudio((s) => s.setQuality);
  const importPlate = useStudio((s) => s.importPlate);
  const frames = useStudio((s) => s.frames);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const busy = status !== "idle";

  const ratio = frame
    ? cssAspect(frame.width, frame.height, frame.aspectRatio.replace(":", " / "))
    : "4 / 3";
  const index = frame
    ? frames.findIndex((f) => f.id === frame.id) + 1
    : frames.length + 1;

  function download() {
    if (!frame) return;
    const a = document.createElement("a");
    a.href = frame.imageDataUrl;
    a.download = `halide-${String(index).padStart(2, "0")}.png`;
    a.click();
  }

  async function takeFile(file?: File | null) {
    if (!file || busy) return;
    await importPlate(file);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void takeFile(file);
        }}
      />

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          className={cn(
            "film-grain relative max-h-full w-full max-w-3xl overflow-hidden rounded-lg bg-inset shadow-[var(--shadow-border)] transition-[box-shadow] duration-150",
            dragOver && "shadow-[0_0_0_1px_var(--color-accent)]",
          )}
          style={{ aspectRatio: ratio }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void takeFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-5 flex-col justify-between py-3 sm:flex"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-auto block h-3 w-2.5 rounded-[2px] bg-bg" />
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-5 flex-col justify-between py-3 sm:flex"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-auto block h-3 w-2.5 rounded-[2px] bg-bg" />
            ))}
          </div>

          {frame ? (
            <img
              src={frame.imageDataUrl}
              alt={frame.prompt}
              className="h-full w-full object-contain outline outline-1 -outline-offset-1 outline-border"
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center"
            >
              <ImagePlus className="size-7 text-subtle" />
              <div>
                <p className="font-display text-2xl italic tracking-tight">
                  Open a plate
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  Drop a photo, or click to upload. The frame keeps the
                  picture’s shape. The prompt writes itself from what it sees.
                </p>
              </div>
            </button>
          )}

          {status !== "idle" ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-bg/55 backdrop-blur-[2px]">
              <p className="halide-shimmer font-display text-2xl italic">
                {status === "translating"
                  ? "Translating prompt"
                  : status === "reading"
                    ? "Reading the plate"
                    : "Grok Imagine"}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                {status === "translating"
                  ? "Change → prompt"
                  : status === "reading"
                    ? "Image → prompt"
                    : "Imagine 2.0"}
              </p>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-bg/80 via-bg/25 to-transparent px-6 pb-3 pt-12 sm:px-10">
            <span className="font-mono text-[11px] tabular-nums text-fg/80">
              {String(index).padStart(2, "0")}
            </span>
            {frame ? (
              <span className="max-w-[70%] truncate font-display text-xs italic text-fg/80">
                {frame.summary}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {frame ? "Start from another photo" : "Upload a photo"}
        </Button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuality(false)}
            className={cn(
              "h-8 rounded-full px-2.5 text-xs",
              !quality ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            1K
          </button>
          <button
            type="button"
            onClick={() => setQuality(true)}
            className={cn(
              "h-8 rounded-full px-2.5 text-xs",
              quality ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            2K
          </button>
          {frame ? (
            <Button type="button" variant="ghost" size="sm" onClick={download}>
              <Download className="size-4" />
              Save
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
