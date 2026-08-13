const KEY_NAME = "halide-imagine-key";

export function loadImagineKey(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(KEY_NAME) ?? "";
  } catch {
    return "";
  }
}

export function saveImagineKey(key: string) {
  if (typeof localStorage === "undefined") return;
  const trimmed = key.trim();
  if (!trimmed) {
    localStorage.removeItem(KEY_NAME);
    return;
  }
  localStorage.setItem(KEY_NAME, trimmed);
}

export function clearImagineKey() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY_NAME);
}
