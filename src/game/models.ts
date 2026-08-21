export type MapId = 'forest-camp' | 'river-shelter' | 'ruined-outpost';

export interface LocalPlayerProfile {
  id: string;
  displayName: string;
  createdAt: string;
  lastPlayedAt: string;
  character: {
    level: number;
    health: number;
    energy: number;
    equipment: string[];
  };
  inventory: Record<string, number>;
  progress: { unlockedMaps: MapId[]; daysSurvived: number };
}

export interface RoomMember {
  profileId: string;
  displayName: string;
  isHost: boolean;
  joinedAt: string;
}

export interface RoomSessionSnapshot {
  roomCode: string;
  mapId: MapId;
  worldSeed: string;
  members: RoomMember[];
}

export interface JoinRequest {
  requestId: string;
  roomCode: string;
  requester: Pick<LocalPlayerProfile, 'id' | 'displayName'>;
}
