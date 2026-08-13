export type AspectRatio = string;

export type StudioStatus = "idle" | "translating" | "generating" | "reading";

export type AnatomyKey = "subject" | "place" | "light" | "style" | "lens";

export type Anatomy = Record<AnatomyKey, string>;

export type Frame = {
  id: string;
  prompt: string;
  imageDataUrl: string;
  summary: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  createdAt: number;
};

export const ANATOMY_META: {
  key: AnatomyKey;
  label: string;
}[] = [
  { key: "subject", label: "Subject" },
  { key: "place", label: "Place" },
  { key: "light", label: "Light" },
  { key: "style", label: "Style" },
  { key: "lens", label: "Lens" },
];

export const STARTERS: { title: string; prompt: string }[] = [
  {
    title: "Blue hour shore",
    prompt:
      "A lone fisherman on a black volcanic beach at blue hour, long-exposure surf folding over basalt, 35mm film grain, muted teal and rust, quiet horizon",
  },
  {
    title: "Vending glow",
    prompt:
      "Close portrait of a woman in a rain-soaked linen coat under a Tokyo vending-machine glow, shallow depth of field, wet asphalt reflections, cinematic still",
  },
  {
    title: "Marble still life",
    prompt:
      "Overhead still life of cardamom coffee, a brass spoon, and a folded newspaper on worn marble, north window light, editorial food photography",
  },
  {
    title: "Desert radio",
    prompt:
      "A rusted shortwave radio on a sun-bleached desert table at late afternoon, hard shadows, Kodachrome warmth, wide environmental still",
  },
];

export const QUICK_CHANGES = [
  "Make it night",
  "Add rain",
  "Move closer",
  "Wider shot",
  "Warmer light",
  "Colder, bluer",
  "More film grain",
  "Softer light",
];

export const EMPTY_ANATOMY: Anatomy = {
  subject: "",
  place: "",
  light: "",
  style: "",
  lens: "",
};
