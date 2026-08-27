import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createQuestProgressionRegistry, type QuestProgressionInput } from "../server/generators/questProgressionGenerator";

function readArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("A-Survival Story/Quest Progression Generator\nUsage: pnpm story:generate -- --map-count=100 --seed=story-v1 --out=artifacts/story-progression.json\nBackend only: map 1 is the playable Obsidian Frontier record; future maps remain planned and are not imported into player runtime.");
    return;
  }

  const input: QuestProgressionInput = { mapCount: Number(readArg("map-count", "100")) };
  const seed = readArg("seed", "story-progression-v1");
  const outputPath = resolve(process.cwd(), readArg("out", "artifacts/story-progression.json"));
  const registry = createQuestProgressionRegistry();
  const artifact = registry.generate("quest.progression", input, { seed, generatedAt: 0 });
  const preview = registry.preview(artifact);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ artifact, preview, playerStoryGenerationUi: false }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: outputPath, generatorId: artifact.generatorId, seed: artifact.seed, contentHash: artifact.contentHash, maps: artifact.output.maps.length, quests: artifact.output.quests.length, playableMap: artifact.output.constraints.playableMapId, futureMapsRuntimeImportAllowed: artifact.output.constraints.futureMapsRuntimeImportAllowed, playerStoryGenerationUi: false }, null, 2));
}

if (process.argv[1]?.endsWith("quest-progression-generator.ts")) void main();
