import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAnimationProfileRegistry, type AnimationAssetSource, type AnimationProfileInput } from "../server/generators/animationProfileGenerator";

const DEFAULT_SEED = "animation-profile-v1";

function readArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("A-Survival Animation Profile Generator\nUsage: pnpm animation:generate -- --id=survivor.default --name='Survivor Default Motion' --asset=animation.survivor.default --source=starter-authored --provenance=procedural-starter-authored --seed=animation-profile-v1 --out=artifacts/animation-profile.json\nBackend only: the exported profile is not automatically imported into the playable runtime.");
    return;
  }

  const input: AnimationProfileInput = {
    id: readArg("id", "survivor.default"),
    displayName: readArg("name", "Survivor Default Motion"),
    assetId: readArg("asset", "animation.survivor.default"),
    assetSource: readArg("source", "starter-authored") as AnimationAssetSource,
    provenanceRef: readArg("provenance", "procedural-starter-authored"),
    fps: Number(readArg("fps", "12")),
  };
  const seed = readArg("seed", DEFAULT_SEED);
  const outputPath = resolve(process.cwd(), readArg("out", "artifacts/animation-profile.json"));
  const registry = createAnimationProfileRegistry();
  const artifact = registry.generate("animation.profile", input, { seed, generatedAt: 0 });
  const preview = registry.preview(artifact);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ artifact, preview, animationGenerationUi: false }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: outputPath, generatorId: artifact.generatorId, seed: artifact.seed, contentHash: artifact.contentHash, states: preview.recordCount, animationGenerationUi: false }, null, 2));
}

if (process.argv[1]?.endsWith("animation-profile-generator.ts")) void main();
