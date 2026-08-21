import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { createProfile, getActiveProfile, listProfiles, setActiveProfile } from './game/localProfileStore';
import { LocalLanTransport } from './game/lan-transport';
import type { JoinRequest, LocalPlayerProfile, MapId, RoomSessionSnapshot } from './game/models';
import type { ServerMessage } from './game/lan-protocol';

type View = 'profiles' | 'lobby' | 'waiting' | 'syncing' | 'world';
const maps: Array<{ id: MapId; name: string; description: string }> = [
  { id: 'forest-camp', name: 'ค่ายกลางป่า', description: 'พื้นที่เริ่มต้นสำหรับตั้งค่ายและหาเสบียง' },
  { id: 'river-shelter', name: 'ที่พักริมธาร', description: 'ปลดล็อกเมื่อรอดชีวิตได้มากขึ้น' },
  { id: 'ruined-outpost', name: 'ฐานร้าง', description: 'พื้นที่อันตรายสำหรับทีมที่พร้อมแล้ว' },
];
const roomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
const defaultEndpoint = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8787/lan`;

export default function App() {
  const transportRef = useRef(new LocalLanTransport());
  const [profiles, setProfiles] = useState<LocalPlayerProfile[]>(() => listProfiles());
  const [active, setActive] = useState<LocalPlayerProfile | null>(() => getActiveProfile());
  const [view, setView] = useState<View>(() => getActiveProfile() ? 'lobby' : 'profiles');
  const [newName, setNewName] = useState('');
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [selectedMap, setSelectedMap] = useState<MapId>('forest-camp');
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<RoomSessionSnapshot | null>(null);
  const [incoming, setIncoming] = useState<JoinRequest | null>(null);
  const [notice, setNotice] = useState('');
  const [syncPercent, setSyncPercent] = useState(0);

  const selectedMapInfo = useMemo(() => maps.find((map) => map.id === selectedMap)!, [selectedMap]);
  useEffect(() => {
    const off = transportRef.current.onMessage((message: ServerMessage) => handleServerMessage(message));
    return () => { off(); transportRef.current.disconnect(); };
  });

  function handleServerMessage(message: ServerMessage) {
    if (message.type === 'room:created' || message.type === 'room:members') { setSession(message.session); return; }
    if (message.type === 'room:join-request') { setIncoming(message.request); setNotice(`${message.request.requester.displayName} ต้องการเข้าร่วม`); return; }
    if (message.type === 'room:awaiting-approval') { setView('waiting'); setNotice('ส่งคำขอแล้ว กำลังรอเจ้าของห้องยืนยัน'); return; }
    if (message.type === 'room:join-approved') { setSession(message.session); beginSync(message.session); return; }
    if (message.type === 'room:join-rejected') { setView('lobby'); setNotice(message.reason); return; }
    if (message.type === 'server:error') { setNotice(message.reason); }
  }

  function beginSync(nextSession: RoomSessionSnapshot) {
    setView('syncing'); setSyncPercent(8);
    const dataWeight = JSON.stringify(nextSession).length;
    const checkpoints = [32, 58, Math.min(92, 75 + Math.ceil(dataWeight / 80)), 100];
    checkpoints.forEach((value, index) => window.setTimeout(() => { setSyncPercent(value); if (value === 100) setView('world'); }, 500 + index * 700));
  }

  function createPlayer(event: FormEvent) {
    event.preventDefault();
    try { const profile = createProfile(newName); setProfiles(listProfiles()); setActive(profile); setNewName(''); setView('lobby'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'ไม่สามารถสร้างผู้เล่นได้'); }
  }

  async function connect() { await transportRef.current.connect(endpoint); }
  async function createRoom() {
    if (!active) return;
    try { await connect(); transportRef.current.send({ type: 'room:create', roomCode: roomCode(), mapId: selectedMap, profile: active }); setNotice('สร้างห้องแล้ว รอคำขอเข้าร่วม'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'เชื่อมต่อไม่สำเร็จ'); }
  }
  async function requestJoin() {
    if (!active || !joinCode.trim()) { setNotice('กรุณากรอกรหัสห้อง'); return; }
    try { await connect(); transportRef.current.send({ type: 'room:request-join', roomCode: joinCode.trim().toUpperCase(), profile: active }); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'เชื่อมต่อไม่สำเร็จ'); }
  }
  function respondToJoin(accepted: boolean) {
    if (!incoming) return;
    transportRef.current.send({ type: 'room:respond-join', requestId: incoming.requestId, accepted });
    if (accepted && session) beginSync(session);
    setIncoming(null); setNotice(accepted ? 'ยืนยันผู้เล่นแล้ว กำลังเตรียมข้อมูลร่วมกัน' : 'ปฏิเสธคำขอแล้ว');
  }
  function chooseProfile(profile: LocalPlayerProfile) { setActiveProfile(profile.id); setActive(profile); setView('lobby'); }

  return <main className="app-shell">
    <section className="hero"><p className="eyebrow">LOCAL-FIRST SURVIVAL</p><h1>A<span>_</span>Survival</h1><p>ตัวละครของคุณเก็บอยู่ในเครื่องนี้ และจะเชื่อมต่อกับเพื่อนเมื่อทั้งสองฝ่ายยืนยันพร้อมกัน</p></section>
    {notice && <div className="notice" role="status">{notice}</div>}
    {view === 'profiles' && <section className="panel profile-panel"><div><h2>เลือกผู้เล่น</h2><p>ข้อมูลตัวละคร ไอเทม และความคืบหน้าจะเก็บแยกไว้ในอุปกรณ์นี้</p></div><div className="profile-grid">{profiles.map((profile) => <button className="profile-card" onClick={() => chooseProfile(profile)} key={profile.id}><span className="avatar">{profile.displayName.slice(0, 1)}</span><strong>{profile.displayName}</strong><small>เลเวล {profile.character.level} · รอดชีวิต {profile.progress.daysSurvived} วัน</small></button>)}</div><form className="create-profile" onSubmit={createPlayer}><label htmlFor="new-player">สร้างผู้เล่นใหม่</label><div><input id="new-player" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="ชื่อผู้เล่น" maxLength={24} /><button className="primary">สร้างผู้เล่น</button></div></form></section>}
    {view === 'lobby' && active && <section className="lobby-grid"><div className="panel player-summary"><span className="avatar">{active.displayName.slice(0, 1)}</span><div><p className="eyebrow">ผู้เล่นในเครื่องนี้</p><h2>{active.displayName}</h2><p>เลเวล {active.character.level} · ไอเทมเริ่มต้น {Object.keys(active.inventory).length} ชนิด</p></div><button className="secondary" onClick={() => setView('profiles')}>เปลี่ยนผู้เล่น</button></div><div className="panel"><h2>เชื่อมต่อใน Wi‑Fi เดียวกัน</h2><label htmlFor="endpoint">ที่อยู่เครื่องโฮสต์</label><input id="endpoint" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} spellCheck="false" /><p className="helper">เครื่องที่สร้างห้องเปิด LAN Host ไว้ก่อน แล้วผู้เล่นทุกคนใช้ที่อยู่นี้</p><div className="map-options">{maps.map((map) => <button key={map.id} className={selectedMap === map.id ? 'map-option selected' : 'map-option'} disabled={!active.progress.unlockedMaps.includes(map.id)} onClick={() => setSelectedMap(map.id)}><strong>{map.name}</strong><small>{map.description}</small></button>)}</div><button className="primary wide" onClick={createRoom}>สร้างห้อง {selectedMapInfo.name}</button></div><div className="panel join-panel"><h2>เข้าร่วมห้องเพื่อน</h2><p>เจ้าของห้องต้องกดยืนยันก่อน คุณจึงจะเริ่มปรับข้อมูลเพื่อเข้าแผนที่ได้</p><input aria-label="รหัสห้อง" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="รหัสห้อง เช่น AB12-CD34" /><button className="secondary wide" onClick={requestJoin}>ส่งคำขอเชื่อมต่อ</button></div>{session && <div className="panel room-panel"><p className="eyebrow">ห้องที่เปิดอยู่</p><h2>{session.roomCode}</h2><p>{maps.find((map) => map.id === session.mapId)?.name} · ผู้เล่น {session.members.length} คน</p><p className="helper">ไม่มีการจำกัดจำนวนโดยโค้ด แต่จำนวนที่เหมาะสมขึ้นกับกำลังของเครื่องโฮสต์และเครือข่าย</p></div>}{incoming && <div className="modal-backdrop"><section className="confirm-card"><p className="eyebrow">คำขอเชื่อมต่อ</p><h2>{incoming.requester.displayName} ต้องการเข้าร่วมห้อง</h2><p>หากยอมรับ ระบบจะเตรียมเฉพาะสถานะที่จำเป็นสำหรับเล่นร่วมกัน โดยไม่แทนที่ข้อมูลตัวละครในเครื่องของคุณ</p><div className="actions"><button className="secondary" onClick={() => respondToJoin(false)}>ปฏิเสธ</button><button className="primary" onClick={() => respondToJoin(true)}>ยอมรับและเตรียมข้อมูล</button></div></section></div>}</section>}
    {view === 'waiting' && <section className="panel centered"><p className="eyebrow">คำขอถูกส่งแล้ว</p><h2>กำลังรอเจ้าของห้องยืนยัน</h2><p>เมื่อเจ้าของห้องยอมรับ ระบบจะเริ่มตรวจสอบและเตรียมข้อมูลเพื่อเข้าแผนที่เดียวกัน</p><button className="secondary" onClick={() => { transportRef.current.disconnect(); setView('lobby'); }}>ยกเลิกคำขอ</button></section>}
    {view === 'syncing' && <section className="panel centered sync-panel"><p className="eyebrow">กำลังเตรียมการเล่นร่วมกัน</p><h2>{syncPercent < 35 ? 'ตรวจสอบโปรไฟล์ผู้เล่น' : syncPercent < 75 ? 'ปรับกติกาห้องและแผนที่' : 'จัดเตรียมสถานะร่วมกัน'}</h2><div className="progress"><i style={{ width: `${syncPercent}%` }} /></div><strong>{syncPercent}%</strong><p>ข้อมูลตัวละครส่วนตัวจะยังคงอยู่ในอุปกรณ์ของแต่ละคน</p></section>}
    {view === 'world' && <section className="world-shell"><GameCanvas /><div className="world-hud"><span>♥ {active?.character.health ?? 100}</span><span>⚡ {active?.character.energy ?? 100}</span><span>ห้อง {session?.roomCode ?? '—'}</span></div><div className="world-caption"><p>เล่นร่วมกันแล้ว</p><strong>{session?.members.length ?? 1} ผู้เล่นในห้อง</strong></div></section>}
  </main>;
}
