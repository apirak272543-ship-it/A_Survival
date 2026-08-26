import { createStarterInstance, validateItemInstances, type ItemInstance } from "@/game/data/catalog";
import { loadOfflineProfile, queueSessionPendingActions, saveOfflineProfile, type OfflineProfileRecord } from "./indexedDb";
import type { HomeAction, HomeState } from "@/game/home/homeSystemV2";
import type { VaultEquipment } from "@/game/integrity/vaultActions";
import { DEFAULT_HOTBAR_BINDINGS, type HotbarBindings } from "@/game/systems/itemActionSystem";

const SESSION_KEY = "arcane-frontier.session.v1";
const SETTINGS_KEY = "arcane-frontier.settings.v1";

export type GameSettings = {
  quality: "low" | "medium" | "high";
  effectIntensity: "low" | "medium" | "high";
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  touchPreference: "fixed" | "dynamic";
  renderDistance: "near" | "balanced" | "far";
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
};

export const DEFAULT_SETTINGS: GameSettings = {
  quality: "high",
  effectIntensity: "high",
  musicVolume: 70,
  sfxVolume: 80,
  reducedMotion: false,
  touchPreference: "dynamic",
  renderDistance: "balanced",
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
    createStarterInstance("decoration-001", 7),
    createStarterInstance("material-001", 8),
  ];
  return {
    playerId: normalized,
    deviceToken: randomToken(),
    createdAt: Date.now(),
    lastMapId: "obsidian-frontier",
    health: 100,
    currency: 240,
    inventory,
    vaultEquipment: {},
    hotbarBindings: { 0: "sword-001", 1: "seed-001", 2: "structure-001", 3: "material-001" },
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
  if (!Array.isArray(candidate.inventory) || !validateItemInstances(candidate.inventory).valid) return null;
  const fallbackHome = defaultHome();
  const home = candidate.home ?? fallbackHome;
  return {
    playerId: candidate.playerId,
    deviceToken: candidate.deviceToken,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    lastMapId: candidate.lastMapId ?? "obsidian-frontier",
    health: typeof candidate.health === "number" ? candidate.health : 100,
    currency: typeof candidate.currency === "number" ? candidate.currency : 0,
    inventory: candidate.inventory,
    vaultEquipment: candidate.vaultEquipment ?? {},
    hotbarBindings: { ...DEFAULT_HOTBAR_BINDINGS, ...(candidate.hotbarBindings ?? {}) },
    home: {
      ...fallbackHome,
      ...home,
      structures: home.structures ?? fallbackHome.structures,
      plots: home.plots ?? fallbackHome.plots,
      petEquipment: home.petEquipment ?? {},
    },
    pendingActions: candidate.pendingActions ?? [],
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
    const renderDistance = candidate.renderDistance === "near" || candidate.renderDistance === "far" ? candidate.renderDistance : "balanced";
    const touchScale = typeof candidate.touchScale === "number" ? Math.max(0.8, Math.min(1.25, candidate.touchScale)) : DEFAULT_SETTINGS.touchScale;
    const touchOpacity = typeof candidate.touchOpacity === "number" ? Math.max(0.45, Math.min(1, candidate.touchOpacity)) : DEFAULT_SETTINGS.touchOpacity;
    return { ...DEFAULT_SETTINGS, ...candidate, renderDistance, touchScale, touchOpacity };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
