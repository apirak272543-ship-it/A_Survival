import type { CreatorDomainArtifact } from "../drizzle/schema";

export const CREATOR_DOMAIN_ARTIFACT_EXPORT_SCHEMA = "a-survival.creator-domain-artifact-export.v1";

export type CreatorDomainArtifactExport = {
  exportSchemaVersion: typeof CREATOR_DOMAIN_ARTIFACT_EXPORT_SCHEMA;
  exportOnly: true;
  artifactKey: string;
  domain: CreatorDomainArtifact["domain"];
  artifactId: string;
  artifactVersion: string;
  generatorId: string;
  generatorVersion: string;
  contentSha256: string;
  review: {
    status: "approved";
    reviewedByUserId: number;
    reviewedAt: Date;
    note: string | null;
  };
  manifest: Record<string, unknown>;
  summary: Record<string, unknown>;
  provenance: Record<string, unknown>;
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  assets: [];
  publishReady: false;
};

export function buildCreatorDomainArtifactExport(artifact: CreatorDomainArtifact): CreatorDomainArtifactExport {
  if (artifact.reviewStatus !== "approved") throw new Error(`Only approved creator domain artifacts can be exported: ${artifact.reviewStatus}`);
  if (!artifact.reviewedByUserId || !artifact.reviewedAt) throw new Error("Approved creator domain artifact is missing reviewer audit fields");
  const runtimePolicy = artifact.runtimePolicy as Partial<CreatorDomainArtifactExport["runtimePolicy"]>;
  if (runtimePolicy.runtimeImportAllowed !== false || runtimePolicy.playerVisible !== false || runtimePolicy.cacheable !== false) throw new Error("Creator domain artifact runtime policy must remain disabled for export");
  return {
    exportSchemaVersion: CREATOR_DOMAIN_ARTIFACT_EXPORT_SCHEMA,
    exportOnly: true,
    artifactKey: artifact.artifactKey,
    domain: artifact.domain,
    artifactId: artifact.artifactId,
    artifactVersion: artifact.artifactVersion,
    generatorId: artifact.generatorId,
    generatorVersion: artifact.generatorVersion,
    contentSha256: artifact.contentSha256,
    review: {
      status: "approved",
      reviewedByUserId: artifact.reviewedByUserId,
      reviewedAt: artifact.reviewedAt,
      note: artifact.reviewNote,
    },
    manifest: artifact.manifest,
    summary: artifact.summary,
    provenance: artifact.provenance,
    runtimePolicy: {
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    },
    assets: [],
    publishReady: false,
  };
}
