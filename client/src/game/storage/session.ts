import { createStarterInstance, getItemDefinition, validateItemInstances, type ItemInstance } from "@/game/data/catalog";
import { loadOfflineProfile, queueSessionPendingActions, saveOfflineProfile, type OfflineProfileRecord } from "./indexedDb";
import type { HomeAction, HomeState } from "@/game/home/homeSystemV2";
import type { VaultEquipment } from "@/game/integrity/vaultActions";
import { DEFAULT_HOTBAR_BINDINGS, type HotbarBindings } from "@/game/systems/itemActionSystem";
import { PLAYER_INVENTORY_SLOTS } from "@/game/systems/inventorySystem";
import { DEFAULT_CAMERA_MODE, normalizeCameraMode, type CameraMode } from "@/game/systems/cameraModes";
import { normalizeTargetFps, normalizeViewDistanceBlocks, type TargetFps, type ViewDistanceBlocks } from "@/game/systems/renderDistance";
import { createDefaultStoryProgressState, normalizeStoryProgressState, type StoryProgressState } from "@/game/systems/storyProgressionSystem";

const SESSION_KEY = "arcane-frontier.session.v1";
const SETTINGS_KEY = "arcane-frontier.settings.v1";

export type GameSettings = {
  language: "th" | "en";
  quality: "low" | "medium" | "high";
  effectIntensity: "low" | "medium" | "high";
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  touchPreference: "fixed" | "dynamic";
  renderDistance: "near" | "balanced" | "far";
  viewDistanceBlocks: ViewDistanceBlocks;
  targetFps: TargetFps;
  cameraDefaultMode: CameraMode;
  touchScale: number;
  touchOpacity: number;
};

export type LocalGameSession = {
  playerId: string;
  deviceToken: string;
  createdAt: number;
  lastMapId: string;
  health: number;
  currency: number;
  inventory: ItemInstance[];
  vaultEquipment: VaultEquipment;
  hotbarBindings: HotbarBindings;
  home: HomeState;
  pendingActions: HomeAction[];
  discoveredItemIds: string[];
  storyProgress: StoryProgressState;
};

export const DEFAULT_SETTINGS: GameSettings = {
  language: "th",
  quality: "high",
  effectIntensity: "high",
  musicVolume: 70,
  sfxVolume: 80,
  reducedMotion: false,
  touchPreference: "dynamic",
  renderDistance: "balanced",
  viewDistanceBlocks: 25,
  targetFps: 60,
  cameraDefaultMode: DEFAULT_CAMERA_MODE,
  touchScale: 1,
  touchOpacity: 0.86,
};

function randomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSession(playerId: string): LocalGameSession {
  const normalized = playerId.trim().replace(/\s+/g, "-").slice(0, 24);
  const inventory = [
    createStarterInstance("sword-001", 1),
    createStarterInstance("seed-001", 2),
    createStarterInstance("structure-001", 3),
    createStarterInstance("seed-002", 4),
    createStarterInstance("seed-004", 5),
    createStarterInstance("structure-002", 6),
    createStarterInstance("block-obsidian-pebble", 12),
    createStarterInstance("decoration-001", 7),
    createStarterInstance("material-001", 8),
    createStarterInstance("tool-001", 9),
    createStarterInstance("tool-002", 10),
    createStarterInstance("tool-003", 11),
  ];
  return {
    playerId: normalized,
    deviceToken: randomToken(),
    createdAt: Date.now(),
    lastMapId: "obsidian-frontier",
    health: 100,
    currency: 240,
    inventory,
    discoveredItemIds: inventory.map(instance => instance.definitionId),
    vaultEquipment: {},
    hotbarBindings: { 0: "sword-001", 1: "seed-001", 2: "block-obsidian-pebble", 3: "tool-001", 4: "tool-002", 5: "tool-003" },
    home: {
      structures: [],
      plots: [
        { id: "plot-1", soilId: "terra-loam" },
        { id: "plot-2", soilId: "verdant-humus" },
      ],
      petName: "NOVA-7",
      petFollowing: true,
      petEquipment: {},
    },
    pendingActions: [],
    storyProgress: createDefaultStoryProgressState(),
  };
}

function defaultHome(): HomeState {
  return {
    structures: [],
    plots: [
      { id: "plot-1", soilId: "terra-loam" },
      { id: "plot-2", soilId: "verdant-humus" },
    ],
    petName: "NOVA-7",
    petFollowing: true,
    petEquipment: {},
  };
}

export function normalizeSession(candidate: Partial<LocalGameSession>): LocalGameSession | null {
  if (typeof candidate.playerId !== "string" || !candidate.playerId || typeof candidate.deviceToken !== "string" || !candidate.deviceToken) return null;
  if (!Array.isArray(candidate.inventory) || candidate.inventory.length > PLAYER_INVENTORY_SLOTS || !validateItemInstances(candidate.inventory).valid) return null;
  const normalizedInventory = [...candidate.inventory];
  const existingBlockItem = normalizedInventory.find(instance => getItemDefinition(instance.definitionId)?.isBlockItem);
  if (!existingBlockItem && normalizedInventory.length < PLAYER_INVENTORY_SLOTS) normalizedInventory.push(createStarterInstance("block-obsidian-pebble", 12));
  const blockItem = existingBlockItem ?? normalizedInventory.find(instance => getItemDefinition(instance.definitionId)?.isBlockItem);
  const discoveredItemIds = Array.from(new Set([...(candidate.discoveredItemIds ?? []), ...normalizedInventory.map(instance => instance.definitionId)]));
  const fallbackHome = defaultHome();
  const home = candidate.home ?? fallbackHome;
  return {
    playerId: candidate.playerId,
    deviceToken: candidate.deviceToken,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    lastMapId: candidate.lastMapId ?? "obsidian-frontier",
    health: typeof candidate.health === "number" ? candidate.health : 100,
    currency: typeof candidate.currency === "number" ? candidate.currency : 0,
    inventory: normalizedInventory,
    discoveredItemIds,
    vaultEquipment: candidate.vaultEquipment ?? {},
    hotbarBindings: (() => {
      const bindings = { ...DEFAULT_HOTBAR_BINDINGS, ...(candidate.hotbarBindings ?? {}) };
      if (blockItem && (bindings[2] === undefined || bindings[2] === "structure-001")) bindings[2] = blockItem.definitionId;
      return bindings;
    })(),
    home: {
      ...fallbackHome,
      ...home,
      structures: home.structures ?? fallbackHome.structures,
      plots: home.plots ?? fallbackHome.plots,
      petEquipment: home.petEquipment ?? {},
    },
    pendingActions: candidate.pendingActions ?? [],
    storyProgress: normalizeStoryProgressState(candidate.storyProgress),
  };
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as Partial<LocalGameSession>);
  } catch {
    return null;
  }
}

export function saveSession(session: LocalGameSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  void saveOfflineProfile(session).then(profile => queueSessionPendingActions(session, profile)).catch(() => {
    // LocalStorage remains the compatibility fallback if IndexedDB is unavailable.
  });
}

export async function hydrateSession() {
  try {
    const indexed = await loadOfflineProfile();
    const normalized = indexed ? normalizeSession(indexed) : null;
    if (indexed && normalized) return { ...indexed, ...normalized } as OfflineProfileRecord;
  } catch {
    // Browser privacy mode can disable IndexedDB; recover through the legacy local save.
  }
  const legacy = loadSession();
  if (legacy) {
    try { await saveOfflineProfile(legacy); } catch { /* legacy save remains available */ }
  }
  return legacy;
}

export function getSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const candidate = JSON.parse(raw) as Partial<GameSettings>;
    const language = candidate.language === "en" ? "en" : "th";
    const renderDistance = candidate.renderDistance === "near" || candidate.renderDistance === "far" ? candidate.renderDistance : "balanced";
    const viewDistanceBlocks = normalizeViewDistanceBlocks(candidate.viewDistanceBlocks, DEFAULT_SETTINGS.viewDistanceBlocks);
    const targetFps = normalizeTargetFps(candidate.targetFps, DEFAULT_SETTINGS.targetFps);
    const cameraDefaultMode = normalizeCameraMode(candidate.cameraDefaultMode, DEFAULT_SETTINGS.cameraDefaultMode);
    const touchScale = typeof candidate.touchScale === "number" ? Math.max(0.8, Math.min(1.25, candidate.touchScale)) : DEFAULT_SETTINGS.touchScale;
    const touchOpacity = typeof candidate.touchOpacity === "number" ? Math.max(0.45, Math.min(1, candidate.touchOpacity)) : DEFAULT_SETTINGS.touchOpacity;
    return { ...DEFAULT_SETTINGS, ...candidate, language, renderDistance, viewDistanceBlocks, targetFps, cameraDefaultMode, touchScale, touchOpacity };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
