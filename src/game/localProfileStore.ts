import type { LocalPlayerProfile, MapId } from './models';

const STORAGE_KEY = 'a-survival.local-profiles.v1';
const ACTIVE_PROFILE_KEY = 'a-survival.active-profile.v1';

function readProfiles(): LocalPlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value as LocalPlayerProfile[] : [];
  } catch {
    return [];
  }
}

function writeProfiles(profiles: LocalPlayerProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function listProfiles() { return readProfiles(); }

export function createProfile(displayName: string): LocalPlayerProfile {
  const name = displayName.trim().slice(0, 24);
  if (!name) throw new Error('กรุณาตั้งชื่อผู้เล่น');
  const now = new Date().toISOString();
  const profile: LocalPlayerProfile = {
    id: crypto.randomUUID(), displayName: name, createdAt: now, lastPlayedAt: now,
    character: { level: 1, health: 100, energy: 100, equipment: ['มีดพก'] },
    inventory: { wood: 0, stone: 0, ration: 2 },
    progress: { unlockedMaps: ['forest-camp' as MapId], daysSurvived: 0 },
  };
  const profiles = [...readProfiles(), profile];
  writeProfiles(profiles);
  setActiveProfile(profile.id);
  return profile;
}

export function setActiveProfile(profileId: string) { localStorage.setItem(ACTIVE_PROFILE_KEY, profileId); }
export function getActiveProfile(): LocalPlayerProfile | null {
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return readProfiles().find((profile) => profile.id === activeId) ?? null;
}
