import { createStarterInstance, validateItemInstances, type ItemInstance } from "@/game/data/catalog";
import { loadOfflineProfile, queueSessionPendingActions, saveOfflineProfile, type OfflineProfileRecord } from "./indexedDb";
import type { HomeAction, HomeState } from "@/game/home/homeSystemV2";
import type { VaultEquipment } from "@/game/integrity/vaultActions";

const SESSION_KEY = "arcane-frontier.session.v1";
const SETTINGS_KEY = "arcane-frontier.settings.v1";

export type GameSettings = {
  quality: "low" | "medium" | "high";
  effectIntensity: "low" | "medium" | "high";
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  touchPreference: "fixed" | "dynamic";
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

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LocalGameSession;
    if (!session.playerId || !session.deviceToken || !validateItemInstances(session.inventory).valid) return null;
    return session;
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
    if (indexed && validateItemInstances(indexed.inventory).valid) return indexed as OfflineProfileRecord;
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
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
