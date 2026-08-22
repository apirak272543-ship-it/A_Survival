import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Backpack,
  BellRing,
  Box,
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
  Sparkles,
  Sword,
  TimerReset,
  Volume2,
  Wheat,
  X,
  Zap,
} from "lucide-react";
import GameCanvas from "@/components/GameCanvas";
import { ALL_ITEMS, SOILS, TIER_RULES, getItemDefinition } from "@/game/data/catalog";
import { MAP_REGISTRY } from "@/game/data/maps";
import { WEEKLY_EVENTS } from "@/game/data/worldTime";
import { GAME_VERSION, formatVersionLabel } from "@/game/version";
import { trpc } from "@/lib/trpc";
import { cacheMapModule, getCachedMapIds } from "@/game/storage/mapCache";
import { getPendingTransactions, loadOfflineProfile, markTransactionsSynced, reconcileOfflineVectorClock } from "@/game/storage/indexedDb";
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
import type { GameSnapshot } from "@/game/scene";

type Screen = "landing" | "identity" | "lobby" | "maps" | "home" | "game";
type Transition = { destination: Screen; mapId?: string; title: string; accent: string; progress: number } | null;

function getInitialScreen(): Screen {
  if (typeof window === "undefined") return "landing";
  const requested = new URLSearchParams(window.location.search).get("demo");
  return requested === "lobby" || requested === "maps" || requested === "home" || requested === "game" || requested === "identity" ? requested : "landing";
}

function getInitialMapId() {
  if (typeof window === "undefined") return "obsidian-frontier";
  const requestedMap = new URLSearchParams(window.location.search).get("map");
  return requestedMap && MAP_REGISTRY.some(map => map.id === requestedMap) ? requestedMap : "obsidian-frontier";
}

function dispatchControl(detail: unknown) {
  window.dispatchEvent(new CustomEvent("arcane-control", { detail }));
}

function ArcaneMark() {
  return <div className="arcane-mark" aria-hidden="true"><span /><i /><b /></div>;
}

function LoadingGate({ transition }: { transition: NonNullable<Transition> }) {
  const keyArt = transition.mapId ? MAP_REGISTRY.find(map => map.id === transition.mapId)?.keyArt : null;
  return (
    <div className="loading-gate" style={{ "--biome-accent": transition.accent } as React.CSSProperties}>
      {keyArt && <img className="loading-keyart" src={keyArt} alt="" aria-hidden="true" />}
      <div className="loading-stars" />
      <div className="loading-orbit orbit-one" />
      <div className="loading-orbit orbit-two" />
      <div className="loading-center">
        <ArcaneMark />
        <p className="eyebrow">Frontier relay</p>
        <h2>{transition.title}</h2>
        <p>กำลังปรับเส้นทางพลังงานและสถานะผู้เล่น</p>
        <div className="load-track"><span style={{ width: `${transition.progress}%` }} /></div>
        <small>{Math.round(transition.progress)}% · cache-aware transition</small>
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
    const length = Math.max(1, Math.hypot(rawX, rawY));
    const x = Math.max(-1, Math.min(1, rawX / length));
    const y = Math.max(-1, Math.min(1, rawY / length));
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
  return <div className="settings-scrim" onPointerDown={close}><section className="settings-sheet" onPointerDown={event => event.stopPropagation()}>
    <header><div><p className="eyebrow">Frontier settings</p><h3>Graphics & Audio</h3></div><button className="icon-button" onClick={close}><X size={18} /></button></header>
    <div className="setting-stack">
      <label><span>Graphics quality</span><select value={settings.quality} onChange={event => update("quality", event.target.value as GameSettings["quality"])}><option value="low">Low · battery saver</option><option value="medium">Medium · balanced</option><option value="high">High · full effects</option></select></label>
      <label><span>Effect density</span><select value={settings.effectIntensity} onChange={event => update("effectIntensity", event.target.value as GameSettings["effectIntensity"])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label><span>Music <b>{settings.musicVolume}%</b></span><input type="range" min="0" max="100" value={settings.musicVolume} onChange={event => update("musicVolume", Number(event.target.value))} /></label>
      <label><span>Sound effects <b>{settings.sfxVolume}%</b></span><input type="range" min="0" max="100" value={settings.sfxVolume} onChange={event => update("sfxVolume", Number(event.target.value))} /></label>
      <label className="toggle-row"><span>Reduced motion</span><input type="checkbox" checked={settings.reducedMotion} onChange={event => update("reducedMotion", event.target.checked)} /></label>
    </div>
  </section></div>;
}

export default function ArcaneFrontier() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [transition, setTransition] = useState<Transition>(null);
  const [session, setSession] = useState<LocalGameSession | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(getInitialMapId);
  const [cachedMapIds, setCachedMapIds] = useState<Set<string>>(() => new Set());
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot>({ health: 100, resources: 0, enemies: 7, phase: "night" });
  const [toast, setToast] = useState<string | null>(null);
  const [selectedHomeSeedId, setSelectedHomeSeedId] = useState<string | null>(null);
  const [selectedHomeObjectId, setSelectedHomeObjectId] = useState<string | null>(null);
  const openProfileMutation = trpc.game.openProfile.useMutation();
  const syncMutation = trpc.game.sync.useMutation();
  const syncBatchMutation = trpc.game.syncBatch.useMutation();

  useEffect(() => {
    let active = true;
    const requested = getInitialScreen();
    void hydrateSession().then(saved => {
      if (!active) return;
      const demoSession = requested !== "landing" && requested !== "identity" ? createSession("DEMO-EXPLORER") : null;
      setSession(saved ?? demoSession);
      setSettings(getSettings());
    });
    return () => { active = false; };
  }, []);

  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    if (screen !== "maps") return;
    let active = true;
    void getCachedMapIds(MAP_REGISTRY.slice(0, 10).map(map => map.id)).then(ids => {
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
          if (result.rejectedTxIds.length > 0) setToast("มี action ออฟไลน์บางรายการรอตรวจสอบก่อนซิงก์");
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
        if (!result.accepted) setToast("ตรวจพบข้อมูลคลังไอเทมที่ต้องตรวจสอบก่อนซิงก์");
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
    const map = options?.mapId ? MAP_REGISTRY.find(candidate => candidate.id === options.mapId) : undefined;
    const title = options?.title ?? map?.name ?? (destination === "home" ? "Aether Homestead" : "Frontier Lobby");
    const accent = options?.accent ?? map?.accent ?? "#00f3ff";
    setTransition({ destination, mapId: options?.mapId, title, accent, progress: 0 });
    if (map) void cacheMapModule(map).then(() => setCachedMapIds(current => new Set(Array.from(current).concat(map.id))));
    let progress = 0;
    const interval = window.setInterval(() => {
      progress = Math.min(100, progress + 9 + Math.random() * 13);
      setTransition(current => current ? { ...current, progress } : current);
      if (progress >= 100) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          if (options?.mapId) {
            setSelectedMapId(options.mapId);
          }
          setScreen(destination);
          setTransition(null);
        }, 260);
      }
    }, 80);
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

  const snapshotHandler = useCallback((next: GameSnapshot) => {
    setGameSnapshot(next);
  }, []);

  const primaryWeapon = session ? getItemDefinition(session.inventory[0]?.definitionId ?? "sword-001") : ALL_ITEMS[0];
  const homeSeeds = session?.inventory.filter(item => getItemDefinition(item.definitionId)?.category === "seed") ?? [];
  const homeObjects = session?.inventory.filter(item => ["structure", "furniture", "decoration"].includes(getItemDefinition(item.definitionId)?.category ?? "")) ?? [];
  const selectedHomeSeed = homeSeeds.find(item => item.instanceId === selectedHomeSeedId) ?? homeSeeds[0];
  const selectedHomeObject = homeObjects.find(item => item.instanceId === selectedHomeObjectId) ?? homeObjects[0];

  return <main className="arcane-app">
    <div className="portrait-warning"><Gamepad2 size={20} /><span>หมุนอุปกรณ์เป็นแนวนอนเพื่อสัมผัส Arcane Frontier</span></div>
    {transition && <LoadingGate transition={transition} />}
    {toast && <button className="game-toast" onClick={() => setToast(null)}>{toast}</button>}
    {showSettings && <SettingsSheet settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} />}

    {screen === "landing" && <section className="landing-screen">
      <div className="landing-void" /><div className="landing-runes rune-a" /><div className="landing-runes rune-b" />
      <nav className="landing-nav"><div className="brand-lockup"><ArcaneMark /><span>ARCANE<br />FRONTIER</span></div><button className="quiet-control" onClick={() => setShowSettings(true)}><Volume2 size={16} /> Audio</button></nav>
      <div className="landing-copy"><p className="eyebrow">An offline-first survival frontier</p><h1>Survive the<br /><em>impossible.</em></h1><p className="landing-description">โลกเวทมนตร์แตกสลายกำลังเชื่อมต่อกับเทคโนโลยีต่างดาว สร้างบ้าน ฝึกสัตว์เลี้ยง และออกสำรวจขอบจักรวาลตามจังหวะของคุณเอง</p><button className="primary-cta" onClick={startIdentity}><Play size={18} fill="currentColor" /> Enter the frontier</button><p className="landing-note">Landscape mobile · cache-ready · no password required</p></div>
      <div className="landing-scene"><img className="landing-key-art" src="/manus-storage/map001-obsidian-outpost_09f41a7e.jpg" alt="Obsidian Outpost" /><img className="hero-survivor-art" src="/manus-storage/survivor-hero_d9227206.jpg" alt="Arcane Frontier survivor" /></div>
      <div className="landing-bottom"><span>01 — OBSIDIAN FRONTIER</span><span>Build {GAME_VERSION}</span></div>
    </section>}

    {screen === "identity" && <section className="identity-screen">
      <button className="back-control" onClick={() => transitionTo("landing", { title: "Frontier signal", accent: "#00f3ff" })}><ChevronLeft size={18} /> กลับ</button>
      <div className="identity-orbit"><span /><span /><span /></div>
      <form className="identity-card" onSubmit={event => { event.preventDefault(); confirmIdentity(); }}><ArcaneMark /><p className="eyebrow">One identity · your device</p><h2>Choose your call-sign</h2><p>ใช้ชื่อหรือ Player ID เพื่อเปิดหรือสร้าง Frontier profile บนอุปกรณ์นี้</p><label>PLAYER ID<input autoFocus value={playerId} maxLength={24} onChange={event => setPlayerId(event.target.value)} placeholder="e.g. NovaRider" /></label><div className="identity-actions"><button type="button" className="text-action" onClick={() => setPlayerId(`RIFT-${Math.floor(1000 + Math.random() * 8999)}`)}>สุ่มชื่อ</button><button type="submit" className="primary-cta">Confirm signal <Zap size={17} /></button></div><small>ไม่มีรหัสผ่าน · เซฟในเครื่อง · ซิงก์เมื่อออนไลน์</small></form>
    </section>}

    {screen === "lobby" && session && <section className="lobby-screen">
      <header className="lobby-header"><div className="brand-lockup compact"><ArcaneMark /><span>ARCANE FRONTIER</span></div><div className="lobby-header-right"><span className="currency"><Gem size={15} /> {session.currency.toLocaleString()}</span><button className="icon-button" onClick={() => setShowSettings(true)}><Settings2 size={18} /></button><button className="player-chip"><span className="player-avatar">{session.playerId.slice(0, 1).toUpperCase()}</span>{session.playerId}</button></div></header>
      <div className="lobby-grid">
        <aside className="lobby-rail left-rail"><button onClick={() => transitionTo("home", { title: "Aether Homestead", accent: "#7ee787" })}><Home size={18} /><span>HOME</span></button><button onClick={() => setToast("Inventory preview is synced to your local save") }><Backpack size={18} /><span>VAULT</span></button><button onClick={() => setToast("Cosmetic studio is ready for catalog items") }><Sparkles size={18} /><span>STYLE</span></button><button onClick={() => setToast("Shop rotations will use weekly event data") }><Gem size={18} /><span>SHOP</span></button></aside>
        <section className="lobby-character"><div className="lobby-haze" /><div className="character-pedestal"><div className="character-runes"><i /><i /><i /></div><img className="lobby-survivor-art" src="/manus-storage/survivor-hero_d9227206.jpg" alt="Survivor loadout" /></div><div className="loadout-caption"><span className="tier-dot" style={{ background: TIER_RULES[primaryWeapon?.tier ?? "common"].color }} /><div><b>{primaryWeapon?.name ?? "Aether Blade"}</b><small>+{session.inventory[0]?.enhancement ?? 0} · {TIER_RULES[primaryWeapon?.tier ?? "common"].label}</small></div></div></section>
        <aside className="lobby-rail right-rail"><section className="weekly-card" style={{ "--event-accent": event.accent } as React.CSSProperties}><div><p className="eyebrow">Weekly event</p><h3>{event.title}</h3><p>{event.subtitle}</p></div><div className="weekly-footer"><span><TimerReset size={14} /> 5d 14h</span><button onClick={() => setToast(event.objective)}><BellRing size={15} /></button></div></section><section className="status-card"><p className="eyebrow">Loadout integrity</p><div className="status-line"><Shield size={16} /><span>Instance scan</span><b>VALID</b></div><div className="status-line"><PawPrint size={16} /><span>{session.home.petName}</span><b>LV. 01</b></div></section></aside>
      </div>
      <footer className="lobby-footer"><div className="version-stamp">{formatVersionLabel()}</div><div className="event-objective"><Flame size={15} /><span>{event.objective}</span></div><button className="deploy-button" onClick={() => transitionTo("maps", { title: "Map Observatory", accent: "#00f3ff" })}><Compass size={19} /> DEPLOY <span>เลือกแผนที่</span></button></footer>
    </section>}

    {screen === "maps" && session && <section className="map-screen">
      <header className="screen-header"><button className="back-control" onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><ChevronLeft size={18} /> Lobby</button><div><p className="eyebrow">Map observatory</p><h2>Choose an expedition</h2></div><span className="map-count"><MapIcon size={16} /> {MAP_REGISTRY.length} sectors indexed</span></header>
      <div className="map-cards">{MAP_REGISTRY.slice(0, 10).map((map, index) => {
        const cached = cachedMapIds.has(map.id);
        return <article key={map.id} className={`map-card ${map.id === selectedMapId ? "selected" : ""}`} style={{ "--map-accent": map.accent } as React.CSSProperties}><div className="map-card-art">{map.keyArt ? <img src={map.keyArt} alt="" /> : <span className={`map-art map-art-${index % 4}`} />}<div className="map-number">{String(index + 1).padStart(2, "0")}</div></div><div className="map-card-body"><div><p>{map.biome}</p><h3>{map.name}</h3><small className="map-prototype-status">{map.status === "prototype" ? "EXPEDITION PROTOTYPE · PLAYABLE" : "MODULE IN PLANNING"}</small></div><div className="map-meta"><span>RADIUS {map.radiusMeters}m</span><span>THREAT {"◆".repeat(map.threat)}</span></div><button disabled={map.status !== "prototype"} onClick={() => transitionTo("game", { mapId: map.id, title: map.name, accent: map.accent })}>{map.status !== "prototype" ? "Module in planning" : cached ? <><Play size={15} fill="currentColor" /> Enter cached sector</> : <><Download size={15} /> Prepare expedition</>}</button></div></article>;
      })}</div>
      <p className="map-footnote">MAP_001–MAP_010 เปิดเป็น expedition prototype แล้ว: ใช้วงจรต่อสู้/เก็บทรัพยากรร่วมกัน แต่แต่ละ module มี key art, ambience, NPC, landmark, regular threat และ event boss ของตนเอง · การดาวน์โหลดครั้งแรกจะเก็บ cache ไว้ในเบราว์เซอร์</p>
    </section>}

    {screen === "home" && session && <section className="home-screen">
      <header className="screen-header"><button className="back-control" onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><ChevronLeft size={18} /> Lobby</button><div><p className="eyebrow">Personal instance</p><h2>Aether Homestead</h2></div><span className="map-count"><PawPrint size={16} /> {session.home.petName}</span></header>
      <div className="home-layout home-loop">
        <section className="home-garden"><div className="section-title"><div><p className="eyebrow">Garden grid</p><h3>Plant · Grow · Harvest</h3></div><button className="minor-button" onClick={() => setToast("เลือกเมล็ดที่ตรงกับสีดิน · พืชโตด้วยเวลาแม้ออฟไลน์ · เก็บก่อนเหี่ยว")}>How it works</button></div><div className="seed-selector">{homeSeeds.length === 0 ? <span>ไม่มีเมล็ดในคลัง</span> : homeSeeds.map(seed => { const definition = getItemDefinition(seed.definitionId); return <button key={seed.instanceId} className={seed.instanceId === selectedHomeSeed?.instanceId ? "active" : ""} onClick={() => setSelectedHomeSeedId(seed.instanceId)}><Flower2 size={13} /><span>{definition?.name}</span><small>{SOILS.find(soil => soil.id === definition?.soilId)?.name}</small></button>; })}</div><div className="plot-grid">{session.home.plots.map(plot => {
          const stage = getCropStage(plot); const compatibleSeed = selectedHomeSeed && getItemDefinition(selectedHomeSeed.definitionId)?.soilId === plot.soilId ? selectedHomeSeed : undefined;
          const soil = SOILS.find(candidate => candidate.id === plot.soilId);
          return <article key={plot.id} className={`plot-card ${stage ?? "empty"}`} style={{ "--soil": soil?.color ?? "#456c9c" } as React.CSSProperties}><span className="plot-aura" /><div><small>{soil?.name}</small><b>{stage === "mature" ? "Ready to harvest" : stage === "withered" ? "Withered crop" : stage ? stage.toUpperCase() : "Empty plot"}</b><em>{plot.seedDefinitionId ? getItemDefinition(plot.seedDefinitionId)?.name : "รอเมล็ดที่เข้ากัน"}</em></div>{stage === "mature" ? <button onClick={() => { const result = harvestCrop(session.home, session.inventory, plot.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); setToast("เก็บเกี่ยวสำเร็จ · ผลผลิตเข้าคลังและรอซิงก์"); }}><Wheat size={15} /> Harvest</button> : stage === "withered" ? <button onClick={() => setToast("พืชเหี่ยวแล้ว · เตรียมแปลงใหม่จากเมล็ดชุดต่อไป")}>Clear</button> : !stage ? <button disabled={!compatibleSeed} onClick={() => { if (!compatibleSeed) return setToast("ไม่มีเมล็ดที่เข้ากับดินแปลงนี้"); const result = plantSeed(session.home, session.inventory, plot.id, compatibleSeed.instanceId); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); setToast("ปลูกแล้ว · เวลาเติบโตยังเดินต่อแม้ออฟไลน์"); }}><Flower2 size={15} /> {compatibleSeed ? "Plant" : "Need seed"}</button> : <span className="plot-wait">Growing offline</span>}</article>;
        })}</div><div className="soil-list compact">{SOILS.map(soil => <button key={soil.id} className="soil-tile" style={{ "--soil": soil.color } as React.CSSProperties} onClick={() => setToast(`${soil.name}: ${soil.description}`)}><span className="soil-orb" /><div><b>{soil.name}</b><small>{soil.compatiblePlantTags.join(" · ")}</small></div></button>)}</div></section>
        <section className="home-build"><div className="section-title"><div><p className="eyebrow">Modular build</p><h3>Place · Rotate · Move · Recall</h3></div><Box size={22} /></div><div className="object-selector">{homeObjects.length === 0 ? <span>ไม่มีชิ้นส่วน Home ในคลัง</span> : homeObjects.map(item => { const definition = getItemDefinition(item.definitionId); return <button key={item.instanceId} className={item.instanceId === selectedHomeObject?.instanceId ? "active" : ""} onClick={() => setSelectedHomeObjectId(item.instanceId)}><Box size={13} /><span>{definition?.name}</span><small>{definition?.category}</small></button>; })}</div><div className="build-preview"><div className="build-platform"><i /><i /><i /><i /></div><p>ทุกชิ้นเป็น item instance เดียวกันทั้งตอนวาง หมุน ย้าย และเก็บคืน จึงไม่มีการสร้างไอเทมใหม่จากการย้ายบ้าน</p><button className="minor-button" onClick={() => { const item = selectedHomeObject; if (!item) return setToast("ไม่มี structure, furniture หรือ decoration ในคลัง"); const slots = [[0, 0], [3, 0], [6, 0], [0, 3], [3, 3], [6, 3]]; for (const [x, z] of slots) { const result = placeHomeObject({ home: session.home, inventory: session.inventory, instanceId: item.instanceId, x, z }); if (result.ok) { updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); return setToast("วางชิ้นส่วน Home แล้ว · หมุน ย้าย หรือเก็บคืนได้ตลอดเวลา"); } } setToast("ไม่มีช่องว่างที่วางได้ใน Home grid"); }}><Pickaxe size={15} /> Place selected object</button></div><div className="structure-list">{session.home.structures.length === 0 ? <p>ยังไม่มีโครงสร้างที่วางไว้</p> : session.home.structures.map(structure => <div key={structure.id}><span><b>{getItemDefinition(structure.definitionId)?.name}</b><small>GRID {structure.x},{structure.z} · {structure.rotation}°</small></span><button onClick={() => { const result = rotateStructure(session.home, structure.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); }}><TimerReset size={14} /></button><button onClick={() => { const candidates = [[3, 6], [6, 6], [9, 6], [0, 6]]; for (const [x, z] of candidates) { const result = moveStructure(session.home, structure.id, x, z); if (result.ok) { updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); return; } } setToast("ไม่พบตำแหน่งว่างที่ย้ายได้"); }}><Compass size={14} /></button><button onClick={() => { const result = recallStructure(session.home, session.inventory, structure.id); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); }}><Backpack size={14} /></button></div>)}</div></section>
        <section className="pet-card">{(() => { const bonus = getPetBonus(session.home); return <><PawPrint size={32} /><p className="eyebrow">Companion</p><h3>{session.home.petName}</h3><p>{bonus.following ? "ติดตามผู้เล่นอยู่ · ช่วยสแกนทรัพยากรและเตือนภัย" : "สั่งให้อยู่เฝ้า Home · กด Follow เพื่อเรียกกลับมาร่วมสำรวจ"}</p><div className="pet-bonus"><span>SCOUT +{bonus.scoutRadiusMeters}m</span><span>HARVEST +{bonus.harvestBonusPercent}%</span><button onClick={() => { const result = togglePetFollowing(session.home); updateSession({ home: result.home, pendingActions: session.pendingActions.concat(result.action) }); }}>{bonus.following ? "Stay" : "Follow"}</button></div><div className="pet-slots">{(["collar", "core"] as const).map(slot => { const equipped = session.home.petEquipment?.[slot]; const compatible = session.inventory.find(item => slot === "collar" ? getItemDefinition(item.definitionId)?.category === "decoration" : getItemDefinition(item.definitionId)?.category === "material"); return <div key={slot}><span><small>{slot === "collar" ? "COLLAR" : "CORE"}</small><b>{equipped ? getItemDefinition(equipped.definitionId)?.name : "Empty"}</b></span><button onClick={() => { const result = transferPetEquipment(session.home, session.inventory, slot, equipped ? null : compatible?.instanceId ?? null); if (!result.ok) return setToast(result.reason); updateSession({ home: result.home, inventory: result.inventory, pendingActions: session.pendingActions.concat(result.action) }); }}>{equipped ? "Unequip" : compatible ? "Equip" : "No item"}</button></div>; })}</div><span>2 equipment slots · synced as offline actions</span></>; })()}</section>
      </div>
    </section>}

    {screen === "game" && session && <section className="game-screen"><GameCanvas mapId={selectedMapId} reducedMotion={settings.reducedMotion} onSnapshot={snapshotHandler} />
      <div className="game-top-bar"><div className="game-status"><HealthBar label="VITAL" value={gameSnapshot.health} tone="health" /><HealthBar label="AETHER" value={76} tone="shield" /><HealthBar label="STAMINA" value={88} tone="energy" /></div><div className="phase-badge"><span className={gameSnapshot.phase} /><div><small>{gameSnapshot.phase === "night" ? "NIGHT CYCLE" : "DAY CYCLE"}</small><b>{gameSnapshot.phase === "night" ? "15:00" : "15:00"}</b></div></div><div className="mini-radar"><div className="radar-grid" /><span className="radar-player" /><span className="radar-danger" /></div></div>
      <div className="boss-banner" style={{ "--boss-accent": activeMap.accent } as React.CSSProperties}><Flame size={16} /><span>ANOMALY DETECTED · {activeMap.eventBossName ?? "Unknown anomaly"} may emerge</span></div>
      <div className="expedition-context" style={{ "--map-context-accent": activeMap.accent } as React.CSSProperties}><span><Compass size={13} /> {activeMap.content.npc}</span><span><MapIcon size={13} /> {activeMap.content.landmark}</span><span><Crosshair size={13} /> {activeMap.content.monsters.find(monster => monster.role === "regular")?.name}</span></div>
      <div className="quick-slots"><button><span>1</span><Wheat size={18} /></button><button><span>2</span><Zap size={18} /></button><button><span>3</span><Box size={18} /></button></div>
      <div className="game-controls"><TouchStick /><div className="action-cluster"><button className="skill-button dash" onPointerDown={() => dispatchControl({ type: "dash" })}><Zap size={20} /></button><button className="skill-button interact" onPointerDown={() => dispatchControl({ type: "interact" })}><Pickaxe size={20} /></button><button className="attack-button" onPointerDown={() => dispatchControl({ type: "attack" })}><Sword size={28} /><span>ATTACK</span></button></div></div>
      <div className="game-footer"><button onClick={() => transitionTo("lobby", { title: "Frontier Lobby", accent: "#9d00ff" })}><Menu size={18} /> Exit expedition</button><span><Crosshair size={15} /> {gameSnapshot.enemies} hostiles · {gameSnapshot.resources} resources</span><button onClick={() => setShowSettings(true)}><Settings2 size={18} /></button></div>
    </section>}
  </main>;
}
