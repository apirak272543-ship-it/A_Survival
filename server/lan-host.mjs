import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 8787);
const root = join(process.cwd(), 'dist');
const rooms = new Map();
const clientState = new WeakMap();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (socket, payload) => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload)); };
const publicSession = (room) => ({ roomCode: room.roomCode, mapId: room.mapId, worldSeed: room.worldSeed, members: [...room.members.values()].map(({ profile, isHost, joinedAt }) => ({ profileId: profile.id, displayName: profile.displayName, isHost, joinedAt })) });
const broadcast = (room, payload) => room.clients.forEach((client) => send(client, payload));
const removeClient = (socket) => { const state = clientState.get(socket); if (!state?.roomCode) return; const room = rooms.get(state.roomCode); if (!room) return; room.clients.delete(socket); room.members.delete(state.profileId); if (!room.clients.size) rooms.delete(state.roomCode); else broadcast(room, { type: 'room:members', session: publicSession(room) }); };

const server = createServer((request, response) => {
  const requested = request.url?.split('?')[0] || '/';
  const safePath = normalize(requested === '/' ? '/index.html' : requested).replace(/^([.][.][/\\])+/, '');
  const filename = join(root, safePath);
  const resolved = existsSync(filename) ? filename : join(root, 'index.html');
  if (!existsSync(resolved)) { response.writeHead(404).end('Build the game first with pnpm build'); return; }
  response.writeHead(200, { 'Content-Type': mime[extname(resolved)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); createReadStream(resolved).pipe(response);
});

const wss = new WebSocketServer({ server, path: '/lan' });
wss.on('connection', (socket) => {
  const clientId = crypto.randomUUID(); send(socket, { type: 'session:ready', clientId });
  socket.on('message', (raw) => {
    let message; try { message = JSON.parse(String(raw)); } catch { send(socket, { type: 'server:error', reason: 'รูปแบบข้อมูลไม่ถูกต้อง' }); return; }
    if (message.type === 'room:create') {
      if (rooms.has(message.roomCode)) { send(socket, { type: 'server:error', reason: 'รหัสห้องซ้ำ กรุณาสร้างใหม่' }); return; }
      const room = { roomCode: message.roomCode, mapId: message.mapId, worldSeed: crypto.randomUUID(), host: socket, clients: new Set([socket]), members: new Map([[message.profile.id, { profile: message.profile, isHost: true, joinedAt: new Date().toISOString() }]]), requests: new Map() };
      rooms.set(room.roomCode, room); clientState.set(socket, { roomCode: room.roomCode, profileId: message.profile.id }); send(socket, { type: 'room:created', session: publicSession(room) }); return;
    }
    if (message.type === 'room:request-join') {
      const room = rooms.get(message.roomCode); if (!room) { send(socket, { type: 'room:join-rejected', reason: 'ไม่พบห้องนี้ หรือห้องปิดแล้ว' }); return; }
      const requestId = crypto.randomUUID(); room.requests.set(requestId, { socket, profile: message.profile }); clientState.set(socket, { roomCode: room.roomCode, profileId: message.profile.id }); send(socket, { type: 'room:awaiting-approval', roomCode: room.roomCode }); send(room.host, { type: 'room:join-request', request: { requestId, roomCode: room.roomCode, requester: { id: message.profile.id, displayName: message.profile.displayName } } }); return;
    }
    const state = clientState.get(socket); const room = state?.roomCode ? rooms.get(state.roomCode) : null;
    if (message.type === 'room:respond-join' && room?.host === socket) { const request = room.requests.get(message.requestId); if (!request) { send(socket, { type: 'server:error', reason: 'คำขอนี้หมดอายุแล้ว' }); return; } room.requests.delete(message.requestId); if (!message.accepted) { send(request.socket, { type: 'room:join-rejected', reason: 'เจ้าของห้องปฏิเสธคำขอเชื่อมต่อ' }); return; } room.clients.add(request.socket); room.members.set(request.profile.id, { profile: request.profile, isHost: false, joinedAt: new Date().toISOString() }); const session = publicSession(room); send(request.socket, { type: 'room:join-approved', session }); broadcast(room, { type: 'room:members', session }); }
  });
  socket.on('close', () => removeClient(socket));
});

server.listen(port, '0.0.0.0', () => console.log(`A_Survival LAN Host ready on http://0.0.0.0:${port}`));
