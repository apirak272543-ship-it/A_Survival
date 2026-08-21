import type { JoinRequest, LocalPlayerProfile, MapId, RoomSessionSnapshot } from './models';

export type ClientMessage =
  | { type: 'room:create'; roomCode: string; mapId: MapId; profile: LocalPlayerProfile }
  | { type: 'room:request-join'; roomCode: string; profile: LocalPlayerProfile }
  | { type: 'room:respond-join'; requestId: string; accepted: boolean }
  | { type: 'world:state'; state: Record<string, unknown> };

export type ServerMessage =
  | { type: 'session:ready'; clientId: string }
  | { type: 'room:created'; session: RoomSessionSnapshot }
  | { type: 'room:join-request'; request: JoinRequest }
  | { type: 'room:awaiting-approval'; roomCode: string }
  | { type: 'room:join-approved'; session: RoomSessionSnapshot }
  | { type: 'room:join-rejected'; reason: string }
  | { type: 'room:members'; session: RoomSessionSnapshot }
  | { type: 'server:error'; reason: string };
