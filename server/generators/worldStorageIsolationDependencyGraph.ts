import { createStarterInstance } from "../../client/src/game/data/catalog";
import {
  CARRY_SLOT_LIMIT,
  CHEST_SLOT_LIMIT,
  OBSIDIAN_STORAGE_ID,
  STORAGE_CHEST_ID,
  WORLD_STORAGE_INTERACTION_REACH,
  createEmptyWorldStorage,
  createMapWorldStorage,
  depositIntoChest,
  getWorldStorageAnchor,
  getWorldStorageSlots,
  normalizeWorldStorage,
  storageSlotCount,
  withdrawFromChest,
} from "../../client/src/game/systems/worldStorageSystem";
import { WORLD_STORAGE_DEFAULT_SLOTS } from "../../client/src/game/systems/inventorySystem";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const WORLD_STORAGE_ISOLATION_GRAPH_RULES_VERSION = "world-storage-isolation-graph-rules.v1" as const;
export const WORLD_STORAGE_ISOLATION_GRAPH_SCHEMA_VERSION = "a-survival.world-storage-isolation-graph.v1" as const;
export const WORLD_STORAGE_ISOLATION_GRAPH_VERSION = "1.0.0" as const;
export const WORLD_STORAGE_ISOLATION_MAX_SAMPLE_ITEMS = CHEST_SLOT_LIMIT;

const CANONICAL_MAP_ID = "obsidian-frontier" as const;
const DEFAULT_AUDIT_PLAYER_ID = "audit-player" as const;
const UNIVERSAL_STORAGE_INTEGRATION_KEY = "owner:world-storage:universal-world-state-integration" as const;
const MAP_PLAYER_STORAGE_OWNER_KEY = "owner:world-storage:map-player-persistence" as const;
const STORAGE_SYNC_VALIDATOR_OWNER_KEY = "owner:world-storage:sync-validation" as const;
const STORAGE_RUNTIME_OWNER_KEY = "owner:world-storage:runtime" as const;

export type WorldStorageIsolationDependencyGraphInput = {
  mapId?: string;
  storageId?: string;
  playerId?: string;
  sampleItemCount?: number;
  rulesVersion?: string;
};

export type WorldStorageIsolationBlocker =
  | "requested-map-not-runtime-approved"
  | "storage-anchor-missing"
  | "storage-chest-id-not-canonical"
  | "universal-world-storage-integration-owner-missing";

export type WorldStorageIsolationSummary = {
  mapId: string;
  storageId: string;
  playerId: string;
  canonicalMapId: typeof CANONICAL_MAP_ID;
  canonicalStorageId: typeof OBSIDIAN_STORAGE_ID;
  canonicalChestId: typeof STORAGE_CHEST_ID;
  mapIsRuntimeApproved: boolean;
  storageAnchorPresent: boolean;
  storageAnchorCapacity: number;
  chestSlotLimit: typeof CHEST_SLOT_LIMIT;
  carrySlotLimit: typeof CARRY_SLOT_LIMIT;
  storageUsesSeparateContainer: true;
  storageNamespace: "mapId+playerId";
  sameChestIdAcrossMapsIsolated: true;
  storageStateKey: "worldStorageById";
  transferActionMapId: string | null;
  transferActionChestId: string | null;
  transferActionIsMapScoped: boolean;
  transferActionValidationOwnerPresent: true;
  mapPlayerPersistenceOwnerPresent: true;
  universalStorageIntegrationOwnerPresent: false;
  normalizedDuplicateInstanceRemoved: boolean;
  sampledCarrySlotCount: number;
  sampledDepositAccepted: boolean;
  sampledWithdrawAccepted: boolean;
  sampledChestSlotCount: number;
  sampledChestCapacity: number;
  interactionReach: typeof WORLD_STORAGE_INTERACTION_REACH;
  blockerCodes: WorldStorageIsolationBlocker[];
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type WorldStorageIsolationDependencyGraphOutput = {
  summary: WorldStorageIsolationSummary;
  blockers: WorldStorageIsolationBlocker[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedIdentifier(value: string | undefined, fallback: string, field: string): string {
  const identifier = value ?? fallback;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(identifier)) throw new Error(`${field} must be 1–128 safe identifier characters`);
  return identifier;
}

function boundedSampleItemCount(value: number | undefined): number {
  const count = value ?? 3;
  if (!Number.isInteger(count) || count < 1 || count > WORLD_STORAGE_ISOLATION_MAX_SAMPLE_ITEMS) {
    throw new Error(`sampleItemCount must be an integer between 1 and ${WORLD_STORAGE_ISOLATION_MAX_SAMPLE_ITEMS}`);
  }
  return count;
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return {
    key: node.key,
    kind: node.kind,
    required: true,
    generatorId: node.generatorId,
    generatorVersion: node.generatorVersion,
    contentHash: node.contentHash,
  };
}

function sourceNode(key: string, generatorId: string, source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind: "other",
    generatorId,
    generatorVersion: "1.0.0",
    schemaVersion: WORLD_STORAGE_ISOLATION_GRAPH_SCHEMA_VERSION,
    seed: CANONICAL_MAP_ID,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function auditNode(
  summary: WorldStorageIsolationSummary,
  rulesVersion: string,
  dependencies: GeneratorDependency[],
): DependencyGraphNode {
  return {
    key: `world-storage-isolation:${summary.mapId}:${summary.storageId}:${summary.playerId}`,
    kind: "simulation",
    generatorId: "world.storage.isolation",
    generatorVersion: WORLD_STORAGE_ISOLATION_GRAPH_VERSION,
    schemaVersion: WORLD_STORAGE_ISOLATION_GRAPH_SCHEMA_VERSION,
    seed: `${summary.mapId}:${summary.storageId}:${summary.playerId}`,
    rulesVersion,
    contentHash: hashStableJson({ summary, dependencies } as never),
    dependencies,
  };
}

function sampleItem(sequence: number) {
  return createStarterInstance("material-001", sequence);
}

export function buildWorldStorageIsolationDependencyGraph(
  input: WorldStorageIsolationDependencyGraphInput = {},
): WorldStorageIsolationDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_STORAGE_ISOLATION_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_STORAGE_ISOLATION_GRAPH_RULES_VERSION) throw new Error(`Unsupported world storage isolation graph rules version: ${rulesVersion}`);

  const mapId = boundedIdentifier(input.mapId, CANONICAL_MAP_ID, "mapId");
  const storageId = boundedIdentifier(input.storageId, OBSIDIAN_STORAGE_ID, "storageId");
  const playerId = boundedIdentifier(input.playerId, DEFAULT_AUDIT_PLAYER_ID, "playerId");
  const sampleItemCount = boundedSampleItemCount(input.sampleItemCount);
  const anchor = getWorldStorageAnchor(storageId, mapId);
  const canonicalMap = mapId === CANONICAL_MAP_ID;
  const canonicalStorage = storageId === OBSIDIAN_STORAGE_ID;
  const mapStorage = createMapWorldStorage(mapId, storageId);
  const chestSlots = getWorldStorageSlots(createEmptyWorldStorage(), STORAGE_CHEST_ID);
  const carry = Array.from({ length: sampleItemCount }, (_, index) => sampleItem(index + 1));
  const deposited = depositIntoChest({
    mapId,
    chestId: STORAGE_CHEST_ID,
    carry,
    storage: createEmptyWorldStorage(),
    itemInstanceId: carry[0]!.instanceId,
    now: 0,
  });
  const withdrawn = deposited.ok
    ? withdrawFromChest({ mapId, chestId: STORAGE_CHEST_ID, carry: deposited.carry, storage: deposited.storage, itemInstanceId: deposited.moved.instanceId, now: 0 })
    : { ok: false as const, reason: "deposit preview failed" };
  const duplicate = sampleItem(99);
  const normalized = normalizeWorldStorage({ [STORAGE_CHEST_ID]: [duplicate, duplicate] });
  const blockers: WorldStorageIsolationBlocker[] = [];
  if (!canonicalMap) blockers.push("requested-map-not-runtime-approved");
  if (!anchor) blockers.push("storage-anchor-missing");
  if (!canonicalStorage) blockers.push("storage-chest-id-not-canonical");
  blockers.push("universal-world-storage-integration-owner-missing");

  const transferActionMapId = deposited.ok && withdrawn.ok ? withdrawn.action.payload.mapId : null;
  const transferActionChestId = deposited.ok && withdrawn.ok ? withdrawn.action.payload.chestId : null;
  const summary: WorldStorageIsolationSummary = {
    mapId,
    storageId,
    playerId,
    canonicalMapId: CANONICAL_MAP_ID,
    canonicalStorageId: OBSIDIAN_STORAGE_ID,
    canonicalChestId: STORAGE_CHEST_ID,
    mapIsRuntimeApproved: canonicalMap,
    storageAnchorPresent: Boolean(anchor),
    storageAnchorCapacity: anchor?.capacity ?? mapStorage.capacity,
    chestSlotLimit: CHEST_SLOT_LIMIT,
    carrySlotLimit: CARRY_SLOT_LIMIT,
    storageUsesSeparateContainer: true,
    storageNamespace: "mapId+playerId",
    sameChestIdAcrossMapsIsolated: true,
    storageStateKey: "worldStorageById",
    transferActionMapId,
    transferActionChestId,
    transferActionIsMapScoped: transferActionMapId === mapId && transferActionChestId === STORAGE_CHEST_ID,
    transferActionValidationOwnerPresent: true,
    mapPlayerPersistenceOwnerPresent: true,
    universalStorageIntegrationOwnerPresent: false,
    normalizedDuplicateInstanceRemoved: normalized[STORAGE_CHEST_ID]?.filter(Boolean).length === 1,
    sampledCarrySlotCount: carry.length,
    sampledDepositAccepted: deposited.ok,
    sampledWithdrawAccepted: withdrawn.ok,
    sampledChestSlotCount: storageSlotCount({ [STORAGE_CHEST_ID]: chestSlots }, STORAGE_CHEST_ID),
    sampledChestCapacity: chestSlots.length,
    interactionReach: WORLD_STORAGE_INTERACTION_REACH,
    blockerCodes: blockers,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };

  const runtimeNode = sourceNode(STORAGE_RUNTIME_OWNER_KEY, "world.storage.runtime", "client/src/game/systems/worldStorageSystem.ts", rulesVersion);
  const persistenceNode = sourceNode(MAP_PLAYER_STORAGE_OWNER_KEY, "world.storage.map-player-persistence", "client/src/game/storage/indexedDb.ts", rulesVersion);
  const syncNode = sourceNode(STORAGE_SYNC_VALIDATOR_OWNER_KEY, "world.storage.sync-validation", "server/syncActionValidation.ts", rulesVersion);
  const dependencies: GeneratorDependency[] = [dependencyFor(runtimeNode), dependencyFor(persistenceNode), dependencyFor(syncNode)];
  for (const blocker of blockers) {
    if (blocker === "universal-world-storage-integration-owner-missing") {
      dependencies.push({ key: UNIVERSAL_STORAGE_INTEGRATION_KEY, kind: "simulation", required: true, generatorId: "world.storage.integration", generatorVersion: "1.0.0" });
    }
  }
  const audit = auditNode(summary, rulesVersion, dependencies);
  const nodes = [runtimeNode, persistenceNode, syncNode, audit];

  return { summary, blockers, nodes, graph: validateGeneratorDependencyGraph(nodes) };
}

export function getDefaultWorldStorageIsolationDependencyGraphInput(): WorldStorageIsolationDependencyGraphInput {
  return { mapId: CANONICAL_MAP_ID, storageId: OBSIDIAN_STORAGE_ID, playerId: DEFAULT_AUDIT_PLAYER_ID, sampleItemCount: 3 };
}
