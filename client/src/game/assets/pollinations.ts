/**
 * Pollinations.ai image generation helper (free, no auth, no API key).
 * Returns a URL that renders a generated image when loaded.
 */
export type PollinationsOptions = {
  width?: number;
  height?: number;
  model?: "flux" | "turbo";
  seed?: number;
  nologo?: boolean;
};

export function getGameAssetUrl(prompt: string, options: PollinationsOptions = {}) {
  const { width = 768, height = 768, model = "flux", seed = 1, nologo = true } = options;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: String(nologo),
    seed: String(seed),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
