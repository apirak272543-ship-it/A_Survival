import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEFAULT_ASSET_MANIFEST_PATH, type AssetManifestLike } from "./content-generator";
import {
  CONTENT_SUITE_VERSION,
  ContentRegistry,
  generateContentSuiteBatch,
  type ContentKind,
  type ContentSuiteBundle,
  type ContentSuiteInput,
  type GameplayRole,
} from "./contentRegistry";

type JsonRecord = Record<string, unknown>;

function readArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function parseBoolean(value: string) {
  return value === "true" || value === "1";
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function readManifest(path: string): Promise<AssetManifestLike | undefined> {
  return readJson<AssetManifestLike>(path);
}

function defaultInput(args: typeof process.argv): ContentSuiteInput {
  const kind = readArg("kind", "block") as ContentKind;
  const role = readArg("role", kind === "block" ? "building-block" : kind === "mob" ? "mob" : kind === "weapon" ? "weapon" : "utility") as GameplayRole;
  return {
    kind,
    name: readArg("name", "Obsidian Fire Block"),
    description: readArg("description", "A semantic Obsidian block with restrained fictional fire energy."),
    material: readArg("material", "obsidian"),
    element: readArg("element", "fire"),
    biome: readArg("biome", "obsidian-frontier"),
    gameplayRole: role,
    rarity: readArg("rarity", "rare") as ContentSuiteInput["rarity"],
    theme: readArg("theme", "volcanic fantasy"),
    conceptNote: readArg("concept", "Dark volcanic glass with fiery cracks; readable as a block before it reads as an effect."),
    conceptSource: "human-input",
    seed: Number(readArg("seed", "829173")),
  };
}

async function loadInputs(specPath: string): Promise<ContentSuiteInput[]> {
  if (!specPath) return [defaultInput(process.argv)];
  const raw = await readJson<JsonRecord | ContentSuiteInput[]>(resolve(process.cwd(), specPath));
  if (!raw) throw new Error(`Cannot read content suite spec: ${specPath}`);
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.records) ? raw.records : [raw];
  return entries.map(entry => ({ ...defaultInput(process.argv), ...(entry as Partial<ContentSuiteInput>) })) as ContentSuiteInput[];
}

async function loadCache(path: string) {
  return (await readJson<{ records?: ContentSuiteBundle[] }>(path))?.records ?? [];
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("A-Survival Content Generation Suite\nUsage: pnpm content:suite -- --kind=block --name='Obsidian Fire Block' --material=obsidian --element=fire --biome=obsidian-frontier --role=building-block --rarity=rare --seed=829173\nBatch: pnpm content:suite -- --spec=tools/content-suite.example.json --out=artifacts/content-suite.json\nOptional: --asset-manifest=client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json --cache=artifacts/content-suite-cache.json --preview=artifacts/content-suite-preview.json\nBackend only; no player-facing content-generation UI.");
    return;
  }
  const manifest = await readManifest(resolve(process.cwd(), readArg("asset-manifest", DEFAULT_ASSET_MANIFEST_PATH)));
  const inputs = await loadInputs(readArg("spec", ""));
  const withManifest = inputs.map(input => ({ ...input, assetManifest: manifest }));
  const generated = generateContentSuiteBatch(withManifest);
  const cachePath = resolve(process.cwd(), readArg("cache", "artifacts/content-suite-cache.json"));
  const cached = await loadCache(cachePath);
  const cachedByKey = new Map(cached.map(record => [record.cacheKey, record]));
  const registry = new ContentRegistry();
  let reused = 0;
  generated.forEach(bundle => {
    const previous = cachedByKey.get(bundle.cacheKey);
    if (previous) {
      registry.register(previous);
      reused += 1;
    } else {
      registry.register(bundle);
    }
  });
  const exported = registry.export();
  const output = resolve(process.cwd(), readArg("out", "artifacts/content-suite.json"));
  const previewPath = resolve(process.cwd(), readArg("preview", "artifacts/content-suite-preview.json"));
  await mkdir(resolve(output, ".."), { recursive: true });
  await mkdir(resolve(cachePath, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
  await writeFile(cachePath, `${JSON.stringify({ suiteVersion: CONTENT_SUITE_VERSION, records: exported.records }, null, 2)}\n`, "utf8");
  if (parseBoolean(readArg("write-preview", "true"))) {
    await mkdir(resolve(previewPath, ".."), { recursive: true });
    await writeFile(previewPath, `${JSON.stringify({ suiteVersion: CONTENT_SUITE_VERSION, previews: exported.records.map(record => ({ id: record.definition.id, name: record.definition.name, swatches: record.preview.swatches, summary: record.preview.summary, texturePrompt: record.preview.texturePrompt, finalArtStatus: record.preview.finalArtStatus })) }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ output, cachePath, previewPath, suiteVersion: CONTENT_SUITE_VERSION, records: exported.records.length, reused, assetManifest: manifest?.id ?? "missing", contentGenerationUi: false, registryHash: exported.registryHash }, null, 2));
}

if (process.argv[1]?.endsWith("content-suite-generator.ts")) void main().catch(error => { console.error(error); process.exitCode = 1; });
