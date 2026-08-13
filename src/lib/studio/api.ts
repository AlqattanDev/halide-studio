import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const XAI = "https://api.x.ai/v1";
const IMAGINE_GENERATE = "grok-imagine-image-2.0";
const IMAGINE_EDIT = "grok-imagine-image-quality";
const CHAT_MODEL = "grok-4.5";

type ChatOk = { ok: true; prompt: string; summary: string };
type ImageOk = { ok: true; imageDataUrl: string; revisedPrompt?: string };
type Fail = { ok: false; error: string };

function platformKey(): string | null {
  const key = process.env.XAI_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

function resolveKey(provided?: string | null): string | null {
  return platformKey() ?? (provided?.trim() || null);
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string } | string;
    };
    if (typeof body.error === "string") return body.error;
    if (body.error?.message) return body.error.message;
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    return "Grok Imagine rejected the key. Check it at console.x.ai.";
  }
  return `Grok Imagine error ${res.status}`;
}

function toDataUrl(b64: string): string {
  const trimmed = b64.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

const REWRITE_SYSTEM =
  "You translate visual change requests into a complete standalone image prompt. Rewrite the master prompt so it fully describes the new image. Keep what still applies. Fold the change in naturally — never narrate the edit (no 'now make it', no 'change the'). Write vivid, concrete prose, 1–3 sentences. Return JSON: {\"prompt\": string, \"summary\": string} where summary is a short past-tense note (e.g. \"shifted to night, added rain\").";

const keyField = z.string().max(200).optional();

export const getAiStatus = createServerFn({ method: "GET" }).handler(
  async () => ({
    available: Boolean(platformKey()),
    source: platformKey() ? ("platform" as const) : ("none" as const),
    model: IMAGINE_GENERATE,
  }),
);

export const verifyImagineKey = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ apiKey: z.string().min(8).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const res = await fetch(`${XAI}/models`, {
      headers: { Authorization: `Bearer ${data.apiKey.trim()}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return { ok: true };
  });

export const rewritePrompt = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(4000),
        change: z.string().min(1).max(800),
        apiKey: keyField,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ChatOk | Fail> => {
    const key = resolveKey(data.apiKey);
    if (!key) {
      return { ok: false, error: "Connect Grok Imagine to rewrite the prompt." };
    }

    const res = await fetch(`${XAI}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REWRITE_SYSTEM },
          {
            role: "user",
            content: `MASTER PROMPT:\n${data.prompt}\n\nREQUESTED CHANGE:\n${data.change}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return parseRewrite(await res.json(), data.change);
  });

export const promptFromImage = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(20).max(8_000_000),
        apiKey: keyField,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ChatOk | Fail> => {
    const key = resolveKey(data.apiKey);
    if (!key) {
      return { ok: false, error: "Connect Grok Imagine to read a plate." };
    }

    const res = await fetch(`${XAI}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write image-generation prompts from a photograph. Describe only what is visible: subject, setting, light, style, lens/framing. Complete standalone prose, 1–3 sentences. No preamble. Return JSON: {\"prompt\": string, \"summary\": string} where summary is a short note like \"read from the uploaded plate\".",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: data.imageDataUrl },
              },
              {
                type: "text",
                text: "Write the master prompt for this image.",
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return parseRewrite(await res.json(), "Read from the uploaded plate");
  });

const genSchema = z.object({
  prompt: z.string().min(1).max(4000),
  aspectRatio: z.string().min(1).max(16),
  quality: z.boolean(),
  apiKey: keyField,
});

export const generateImage = createServerFn({ method: "POST" })
  .validator((input: unknown) => genSchema.parse(input))
  .handler(async ({ data }): Promise<ImageOk | Fail> => {
    const key = resolveKey(data.apiKey);
    if (!key) {
      return { ok: false, error: "Connect Grok Imagine to develop a plate." };
    }

    const res = await fetch(`${XAI}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: IMAGINE_GENERATE,
        prompt: data.prompt,
        n: 1,
        aspect_ratio: data.aspectRatio,
        resolution: data.quality ? "2k" : "1k",
        quality: "medium",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return parseImageResponse(res);
  });

export const editImage = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(4000),
        imageDataUrl: z.string().min(20).max(8_000_000),
        aspectRatio: z.string().min(1).max(16),
        quality: z.boolean(),
        apiKey: keyField,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ImageOk | Fail> => {
    const key = resolveKey(data.apiKey);
    if (!key) {
      return { ok: false, error: "Connect Grok Imagine to apply a change." };
    }

    const body = {
      prompt: data.prompt,
      aspect_ratio: data.aspectRatio,
      resolution: data.quality ? "2k" : "1k",
      response_format: "b64_json",
      image: {
        url: data.imageDataUrl,
        type: "image_url",
      },
    };

    const first = await fetch(`${XAI}/images/edits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: IMAGINE_GENERATE, ...body }),
      signal: AbortSignal.timeout(120_000),
    });
    if (first.ok) return parseImageResponse(first);

    const second = await fetch(`${XAI}/images/edits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: IMAGINE_EDIT, ...body }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!second.ok) return { ok: false, error: await readError(second) };
    return parseImageResponse(second);
  });

function parseRewrite(body: unknown, fallbackSummary: string): ChatOk | Fail {
  const raw =
    (body as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content ?? "";
  const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as { prompt?: string; summary?: string };
    const prompt = (parsed.prompt ?? "").trim();
    if (!prompt) return { ok: false, error: "Empty rewritten prompt." };
    return {
      ok: true,
      prompt,
      summary: (parsed.summary ?? fallbackSummary).trim().slice(0, 160),
    };
  } catch {
    if (jsonText.length > 8) {
      return { ok: true, prompt: jsonText.slice(0, 2000), summary: fallbackSummary };
    }
    return { ok: false, error: "Could not parse the rewritten prompt." };
  }
}

async function parseImageResponse(res: Response): Promise<ImageOk | Fail> {
  const body = (await res.json()) as {
    data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
  };
  const item = body.data?.[0];
  if (item?.b64_json) {
    return {
      ok: true,
      imageDataUrl: toDataUrl(item.b64_json),
      revisedPrompt: item.revised_prompt,
    };
  }
  if (item?.url) {
    try {
      const img = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
      if (img.ok) {
        const buf = Buffer.from(await img.arrayBuffer());
        const mime = img.headers.get("content-type") ?? "image/png";
        return {
          ok: true,
          imageDataUrl: `data:${mime};base64,${buf.toString("base64")}`,
          revisedPrompt: item.revised_prompt,
        };
      }
    } catch {
      /* fall through */
    }
    return {
      ok: true,
      imageDataUrl: item.url,
      revisedPrompt: item.revised_prompt,
    };
  }
  return { ok: false, error: "No image returned." };
}
