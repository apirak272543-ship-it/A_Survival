import { useState } from "react";
import {
  ArrowLeft,
  Blocks,
  Building2,
  CheckCircle2,
  Hammer,
  LockKeyhole,
  Map,
  ShieldCheck,
  Sparkles,
  Swords,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

type CreatorDomain = "world" | "block" | "structure" | "item" | "weapon" | "animation";

type DomainCard = {
  id: CreatorDomain;
  title: string;
  detail: string;
  icon: typeof Map;
};

const DOMAIN_CARDS: DomainCard[] = [
  { id: "world", title: "ทดลองแผนที่", detail: "กำหนดเมล็ด ระยะ และระดับความยากของ Obsidian Frontier", icon: Map },
  { id: "block", title: "ออกแบบบล็อก", detail: "เลือกกฎบล็อก การชน เครื่องมือ และของดรอป", icon: Blocks },
  { id: "structure", title: "ประกอบสิ่งปลูกสร้าง", detail: "เลือกแม่แบบและตรวจว่าพื้นที่วางได้หรือไม่", icon: Building2 },
  { id: "item", title: "ออกแบบไอเทม", detail: "กรอกคุณสมบัติเป็นภาษาคน แล้วให้ระบบตรวจสมดุล", icon: Hammer },
  { id: "weapon", title: "ทดลองอาวุธ", detail: "เลือกหมวด วัสดุจากระบบ และดูผลลัพธ์ตาม seed", icon: Swords },
  { id: "animation", title: "จัดชุดแอนิเมชัน", detail: "กำหนดโปรไฟล์การเคลื่อนไหวและกฎประหยัดเครื่อง", icon: Sparkles },
];

const BLOCK_OPTIONS = [
  { id: "terrain.obsidian", title: "หินออบซิเดียน", detail: "บล็อกพื้นฐาน แข็งเต็มช่อง" },
  { id: "terrain.obsidian.sand", title: "ทรายออบซิเดียน", detail: "บล็อกตกเมื่อไม่มีตัวรองรับ" },
  { id: "rock.obsidian.large", title: "ก้อนหินแผ่นใหญ่", detail: "สิ่งกีดขวางทรง slab" },
  { id: "ore.aether.block", title: "แร่ Aether", detail: "แร่สำหรับเก็บเกี่ยว" },
  { id: "flora.obsidian.sprout", title: "ต้นอ่อนผลึก", detail: "พืชทรงบางสำหรับเก็บเกี่ยว" },
  { id: "flora.obsidian.thorn-cactus", title: "กระบองเพชรหนาม", detail: "พืชที่มีความเสียหาย" },
  { id: "storage.obsidian.chest", title: "หีบออบซิเดียน", detail: "ที่เก็บของในโลก" },
];

const STRUCTURE_OPTIONS = [
  { id: "object-frontier-lantern", title: "โคมไฟชายแดน", detail: "วัตถุขนาดเล็กสำหรับนำทาง" },
  { id: "building-magic-clock-tower", title: "หอนาฬิกาเวทมนตร์", detail: "อาคารศูนย์กลางหมู่บ้าน" },
  { id: "compound-frontier-farm", title: "ชุมชนฟาร์มชายแดน", detail: "พื้นที่ทำฟาร์มและจุดปลอดภัย" },
  { id: "settlement-obsidian-village", title: "หมู่บ้าน Obsidian", detail: "โครงสร้างระดับชุมชน" },
  { id: "landmark-leyline-fortress", title: "ป้อม Leyline", detail: "จุดหมายระดับ landmark" },
];

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor} className="text-xs text-slate-300">{label}</Label>{children}</div>;
}

function SelectField({ id, value, onChange, children }: { id: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select id={id} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/50">{children}</select>;
}

function ResultPill({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 font-mono text-sm text-cyan-100">{value}</p></div>;
}

type AnimationPreviewSummary = { id: string; stateCount: number; fps: number; sleepsOffscreen: boolean; deadVisible: boolean; assetId: string };

function readAnimationPreviewSummary(value: unknown): AnimationPreviewSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output = (value as Record<string, unknown>).output;
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const record = output as Record<string, unknown>;
  const states = record.states;
  const policy = record.playbackPolicy;
  const dead = states && typeof states === "object" && !Array.isArray(states) ? (states as Record<string, unknown>).dead : undefined;
  const stateCount = states && typeof states === "object" && !Array.isArray(states) ? Object.keys(states).length : 0;
  const playback = policy && typeof policy === "object" && !Array.isArray(policy) ? policy as Record<string, unknown> : null;
  if (typeof record.id !== "string" || typeof record.fps !== "number" || typeof record.assetId !== "string" || !playback || typeof playback.sleepWhenOffscreen !== "boolean" || !dead || typeof dead !== "object" || Array.isArray(dead) || typeof (dead as Record<string, unknown>).visible !== "boolean") return null;
  return { id: record.id, stateCount, fps: record.fps, sleepsOffscreen: playback.sleepWhenOffscreen, deadVisible: Boolean((dead as Record<string, unknown>).visible), assetId: record.assetId };
}

export default function CreatorDomainWorkbench() {
  const [domain, setDomain] = useState<CreatorDomain>("world");
  const [status, setStatus] = useState("ยังไม่ได้ทดลอง preview");
  const [worldSeed, setWorldSeed] = useState("9107");
  const [worldRadius, setWorldRadius] = useState("32");
  const [worldDifficulty, setWorldDifficulty] = useState("normal");
  const [blockId, setBlockId] = useState(BLOCK_OPTIONS[0]!.id);
  const [structureId, setStructureId] = useState(STRUCTURE_OPTIONS[0]!.id);
  const [structureSeed, setStructureSeed] = useState("lantern-preview");
  const [structureX, setStructureX] = useState("0");
  const [structureZ, setStructureZ] = useState("0");
  const [itemId, setItemId] = useState("obsidian-field-tool");
  const [itemName, setItemName] = useState("เครื่องมือภาคสนามออบซิเดียน");
  const [itemFamily, setItemFamily] = useState("tool");
  const [itemRole, setItemRole] = useState("farmer");
  const [itemProgression, setItemProgression] = useState("early");
  const [itemElement, setItemElement] = useState("neutral");
  const [itemMaterial, setItemMaterial] = useState("obsidian");
  const [itemEnvironment, setItemEnvironment] = useState("obsidian-frontier");
  const [itemPurpose, setItemPurpose] = useState("ใช้เตรียมพื้นที่และดูแลแปลงปลูก");
  const [itemIdentity, setItemIdentity] = useState("เครื่องมือที่อ่านสภาพดินได้ง่าย");
  const [itemWeakness, setItemWeakness] = useState("ไม่เหมาะกับการต่อสู้ระยะประชิดหนัก ๆ");
  const [weaponSeed, setWeaponSeed] = useState("829173");
  const [weaponCount, setWeaponCount] = useState("3");
  const [weaponCategory, setWeaponCategory] = useState("melee");
  const [weaponRarity, setWeaponRarity] = useState("common");
  const [animationId, setAnimationId] = useState("survivor.default");
  const [animationName, setAnimationName] = useState("Survivor Default Motion");
  const [animationAssetId, setAnimationAssetId] = useState("animation.survivor.default");
  const [animationProvenance, setAnimationProvenance] = useState("procedural-starter-authored");
  const [animationFps, setAnimationFps] = useState("12");
  const [animationSeed, setAnimationSeed] = useState("animation-preview");

  const worldPreview = trpc.creator.world.preview.useMutation();
  const blockPreview = trpc.creator.block.preview.useMutation();
  const structurePreview = trpc.creator.structure.preview.useMutation();
  const itemPreview = trpc.creator.item.preview.useMutation();
  const weaponPreview = trpc.creator.weapon.preview.useMutation();
  const animationPreview = trpc.creator.animation.preview.useMutation();

  const busy = worldPreview.isPending || blockPreview.isPending || structurePreview.isPending || itemPreview.isPending || weaponPreview.isPending || animationPreview.isPending;
  const lastError = worldPreview.error ?? blockPreview.error ?? structurePreview.error ?? itemPreview.error ?? weaponPreview.error ?? animationPreview.error;

  const runPreview = () => {
    setStatus("กำลังตรวจข้อมูลและเรียก generator ฝั่งผู้พัฒนา…");
    if (domain === "world") {
      worldPreview.mutate({ seed: Number(worldSeed), radius: Number(worldRadius), difficulty: worldDifficulty as "peaceful" | "normal" | "hard" }, { onSuccess: result => setStatus(`ทดลองแผนที่สำเร็จ · hash ${result.worldHash.slice(0, 12)}…`) });
      return;
    }
    if (domain === "block") {
      blockPreview.mutate({ blockId }, { onSuccess: result => setStatus(`ตรวจบล็อกสำเร็จ · ${result.definition.action} · ${result.definition.collisionShape}`) });
      return;
    }
    if (domain === "structure") {
      structurePreview.mutate({ mapId: "obsidian-frontier", blueprintId: structureId, seed: structureSeed, x: Number(structureX), z: Number(structureZ) }, { onSuccess: result => setStatus(result.output.placements.length > 0 ? "วางสิ่งปลูกสร้างได้ตามกฎพื้นที่" : "ยังวางไม่ได้ ระบบเก็บเหตุผลไว้ให้ตรวจ") });
      return;
    }
    if (domain === "item") {
      itemPreview.mutate({ id: itemId, name: itemName, family: itemFamily as "tool" | "melee" | "ranged" | "magic" | "technology" | "modern" | "hybrid" | "armor" | "consumable" | "material" | "artifact" | "clothing" | "accessory", role: itemRole as "dps" | "tank" | "assassin" | "ranger" | "mage" | "support" | "farmer" | "explorer" | "crafter" | "technician" | "hybrid", progression: itemProgression as "early" | "mid" | "late" | "end" | "special", element: itemElement as "fire" | "water" | "ice" | "earth" | "wind" | "lightning" | "light" | "dark" | "poison" | "nature" | "arcane" | "neutral", materialTag: itemMaterial, environmentTag: itemEnvironment, purpose: itemPurpose, identity: itemIdentity, weakness: itemWeakness }, { onSuccess: result => setStatus(`ตรวจไอเทมสำเร็จ · คะแนนสมดุล ${result.output.definition.balanceProfile.totalScore}/100`) });
      return;
    }
    if (domain === "animation") {
      animationPreview.mutate({ id: animationId, displayName: animationName, assetId: animationAssetId, assetSource: "starter-authored", provenanceRef: animationProvenance, fps: Number(animationFps), seed: animationSeed }, { onSuccess: result => setStatus(`โปรไฟล์แอนิเมชันผ่าน · ${result.preview.recordCount} state`) });
      return;
    }
    weaponPreview.mutate({ seed: Number(weaponSeed), count: Number(weaponCount), category: weaponCategory as "melee" | "ranged" | "magic", rarity: weaponRarity as "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" }, { onSuccess: result => setStatus(`ทดลองอาวุธสำเร็จ · ได้ ${result.records.length} แบบ`) });
  };

  const renderResult = () => {
    if (domain === "world" && worldPreview.data) {
      const result = worldPreview.data;
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="แผนที่" value={result.mapId} /><ResultPill label="บล็อกที่เตรียมไว้" value={result.counts.blocks} /><ResultPill label="พื้นที่ terrain" value={result.counts.terrain} /><ResultPill label="สิ่งปลูกสร้าง" value={result.counts.structures} /><ResultPill label="จุดเกิด" value={result.counts.spawnPoints} /><ResultPill label="world hash" value={`${result.worldHash.slice(0, 16)}…`} /></div>;
    }
    if (domain === "block" && blockPreview.data) {
      const definition = blockPreview.data.definition;
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="บล็อก" value={definition.id} /><ResultPill label="การชน" value={definition.collisionShape} /><ResultPill label="การกระทำ" value={definition.action} /><ResultPill label="เครื่องมือ" value={definition.requiredToolTag ?? "มือเปล่า"} /><ResultPill label="ของดรอป" value={`${definition.dropDefinitionId} × ${definition.dropQuantity}`} /><ResultPill label="การรองรับ" value={definition.canFloat ? "ลอยได้" : "ต้องมีบล็อกรองรับ"} /></div>;
    }
    if (domain === "structure" && structurePreview.data) {
      const result = structurePreview.data;
      const placement = result.output.placements[0];
      return <div className="grid gap-3 sm:grid-cols-2"><ResultPill label="สถานะ" value={placement ? "วางได้" : "ถูกปฏิเสธตามกฎ"} /><ResultPill label="คะแนนพื้นที่" value={placement?.score ?? result.output.rejected[0]?.score ?? 0} /><ResultPill label="ตำแหน่ง" value={placement ? `${placement.x}, ${placement.y}, ${placement.z}` : "ต้องปรับพื้นที่"} /><ResultPill label="ชิ้นส่วนต่อพ่วง" value={placement?.generatedChildren.length ?? 0} /></div>;
    }
    if (domain === "item" && itemPreview.data) {
      const definition = itemPreview.data.output.definition;
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="ชื่อภายใน" value={definition.id} /><ResultPill label="พลังรวม" value={`${definition.balanceProfile.totalScore}/100`} /><ResultPill label="พลังโจมตี" value={definition.stats.damage} /><ResultPill label="ความทนทาน" value={definition.durability.maximum} /><ResultPill label="บทบาท" value={definition.role} /><ResultPill label="สถานะ" value={itemPreview.data.validation.valid ? "ผ่าน" : "ต้องแก้"} /></div>;
    }
    if (domain === "weapon" && weaponPreview.data) {
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{weaponPreview.data.records.map(record => <div key={record.id} className="rounded-lg border border-white/8 bg-black/15 p-3"><p className="text-xs font-bold text-white">{record.name}</p><p className="mt-2 text-[10px] text-slate-500">{record.baseType} · {record.material} · {record.element}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><span className="text-slate-400">พลัง {record.stats.power}</span><span className="text-slate-400">โจมตี {record.stats.damage}</span><span className="text-slate-400">ระยะ {record.stats.range}</span><span className="text-slate-400">ความทน {record.stats.durability}</span></div></div>)}</div>;
    }
    if (domain === "animation" && animationPreview.data) {
      const result = readAnimationPreviewSummary(animationPreview.data);
      if (!result) return <p className="text-sm text-amber-200">ผลลัพธ์ animation ไม่ครบตาม contract</p>;
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="โปรไฟล์" value={result.id} /><ResultPill label="จำนวน state" value={result.stateCount} /><ResultPill label="เฟรมต่อวินาที" value={result.fps} /><ResultPill label="off-screen" value={result.sleepsOffscreen ? "หยุดพัก" : "ทำงานต่อ"} /><ResultPill label="dead state" value={result.deadVisible ? "แสดง" : "ซ่อน"} /><ResultPill label="asset" value={result.assetId} /></div>;
    }
    return <p className="text-sm text-slate-500">กด “ทดลอง preview” เพื่อให้ระบบแสดงผลลัพธ์ที่ตรวจแล้ว</p>;
  };

  return (
    <main className="creator-studio min-h-dvh bg-[#070a10] text-slate-100">
      <header className="border-b border-cyan-200/10 bg-[#0a111e]/95 px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200"><Wand2 size={20} /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black tracking-[0.18em] text-white">A_SURVIVAL CREATOR WORKBENCH</p><Badge className="border-amber-300/30 bg-amber-300/10 text-[10px] text-amber-200">DEVELOPER ONLY</Badge></div><p className="mt-1 text-xs text-slate-400">เครื่องมือภาษาไทยสำหรับทดลองข้อมูลก่อนส่งต่อเข้าระบบเกม</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><a href="/creator-studio" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"><ArrowLeft size={14} /> กลับวาด asset</a><div className="hidden items-center gap-2 text-[10px] text-slate-500 md:flex"><LockKeyhole size={13} className="text-emerald-300" /> ไม่ใช่เมนูผู้เล่น</div></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-8">
        <aside className="space-y-4">
          <Card className="border-white/10 bg-[#0c1422]/90"><CardHeader className="pb-3"><CardTitle className="text-sm">เลือกสิ่งที่อยากสร้าง</CardTitle><p className="text-xs leading-relaxed text-slate-400">ทุกช่องเป็นข้อมูล ไม่ต้องเขียนโค้ด ระบบจะส่งต่อให้ generator ที่ตรงประเภท</p></CardHeader><CardContent className="grid gap-2">{DOMAIN_CARDS.map(card => { const Icon = card.icon; const selected = domain === card.id; return <button key={card.id} type="button" onClick={() => setDomain(card.id)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300/50 bg-cyan-300/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-cyan-300/30"}`}><span className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-lg ${selected ? "bg-cyan-300/15 text-cyan-100" : "bg-white/5 text-slate-400"}`}><Icon size={17} /></span><span><span className="block text-xs font-bold text-slate-100">{card.title}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{card.detail}</span></span></span></button>; })}</CardContent></Card>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[10px] leading-relaxed text-amber-100/70"><div className="mb-1 flex items-center gap-2 font-bold text-amber-200"><ShieldCheck size={13} /> ขอบเขตปลอดภัย</div>ผลลัพธ์หน้านี้เป็น preview สำหรับผู้พัฒนาเท่านั้น ไม่สร้าง texture, model หรือ animation ใน render loop และไม่ปลดล็อกแผนที่อนาคต</div>
        </aside>

        <section className="space-y-5">
          <Card className="border-white/10 bg-[#0c1422]/90"><CardHeader className="border-b border-white/8 pb-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.18em] text-cyan-300">NO-CODE INPUT</p><CardTitle className="mt-1 text-2xl font-black text-white">{DOMAIN_CARDS.find(card => card.id === domain)?.title}</CardTitle><p className="mt-2 text-sm leading-relaxed text-slate-400">กรอกค่าที่เข้าใจง่าย แล้วกดทดลอง ระบบจะตรวจข้อจำกัดของ A_Survival ให้ก่อน</p></div><Badge className="border-emerald-300/20 bg-emerald-300/10 text-[10px] text-emerald-200"><Blocks size={12} className="mr-1" /> preview เท่านั้น</Badge></div></CardHeader><CardContent className="pt-5">
            {domain === "world" && <div className="grid gap-4 md:grid-cols-3"><Field label="เมล็ดสร้างโลก" htmlFor="world-seed"><Input id="world-seed" value={worldSeed} onChange={event => setWorldSeed(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="รัศมีทดลอง (สูงสุด 64 ใน preview)" htmlFor="world-radius"><SelectField id="world-radius" value={worldRadius} onChange={setWorldRadius}><option value="8">8 บล็อก</option><option value="16">16 บล็อก</option><option value="32">32 บล็อก</option><option value="64">64 บล็อก</option></SelectField></Field><Field label="ระดับความยาก" htmlFor="world-difficulty"><SelectField id="world-difficulty" value={worldDifficulty} onChange={setWorldDifficulty}><option value="peaceful">สงบ</option><option value="normal">ปกติ</option><option value="hard">ยาก</option></SelectField></Field></div>}
            {domain === "block" && <div className="space-y-4"><Field label="แม่แบบบล็อกของ Obsidian" htmlFor="block-id"><SelectField id="block-id" value={blockId} onChange={setBlockId}>{BLOCK_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.title} · {option.detail}</option>)}</SelectField></Field><div className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs leading-relaxed text-slate-400">ระบบจะอ่านกฎจาก registry กลาง: การชน, การทุบ/ตัด/เก็บเกี่ยว, ความแข็ง, เครื่องมือที่เหมาะสม, ของดรอป, การรองรับ และ hazard ถ้ามี ไม่สร้างบล็อกใหม่เข้าเกมโดยอัตโนมัติ</div></div>}
            {domain === "structure" && <div className="space-y-4"><Field label="แม่แบบสิ่งปลูกสร้าง" htmlFor="structure-id"><SelectField id="structure-id" value={structureId} onChange={setStructureId}>{STRUCTURE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.title} · {option.detail}</option>)}</SelectField></Field><div className="grid gap-4 md:grid-cols-3"><Field label="seed ทดลอง" htmlFor="structure-seed"><Input id="structure-seed" value={structureSeed} onChange={event => setStructureSeed(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="พิกัด X" htmlFor="structure-x"><Input id="structure-x" value={structureX} onChange={event => setStructureX(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="พิกัด Z" htmlFor="structure-z"><Input id="structure-z" value={structureZ} onChange={event => setStructureZ(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field></div></div>}
            {domain === "item" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="ชื่อที่คนจะเห็น" htmlFor="item-name"><Input id="item-name" value={itemName} onChange={event => { setItemName(event.target.value); if (!itemId || itemId === "obsidian-field-tool") setItemId(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "new-item"); }} className="border-white/10 bg-white/[0.04]" /></Field><Field label="หมวดไอเทม" htmlFor="item-family"><SelectField id="item-family" value={itemFamily} onChange={setItemFamily}><option value="tool">เครื่องมือ</option><option value="melee">อาวุธประชิด</option><option value="ranged">อาวุธระยะไกล</option><option value="magic">เวทมนตร์</option><option value="armor">เกราะ</option><option value="consumable">ของใช้แล้วหมด</option><option value="material">วัสดุ</option></SelectField></Field><Field label="บทบาท" htmlFor="item-role"><SelectField id="item-role" value={itemRole} onChange={setItemRole}><option value="farmer">ชาวฟาร์ม</option><option value="dps">โจมตี</option><option value="tank">รับความเสียหาย</option><option value="mage">นักเวท</option><option value="support">สนับสนุน</option><option value="explorer">สำรวจ</option><option value="crafter">ประดิษฐ์</option></SelectField></Field><Field label="ช่วงความก้าวหน้า" htmlFor="item-progression"><SelectField id="item-progression" value={itemProgression} onChange={setItemProgression}><option value="early">ช่วงต้น</option><option value="mid">ช่วงกลาง</option><option value="late">ช่วงท้าย</option><option value="special">พิเศษ</option></SelectField></Field><Field label="ธาตุ" htmlFor="item-element"><SelectField id="item-element" value={itemElement} onChange={setItemElement}><option value="neutral">กลาง</option><option value="fire">ไฟ</option><option value="ice">น้ำแข็ง</option><option value="lightning">สายฟ้า</option><option value="nature">ธรรมชาติ</option><option value="arcane">อาร์เคน</option></SelectField></Field><Field label="วัสดุหลัก" htmlFor="item-material"><Input id="item-material" value={itemMaterial} onChange={event => setItemMaterial(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="จุดประสงค์" htmlFor="item-purpose"><Input id="item-purpose" value={itemPurpose} onChange={event => setItemPurpose(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="เอกลักษณ์" htmlFor="item-identity"><Input id="item-identity" value={itemIdentity} onChange={event => setItemIdentity(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="ข้อจำกัด/จุดอ่อน" htmlFor="item-weakness"><Input id="item-weakness" value={itemWeakness} onChange={event => setItemWeakness(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field></div>}
            {domain === "weapon" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="seed อาวุธ" htmlFor="weapon-seed"><Input id="weapon-seed" value={weaponSeed} onChange={event => setWeaponSeed(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="จำนวนแบบที่อยากดู" htmlFor="weapon-count"><SelectField id="weapon-count" value={weaponCount} onChange={setWeaponCount}><option value="1">1 แบบ</option><option value="3">3 แบบ</option><option value="8">8 แบบ</option><option value="16">16 แบบ</option></SelectField></Field><Field label="หมวดอาวุธ" htmlFor="weapon-category"><SelectField id="weapon-category" value={weaponCategory} onChange={setWeaponCategory}><option value="melee">ประชิด</option><option value="ranged">ระยะไกล</option><option value="magic">เวทมนตร์</option></SelectField></Field><Field label="ระดับความหายาก" htmlFor="weapon-rarity"><SelectField id="weapon-rarity" value={weaponRarity} onChange={setWeaponRarity}><option value="common">ทั่วไป</option><option value="uncommon">ไม่ธรรมดา</option><option value="rare">หายาก</option><option value="epic">มหากาพย์</option><option value="legendary">ตำนาน</option><option value="mythic">มายา</option></SelectField></Field></div>}
            {domain === "animation" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="รหัสโปรไฟล์" htmlFor="animation-id"><Input id="animation-id" value={animationId} onChange={event => setAnimationId(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="ชื่อโปรไฟล์" htmlFor="animation-name"><Input id="animation-name" value={animationName} onChange={event => setAnimationName(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="asset animation" htmlFor="animation-asset"><Input id="animation-asset" value={animationAssetId} onChange={event => setAnimationAssetId(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="ที่มา" htmlFor="animation-provenance"><Input id="animation-provenance" value={animationProvenance} onChange={event => setAnimationProvenance(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="เฟรมต่อวินาที" htmlFor="animation-fps"><SelectField id="animation-fps" value={animationFps} onChange={setAnimationFps}><option value="8">8 fps</option><option value="12">12 fps</option><option value="24">24 fps</option><option value="30">30 fps</option><option value="60">60 fps</option></SelectField></Field><Field label="seed โปรไฟล์" htmlFor="animation-seed"><Input id="animation-seed" value={animationSeed} onChange={event => setAnimationSeed(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><div className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs leading-relaxed text-slate-400 md:col-span-2 xl:col-span-3">state มาตรฐานประกอบด้วย idle, walk, run, dash, attack, hurt และ dead โดยใช้ข้อมูลล่วงหน้าและ policy หยุดพักเมื่ออยู่นอกระยะ ไม่สร้าง animation ใหม่ระหว่างวาดฉาก</div></div>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3"><p className="flex items-center gap-2 text-xs text-slate-300"><Sparkles size={15} className="text-cyan-300" /> {status}</p><Button onClick={runPreview} disabled={busy} className="gap-2 bg-emerald-300 text-[#061810] hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"><ShieldCheck size={15} /> {busy ? "กำลังตรวจ…" : "ทดลอง preview"}</Button></div>
            {lastError && <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-300/20 bg-red-300/[0.05] p-3 text-xs text-red-200" role="alert"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> {lastError.message}</div>}
          </CardContent></Card>

          <Card className="border-white/10 bg-[#0c1422]/90"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-emerald-300" /> ผลลัพธ์ที่ตรวจแล้ว</CardTitle><Badge className="border-white/10 bg-white/5 text-[10px] text-slate-400">ไม่บันทึกเข้าเกม</Badge></div><Separator className="mt-3 bg-white/8" /></CardHeader><CardContent>{renderResult()}</CardContent></Card>
        </section>
      </div>
    </main>
  );
}
