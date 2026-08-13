import type { AspectRatio, Frame } from "./types";

const DB_NAME = "halide-studio";
const STORE = "frames";
const META_KEY = "halide-meta";
const MAX_FRAMES = 24;

export type StudioMeta = {
  prompt: string;
  aspectRatio: AspectRatio;
  quality: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadFrames(): Promise<Frame[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as Frame[]).sort(
          (a, b) => a.createdAt - b.createdAt,
        );
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveFrame(frame: Frame): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const existing = await loadFrames();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put(frame);
      const overflow = [...existing, frame]
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, Math.max(0, existing.length + 1 - MAX_FRAMES));
      for (const old of overflow) {
        if (old.id !== frame.id) store.delete(old.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadMeta(): StudioMeta | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudioMeta;
  } catch {
    return null;
  }
}

export function saveMeta(meta: StudioMeta) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
