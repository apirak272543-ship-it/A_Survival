import assert from 'node:assert/strict';
import WebSocket from 'ws';

const endpoint = process.env.LAN_TEST_ENDPOINT || 'ws://127.0.0.1:8787/lan';
const profile = (id, displayName) => ({
  id, displayName, createdAt: new Date().toISOString(), lastPlayedAt: new Date().toISOString(),
  character: { level: 1, health: 100, energy: 100, equipment: ['มีดพก'] },
  inventory: { ration: 2 }, progress: { unlockedMaps: ['forest-camp'], daysSurvived: 0 },
});
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(endpoint); socket.once('open', () => resolve(socket)); socket.once('error', reject); });
const next = (socket, expectedType) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timed out waiting for ${expectedType}`)), 3000);
  const handler = (raw) => { const message = JSON.parse(String(raw)); if (message.type === expectedType) { clearTimeout(timer); socket.off('message', handler); resolve(message); } };
  socket.on('message', handler);
});

const host = await open();
await next(host, 'session:ready');
host.send(JSON.stringify({ type: 'room:create', roomCode: 'TEST-LAN', mapId: 'forest-camp', profile: profile('host-profile', 'เจ้าของห้อง') }));
const created = await next(host, 'room:created');
assert.equal(created.session.roomCode, 'TEST-LAN');
assert.equal(created.session.members.length, 1);

const guest = await open();
await next(guest, 'session:ready');
guest.send(JSON.stringify({ type: 'room:request-join', roomCode: 'TEST-LAN', profile: profile('guest-profile', 'ผู้ร่วมทีม') }));
await next(guest, 'room:awaiting-approval');
const request = await next(host, 'room:join-request');
assert.equal(request.request.requester.displayName, 'ผู้ร่วมทีม');

host.send(JSON.stringify({ type: 'room:respond-join', requestId: request.request.requestId, accepted: true }));
const approved = await next(guest, 'room:join-approved');
assert.equal(approved.session.members.length, 2);
assert.deepEqual(approved.session.members.map((member) => member.displayName).sort(), ['ผู้ร่วมทีม', 'เจ้าของห้อง']);
host.close(); guest.close();
console.log('A_Survival LAN Host integration: PASS');
