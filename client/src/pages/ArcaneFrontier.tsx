import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Backpack,
  BellRing,
  Box,
  CircleHelp,
  ChevronLeft,
  Compass,
  Crosshair,
  Download,
  Flame,
  Flower2,
  Gamepad2,
  Gem,
  Home,
  Map as MapIcon,
  Menu,
  PawPrint,
  Pickaxe,
  Play,
  Settings2,
  Shield,
  ShieldAlert,
  Sparkles,
  Sword,
  TimerReset,
  Volume2,
  Wheat,
  X,
  Zap,
} from "lucide-react";
import GameCanvas from "@/components/GameCanvas";
import { ALL_ITEMS, SOILS, TIER_RULES, createMapRewardInstance, getItemDefinition } from "@/game/data/catalog";
import { MAP_REGISTRY } from "@/game/data/maps";
import { WEEKLY_EVENTS } from "@/game/data/worldTime";
import { GAME_VERSION, formatVersionLabel } from "@/game/version";
import { trpc } from "@/lib/trpc";
import { getCachedMapIds, prepareMapModule } from "@/game/storage/mapCache";
import { getPendingTransactions, loadOfflineMapState, loadOfflineProfile, markTransactionsSynced, reconcileOfflineVectorClock, saveOfflineMapState } from "@/game/storage/indexedDb";
import { getCropStage, getPetBonus, harvestCrop, moveStructure, placeHomeObject, plantSeed, recallStructure, rotateStructure, togglePetFollowing, transferPetEquipment } from "@/game/home/homeSystemV2";
import {
  DEFAULT_SETTINGS,
  createSession,
  getSettings,
  hydrateSession,
  saveSession,
  saveSettings,
  type GameSettings,
  type LocalGameSession,
} from "@/game/storage/session";
import type { BlockActionEvent, FarmActionEvent, GameSnapshot } from "@/game/scene";
import { HELP_ARTICLES, getHelpArticle, type HelpTopic } from "@/game/help/helpContent";
import { inspectInventoryIntegrity, integrityStatusCopy, type IntegrityReport } from "@/game/integrity/integrityVerdict";
import { getVaultActionState, toggleVaultEquipment, type VaultAction } from "@/game/integrity/vaultActions";
import { RUNTIME_MAP_ID, isRuntimeMapAllowed, resolveDirectMapId, resolveDirectRoute, type DirectRouteScreen } from "@/game/routing/directRoute";
import { dispatchHotbarAction, getHotbarInstance, type HotbarSlot } from "@/game/systems/itemActionSystem";
import { consumeOneFromStack, type WorldBlockOverrides } from "@/game/systems/blockActionSystem";
import { CHEST_SLOT_LIMIT, CARRY_SLOT_LIMIT, STORAGE_CHEST_ID, createEmptyWorldStorage, depositIntoChest, getWorldStorageSlots, withdrawFromChest as withdrawItemFromChest, type WorldStorageById } from "@/game/systems/worldStorageSystem";
import type { WorldFarmState } from "@/game/systems/worldFarmSystem";
import { CAMERA_MODE_OPTIONS, DEFAULT_IN_MAP_SETTINGS, TARGET_FPS_OPTIONS, VIEW_DISTANCE_BLOCKS, normalizeInMapSettings, type InMapSettings } from "@/game/systems/cameraModes";
import { DEFAULT_ASSET_PACK_MANIFEST, loadAssetPackManifest, resolveAssetUrl, type AssetPackManifest } from "@/game/assets/assetPackLoader";
import { resolveLoadingVariant } from "@/game/ui/loadingVariant";

type Screen = DirectRouteScreen;
type Transition = { destination: Screen; mapId?: string; title: string; accent: string; progress: number; phase: string; cached?: boolean; offline?: boolean } | null;
const SCREEN_HINTS: Partial<Record<Screen, { topic: HelpTopic; text: string }>> = {
  identity: { topic: "identity", text: "Player ID ไม่ใช่รหัสผ่าน · เซฟเริ่มบนอุปกรณ์นี้ทันที" },
  maps: { topic: "offline", text: "ครั้งแรกเตรียม map module และ key art · รอบถัดไปใช้ cache ได้" },
  home: { topic: "home", text: "เลือกเมล็ดที่ตรงสีดิน แล้วปลูก/เก็บเกี่ยวได้แม้ออฟไลน์" },
  game: { topic: "expedition", text: "จอยซ้ายเดิน · แตะช่องเพื่อเลือก · กด USE เพื่อใช้ · ปุ่มขวาโจมตีและ dash" },
};

function getInitialScreen(): Screen {
  if (typeof window === "undefined") return "landing";
  return resolveDirectRoute(window.location.search);
}

function getInitialMapId() {
  if (typeof window === "undefined") return "obsidian-frontier";
  return resolveDirectMapId(window.location.search, MAP_REGISTRY.map(map => map.id));
}

function getIntegrityDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("integrity") === "demo";
}

function getVaultDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("vault") === "demo";
}

function getLoadingDemoTransition(): Transition {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const demo = params.get("loading");
  const map = MAP_REGISTRY.find(candidate => candidate.id === params.get("map") && isRuntimeMapAllowed(candidate.id)) ?? MAP_REGISTRY.find(candidate => candidate.id === RUNTIME_MAP_ID);
  if (demo === "biome" && map) return { destination: "game", mapId: map.id, title: map.name, accent: map.accent, progress: 64, phase: "กำลังตรวจ asset ของ biome", cached: false, offline: false };
  if (demo === "home") return { destination: "home", title: "Aether Homestead", accent: "#ffb703", progress: 68, phase: "เตรียมระบบฐานที่มั่น", cached: true, offline: false };
  if (demo === "maps") return { destination: "maps", title: "Map Observatory", accent: "#9d4edd", progress: 42, phase: "กำลังอ่านพิกัดที่บันทึกไว้", cached: true, offline: true };
  if (demo === "lobby") return { destination: "lobby", title: "Frontier Lobby", accent: "#00f0ff", progress: 56, phase: "ตรวจสถานะ Player ID", cached: false, offline: false };
  return null;
}

function dispatchControl(detail: unknown) {
  window.dispatchEvent(new CustomEvent("arcane-control", { detail }));
}

function ArcaneMark() {
  return <div className="arcane-mark" aria-hidden="true"><span /><i /><b /></div>;
}

function LoadingGate({ transition, reducedMotion }: { transition: NonNullable<Transition>; reducedMotion: boolean }) {
  const variant = resolveLoadingVariant(transition.destination, transition.mapId);
  const connectionMode = transition.offline ? "offline" : transition.cached ? "cached" : "online";
  const statusCopy = transition.offline ? "โหมดออฟไลน์: กำลังโหลดข้อมูลจากหน่วยความจำสำรองในเครื่อง..." : transition.cached ? "พบข้อมูลในแคช: กำลังเข้าสู่พื้นที่อย่างรวดเร็ว..." : transition.phase === "กำลังปรับเส้นทางพลังงาน" ? variant.statusLabel : transition.phase;
  return (
    <div className="loading-gate" data-destination-type={variant.kind} data-loading-state={transition.progress >= 100 ? "complete" : transition.progress > 0 ? "loading" : "preparing"} data-connection-mode={connectionMode} data-reduced-motion={reducedMotion ? "true" : "false"} style={{ "--biome-accent": transition.accent } as React.CSSProperties}>
      {variant.keyArt && <img className="loading-keyart" src={variant.keyArt} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback"); }} />}
      <div className="loading-variant-texture" aria-hidden="true" />
      <div className="loading-stars" />
      <div className="loading-orbit orbit-one" />
      <div className="loading-orbit orbit-two" />
      <div className="loading-center">
        <ArcaneMark />
        <p className="eyebrow">{variant.eyebrow}</p>
        <h2>{transition.title}</h2>
        <p>{statusCopy}</p>
        <div className="loading-telemetry"><span>{variant.metric}</span><span>{connectionMode.toUpperCase()}</span></div>
        <div className="load-track" role="progressbar" aria-label="ความคืบหน้าการโหลด" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(transition.progress)}><span style={{ width: `${transition.progress}%` }} /></div>
        <small>{Math.round(transition.progress)}% · {transition.offline ? "offline route" : transition.cached ? "cached route" : "cache preparation"}</small>
      </div>
    </div>
  );
}

function HealthBar({ label, value, tone }: { label: string; value: number; tone: "health" | "shield" | "energy" }) {
  return <div className="meter"><div className="meter-label"><span>{label}</span><b>{Math.round(value)}</b></div><div className={`meter-track ${tone}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function TouchStick() {
  const padRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = padRef.current?.getBoundingClientRect();
    if (!box) return;
    const rawX = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const rawY = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
    const rawLength = Math.hypot(rawX, rawY);
    const length = Math.min(1, rawLength);
    const x = rawLength > 0 ? Math.max(-1, Math.min(1, (rawX / rawLength) * length)) : 0;
    const y = rawLength > 0 ? Math.max(-1, Math.min(1, (rawY / rawLength) * length)) : 0;
    setPoint({ x, y });
    dispatchControl({ type: "move", x, y });
  };
  const stop = () => {
    setPoint({ x: 0, y: 0 });
    dispatchControl({ type: "move", x: 0, y: 0 });
  };
  return <div ref={padRef} className="touch-stick" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }} onPointerMove={event => event.currentTarget.hasPointerCapture(event.pointerId) && move(event)} onPointerUp={stop} onPointerCancel={stop}>
    <span className="touch-stick-core" style={{ transform: `translate(${point.x * 22}px, ${point.y * 22}px)` }} />
  </div>;
}

function SettingsSheet({ settings, setSettings, close }: { settings: GameSettings; setSettings: (settings: GameSettings) => void; close: () => void }) {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => setSettings({ ...settings, [key]: value });
  return <div className="settings-scrim" onPointerDown={close}><section className="settings-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="ตั้งค่าตัวเกมภาพรวม">
    <header><div><p className="eyebrow">Global settings · App-wide</p><h3>ตั้งค่าตัวเกมภาพรวม</h3></div><button className="icon-button" onClick={close} aria-label="ปิดตั้งค่า"><X size={18} /></button></header>
    <div className="setting-stack">
      <label><span>ระยะเรนเดอร์ภาพรวม</span><select value={settings.renderDistance} onChange={event => update("renderDistance", event.target.value as GameSettings["renderDistance"])}><option value="near">ใกล้ · ประหยัดแบต</option><option value="balanced">กลาง · แนะนำ</option><option value="far">ไกล · ใช้กับเครื่องแรงกว่า</option></select></label>
      <label><span>คุณภาพภาพ</span><select value={settings.quality} onChange={event => update("quality", event.target.value as GameSettings["quality"])}><option value="low">ต่ำ · ประหยัดแบต</option><option value="medium">กลาง · สมดุล</option><option value="high">สูง · เอฟเฟกต์เต็ม</option></select></label>
      <label><span>ความหนาแน่นเอฟเฟกต์</span><select value={settings.effectIntensity} onChange={event => update("effectIntensity", event.target.value as GameSettings["effectIntensity"])}><option value="low">ต่ำ</option><option value="medium">กลาง</option><option value="high">สูง</option></select></label>
      <label><span>เพลง <b>{settings.musicVolume}%</b></span><input type="range" min="0" max="100" value={settings.musicVolume} onChange={event => update("musicVolume", Number(event.target.value))} /></label>
      <label><span>เสียงเอฟเฟกต์ <b>{settings.sfxVolume}%</b></span><input type="range" min="0" max="100" value={settings.sfxVolume} onChange={event => update("sfxVolume", Number(event.target.value))} /></label>
      <label><span>ขนาดปุ่มสัมผัส <b>{Math.round(settings.touchScale * 100)}%</b></span><input type="range" min="0.8" max="1.25" step="0.05" value={settings.touchScale} onChange={event => update("touchScale", Number(event.target.value))} /></label>
      <label><span>ความทึบปุ่มสัมผัส <b>{Math.round(settings.touchOpacity * 100)}%</b></span><input type="range" min="0.45" max="1" step="0.05" value={settings.touchOpacity} onChange={event => update("touchOpacity", Number(event.target.value))} /></label>
      <label className="toggle-row"><span>ลดการเคลื่อนไหว</span><input type="checkbox" checked={settings.reducedMotion} onChange={event => update("reducedMotion", event.target.checked)} /></label>
      <p className="settings-note">เมนูนี้ใช้กับภาพ เสียง และการควบคุมของแอปโดยรวม ส่วนมุมมอง ระยะ 5–50 บล็อก และเป้าหมาย FPS อยู่ในตั้งค่าภายในแผนที่เมื่อกำลังเล่น</p>
    </div>
  </section></div>;
}

function InMapSettingsSheet({ settings, setSettings, close }: { settings: InMapSettings; setSettings: (settings: InMapSettings) => void; close: () => void }) {
  const update = <K extends keyof InMapSettings>(key: K, value: InMapSettings[K]) => setSettings({ ...settings, [key]: value });
  return <div className="settings-scrim" onPointerDown={close}><section className="settings-sheet in-map-settings-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="ตั้งค่าภายในแผนที่">
    <header><div><p className="eyebrow">In-map settings · Obsidian Frontier</p><h3>ตั้งค่าภายในแผนที่</h3></div><button className="icon-button" onClick={close} aria-label="ปิดตั้งค่า"><X size={18} /></button></header>
    <div className="setting-stack">
      <label><span>มุมมองการเล่น</span><select value={settings.cameraMode} onChange={event => update("cameraMode", event.target.value as InMapSettings["cameraMode"])}>{CAMERA_MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label} · {option.description}</option>)}</select></label>
      <label><span>ระยะมองเห็น <b>{settings.viewDistanceBlocks} บล็อก</b></span><select value={settings.viewDistanceBlocks} onChange={event => update("viewDistanceBlocks", Number(event.target.value) as InMapSettings["viewDistanceBlocks"])}>{VIEW_DISTANCE_BLOCKS.map(blocks => <option key={blocks} value={blocks}>{blocks} บล็อก</option>)}</select></label>
      <label><span>เป้าหมายเฟรมเรต <b>{settings.targetFps} FPS</b></span><select value={settings.targetFps} onChange={event => update("targetFps", Number(event.target.value) as InMapSettings["targetFps"])}>{TARGET_FPS_OPTIONS.map(fps => <option key={fps} value={fps}>{fps} FPS{fps === 120 ? " · ถ้าอุปกรณ์รองรับ" : " · เป้าหมาย ไม่ใช่การรับประกัน"}</option>)}</select></label>
      <p className="settings-note">มุมมองและระยะนี้บันทึกแยกตามผู้เล่นกับแผนที่ ส่วน FPS เป็นค่าเป้าหมายของเกม ไม่ใช่ผลทดสอบประสิทธิภาพของเครื่อง</p>
    </div>
  </section></div>;
}

function HelpSheet({ topic, setTopic, close }: { topic: HelpTopic; setTopic: (topic: HelpTopic) => void; close: () => void }) {
  const article = getHelpArticle(topic);
  return <div className="settings-scrim help-scrim" onPointerDown={close}><section className="settings-sheet help-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="คู่มือ Arcane Frontier">
    <header><div><p className="eyebrow">Frontier field guide</p><h3>คู่มือการเอาชีวิตรอด</h3></div><button className="icon-button" onClick={close} aria-label="ปิดคู่มือ"><X size={18} /></button></header>
    <div className="help-layout"><nav aria-label="หัวข้อคู่มือ">{HELP_ARTICLES.map(item => <button key={item.id} className={item.id === topic ? "active" : ""} onClick={() => setTopic(item.id)}>{item.eyebrow}</button>)}</nav><article><p className="eyebrow">{article.eyebrow}</p><h4>{article.title}</h4><p>{article.body}</p><ul>{article.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></article></div>
  </section></div>;
}

function TacticalMapSheet({ map, snapshot, close }: { map: typeof MAP_REGISTRY[number]; snapshot: GameSnapshot; close: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [waypoint, setWaypoint] = useState<{ x: number; y: number } | null>(null);
  return <div className="tactical-scrim" onPointerDown={close}>
    <section className="tactical-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Tactical map">
      <header className="tactical-header"><div><p className="eyebrow">Tactical map · {map.biome}</p><h3>{map.name}</h3></div><div className="tactical-actions"><button className="icon-button" onClick={() => setZoom(current => Math.max(.8, Number((current - .15).toFixed(2))))} aria-label="ซูมออก">−</button><b>{Math.round(zoom * 100)}%</b><button className="icon-button" onClick={() => setZoom(current => Math.min(1.8, Number((current + .15).toFixed(2))))} aria-label="ซูมเข้า">+</button><button className="icon-button" onClick={close} aria-label="ปิดแผนที่"><X size={18} /></button></div></header>
      <div className="tactical-map-canvas" style={{ "--map-zoom": zoom, "--map-accent": map.accent } as React.CSSProperties} onPointerDown={event => { const rect = event.currentTarget.getBoundingClientRect(); setWaypoint({ x: Math.round(((event.clientX - rect.left) / rect.width) * 100), y: Math.round(((event.clientY - rect.top) / rect.height) * 100) }); }}>
        <span className="tactical-grid" /><span className="tactical-player" style={{ left: "50%", top: "50%" }} /><span className="tactical-safe-zone" /><span className="tactical-resource" style={{ left: "31%", top: "38%" }} /><span className="tactical-resource" style={{ left: "70%", top: "62%" }} /><span className="tactical-threat" style={{ left: "64%", top: "35%" }} /><span className="tactical-threat" style={{ left: "39%", top: "69%" }} />{waypoint && <span className="tactical-waypoint" style={{ left: `${waypoint.x}%`, top: `${waypoint.y}%` }} />}
      </div>
      <footer className="tactical-footer"><span><MapIcon size={14} /> แตะบนแผนที่เพื่อวาง waypoint</span><span><Crosshair size={14} /> {snapshot.enemies} threats · {snapshot.resources} resources · fog {snapshot.mapState ?? "exploring"}</span></footer>
    </section>
  </div>;
}

function IntegritySheet({ report, syncAttention, close }: { report: IntegrityReport; syncAttention: boolean; close: () => void }) {
  const quarantined = report.quarantinedInstanceIds.length;
  return <div className="settings-scrim help-scrim" onPointerDown={close}><section className="settings-sheet help-sheet integrity-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="สถานะความสอดคล้องของคลังไอเทม">
    <header><div><p className="eyebrow">Integrity relay</p><h3>ตรวจสอบคลังไอเทม</h3></div><button className="icon-button" onClick={close} aria-label="ปิดสถานะ integrity"><X size={18} /></button></header>
    <div className="integrity-sheet-content"><div className={`integrity-verdict ${report.status}`}><ShieldAlert size={21} /><div><b>{report.status === "clear" && !syncAttention ? "คลังไอเทมพร้อมใช้งาน" : "มีรายการรอตรวจสอบ"}</b><p>{report.status === "clear" ? (syncAttention ? "มี action ออฟไลน์บางรายการที่ต้องซิงก์ใหม่" : "ไม่พบ item instance ที่ผิดกติกาในเซฟปัจจุบัน") : integrityStatusCopy(report)}</p></div></div>
      {quarantined > 0 && <section className="integrity-explainer"><h4>สิ่งที่ระบบทำตอนนี้</h4><p>ระบบพักการสวมใส่ ย่อย หรือแลกเปลี่ยนเฉพาะ {quarantined} item instance ที่ข้อมูลไม่ตรงกันเท่านั้น รายการอื่นยังเล่นและใช้งานต่อได้ตามปกติ</p><ul><li>เชื่อมต่ออินเทอร์เน็ตแล้วกลับ Lobby เพื่อซิงก์ข้อมูลอีกครั้ง</li><li>หากสถานะยังอยู่ ให้เก็บ item instance นี้ไว้เพื่อให้ server ตรวจประวัติได้</li><li>ต้นแบบนี้เป็นระบบป้องกันข้อมูลเสียหายเบื้องต้น ไม่ใช่ anti-cheat แบบ server-authoritative</li></ul></section>}
      {report.findings.length > 0 && <div className="integrity-findings">{report.findings.slice(0, 4).map((item, index) => <div key={`${item.code}-${item.instanceId ?? "global"}-${index}`}><span>{item.severity.toUpperCase()}</span><p>{item.message}</p></div>)}</div>}
    </div>
  </section></div>;
}

function VaultSheet({ session, quarantinedInstanceIds, close, onEquip, onSyncRequest, toast, getAssetUrl }: { session: LocalGameSession; quarantinedInstanceIds: Set<string>; close: () => void; onEquip: (instanceId: string) => void; onSyncRequest: () => void; toast: (message: string) => void; getAssetUrl: (assetId?: string) => string | undefined }) {
  const [category, setCategory] = useState<"all" | "weapons" | "materials">("all");
  const [selectedInstanceId, setSelectedInstanceId] = useState(session.inventory[0]?.instanceId ?? "");
  const visibleItems = session.inventory.filter(instance => {
    const definition = getItemDefinition(instance.definitionId);
    return category === "all" || category === "weapons" ? category === "all" || Boolean(definition?.equippable) : definition?.category === "material";
  });
  const selected = visibleItems.find(instance => instance.instanceId === selectedInstanceId) ?? visibleItems[0];
  const definition = selected ? getItemDefinition(selected.definitionId) : undefined;
  const quarantined = Boolean(selected && quarantinedInstanceIds.has(selected.instanceId));
  const equipment = session.vaultEquipment ?? {};
  const equipped = Boolean(selected && Object.values(equipment).includes(selected.instanceId));
  const actionState = (action: VaultAction) => getVaultActionState(selected, quarantinedInstanceIds, action);
  const action = (kind: VaultAction) => {
    const state = actionState(kind);
    if (!state.allowed) { toast(state.reason ?? "การทำงานนี้ถูกจำกัด"); return; }
    if (kind === "equip" && selected) onEquip(selected.instanceId);
  };
  return <div className="settings-scrim vault-scrim" onPointerDown={close}><section className="vault-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Frontier Vault">
    <header><div><p className="eyebrow">Frontier vault</p><h3>คลังไอเทม</h3></div><button className="icon-button" onClick={close} aria-label="ปิดคลังไอเทม"><X size={18} /></button></header>
    <div className="vault-layout"><aside className="vault-nav"><div className="vault-player"><span>{session.playerId.slice(0, 1).toUpperCase()}</span><div><b>{session.playerId}</b><small>LOCAL SAVE · {navigator.onLine ? "ONLINE" : "OFFLINE"}</small></div></div><div className="vault-tabs"><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>ทั้งหมด</button><button className={category === "weapons" ? "active" : ""} onClick={() => setCategory("weapons")}>อาวุธ</button><button className={category === "materials" ? "active" : ""} onClick={() => setCategory("materials")}>วัตถุดิบ</button></div><p>เลือก item instance เพื่อดู provenance และสถานะการใช้งาน</p></aside>
      <section className="vault-grid-panel"><div className="vault-grid-label"><span>ITEM INSTANCES</span><b>{visibleItems.length}</b></div><div className="vault-grid">{visibleItems.map(instance => { const item = getItemDefinition(instance.definitionId); const isQuarantined = quarantinedInstanceIds.has(instance.instanceId); const isEquipped = Object.values(equipment).includes(instance.instanceId); return <button key={instance.instanceId} className={`vault-item ${instance.instanceId === selected?.instanceId ? "selected" : ""} ${isQuarantined ? "quarantined" : ""}`} onClick={() => setSelectedInstanceId(instance.instanceId)} aria-label={`${item?.name ?? instance.definitionId}${isQuarantined ? ", รอการยืนยันและ actions ถูกจำกัด" : ""}`}><span className="vault-item-tier" style={{ background: TIER_RULES[item?.tier ?? "common"].color }} />{getAssetUrl(item?.iconAssetId) ? <img className="vault-pack-icon" src={getAssetUrl(item?.iconAssetId)} alt="" /> : <Box size={17} />}<b>{item?.name ?? instance.definitionId}</b><small>×{instance.quantity} · +{instance.enhancement}</small>{isEquipped && <em>ติดตั้ง</em>}{isQuarantined && <em className="quarantine-badge"><ShieldAlert size={11} /> รอยืนยัน</em>}</button>; })}</div></section>
      <section className={`vault-detail ${quarantined ? "quarantined" : ""}`}>{selected && definition ? <><div className="vault-preview">{getAssetUrl(definition.iconAssetId) ? <img className="vault-pack-preview" src={getAssetUrl(definition.iconAssetId)} alt="" /> : <Box size={38} />}<span style={{ background: TIER_RULES[definition.tier].color }} /></div><p className="eyebrow">{definition.category} · {TIER_RULES[definition.tier].label}</p><h4>{definition.name}</h4><p>{definition.effect}</p>{quarantined ? <div className="vault-quarantine"><ShieldAlert size={18} /><div><b>รอการยืนยันข้อมูล</b><p>พบความคลาดเคลื่อนของข้อมูลไอเทมนี้ ระบบได้จำกัดการใช้งานชั่วคราวเพื่อป้องกันความเสียหายต่อไฟล์เซฟของคุณ</p></div></div> : <div className="vault-provenance"><Shield size={16} /><span>Provenance · {selected.provenance.type} · {selected.provenance.eventId.slice(0, 18)}</span></div>}<div className="vault-actions"><button disabled={!actionState("equip").allowed} onClick={() => action("equip")}>{equipped ? "ถอดอาวุธ" : "ติดตั้ง"}</button><button disabled={!actionState("use").allowed} onClick={() => action("use")}>ใช้</button><button disabled={quarantined} onClick={() => action("trade")}>แลกเปลี่ยน</button><button disabled={quarantined} onClick={() => action("dismantle")}>ย่อยสลาย</button></div>{quarantined && <button className="vault-verify" onClick={onSyncRequest}>ตรวจสอบและซิงก์ใหม่</button>}</> : <p>ไม่มี item instance ในหมวดนี้</p>}</section>
    </div>
  </section></div>;
}

function ChestSheet({ session, storage, chestId, quarantinedInstanceIds, close, onDeposit, onWithdraw, getAssetUrl }: { session: LocalGameSession; storage: WorldStorageById; chestId: string; quarantinedInstanceIds: Set<string>; close: () => void; onDeposit: (instanceId: string) => void; onWithdraw: (instanceId: string) => void; getAssetUrl: (assetId?: string) => string | undefined }) {
  const [selectedChestInstanceId, setSelectedChestInstanceId] = useState<string | null>(null);
  const [selectedCarryInstanceId, setSelectedCarryInstanceId] = useState<string | null>(null);
  const slots = getWorldStorageSlots(storage, chestId);
  const storedItems = slots.filter((item): item is NonNullable<typeof item> => Boolean(item));
  const selectedChest = storedItems.find(item => item.instanceId === selectedChestInstanceId) ?? storedItems[0];
  const selectedCarry = session.inventory.find(item => item.instanceId === selectedCarryInstanceId) ?? session.inventory[0];
  const icon = (definitionId: string) => getAssetUrl(getItemDefinition(definitionId)?.iconAssetId);
  return <div className="settings-scrim vault-scrim chest-scrim" onPointerDown={close}><section className="vault-sheet chest-sheet" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="หีบเก็บของใน Obsidian Frontier">
    <header><div><p className="eyebrow">Map-local storage · Obsidian Frontier</p><h3>หีบออบซิเดียน</h3></div><button className="icon-button" onClick={close} aria-label="ปิดหีบ"><X size={18} /></button></header>
    <div className="chest-layout">
      <section className="chest-panel"><div className="vault-grid-label"><span>CHEST SLOTS</span><b>{storedItems.length}/{CHEST_SLOT_LIMIT}</b></div><div className="chest-grid">{slots.map((item, index) => { const itemDefinition = item ? getItemDefinition(item.definitionId) : undefined; const locked = Boolean(item && quarantinedInstanceIds.has(item.instanceId)); return <button key={`${chestId}-${index}`} className={`chest-slot ${item?.instanceId === selectedChest?.instanceId ? "selected" : ""} ${locked ? "quarantined" : ""}`} onClick={() => item && setSelectedChestInstanceId(item.instanceId)} disabled={!item} aria-label={`ช่องหีบ ${index + 1}${item ? ` · ${itemDefinition?.name ?? item.definitionId} ×${item.quantity}` : " · ว่าง"}`}><span>{item && (icon(item.definitionId) ? <img src={icon(item.definitionId)} alt="" /> : <Box size={16} />)}</span>{item && <><b>{itemDefinition?.name ?? item.definitionId}</b><small>×{item.quantity}</small></>}</button>; })}</div><div className="chest-actions"><button disabled={!selectedChest || quarantinedInstanceIds.has(selectedChest?.instanceId ?? "")} onClick={() => selectedChest && onWithdraw(selectedChest.instanceId)}>นำของออก</button><small>เลือกของในหีบเพื่อย้ายเข้าตัว · คง provenance เดิม</small></div></section>
      <section className="chest-panel"><div className="vault-grid-label"><span>CARRY SLOTS</span><b>{session.inventory.length}/{CARRY_SLOT_LIMIT}</b></div><div className="chest-carry-list">{session.inventory.map(item => { const itemDefinition = getItemDefinition(item.definitionId); const locked = quarantinedInstanceIds.has(item.instanceId); return <button key={item.instanceId} className={`chest-carry-item ${item.instanceId === selectedCarry?.instanceId ? "selected" : ""} ${locked ? "quarantined" : ""}`} onClick={() => setSelectedCarryInstanceId(item.instanceId)} aria-label={`${itemDefinition?.name ?? item.definitionId} ×${item.quantity}${locked ? " · รอยืนยัน" : ""}`}><span>{icon(item.definitionId) ? <img src={icon(item.definitionId)} alt="" /> : <Box size={15} />}</span><b>{itemDefinition?.name ?? item.definitionId}</b><small>×{item.quantity}</small></button>; })}</div><div className="chest-actions"><button disabled={!selectedCarry || quarantinedInstanceIds.has(selectedCarry?.instanceId ?? "")} onClick={() => selectedCarry && onDeposit(selectedCarry.instanceId)}>เก็บเข้าหีบ</button><small>เลือกของติดตัวเพื่อย้ายเข้าช่องว่าง · หีบเต็มจะไม่ทำให้ของหาย</small></div></section>
    </div>
  </section></div>;
}

export default function ArcaneFrontier() {
  const directEntryRef = useRef<Screen>(getInitialScreen());
  const directMapRef = useRef(getInitialMapId());
  const integrityDemoRef = useRef(getIntegrityDemoEnabled());
  const lastIntegrityReportRef = useRef<string | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [transition, setTransition] = useState<Transition>(getLoadingDemoTransition);
  const [session, setSession] = useState<LocalGameSession | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showIntegrity, setShowIntegrity] = useState(getIntegrityDemoEnabled);
  const [showVault, setShowVault] = useState(getVaultDemoEnabled);
  const [showChest, setShowChest] = useState(false);
  const [activeChestId, setActiveChestId] = useState(STORAGE_CHEST_ID);
  const [showTacticalMap, setShowTacticalMap] = useState(false);
  const [syncAttention, setSyncAttention] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic>("identity");
  const [contextHint, setContextHint] = useState<{ topic: HelpTopic; text: string } | null>(null);
  const [selectedMapId, setSelectedMapId] = useState(getInitialMapId);
  const [cachedMapIds, setCachedMapIds] = useState<Set<string>>(() => new Set());
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot>({ health: 100, resources: 0, enemies: 7, phase: "night" });
  const [activeHotbarSlot, setActiveHotbarSlot] = useState(0);
  const [worldBlockOverrides, setWorldBlockOverrides] = useState<WorldBlockOverrides>({});
  const [worldFarmState, setWorldFarmState] = useState<WorldFarmState>({});
  const [worldStorageById, setWorldStorageById] = useState<WorldStorageById>(createEmptyWorldStorage);
  const [inMapSettings, setInMapSettings] = useState<InMapSettings>(DEFAULT_IN_MAP_SETTINGS);
  const [worldBlockStateReady, setWorldBlockStateReady] = useState(false);
  const [assetPackManifest, setAssetPackManifest] = useState<AssetPackManifest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedHomeSeedId, setSelectedHomeSeedId] = useState<string | null>(null);
  const [selectedHomeObjectId, setSelectedHomeObjectId] = useState<string | null>(null);
  const openProfileMutation = trpc.game.openProfile.useMutation();
  const syncMutation = trpc.game.sync.useMutation();
  const syncBatchMutation = trpc.game.syncBatch.useMutation();
  const reportIntegrityMutation = trpc.game.reportIntegrity.useMutation();

  useEffect(() => {
    let active = true;
    const requested = directEntryRef.current;
    void hydrateSession().then(saved => {
      if (!active) return;
      const demoSession = requested !== "landing" && requested !== "identity" ? createSession("DEMO-EXPLORER") : null;
      setSession(saved ?? demoSession);
      setSettings(getSettings());
      if (requested === "game") {
        const map = MAP_REGISTRY.find(candidate => candidate.id === RUNTIME_MAP_ID);
        transitionTo("game", { mapId: map?.id, title: map?.name, accent: map?.accent });
      } else if (requested !== "landing" && requested !== "identity") {
        transitionTo(requested, { title: requested === "home" ? "Aether Homestead" : "Frontier Lobby", accent: requested === "home" ? "#7ee787" : "#9d4edd" });
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    if (screen !== "game" || !session) {
      setWorldBlockStateReady(false);
      return;
    }
    let active = true;
    setWorldBlockStateReady(false);
    void loadOfflineMapState(RUNTIME_MAP_ID, session.playerId).then(state => {
      if (!active) return;
      setWorldBlockOverrides(state.worldBlockOverrides);
      setWorldFarmState(state.worldFarmState);
      setWorldStorageById(state.worldStorageById);
      setInMapSettings(state.inMapSettings);
      setWorldBlockStateReady(true);
    }).catch(() => {
      if (active) {
        setWorldBlockOverrides({});
        setWorldFarmState({});
        setWorldStorageById(createEmptyWorldStorage());
        setInMapSettings(DEFAULT_IN_MAP_SETTINGS);
        setWorldBlockStateReady(true);
      }
    });
    return () => { active = false; };
  }, [screen, session?.playerId]);

  useEffect(() => {
    let active = true;
    void loadAssetPackManifest(DEFAULT_ASSET_PACK_MANIFEST).then(manifest => {
      if (active) setAssetPackManifest(manifest);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if (["1", "2", "3", "4"].includes(event.key)) {
        setActiveHotbarSlot(Number(event.key) - 1);
        return;
      }
      if (screen === "game" && (event.key.toLowerCase() === "i" || event.key === "Tab")) {
        event.preventDefault();
        setShowVault(true);
      }
      if (screen === "game" && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setShowTacticalMap(current => !current);
      }
      if (screen === "game" && event.key === "Escape") {
        event.preventDefault();
        setShowSettings(current => !current);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [screen]);

  useEffect(() => {
    const hint = SCREEN_HINTS[screen];
    if (!hint) return;
    const hintKey = `arcane-frontier.hint.${session?.playerId ?? "new"}.${screen}`;
    try {
      if (localStorage.getItem(hintKey)) return;
      localStorage.setItem(hintKey, "seen");
    } catch { /* private browsing can still show the hint for this session */ }
    setContextHint(hint);
    const timeout = window.setTimeout(() => setContextHint(null), 4600);
    return () => window.clearTimeout(timeout);
  }, [screen, session?.playerId]);

  useEffect(() => {
    if (screen !== "maps") return;
    let active = true;
    void getCachedMapIds([RUNTIME_MAP_ID]).then(ids => {
      if (active) setCachedMapIds(new Set(ids));
    });
    return () => { active = false; };
  }, [screen]);

  const activeMap = useMemo(() => MAP_REGISTRY.find(map => map.id === selectedMapId) ?? MAP_REGISTRY[0]!, [selectedMapId]);
  const event = WEEKLY_EVENTS[0]!;

  const flushPendingTransactions = useCallback((candidate: LocalGameSession) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    void Promise.all([loadOfflineProfile(candidate.playerId), getPendingTransactions(candidate.playerId)]).then(([profile, transactions]) => {
      if (!profile || transactions.length === 0) return;
      const checksum = `${candidate.playerId}:${transactions.map(transaction => transaction.id).join(".")}:${JSON.stringify(profile.vectorClock)}`;
      syncBatchMutation.mutate({
        playerId: candidate.playerId,
        clientClock: profile.vectorClock,
        checksum,
        transactions: transactions.slice(0, 100).map(transaction => ({
          txId: transaction.id,
          actorId: transaction.actorId,
          actionType: transaction.type,
          payload: transaction.payload,
          vectorClock: transaction.vectorClock,
        })),
      }, {
        onSuccess: result => {
          if (result.acceptedTxIds.length > 0) void markTransactionsSynced(result.acceptedTxIds);
          void reconcileOfflineVectorClock(candidate.playerId, result.serverClock);
          if (result.rejectedTxIds.length > 0) {
            setSyncAttention(true);
            setToast("มี action ออฟไลน์บางรายการรอตรวจสอบก่อนซิงก์");
          } else setSyncAttention(false);
        },
        onError: () => setToast("คิวออฟไลน์ถูกเก็บไว้แล้ว · จะลองซิงก์ใหม่เมื่อพร้อม"),
      });
    }).catch(() => {
      // IndexedDB can be unavailable in privacy mode; the snapshot sync remains available.
    });
  }, [syncBatchMutation]);

  const syncSession = useCallback((candidate: LocalGameSession) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    flushPendingTransactions(candidate);
    const payload = {
      inventory: candidate.inventory,
      home: candidate.home,
      pendingActions: candidate.pendingActions,
      localCreatedAt: candidate.createdAt,
    };
    const checksum = `${candidate.playerId}:${candidate.inventory.length}:${candidate.currency}:${candidate.health}:${candidate.lastMapId}:${candidate.pendingActions.length}`;
    syncMutation.mutate({
      playerId: candidate.playerId,
      payload,
      checksum,
      clientUpdatedAt: Date.now(),
      health: candidate.health,
      currency: candidate.currency,
      lastMapId: candidate.lastMapId,
    }, {
      onError: () => setToast("บันทึกในเครื่องแล้ว · จะซิงก์อีกครั้งเมื่อเชื่อมต่อได้"),
      onSuccess: result => {
        if (!result.accepted || result.quarantinedInstanceIds.length > 0) {
          setSyncAttention(true);
          setToast(result.quarantinedInstanceIds.length > 0 ? `แยก ${result.quarantinedInstanceIds.length} item instance รอตรวจสอบก่อนซิงก์` : "ตรวจพบข้อมูลคลังไอเทมที่ต้องตรวจสอบก่อนซิงก์");
          setShowIntegrity(true);
        } else setSyncAttention(false);
      },
    });
  }, [flushPendingTransactions, syncMutation]);

  useEffect(() => {
    const onOnline = () => { if (session) syncSession(session); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session, syncSession]);

  useEffect(() => {
    const syncVisibleSession = () => { if (document.visibilityState === "visible" && session) syncSession(session); };
    const receiveSyncRequest = (event: MessageEvent<{ type?: string }>) => { if (event.data?.type === "arcane-sync-request" && session) syncSession(session); };
    document.addEventListener("visibilitychange", syncVisibleSession);
    navigator.serviceWorker?.addEventListener("message", receiveSyncRequest);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibleSession);
      navigator.serviceWorker?.removeEventListener("message", receiveSyncRequest);
    };
  }, [session, syncSession]);

  const transitionTo = useCallback((destination: Screen, options?: { mapId?: string; title?: string; accent?: string }) => {
    const requestedMapId = destination === "game" ? RUNTIME_MAP_ID : options?.mapId;
    const map = requestedMapId ? MAP_REGISTRY.find(candidate => candidate.id === requestedMapId && isRuntimeMapAllowed(candidate.id)) : undefined;
    const mapId = destination === "game" ? RUNTIME_MAP_ID : options?.mapId;
    const title = options?.title ?? map?.name ?? (destination === "home" ? "Aether Homestead" : "Frontier Lobby");
    const accent = options?.accent ?? map?.accent ?? "#00f3ff";
    setTransition({ destination, mapId, title, accent, progress: 0, phase: "กำลังปรับเส้นทางพลังงาน" });
    const delay = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));
    void (async () => {
      let resolvedDestination = destination;
      let resolvedMapId = mapId;
      if (map) {
        try {
          const result = await prepareMapModule(map, update => setTransition(current => current ? { ...current, progress: update.progress, phase: update.phase, cached: update.cached, offline: update.offline } : current));
          if (result.ready) {
            setCachedMapIds(current => new Set(Array.from(current).concat(map.id)));
          } else {
            resolvedDestination = "maps";
            resolvedMapId = undefined;
            setTransition(current => current ? { ...current, destination: "maps", mapId: undefined, title: "Map Observatory", accent: "#00f3ff", progress: 82, phase: "ออฟไลน์: เลือกแผนที่ที่ดาวน์โหลดแล้ว", cached: false, offline: true } : current);
            setToast("แผนที่นี้ยังไม่ได้ดาวน์โหลด · นำคุณไปยังแผนที่ที่พร้อมเล่นออฟไลน์");
          }
        } catch {
          setTransition(current => current ? { ...current, progress: 82, phase: "ใช้โมดูลที่มีในเครื่อง", offline: navigator.onLine === false } : current);
        }
      } else {
        setTransition(current => current ? { ...current, progress: 28, phase: "ตรวจสถานะผู้เล่นในเครื่อง" } : current);
        await delay(90);
        setTransition(current => current ? { ...current, progress: 68, phase: "เตรียมเส้นทางปลายทาง" } : current);
        await delay(90);
      }
      await delay(180);
      setTransition(current => current ? { ...current, progress: 100, phase: "พร้อมเดินทาง" } : current);
      await delay(260);
      if (resolvedMapId) setSelectedMapId(resolvedMapId);
      setScreen(resolvedDestination);
      setTransition(null);
    })();
  }, []);

  const startIdentity = () => transitionTo("identity", { title: "Signal Alignment", accent: "#00f3ff" });
  const confirmIdentity = () => {
    if (playerId.trim().length < 3) {
      setToast("Player ID ต้องมีอย่างน้อย 3 ตัวอักษร");
      return;
    }
    const existing = session;
    const next = existing?.playerId.toLowerCase() === playerId.trim().toLowerCase() ? existing : createSession(playerId);
    setSession(next);
    saveSession(next);
    openProfileMutation.mutate({
      playerId: next.playerId,
      deviceToken: next.deviceToken,
      displayName: next.playerId,
    }, {
      onSuccess: result => {
        if (result.available) {
          if (result.created) setToast("สร้าง Frontier profile และ starter inventory แล้ว");
          syncSession(next);
        }
      },
      onError: () => setToast("เริ่มเล่นแบบออฟไลน์แล้ว · โปรไฟล์จะซิงก์เมื่อเชื่อมต่อได้"),
    });
    transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" });
  };

  const updateSession = (patch: Partial<LocalGameSession>) => {
    if (!session) return;
    const next = { ...session, ...patch };
    setSession(next);
    saveSession(next);
    syncSession(next);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(registration => {
        const syncRegistration = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
        return syncRegistration.sync?.register("arcane-sync");
      }).catch(() => undefined);
    }
  };

  const blockActionHandler = useCallback((event: Pick<BlockActionEvent, "type" | "mapId" | "overrides" | "itemInstanceId" | "itemDefinitionId" | "message" | "coordinate" | "moduleId">) => {
    if (!session || event.mapId !== RUNTIME_MAP_ID) return false;
    if (event.type === "place" && event.itemInstanceId) {
      const consumed = consumeOneFromStack(session.inventory, event.itemInstanceId);
      if (!consumed.accepted) {
        setToast(consumed.reason);
        return false;
      }
      updateSession({ inventory: consumed.inventory, pendingActions: session.pendingActions.concat({ id: `block-place-${Date.now()}`, type: "block-place", createdAt: Date.now(), payload: { mapId: event.mapId, moduleId: event.moduleId, itemInstanceId: event.itemInstanceId, itemDefinitionId: event.itemDefinitionId, coordinate: event.coordinate }, }) });
    } else {
      updateSession({ pendingActions: session.pendingActions.concat({ id: `block-break-${Date.now()}`, type: "block-break", createdAt: Date.now(), payload: { mapId: event.mapId, moduleId: event.moduleId, coordinate: event.coordinate }, }) });
    }
    setWorldBlockOverrides(event.overrides);
    void saveOfflineMapState({ mapId: RUNTIME_MAP_ID, playerId: session.playerId, fogOfWar: "", harvestedNodes: {}, worldBlockOverrides: event.overrides, worldFarmState, worldStorageById, inMapSettings, updatedAt: Date.now() }).catch(() => setToast("บันทึกบล็อกในเครื่องไม่สำเร็จ · การเล่นยังดำเนินต่อได้"));
    setToast(event.message);
    return true;
  }, [inMapSettings, session, worldFarmState, worldStorageById]);

  const blockMessageHandler = useCallback((message: string) => setToast(message), []);
  const farmMessageHandler = useCallback((message: string) => setToast(message), []);

  const farmActionHandler = useCallback((event: FarmActionEvent) => {
    if (!session || event.mapId !== RUNTIME_MAP_ID) return false;
    if (event.type === "plant" && event.seedInstanceId) {
      const consumed = consumeOneFromStack(session.inventory, event.seedInstanceId);
      if (!consumed.accepted) {
        setToast(consumed.reason);
        return false;
      }
      updateSession({ inventory: consumed.inventory, pendingActions: session.pendingActions.concat({ id: `plant-world-${Date.now()}`, type: "plant-world-seed", createdAt: Date.now(), payload: { mapId: event.mapId, plotId: event.plotId, seedDefinitionId: event.seedDefinitionId, seedInstanceId: event.seedInstanceId, coordinate: event.coordinate }, }) });
    } else if (event.type === "harvest" && event.reward) {
      if (session.inventory.some(item => item.provenance.eventId === event.reward!.provenance.eventId)) return false;
      const reward = event.reward;
      updateSession({ inventory: session.inventory.concat(reward), pendingActions: session.pendingActions.concat({ id: `harvest-world-${Date.now()}`, type: "harvest-world-crop", createdAt: Date.now(), payload: { mapId: event.mapId, plotId: event.plotId, rewardInstanceId: reward.instanceId, coordinate: event.coordinate }, }) });
      const restoreAmount = event.effect?.kind === "restore" ? Math.min(event.effect.amount, event.effect.cap, 12) : 0;
      if (restoreAmount > 0) setGameSnapshot(current => ({ ...current, health: Math.min(100, current.health + restoreAmount) }));
      if (event.effect?.kind === "repel") setToast(`${event.message} · แรงผลักทำงาน ${event.effect.radius} บล็อกแบบไม่ทำลาย`);
    }
    setWorldFarmState(event.state);
    void saveOfflineMapState({ mapId: RUNTIME_MAP_ID, playerId: session.playerId, fogOfWar: "", harvestedNodes: {}, worldBlockOverrides, worldFarmState: event.state, worldStorageById, inMapSettings, updatedAt: Date.now() }).catch(() => setToast("บันทึกแปลงโลกในเครื่องไม่สำเร็จ · การเล่นยังดำเนินต่อได้"));
    if (!event.effect || event.effect.kind !== "repel") setToast(event.message);
    return true;
  }, [inMapSettings, session, worldBlockOverrides, worldStorageById]);

  const chestOpenHandler = useCallback((chestId: string) => {
    if (chestId !== STORAGE_CHEST_ID) return;
    setActiveChestId(chestId);
    setShowChest(true);
  }, []);

  const persistStorageTransfer = useCallback((result: ReturnType<typeof depositIntoChest> | ReturnType<typeof withdrawItemFromChest>) => {
    if (!session || !result.ok) return;
    setWorldStorageById(result.storage);
    void saveOfflineMapState({ mapId: RUNTIME_MAP_ID, playerId: session.playerId, fogOfWar: "", harvestedNodes: {}, worldBlockOverrides, worldFarmState, worldStorageById: result.storage, inMapSettings, updatedAt: Date.now() }).catch(() => setToast("บันทึกของในหีบไม่สำเร็จ · การเล่นยังดำเนินต่อได้"));
    updateSession({ inventory: result.carry, pendingActions: session.pendingActions.concat(result.action) });
  }, [inMapSettings, session, worldBlockOverrides, worldFarmState]);

  const depositFromChest = useCallback((itemInstanceId: string) => {
    if (!session) return;
    const result = depositIntoChest({ mapId: RUNTIME_MAP_ID, chestId: activeChestId, carry: session.inventory, storage: worldStorageById, itemInstanceId, now: Date.now() });
    if (!result.ok) return setToast(result.reason);
    persistStorageTransfer(result);
    setToast("เก็บของเข้าหีบแล้ว · item instance และ provenance เดิมยังอยู่");
  }, [activeChestId, persistStorageTransfer, session, worldStorageById]);

  const withdrawFromChest = useCallback((itemInstanceId: string) => {
    if (!session) return;
    const result = withdrawItemFromChest({ mapId: RUNTIME_MAP_ID, chestId: activeChestId, carry: session.inventory, storage: worldStorageById, itemInstanceId, now: Date.now() });
    if (!result.ok) return setToast(result.reason);
    persistStorageTransfer(result);
    setToast("นำของออกจากหีบแล้ว · provenance เดิมยังอยู่");
  }, [activeChestId, persistStorageTransfer, session, worldStorageById]);

  const commitInMapSettings = useCallback((next: InMapSettings) => {
    const normalized = normalizeInMapSettings(next);
    setInMapSettings(normalized);
    if (!session) return;
    void saveOfflineMapState({ mapId: RUNTIME_MAP_ID, playerId: session.playerId, fogOfWar: "", harvestedNodes: {}, worldBlockOverrides, worldFarmState, worldStorageById, inMapSettings: normalized, updatedAt: Date.now() }).catch(() => setToast("บันทึกตั้งค่าในแผนที่ไม่สำเร็จ · การเล่นยังดำเนินต่อได้"));
  }, [session, worldBlockOverrides, worldFarmState, worldStorageById]);

  const snapshotHandler = useCallback((next: GameSnapshot) => {
    setGameSnapshot(next);
  }, []);

  const rewardHandler = useCallback((reward: { definitionId: string; eventId: string; provenanceType: "harvest" | "drop" | "reward" }) => {
    setSession(current => {
      if (!current || current.inventory.some(instance => instance.provenance.eventId === reward.eventId)) return current;
      const next = {
        ...current,
        inventory: [...current.inventory, createMapRewardInstance(reward.definitionId, current.inventory.length + 5000, selectedMapId, reward.eventId, reward.provenanceType)],
      };
      void saveSession(next);
      return next;
    });
  }, [selectedMapId]);

  const integrityReport = useMemo(() => {
    if (!session) return null;
    const attachedItems = [
      ...session.home.structures.flatMap(structure => structure.item ? [structure.item] : []),
      ...Object.values(session.home.petEquipment ?? {}).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ];
    const inventory = integrityDemoRef.current && session.inventory[0] ? [...session.inventory, { ...session.inventory[0] }, ...attachedItems] : [...session.inventory, ...attachedItems];
    return inspectInventoryIntegrity(inventory);
  }, [session]);
  const hasIntegrityAttention = Boolean(syncAttention || integrityReport?.status === "attention");
  const quarantinedInstanceIds = new Set(integrityReport?.quarantinedInstanceIds ?? []);
  const integrityReportId = useMemo(() => integrityReport?.status === "attention" && session ? `${session.playerId}:${integrityReport.quarantinedInstanceIds.slice().sort().join(".")}:${integrityReport.findings.map(item => item.code).sort().join(".")}` : null, [integrityReport, session]);
  useEffect(() => {
    if (!session || !integrityReport || !integrityReportId || integrityDemoRef.current || (typeof navigator !== "undefined" && !navigator.onLine) || lastIntegrityReportRef.current === integrityReportId) return;
    lastIntegrityReportRef.current = integrityReportId;
    reportIntegrityMutation.mutate({
      playerId: session.playerId,
      reportId: integrityReportId,
      quarantinedInstanceIds: integrityReport.quarantinedInstanceIds,
      codes: Array.from(new Set(integrityReport.findings.map(item => item.code))),
    });
  }, [integrityReport, integrityReportId, reportIntegrityMutation, session]);
  const safeHome = useMemo(() => {
    if (!session) return undefined;
    const safePetEquipment = Object.fromEntries(Object.entries(session.home.petEquipment ?? {}).filter(([, item]) => item && !quarantinedInstanceIds.has(item.instanceId)));
    return { ...session.home, petEquipment: safePetEquipment };
  }, [session, integrityReport]);
  const primaryWeapon = session ? getItemDefinition(session.inventory.find(item => !quarantinedInstanceIds.has(item.instanceId))?.definitionId ?? "sword-001") : ALL_ITEMS[0];
  const integrityBannerCopy = syncAttention && integrityReport?.status === "clear" ? "มี action ออฟไลน์บางรายการที่รอตรวจสอบก่อนซิงก์" : integrityReport ? integrityStatusCopy(integrityReport) : "";
  const homeSeeds = session?.inventory.filter(item => !quarantinedInstanceIds.has(item.instanceId) && getItemDefinition(item.definitionId)?.category === "seed") ?? [];
  const homeObjects = session?.inventory.filter(item => !quarantinedInstanceIds.has(item.instanceId) && ["structure", "furniture", "decoration"].includes(getItemDefinition(item.definitionId)?.category ?? "")) ?? [];
  const selectedHomeSeed = homeSeeds.find(item => item.instanceId === selectedHomeSeedId) ?? homeSeeds[0];
  const selectedHomeObject = homeObjects.find(item => item.instanceId === selectedHomeObjectId) ?? homeObjects[0];
  const companionConfig = useMemo(() => {
    if (!safeHome) return undefined;
    const bonus = getPetBonus(safeHome);
    return { following: bonus.following, lootRadius: bonus.lootRadius, resourceYieldMultiplier: bonus.resourceYieldMultiplier, damageMitigation: bonus.damageMitigation };
  }, [safeHome]);
  const openHelp = (topic: HelpTopic) => { setHelpTopic(topic); setShowHelp(true); };
  const getPackIconUrl = (assetId?: string): string | undefined => assetPackManifest && assetId ? resolveAssetUrl(assetPackManifest, assetId) ?? undefined : undefined;
  const getPackArtUrl = (assetId?: string): string | undefined => assetPackManifest && assetId ? resolveAssetUrl(assetPackManifest, assetId) ?? undefined : undefined;
  const obsidianKeyArt = getPackArtUrl("art.obsidian.frontier-key-art");
  const obsidianSurvivorArt = getPackArtUrl("art.obsidian.survivor");
  const obsidianCompanionArt = getPackArtUrl("art.obsidian.companion");
  const useHotbarSlot = (slot: HotbarSlot) => {
    if (!session) return;
    const result = dispatchHotbarAction(session.inventory, session.hotbarBindings ?? {}, slot);
    if (!result.accepted) return setToast(result.message);
    if (result.kind === "consume") {
      updateSession({ inventory: result.inventory, pendingActions: session.pendingActions.concat({ id: `use-item-${Date.now()}`, type: "use-item", createdAt: Date.now(), payload: { slot, instanceId: result.instance?.instanceId, definitionId: result.definitionId } }) });
    }
    setToast(result.message);
    dispatchControl({ type: "use-item", slot, itemInstanceId: result.instance?.instanceId, itemDefinitionId: result.definitionId });
  };
  const equipVaultInstance = (instanceId: string) => {
    if (!session) return;
    const target = session.inventory.find(instance => instance.instanceId === instanceId);
    if (!target) return;
    const nextEquipment = toggleVaultEquipment(session.vaultEquipment ?? {}, target, quarantinedInstanceIds);
    updateSession({ vaultEquipment: nextEquipment });
    setToast(Object.values(nextEquipment).includes(instanceId) ? "ติดตั้ง item instance ในช่องอุปกรณ์แล้ว" : "ถอด item instance ออกจากช่องอุปกรณ์แล้ว");
  };
  const requestVaultSync = () => {
    if (!session) return;
    syncSession(session);
    setSyncAttention(true);
    setToast("ส่งคำขอตรวจสอบแล้ว · item จะปลดล็อกเมื่อ integrity verdict ผ่านเท่านั้น");
  };

  return <main className="arcane-app">
    <div className="portrait-warning"><Gamepad2 size={20} /><span>หมุนอุปกรณ์เป็นแนวนอนเพื่อสัมผัส Arcane Frontier</span></div>
    {transition && <LoadingGate transition={transition} reducedMotion={settings.reducedMotion} />}
    {toast && <button className="game-toast" onClick={() => setToast(null)}>{toast}</button>}
    {showSettings && (screen === "game" ? <InMapSettingsSheet settings={inMapSettings} setSettings={commitInMapSettings} close={() => setShowSettings(false)} /> : <SettingsSheet settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} />)}
    {showHelp && <HelpSheet topic={helpTopic} setTopic={setHelpTopic} close={() => setShowHelp(false)} />}
    {showIntegrity && integrityReport && <IntegritySheet report={integrityReport} syncAttention={syncAttention} close={() => setShowIntegrity(false)} />}
    {showChest && session && screen === "game" && <ChestSheet session={session} storage={worldStorageById} chestId={activeChestId} quarantinedInstanceIds={quarantinedInstanceIds} close={() => setShowChest(false)} onDeposit={depositFromChest} onWithdraw={withdrawFromChest} getAssetUrl={getPackIconUrl} />}
    {showVault && session && <VaultSheet session={session} quarantinedInstanceIds={quarantinedInstanceIds} close={() => setShowVault(false)} onEquip={equipVaultInstance} onSyncRequest={requestVaultSync} toast={message => setToast(message)} getAssetUrl={getPackIconUrl} />}
    {showTacticalMap && screen === "game" && <TacticalMapSheet map={activeMap} snapshot={gameSnapshot} close={() => setShowTacticalMap(false)} />}
    {contextHint && <button className="context-help-hint" onClick={() => { openHelp(contextHint.topic); setContextHint(null); }}><CircleHelp size={15} /><span>{contextHint.text}</span><X size={13} /></button>}
    {hasIntegrityAttention && integrityReport && <button className="integrity-banner" onClick={() => setShowIntegrity(true)}><ShieldAlert size={16} /><span>{integrityBannerCopy}</span><b>ดูรายละเอียด</b></button>}

    {screen === "landing" && <section className="landing-screen">
      <div className="landing-void" /><div className="landing-runes rune-a" /><div className="landing-runes rune-b" />
      <nav className="landing-nav"><div className="brand-lockup"><ArcaneMark /><span>ARCANE<br />FRONTIER</span></div><button className="quiet-control" onClick={() => setShowSettings(true)}><Volume2 size={16} /> Audio</button></nav>
      <div className="landing-copy"><p className="eyebrow">An offline-first survival frontier</p><h1>Survive the<br /><em>impossible.</em></h1><p className="landing-description">โลกเวทมนตร์แตกสลายกำลังเชื่อมต่อกับเทคโนโลยีต่างดาว สร้างบ้าน ฝึกสัตว์เลี้ยง และออกสำรวจขอบจักรวาลตามจังหวะของคุณเอง</p><button className="primary-cta" onClick={startIdentity}><Play size={18} fill="currentColor" /> Enter the frontier</button><p className="landing-note">Landscape mobile · cache-ready · no password required</p></div>
      <div className="landing-scene"><img className="landing-key-art" src={obsidianKeyArt ?? "/manus-storage/map001-obsidian-outpost_09f41a7e.jpg"} alt="Obsidian Outpost" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback"); }} /><img className="hero-survivor-art" src={obsidianSurvivorArt ?? "/manus-storage/survivor-hero_d9227206.jpg"} alt="Arcane Frontier survivor" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback-character"); }} /></div>
      <div className="landing-bottom"><span>01 — OBSIDIAN FRONTIER</span><span>Build {GAME_VERSION}</span></div>
    </section>}

    {screen === "identity" && <section className="identity-screen">
      <button className="back-control" onClick={() => transitionTo("landing", { title: "Frontier signal", accent: "#00f3ff" })}><ChevronLeft size={18} /> กลับ</button>
      <div className="identity-orbit"><span /><span /><span /></div>
      <form className="identity-card" onSubmit={event => { event.preventDefault(); confirmIdentity(); }}><ArcaneMark /><p className="eyebrow">One identity · your device</p><h2>Choose your call-sign</h2><p>ใช้ชื่อหรือ Player ID เพื่อเปิดหรือสร้าง Frontier profile บนอุปกรณ์นี้</p><label>PLAYER ID<input autoFocus value={playerId} maxLength={24} onChange={event => setPlayerId(event.target.value)} placeholder="e.g. NovaRider" /></label><div className="identity-actions"><button type="button" className="text-action" onClick={() => setPlayerId(`RIFT-${Math.floor(1000 + Math.random() * 8999)}`)}>สุ่มชื่อ</button><button type="submit" className="primary-cta">Confirm signal <Zap size={17} /></button></div><small>ไม่มีรหัสผ่าน · เซฟในเครื่อง · ซิงก์เมื่อออนไลน์</small></form>
    </section>}

    {screen === "lobby" && session && <section className="lobby-screen">
      <header className="lobby-header"><div className="brand-lockup compact"><ArcaneMark /><span>ARCANE FRONTIER</span></div><div className="lobby-header-right"><span className="currency"><Gem size={15} /> {session.currency.toLocaleString()}</span><button className="icon-button" onClick={() => openHelp("identity")} aria-label="เปิดคู่มือ"><CircleHelp size={18} /></button><button className="icon-button" onClick={() => setShowSettings(true)}><Settings2 size={18} /></button><button className="player-chip"><span className="player-avatar">{session.playerId.slice(0, 1).toUpperCase()}</span>{session.playerId}</button></div></header>
      <div className="lobby-grid">
        <aside className="lobby-rail left-rail"><button onClick={() => transitionTo("home", { title: "Aether Homestead", accent: "#7ee787" })}><Home size={18} /><span>HOME</span></button><button onClick={() => setShowVault(true)}><Backpack size={18} /><span>VAULT</span></button><button onClick={() => setToast("Cosmetic studio is ready for catalog items") }><Sparkles size={18} /><span>STYLE</span></button><button onClick={() => setToast("Shop rotations will use weekly event data") }><Gem size={18} /><span>SHOP</span></button></aside>
        <section className="lobby-character"><div className="lobby-haze" /><div className="character-pedestal"><div className="character-runes"><i /><i /><i /></div><img className="lobby-survivor-art" src={obsidianSurvivorArt ?? "/manus-storage/survivor-hero_d9227206.jpg"} alt="Survivor loadout" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback-character"); }} /></div><div className="loadout-caption"><span className="tier-dot" style={{ background: TIER_RULES[primaryWeapon?.tier ?? "common"].color }} /><div><b>{primaryWeapon?.name ?? "Aether Blade"}</b><small>+{session.inventory[0]?.enhancement ?? 0} · {TIER_RULES[primaryWeapon?.tier ?? "common"].label}</small></div></div></section>
        <aside className="lobby-rail right-rail"><section className="weekly-card" style={{ "--event-accent": event.accent } as React.CSSProperties}><div><p className="eyebrow">Weekly event</p><h3>{event.title}</h3><p>{event.subtitle}</p></div><div className="weekly-footer"><span><TimerReset size={14} /> 5d 14h</span><button onClick={() => setToast(event.objective)}><BellRing size={15} /></button></div></section><section className="status-card"><p className="eyebrow">Loadout integrity</p><button className={`status-line integrity-status ${hasIntegrityAttention ? "attention" : ""}`} onClick={() => setShowIntegrity(true)}><Shield size={16} /><span>Instance scan</span><b>{hasIntegrityAttention ? "REVIEW" : "VALID"}</b></button><div className="status-line"><PawPrint size={16} /><span>{session.home.petName}</span><b>LV. 01</b></div></section></aside>
      </div>
      <footer className="lobby-footer"><div className="version-stamp">{formatVersionLabel()}</div><div className="event-objective"><Flame size={15} /><span>{event.objective}</span></div><button className="deploy-button" onClick={() => transitionTo("maps", { title: "Map Observatory", accent: "#00f3ff" })}><Compass size={19} /> DEPLOY <span>เลือกแผนที่</span></button></footer>
    </section>}

    {screen === "maps" && session && <section className="map-screen">
      <header className="screen-header"><button className="back-control" onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><ChevronLeft size={18} /> Lobby</button><div><p className="eyebrow">Map observatory</p><h2>Choose an expedition</h2></div><button className="map-count help-trigger" onClick={() => openHelp("offline")}><CircleHelp size={16} /> Cache & offline</button></header>
      <div className="map-cards">{MAP_REGISTRY.filter(map => isRuntimeMapAllowed(map.id)).map((map, index) => {
        const cached = cachedMapIds.has(map.id);
        return <article key={map.id} className={`map-card ${map.id === selectedMapId ? "selected" : ""}`} style={{ "--map-accent": map.accent } as React.CSSProperties}><div className="map-card-art">{(map.id === "obsidian-frontier" ? obsidianKeyArt : map.keyArt) ? <img src={map.id === "obsidian-frontier" ? obsidianKeyArt : map.keyArt} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback"); }} /> : <span className={`map-art map-art-${index % 4}`} />}<div className="map-number">{String(index + 1).padStart(2, "0")}</div></div><div className="map-card-body"><div><p>{map.biome}</p><h3>{map.name}</h3><small className="map-prototype-status">{map.status === "prototype" ? "EXPEDITION PROTOTYPE · PLAYABLE" : "MODULE IN PLANNING"}</small></div><div className="map-meta"><span>RADIUS {map.radiusMeters}m</span><span>THREAT {"◆".repeat(map.threat)}</span></div><button disabled={map.status !== "prototype"} onClick={() => transitionTo("game", { mapId: map.id, title: map.name, accent: map.accent })}>{map.status !== "prototype" ? "Module in planning" : cached ? <><Play size={15} fill="currentColor" /> Enter cached sector</> : <><Download size={15} /> Prepare expedition</>}</button></div></article>;
      })}</div>
      <p className="map-footnote">ตอนนี้เปิดให้เล่นเฉพาะ Obsidian Frontier vertical slice เท่านั้น ส่วนแผนที่อื่นยังเป็นข้อมูลแผนงานหลังบ้านและยังไม่เปิดให้เลือกหรือเตรียม cache ใน runtime</p>
    </section>}

    {screen === "home" && session && <section className="home-screen">
      <header className="screen-header"><button className="back-control" onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><ChevronLeft size={18} /> Lobby</button><div><p className="eyebrow">Personal instance</p><h2>Aether Homestead</h2></div><span className="map-count"><PawPrint size={16} /> {session.home.petName}</span></header>
      <div className="home-layout home-loop">
        <section className="home-garden"><div className="section-title"><div><p className="eyebrow">Garden grid</p><h3>Plant · Grow · Harvest</h3></div><button className="minor-button" onClick={() => openHelp("home")}>How it works</button></div><div className="seed-selector">{homeSeeds.length === 0 ? <span>ไม่มีเมล็ดในคลัง</span> : homeSeeds.map(seed => { const definition = getItemDefinition(seed.definitionId); return <button key={seed.instanceId} className={seed.instanceId === selectedHomeSeed?.instanceId ? "active" : ""} onClick={() => setSelectedHomeSeedId(seed.instanceId)}><Flower2 size={13} /><span>{definition?.name}</span><small>{SOILS.find(soil => soil.id === definition?.soilId)?.name}</small></button>; })}</div><div className="plot-grid">{session.home.plots.map(plot => {
          const stage = getCropStage(plot); const compatibleSeed = selectedHomeSeed && getItemDefinition(selectedHomeSeed.definitionId)?.soilId === plot.soilId ? selectedHomeSeed : undefined;
          const soil = SOILS.find(candidate => candidate.id === plot.soilId);
          return <article key={plot.id} className={`plot-card ${stage ?? "empty"}`} style={{ "--soil": soil?.color ?? "#456c9c" } as React.CSSProperties}><span className="plot-aura" /><div><small>{soil?.name}</small><b>{stage === "mature" ? "Ready to harvest" : stage === "withered" ? "Withered crop" : stage ? stage.toUpperCase() : "Empty plot"}</b><em>{plot.seedDefinitionId ? getItemDefinition(plot.seedDefinitionId)?.name : "รอเมล็ดที่เข้ากัน"}</em></div>{stage === "mature" ? <button onClick={() => { const result = harvestCrop(session.home, session.inventory, plot.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); setToast("เก็บเกี่ยวสำเร็จ · ผลผลิตเข้าคลังและรอซิงก์"); }}><Wheat size={15} /> Harvest</button> : stage === "withered" ? <button onClick={() => setToast("พืชเหี่ยวแล้ว · เตรียมแปลงใหม่จากเมล็ดชุดต่อไป")}>Clear</button> : !stage ? <button disabled={!compatibleSeed} onClick={() => { if (!compatibleSeed) return setToast("ไม่มีเมล็ดที่เข้ากับดินแปลงนี้"); const result = plantSeed(session.home, session.inventory, plot.id, compatibleSeed.instanceId); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); setToast("ปลูกแล้ว · เวลาเติบโตยังเดินต่อแม้ออฟไลน์"); }}><Flower2 size={15} /> {compatibleSeed ? "Plant" : "Need seed"}</button> : <span className="plot-wait">Growing offline</span>}</article>;
        })}</div><div className="soil-list compact">{SOILS.map(soil => <button key={soil.id} className="soil-tile" style={{ "--soil": soil.color } as React.CSSProperties} onClick={() => setToast(`${soil.name}: ${soil.description}`)}><span className="soil-orb" /><div><b>{soil.name}</b><small>{soil.compatiblePlantTags.join(" · ")}</small></div></button>)}</div></section>
        <section className="home-build"><div className="section-title"><div><p className="eyebrow">Modular build</p><h3>Place · Rotate · Move · Recall</h3></div><Box size={22} /></div><div className="object-selector">{homeObjects.length === 0 ? <span>ไม่มีชิ้นส่วน Home ในคลัง</span> : homeObjects.map(item => { const definition = getItemDefinition(item.definitionId); return <button key={item.instanceId} className={item.instanceId === selectedHomeObject?.instanceId ? "active" : ""} onClick={() => setSelectedHomeObjectId(item.instanceId)}><Box size={13} /><span>{definition?.name}</span><small>{definition?.category}</small></button>; })}</div><div className="build-preview"><div className="build-platform"><i /><i /><i /><i /></div><p>ทุกชิ้นเป็น item instance เดียวกันทั้งตอนวาง หมุน ย้าย และเก็บคืน จึงไม่มีการสร้างไอเทมใหม่จากการย้ายบ้าน</p><button className="minor-button" onClick={() => { const item = selectedHomeObject; if (!item) return setToast("ไม่มี structure, furniture หรือ decoration ในคลัง"); const slots = [[0, 0], [3, 0], [6, 0], [0, 3], [3, 3], [6, 3]]; for (const [x, z] of slots) { const result = placeHomeObject({ home: session.home, inventory: session.inventory, instanceId: item.instanceId, x, z }); if (result.ok) { updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); return setToast("วางชิ้นส่วน Home แล้ว · หมุน ย้าย หรือเก็บคืนได้ตลอดเวลา"); } } setToast("ไม่มีช่องว่างที่วางได้ใน Home grid"); }}><Pickaxe size={15} /> Place selected object</button></div><div className="structure-list">{session.home.structures.length === 0 ? <p>ยังไม่มีโครงสร้างที่วางไว้</p> : session.home.structures.map(structure => <div key={structure.id}><span><b>{getItemDefinition(structure.definitionId)?.name}</b><small>GRID {structure.x},{structure.z} · {structure.rotation}°</small></span><button onClick={() => { const result = rotateStructure(session.home, structure.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); }}><TimerReset size={14} /></button><button onClick={() => { const candidates = [[3, 6], [6, 6], [9, 6], [0, 6]]; for (const [x, z] of candidates) { const result = moveStructure(session.home, structure.id, x, z); if (result.ok) { updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); return; } } setToast("ไม่พบตำแหน่งว่างที่ย้ายได้"); }}><Compass size={14} /></button><button onClick={() => { const result = recallStructure(session.home, session.inventory, structure.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); }}><Backpack size={14} /></button></div>)}</div></section>
        <section className="pet-card">{(() => { const bonus = getPetBonus(safeHome ?? session.home); return <><PawPrint size={32} /><p className="eyebrow">Companion</p><h3>{session.home.petName}</h3><p>{bonus.following ? "ติดตามผู้เล่นอยู่ · ช่วยสแกนทรัพยากรและเตือนภัย" : "สั่งให้อยู่เฝ้า Home · กด Follow เพื่อเรียกกลับมาร่วมสำรวจ"}</p><div className="pet-bonus"><span>SCOUT +{bonus.scoutRadiusMeters}m</span><span>HARVEST +{bonus.harvestBonusPercent}%</span><button onClick={() => { const result = togglePetFollowing(session.home); updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); }}>{bonus.following ? "Stay" : "Follow"}</button></div><div className="pet-slots">{(["collar", "core"] as const).map(slot => { const equipped = session.home.petEquipment?.[slot]; const quarantined = Boolean(equipped && quarantinedInstanceIds.has(equipped.instanceId)); const compatible = session.inventory.find(item => !quarantinedInstanceIds.has(item.instanceId) && (slot === "collar" ? getItemDefinition(item.definitionId)?.category === "decoration" : getItemDefinition(item.definitionId)?.category === "material")); return <div key={slot}><span><small>{slot === "collar" ? "COLLAR" : "CORE"}</small><b>{quarantined ? "Pending verification" : equipped ? getItemDefinition(equipped.definitionId)?.name : "Empty"}</b></span><button disabled={quarantined} onClick={() => { const result = transferPetEquipment(session.home, session.inventory, slot, equipped ? null : compatible?.instanceId ?? null); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); }}>{quarantined ? "Locked" : equipped ? "Unequip" : compatible ? "Equip" : "No item"}</button></div>; })}</div><span>2 equipment slots · synced as offline actions</span></>; })()}</section>
      </div>
    </section>}

    {screen === "game" && session && <section className="game-screen" style={{ "--touch-scale": settings.touchScale, "--touch-opacity": settings.touchOpacity } as React.CSSProperties}>{worldBlockStateReady ? <GameCanvas mapId={selectedMapId} reducedMotion={settings.reducedMotion} renderDistance={settings.renderDistance} cameraMode={inMapSettings.cameraMode} viewDistanceBlocks={inMapSettings.viewDistanceBlocks} worldBlockOverrides={worldBlockOverrides} worldFarmState={worldFarmState} onSnapshot={snapshotHandler} onReward={rewardHandler} onBlockAction={blockActionHandler} onChestOpen={chestOpenHandler} onBlockMessage={blockMessageHandler} onFarmAction={farmActionHandler} onFarmMessage={farmMessageHandler} companion={companionConfig} /> : <div className="game-state-loading" role="status">กำลังโหลดสถานะบล็อกของผู้เล่น...</div>}
      <div className="game-top-bar"><div className="game-status"><HealthBar label="VITAL" value={gameSnapshot.health} tone="health" /><HealthBar label="AETHER" value={76} tone="shield" /><HealthBar label="STAMINA" value={gameSnapshot.stamina ?? 88} tone="energy" /></div><div className="phase-badge"><span className={gameSnapshot.phase} /><div><small>{gameSnapshot.phase === "night" ? "NIGHT CYCLE" : "DAY CYCLE"}</small><b>{gameSnapshot.phase === "night" ? "15:00" : "15:00"}</b></div></div><div className="mini-radar"><div className="radar-grid" /><span className="radar-player" /><span className="radar-danger" /></div><div className="game-top-actions"><button className="game-icon-button" onClick={() => setShowVault(true)} aria-label="เปิดคลังไอเทม" title="Inventory (I / Tab)"><Backpack size={15} /></button><button className="game-icon-button" onClick={() => setShowTacticalMap(true)} aria-label="เปิดแผนที่ยุทธวิธี" title="Tactical map (M)"><MapIcon size={15} /></button><button className="game-icon-button" onClick={() => setShowSettings(true)} aria-label="เปิดตั้งค่า" title="Settings (Esc)"><Settings2 size={15} /></button></div></div>
      <div className="companion-hud"><img src={obsidianCompanionArt ?? "/manus-storage/arcane-cyber-fox-hud-icon_d96b6bd0.jpg"} alt="Arcane Cyber Fox" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.add("asset-fallback"); }} /><span><b>{session.home.petName}</b><small>{gameSnapshot.companionState ?? (companionConfig?.following ? "following" : "resting")} · LOOT {companionConfig?.lootRadius ?? 2}m</small></span><button onClick={() => { const result = togglePetFollowing(session.home); updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); }} aria-label="Toggle companion follow"><PawPrint size={16} className={companionConfig?.following ? "active" : ""} /></button></div>
      <button className="game-help-trigger" onClick={() => openHelp("expedition")}><CircleHelp size={15} /> Controls</button>
      <div className="boss-banner" style={{ "--boss-accent": activeMap.accent } as React.CSSProperties}><Flame size={16} /><span>ANOMALY DETECTED · {activeMap.eventBossName ?? "Unknown anomaly"} may emerge</span></div>
      {gameSnapshot.warning && <div className="map-event-warning" role="status"><Shield size={15} /><span>{gameSnapshot.warning}</span></div>}
      <div className="expedition-context" style={{ "--map-context-accent": activeMap.accent } as React.CSSProperties}><span><Compass size={13} /> {activeMap.content.npc}</span><span><MapIcon size={13} /> {activeMap.content.landmark}</span><span><Crosshair size={13} /> {activeMap.content.monsters.find(monster => monster.role === "regular")?.name}</span></div>
      <div className="quick-slots" aria-label="ช่องลัดไอเทม">      {([0, 1, 2, 3] as const).map(slot => { const instance = session ? getHotbarInstance(session.inventory, session.hotbarBindings ?? {}, slot) : undefined; const definition = instance ? getItemDefinition(instance.definitionId) : undefined; const iconUrl = getPackIconUrl(definition?.iconAssetId); const fallbackIcon = slot === 0 ? <Wheat size={18} /> : slot === 1 ? <Zap size={18} /> : slot === 3 ? <Pickaxe size={18} /> : <Box size={18} />; return <button key={slot} className={activeHotbarSlot === slot ? "active" : ""} onClick={() => setActiveHotbarSlot(slot)} aria-label={`ช่องไอเทม ${slot + 1}${definition ? ` · ${definition.name}` : " · ว่าง"} · แตะเพื่อเลือก`}>{iconUrl ? <img className="hotbar-pack-icon" src={iconUrl} alt="" onError={event => { event.currentTarget.style.display = "none"; }} /> : fallbackIcon}<span>{slot + 1}</span>{instance && instance.quantity > 1 && <small>×{instance.quantity}</small>}</button>; })}</div>
      <div className="game-controls"><TouchStick /><div className="action-cluster"><button className="skill-button use" onPointerDown={() => useHotbarSlot(activeHotbarSlot as HotbarSlot)} aria-label="ใช้ไอเท็มที่เลือก"><Box size={20} /><small>USE</small></button><button className="skill-button dash" onPointerDown={() => dispatchControl({ type: "dash" })} aria-label="แดช · Shift"><Zap size={20} /><small>SHIFT</small></button><button className="skill-button interact" onPointerDown={() => dispatchControl({ type: "interact" })} aria-label="โต้ตอบและเก็บของ · E"><Pickaxe size={20} /><small>E</small></button><button className="attack-button" onPointerDown={() => dispatchControl({ type: "attack" })} aria-label="โจมตี · Space"><Sword size={28} /><span>ATTACK</span></button></div></div>
      <div className="game-footer"><button onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><Menu size={18} /> Exit expedition</button><span><Crosshair size={15} /> {gameSnapshot.enemies} hostiles · {gameSnapshot.resources} resources</span><button onClick={() => setShowSettings(true)}><Settings2 size={18} /></button></div>
    </section>}
  </main>;
}
