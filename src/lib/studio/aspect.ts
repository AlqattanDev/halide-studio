export const IMAGINE_ASPECTS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "2:1",
  "1:2",
  "19.5:9",
  "9:19.5",
  "20:9",
  "9:20",
] as const;

export type ImagineAspect = (typeof IMAGINE_ASPECTS)[number];

export function nearestAspect(width: number, height: number): ImagineAspect {
  const ratio = width / Math.max(height, 1);
  let best: ImagineAspect = "3:2";
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const id of IMAGINE_ASPECTS) {
    const [a, b] = id.split(":").map(Number);
    if (!a || !b) continue;
    const diff = Math.abs(ratio - a / b);
    if (diff < bestDiff) {
      best = id;
      bestDiff = diff;
    }
  }
  return best;
}

export function cssAspect(width?: number, height?: number, fallback = "3 / 2") {
  if (width && height) return `${width} / ${height}`;
  return fallback;
}

export async function readImageFile(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: ImagineAspect;
}> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo (JPEG, PNG, or WebP).");
  }
  const raw = await fileToDataUrl(file);
  const measured = await measureImage(raw);
  const dataUrl = await downscale(raw, measured.width, measured.height, 1600);
  const final = await measureImage(dataUrl);
  return {
    dataUrl,
    width: final.width,
    height: final.height,
    aspectRatio: nearestAspect(final.width, final.height),
  };
}

export function measureDataUrl(src: string): Promise<{ width: number; height: number }> {
  return measureImage(src);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function measureImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("That file is not a readable image."));
    img.src = src;
  });
}

async function downscale(
  src: string,
  width: number,
  height: number,
  maxSide: number,
): Promise<string> {
  const long = Math.max(width, height);
  if (long <= maxSide) return src;
  const scale = maxSide / long;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not process the image."));
    img.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.9);
}
