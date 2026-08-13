import { create } from "zustand";
import { toast } from "sonner";
import { applyAnatomyEdit, parseAnatomy } from "./anatomy";
import {
  editImage,
  generateImage,
  getAiStatus,
  promptFromImage,
  rewritePrompt,
  verifyImagineKey,
} from "./api";
import { measureDataUrl, readImageFile } from "./aspect";
import { clearImagineKey, loadImagineKey, saveImagineKey } from "./keys";
import { loadFrames, loadMeta, saveFrame, saveMeta } from "./persist";
import type { Anatomy, AnatomyKey, AspectRatio, Frame, StudioStatus } from "./types";

type StudioState = {
  ready: boolean;
  platformKey: boolean;
  personalKey: boolean;
  prompt: string;
  committedPrompt: string;
  change: string;
  aspectRatio: AspectRatio;
  quality: boolean;
  status: StudioStatus;
  frames: Frame[];
  activeId: string | null;
  lastSummary: string;
  flashToken: number;
  anatomy: Anatomy;
  hydrate: () => Promise<void>;
  setPrompt: (prompt: string) => void;
  setChange: (change: string) => void;
  setQuality: (quality: boolean) => void;
  editAnatomy: (key: AnatomyKey, value: string) => void;
  connectKey: (key: string) => Promise<boolean>;
  disconnectKey: () => void;
  importPlate: (file: File) => Promise<void>;
  generate: () => Promise<void>;
  applyChange: (override?: string) => Promise<void>;
  restore: (id: string) => void;
};

function persistMeta(state: Pick<StudioState, "prompt" | "aspectRatio" | "quality">) {
  saveMeta({
    prompt: state.prompt,
    aspectRatio: state.aspectRatio,
    quality: state.quality,
  });
}

function newId() {
  return crypto.randomUUID();
}

function clientKey(): string | undefined {
  const key = loadImagineKey();
  return key || undefined;
}

function normalizeFrame(row: Frame): Frame {
  return {
    ...row,
    width: row.width || 0,
    height: row.height || 0,
  };
}

async function plateSize(
  dataUrl: string,
  fallback?: { width: number; height: number },
): Promise<{ width: number; height: number }> {
  try {
    return await measureDataUrl(dataUrl);
  } catch {
    return { width: fallback?.width ?? 0, height: fallback?.height ?? 0 };
  }
}

export const useStudio = create<StudioState>((set, get) => ({
  ready: false,
  platformKey: false,
  personalKey: false,
  prompt: "",
  committedPrompt: "",
  change: "",
  aspectRatio: "3:2",
  quality: false,
  status: "idle",
  frames: [],
  activeId: null,
  lastSummary: "",
  flashToken: 0,
  anatomy: parseAnatomy(""),

  hydrate: async () => {
    const [meta, rawFrames, status] = await Promise.all([
      Promise.resolve(loadMeta()),
      loadFrames(),
      getAiStatus().catch(() => ({ available: false, source: "none" as const })),
    ]);
    const frames = rawFrames.map(normalizeFrame);
    const last = frames[frames.length - 1];
    const prompt = meta?.prompt ?? last?.prompt ?? "";
    set({
      ready: true,
      platformKey: status.source === "platform",
      personalKey: Boolean(loadImagineKey()),
      prompt,
      committedPrompt: last?.prompt ?? "",
      aspectRatio: last?.aspectRatio ?? meta?.aspectRatio ?? "3:2",
      quality: meta?.quality ?? false,
      frames,
      activeId: last?.id ?? null,
      lastSummary: last?.summary ?? "",
      anatomy: parseAnatomy(prompt),
    });
  },

  setPrompt: (prompt) => {
    set({ prompt, anatomy: parseAnatomy(prompt) });
    persistMeta(get());
  },

  setChange: (change) => set({ change }),

  setQuality: (quality) => {
    set({ quality });
    persistMeta(get());
  },

  editAnatomy: (key, value) => {
    const { prompt, anatomy } = get();
    const next = applyAnatomyEdit(prompt, key, value, anatomy);
    set({ prompt: next, anatomy: parseAnatomy(next) });
    persistMeta(get());
  },

  connectKey: async (key) => {
    const trimmed = key.trim();
    if (!trimmed) {
      toast("Paste your xAI API key.");
      return false;
    }
    try {
      const result = await verifyImagineKey({ data: { apiKey: trimmed } });
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      saveImagineKey(trimmed);
      set({ personalKey: true });
      toast("Grok Imagine connected.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify the key.");
      return false;
    }
  },

  disconnectKey: () => {
    clearImagineKey();
    set({ personalKey: false });
  },

  importPlate: async (file) => {
    if (get().status !== "idle") return;
    try {
      const plate = await readImageFile(file);
      const frame: Frame = {
        id: newId(),
        prompt: get().prompt,
        imageDataUrl: plate.dataUrl,
        summary: "Opened plate",
        aspectRatio: plate.aspectRatio,
        width: plate.width,
        height: plate.height,
        createdAt: Date.now(),
      };
      const frames = [...get().frames, frame].slice(-24);
      set({
        frames,
        activeId: frame.id,
        aspectRatio: plate.aspectRatio,
        lastSummary: frame.summary,
        status: "reading",
      });
      persistMeta(get());
      void saveFrame(frame);

      if (!get().platformKey && !get().personalKey) {
        set({ status: "idle" });
        toast("Plate opened. Connect Imagine to read a prompt from it.");
        return;
      }

      const read = await promptFromImage({
        data: { imageDataUrl: plate.dataUrl, apiKey: clientKey() },
      });
      if (!read.ok) {
        toast.error(read.error);
        set({ status: "idle" });
        return;
      }
      const updated: Frame = { ...frame, prompt: read.prompt, summary: read.summary };
      set({
        status: "idle",
        prompt: read.prompt,
        committedPrompt: read.prompt,
        anatomy: parseAnatomy(read.prompt),
        lastSummary: read.summary,
        flashToken: get().flashToken + 1,
        frames: get().frames.map((f) => (f.id === frame.id ? updated : f)),
      });
      persistMeta(get());
      void saveFrame(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open that image.");
      set({ status: "idle" });
    }
  },

  generate: async () => {
    const { prompt, aspectRatio, quality, status, frames, activeId } = get();
    if (status !== "idle") return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast("Write a prompt first.");
      return;
    }
    set({ status: "generating" });
    try {
      const current = frames.find((f) => f.id === activeId);
      const result = current
        ? await editImage({
            data: {
              prompt: trimmed,
              imageDataUrl: current.imageDataUrl,
              aspectRatio: current.aspectRatio || aspectRatio,
              quality,
              apiKey: clientKey(),
            },
          })
        : await generateImage({
            data: {
              prompt: trimmed,
              aspectRatio,
              quality,
              apiKey: clientKey(),
            },
          });
      if (!result.ok) {
        toast.error(result.error);
        set({ status: "idle" });
        return;
      }
      const size = await plateSize(result.imageDataUrl, current);
      const frame: Frame = {
        id: newId(),
        prompt: trimmed,
        imageDataUrl: result.imageDataUrl,
        summary: current ? "Reshot from plate" : "Generated from prompt",
        aspectRatio: current?.aspectRatio || aspectRatio,
        width: size.width,
        height: size.height,
        createdAt: Date.now(),
      };
      const nextFrames = [...get().frames, frame].slice(-24);
      set({
        status: "idle",
        frames: nextFrames,
        activeId: frame.id,
        committedPrompt: trimmed,
        lastSummary: frame.summary,
        aspectRatio: frame.aspectRatio,
      });
      persistMeta(get());
      void saveFrame(frame);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generate failed.");
      set({ status: "idle" });
    }
  },

  applyChange: async (override) => {
    const { prompt, change, aspectRatio, quality, status, frames, activeId } =
      get();
    if (status !== "idle") return;
    const request = (override ?? change).trim();
    if (!request) {
      toast("Describe what should change.");
      return;
    }
    if (!prompt.trim()) {
      toast("Open a plate or write a prompt first.");
      return;
    }

    set({ status: "translating", change: request });
    try {
      const key = clientKey();
      const translated = await rewritePrompt({
        data: { prompt: prompt.trim(), change: request, apiKey: key },
      });
      if (!translated.ok) {
        toast.error(translated.error);
        set({ status: "idle" });
        return;
      }

      set({
        prompt: translated.prompt,
        anatomy: parseAnatomy(translated.prompt),
        lastSummary: translated.summary,
        flashToken: get().flashToken + 1,
        status: "generating",
      });
      persistMeta(get());

      const current = frames.find((f) => f.id === activeId);
      const result = current
        ? await editImage({
            data: {
              prompt: request,
              imageDataUrl: current.imageDataUrl,
              aspectRatio: current.aspectRatio || aspectRatio,
              quality,
              apiKey: key,
            },
          })
        : await generateImage({
            data: {
              prompt: translated.prompt,
              aspectRatio,
              quality,
              apiKey: key,
            },
          });

      if (!result.ok) {
        toast.error(result.error);
        set({ status: "idle", committedPrompt: "" });
        return;
      }

      const size = await plateSize(result.imageDataUrl, current);
      const frame: Frame = {
        id: newId(),
        prompt: translated.prompt,
        imageDataUrl: result.imageDataUrl,
        summary: translated.summary,
        aspectRatio: current?.aspectRatio || aspectRatio,
        width: size.width,
        height: size.height,
        createdAt: Date.now(),
      };
      const nextFrames = [...get().frames, frame].slice(-24);
      set({
        status: "idle",
        frames: nextFrames,
        activeId: frame.id,
        committedPrompt: translated.prompt,
        change: "",
        lastSummary: translated.summary,
        aspectRatio: frame.aspectRatio,
      });
      persistMeta(get());
      void saveFrame(frame);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed.");
      set({ status: "idle" });
    }
  },

  restore: (id) => {
    const frame = get().frames.find((f) => f.id === id);
    if (!frame) return;
    set({
      activeId: frame.id,
      prompt: frame.prompt,
      committedPrompt: frame.prompt,
      aspectRatio: frame.aspectRatio,
      lastSummary: frame.summary,
      anatomy: parseAnatomy(frame.prompt),
      flashToken: get().flashToken + 1,
    });
    persistMeta(get());
  },
}));

export function selectActiveFrame(state: StudioState): Frame | undefined {
  return state.frames.find((f) => f.id === state.activeId);
}

export function selectIsStale(state: StudioState): boolean {
  return (
    Boolean(state.committedPrompt) &&
    state.prompt.trim() !== state.committedPrompt.trim()
  );
}

export function selectImagineReady(state: StudioState): boolean {
  return state.platformKey || state.personalKey;
}
