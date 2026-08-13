import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { selectImagineReady, useStudio } from "@/lib/studio/store";

export function ImagineConnect({ compact = false }: { compact?: boolean }) {
  const platformKey = useStudio((s) => s.platformKey);
  const personalKey = useStudio((s) => s.personalKey);
  const ready = useStudio(selectImagineReady);
  const connectKey = useStudio((s) => s.connectKey);
  const disconnectKey = useStudio((s) => s.disconnectKey);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await connectKey(value);
    setBusy(false);
    if (ok) {
      setValue("");
      setOpen(false);
    }
  }

  if (platformKey) {
    return compact ? (
      <span className="hidden text-xs text-muted sm:inline">Imagine 2.0</span>
    ) : null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={ready ? "ghost" : "secondary"}
          size={compact ? "sm" : "default"}
        >
          {ready ? "Imagine connected" : "Connect Grok Imagine"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Grok Imagine</DialogTitle>
          <DialogDescription>
            Halide develops plates with Grok Imagine 2.0 on your xAI account —
            the same Imagine models as Grok. The key stays on this device and
            is never written into the project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            xAI API key
            <Input
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="xai-…"
              className="mt-1.5 font-mono"
            />
          </label>
          <p className="text-xs text-subtle">
            Create one at{" "}
            <a
              href="https://console.x.ai/"
              target="_blank"
              rel="noreferrer"
              className="text-fg underline-offset-4 hover:underline"
            >
              console.x.ai
            </a>{" "}
            with your SuperGrok subscription.
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {personalKey ? (
              <button
                type="button"
                className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
                onClick={() => {
                  disconnectKey();
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={busy || !value.trim()}>
              {busy ? "Checking…" : "Connect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
