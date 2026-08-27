import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONTENT_CATALOG_INPUT, createContentCatalogRegistry, type ContentCatalogInput, type ContentCatalogOutput } from "./contentCatalogGenerator";

const outputPath = resolve(process.cwd(), "server/generators/generated/content-catalog-min-300.json");
const registry = createContentCatalogRegistry();
const artifact = registry.generate<ContentCatalogInput, ContentCatalogOutput>("content.catalog", DEFAULT_CONTENT_CATALOG_INPUT, { seed: "content-library-min-300-v1", generatedAt: 0 });
const validation = registry.validate(artifact);
if (!validation.valid) throw new Error(`Generated snapshot is invalid: ${validation.issues.join("; ")}`);
mkdirSync(resolve(process.cwd(), "server/generators/generated"), { recursive: true });
writeFileSync(outputPath, `${registry.export(artifact)}\n`, "utf8");
console.log(`Stored ${artifact.output.definitions.length} definitions at ${outputPath}`);
console.log(`Content hash: ${artifact.contentHash}`);
