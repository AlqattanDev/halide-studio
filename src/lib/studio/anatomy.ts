import { EMPTY_ANATOMY, type Anatomy, type AnatomyKey } from "./types";

const LIGHT_RE =
  /\b(golden hour|blue hour|magic hour|overcast|north light|north window light|rim light|backlit|backlight|neon|tungsten|fluorescent|moonlight|candlelight|chiaroscuro|volumetric(?: light(?:ing)?)?|softbox|studio lighting|harsh sun|dappled|twilight|dusk|dawn|midday|available light|window light|practical lights?|soft light|hard light|low key|high key|warm light|cool light|cooler, bluer|colder, bluer|warmer light)\b/gi;

const LENS_RE =
  /\b(\d{2}mm(?: film)?|wide[- ]angle|telephoto|macro|aerial|overhead|close(?:-up)? portrait|close portrait|shallow depth of field|deep focus|bokeh|film grain|more film grain|kodak|portra|kodachrome|cinestill|anamorphic|tilt[- ]shift|drone shot|wider shot|move closer)\b/gi;

const STYLE_RE =
  /\b(oil paint(?:ing)?|watercolor|cinematic(?: still)?|photoreal(?:istic)?|anime|editorial(?: food photography)?|documentary|still life|noir|pictorial|impressionist|hyperreal|35mm film grain|muted teal and rust|kodachrome warmth|quiet horizon)\b/gi;

const PLACE_RE =
  /\b(on (?:a |an |the )?[^.]+|in (?:a |an |the )?[^.]+|under (?:a |an |the )?[^.]+|at (?:blue hour|dusk|dawn|night|midday|late afternoon)[^.]*|tokyo|paris|kyoto|desert|beach|volcanic beach|marble|kitchen|studio|alley|rooftop)\b/i;

function firstMatch(text: string, re: RegExp): string {
  re.lastIndex = 0;
  const found = text.match(re);
  if (!found?.length) return "";
  const unique: string[] = [];
  for (const piece of found) {
    const n = piece.trim();
    if (n && !unique.some((u) => u.toLowerCase() === n.toLowerCase())) {
      unique.push(n);
    }
  }
  return unique.slice(0, 3).join(", ");
}

function firstSentence(text: string): string {
  const cut = text.split(/[,.]/)[0]?.trim() ?? "";
  return cut.slice(0, 140);
}

export function parseAnatomy(prompt: string): Anatomy {
  const text = prompt.trim();
  if (!text) return { ...EMPTY_ANATOMY };
  return {
    subject: firstSentence(text),
    place: firstMatch(text, PLACE_RE),
    light: firstMatch(text, LIGHT_RE),
    style: firstMatch(text, STYLE_RE),
    lens: firstMatch(text, LENS_RE),
  };
}

export function applyAnatomyEdit(
  prompt: string,
  key: AnatomyKey,
  next: string,
  prev: Anatomy,
): string {
  const incoming = next.trim();
  const prior = prev[key].trim();
  if (incoming === prior) return prompt;

  if (prior && prompt.toLowerCase().includes(prior.toLowerCase())) {
    if (!incoming) {
      return prompt
        .replace(new RegExp(`,?\\s*${escapeReg(prior)}`, "i"), "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+,/g, ",")
        .replace(/^,\s*/, "")
        .trim();
    }
    return prompt.replace(new RegExp(escapeReg(prior), "i"), incoming);
  }

  if (!incoming) return prompt;
  if (!prompt.trim()) return incoming;
  return `${prompt.trim().replace(/[.,]$/, "")}, ${incoming}`;
}

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function wordDiff(prev: string, next: string): {
  word: string;
  added: boolean;
}[] {
  const prevSet = new Set(
    prev
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
      .filter(Boolean),
  );
  return next.split(/(\s+)/).map((word) => {
    const norm = word.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");
    const added = Boolean(norm) && !prevSet.has(norm);
    return { word, added };
  });
}
