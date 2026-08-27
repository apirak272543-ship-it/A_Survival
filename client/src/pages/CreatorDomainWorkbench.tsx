import { useState } from "react";
import {
  ArrowLeft,
  Download,
  Blocks,
  Boxes,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  Hammer,
  LockKeyhole,
  Map,
  ShieldCheck,
  Sparkles,
  ScrollText,
  Swords,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatorPixelGridEditor } from "@/components/CreatorPixelGridEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CREATOR_TEMPLATE_PRESETS, getCompositionSubjectForTemplate, isWorkbenchCompositionTemplate } from "@/lib/creatorTemplateCatalog";

type CreatorDomain = "world" | "block" | "structure" | "item" | "weapon" | "animation" | "composition" | "quest" | "profiler" | "registry";
type CompositionPixelCell = { colorId: string; layerId: string };

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
  { id: "composition", title: "ประกอบ pixel template", detail: "วางส่วนประกอบ เลเยอร์ สี และสัดส่วนโดยไม่ต้องเขียนโค้ด", icon: Blocks },
  { id: "quest", title: "วางเส้นเรื่องและเควส", detail: "ตรวจสายเควส 100 แผนที่และล็อกแผนที่อนาคต", icon: ScrollText },
  { id: "profiler", title: "ตรวจ performance runtime", detail: "วาง snapshot จาก QA แล้วอ่าน cadence กับคำแนะนำแบบไม่แก้เกม", icon: Gauge },
  { id: "registry", title: "ทะเบียน artifact", detail: "ตรวจ provenance และเก็บ metadata ของ preview โดยไม่ publish เข้าเกม", icon: CheckCircle2 },
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
  const [compositionTemplateId, setCompositionTemplateId] = useState("survivor-pixel-32");
  const [compositionSubject, setCompositionSubject] = useState("animation");
  const [compositionWidth, setCompositionWidth] = useState("32");
  const [compositionHeight, setCompositionHeight] = useState("32");
  const [compositionBaseHex, setCompositionBaseHex] = useState("#3f8f5b");
  const [compositionOutlineHex, setCompositionOutlineHex] = useState("#172b20");
  const [compositionPartX, setCompositionPartX] = useState("8");
  const [compositionPartY, setCompositionPartY] = useState("8");
  const [compositionPartWidth, setCompositionPartWidth] = useState("16");
  const [compositionPartHeight, setCompositionPartHeight] = useState("18");
  const [compositionPixels, setCompositionPixels] = useState<Record<string, CompositionPixelCell>>({});
  const [compositionSelectedColor, setCompositionSelectedColor] = useState("base-green");
  const [compositionSelectedLayer, setCompositionSelectedLayer] = useState("base");
  const [compositionSource, setCompositionSource] = useState<"generated" | "starter-authored" | "provided" | "reference-only">("starter-authored");
  const [compositionProvenanceRef, setCompositionProvenanceRef] = useState("procedural-starter-authored");
  const [compositionTextureSampling, setCompositionTextureSampling] = useState<"nearest" | "linear">("nearest");
  const [questMapCount, setQuestMapCount] = useState("100");
  const [questSeed, setQuestSeed] = useState("story-preview");
  const [profilerTier, setProfilerTier] = useState("balanced");
  const [profilerTargetFps, setProfilerTargetFps] = useState("60");
  const [profilerViewDistance, setProfilerViewDistance] = useState("20");
  const [profilerWindowMs, setProfilerWindowMs] = useState("1000");
  const [profilerRenderedFrames, setProfilerRenderedFrames] = useState("0");
  const [profilerThrottledFrames, setProfilerThrottledFrames] = useState("0");
  const [profilerAverageFrameMs, setProfilerAverageFrameMs] = useState("");
  const [profilerP95FrameMs, setProfilerP95FrameMs] = useState("");
  const [profilerWorstFrameMs, setProfilerWorstFrameMs] = useState("");
  const [profilerTotalMeshes, setProfilerTotalMeshes] = useState("0");
  const [profilerActiveMeshes, setProfilerActiveMeshes] = useState("0");
  const [registryDomain, setRegistryDomain] = useState("animation");
  const [registryArtifactId, setRegistryArtifactId] = useState("survivor.default");
  const [registryArtifactVersion, setRegistryArtifactVersion] = useState("0.1.0");
  const [registryGeneratorId, setRegistryGeneratorId] = useState("animation.profile");
  const [registryGeneratorVersion, setRegistryGeneratorVersion] = useState("1.0.0");
  const [registrySource, setRegistrySource] = useState("starter-authored");
  const [registryProvenanceRef, setRegistryProvenanceRef] = useState("procedural-starter-authored");
  const [registryReviewNote, setRegistryReviewNote] = useState("");
  const [compatibilityTargetMap, setCompatibilityTargetMap] = useState("obsidian-frontier");

  const worldPreview = trpc.creator.world.preview.useMutation();
  const blockPreview = trpc.creator.block.preview.useMutation();
  const structurePreview = trpc.creator.structure.preview.useMutation();
  const itemPreview = trpc.creator.item.preview.useMutation();
  const weaponPreview = trpc.creator.weapon.preview.useMutation();
  const animationPreview = trpc.creator.animation.preview.useMutation();
  const compositionPreview = trpc.creator.composition.preview.useMutation();
  const compositionTexturePreview = trpc.creator.composition.texturePreview.useMutation();
  const compositionTextureExportPreview = trpc.creator.composition.exportPreview.useMutation();
  const compositionTextureByteCompatibility = trpc.creator.composition.byteCompatibility.useMutation();
  const compositionTextureRegister = trpc.creator.composition.register.useMutation();
  const questPreview = trpc.creator.quest.preview.useMutation();
  const profilerPreview = trpc.creator.profiler.preview.useMutation();
  const artifactPreview = trpc.creator.artifact.preview.useMutation();
  const artifactRegister = trpc.creator.artifact.register.useMutation();
  const artifactReview = trpc.creator.artifact.review.useMutation();
  const artifactExport = trpc.creator.artifact.export.useMutation();
  const artifactCompatibility = trpc.creator.artifact.compatibility.useMutation();
  const artifactList = trpc.creator.artifact.list.useQuery({ limit: 20 }, { enabled: domain === "registry" });
  const selectedArtifactKey = artifactReview.data?.artifact.artifactKey ?? artifactPreview.data?.artifactKey ?? "pending-artifact-key";
  const artifactAudit = trpc.creator.artifact.audit.useQuery({ artifactKey: selectedArtifactKey, limit: 20 }, { enabled: domain === "registry" && selectedArtifactKey !== "pending-artifact-key" });

  const busy = worldPreview.isPending || blockPreview.isPending || structurePreview.isPending || itemPreview.isPending || weaponPreview.isPending || animationPreview.isPending || compositionPreview.isPending || compositionTexturePreview.isPending || compositionTextureExportPreview.isPending || compositionTextureByteCompatibility.isPending || compositionTextureRegister.isPending || questPreview.isPending || profilerPreview.isPending || artifactPreview.isPending || artifactRegister.isPending || artifactReview.isPending || artifactExport.isPending || artifactCompatibility.isPending;
  const lastError = worldPreview.error ?? blockPreview.error ?? structurePreview.error ?? itemPreview.error ?? weaponPreview.error ?? animationPreview.error ?? compositionPreview.error ?? compositionTexturePreview.error ?? compositionTextureExportPreview.error ?? compositionTextureByteCompatibility.error ?? compositionTextureRegister.error ?? questPreview.error ?? profilerPreview.error ?? artifactPreview.error ?? artifactRegister.error ?? artifactReview.error ?? artifactExport.error ?? artifactCompatibility.error ?? artifactList.error ?? artifactAudit.error;
  const compositionLayers = [{ id: "base", label: "พื้นฐาน", role: "base" as const, zIndex: 0, visible: true, opacity: 1 }, { id: "outline", label: "เส้นขอบ", role: "outline" as const, zIndex: 10, visible: true, opacity: 0.9 }];
  const compositionTemplates = CREATOR_TEMPLATE_PRESETS.filter(isWorkbenchCompositionTemplate);
  const compositionTemplate = compositionTemplates.find(template => template.id === compositionTemplateId) ?? compositionTemplates[0]!;
  const selectCompositionTemplate = (templateId: string) => { const next = compositionTemplates.find(template => template.id === templateId); if (!next || next.id === compositionTemplateId) return; setCompositionTemplateId(next.id); setCompositionSubject(getCompositionSubjectForTemplate(next)); setCompositionWidth(String(next.width)); setCompositionHeight(String(next.height)); setCompositionPartX("0"); setCompositionPartY("0"); setCompositionPartWidth(String(next.width)); setCompositionPartHeight(String(next.height)); setCompositionPixels({}); setStatus(`เปลี่ยน template เป็น ${next.title} · ล้าง draft pixel เพื่อกันขนาดเก่าไหลข้ามงาน`); };
  const compositionPalette = [{ id: "base-green", label: "สีพื้น", hex: compositionBaseHex, semantic: "พื้นผิวหลัก" }, { id: "outline-dark", label: "สีเส้นขอบ", hex: compositionOutlineHex, semantic: "เส้นขอบและเงา" }];
  const toggleCompositionPixel = (x: number, y: number) => setCompositionPixels(previous => { const key = `${compositionSelectedLayer}:${x}:${y}`; const current = previous[key]; if (current?.colorId === compositionSelectedColor && current.layerId === compositionSelectedLayer) { const next = { ...previous }; delete next[key]; return next; } return { ...previous, [key]: { colorId: compositionSelectedColor, layerId: compositionSelectedLayer } }; });
  const buildCompositionRequest = () => ({ templateId: compositionTemplate.id, subject: compositionSubject as "block" | "structure" | "item" | "weapon" | "animation", canvasWidth: Number(compositionWidth), canvasHeight: Number(compositionHeight), layers: compositionLayers, parts: [{ id: "body", label: "ส่วนหลัก", slot: "body" as const, x: Number(compositionPartX), y: Number(compositionPartY), width: Number(compositionPartWidth), height: Number(compositionPartHeight), layerIds: compositionLayers.map(layer => layer.id) }], palette: compositionPalette, pixels: Object.entries(compositionPixels).map(([key, cell]) => { const [, xText, yText] = key.split(":"); return { x: Number(xText), y: Number(yText), ...cell }; }) });
  const runCompositionTexturePreview = () => compositionTexturePreview.mutate({ ...buildCompositionRequest(), source: compositionSource, provenanceRef: compositionProvenanceRef, textureSampling: compositionTextureSampling }, { onSuccess: result => setStatus(`texture handoff preview สำเร็จ · sha256 ${result.output.assets[0]?.sha256.slice(0, 12) ?? "—"}… · ต้อง review ก่อน register`) });
  const runCompositionTextureExportPreview = () => compositionTextureExportPreview.mutate({ ...buildCompositionRequest(), source: compositionSource, provenanceRef: compositionProvenanceRef, textureSampling: compositionTextureSampling }, { onSuccess: result => setStatus(`export preview พร้อมดาวน์โหลด · export ${result.exportId.slice(0, 12)}… · ยังไม่ register/publish`) });
  const runCompositionTextureByteCompatibility = () => compositionTextureByteCompatibility.mutate({ ...buildCompositionRequest(), source: compositionSource, provenanceRef: compositionProvenanceRef, textureSampling: compositionTextureSampling }, { onSuccess: result => setStatus(`ตรวจ bytes เสร็จ · ${result.decision} · ${result.checkedFiles.length} ไฟล์ · runtime import ปิด`) });
  const runCompositionTextureRegister = () => compositionTextureRegister.mutate({ ...buildCompositionRequest(), source: compositionSource, provenanceRef: compositionProvenanceRef, textureSampling: compositionTextureSampling }, { onSuccess: result => setStatus(`ลงทะเบียน texture pack สำเร็จ · ${result.artifact.artifactKey} · runtime import ปิด`), onError: error => setStatus(`ลงทะเบียนไม่สำเร็จ · ${error.message} · ไม่ได้ publish เข้า player`) });
  const downloadCompositionAsset = (asset: NonNullable<typeof compositionTextureExportPreview.data>["assets"][number]) => { const anchor = document.createElement("a"); anchor.href = `data:${asset.mime};base64,${asset.pngBase64}`; anchor.download = asset.downloadFileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setStatus(`ดาวน์โหลด ${asset.downloadFileName} แล้ว · ต้อง review/register แยก`); };
  const downloadCompositionManifest = (manifestFile: NonNullable<typeof compositionTextureExportPreview.data>["manifestFile"]) => { const anchor = document.createElement("a"); anchor.href = `data:${manifestFile.mime};base64,${manifestFile.contentBase64}`; anchor.download = manifestFile.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setStatus(`ดาวน์โหลด ${manifestFile.fileName} แล้ว · ใช้ตรวจ hash คู่กับ PNG ได้`); };
  const downloadCompositionBundle = (bundleFile: NonNullable<typeof compositionTextureExportPreview.data>["bundleFile"]) => { const anchor = document.createElement("a"); anchor.href = `data:${bundleFile.mime};base64,${bundleFile.contentBase64}`; anchor.download = bundleFile.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setStatus(`ดาวน์โหลด ${bundleFile.fileName} แล้ว · ตรวจ ${bundleFile.files.length} ไฟล์จาก package ได้`); };
  const buildRegistryInput = () => ({
    domain: registryDomain as "world" | "block" | "structure" | "item" | "weapon" | "animation" | "quest" | "profiler",
    artifactId: registryArtifactId,
    artifactVersion: registryArtifactVersion,
    generatorId: registryGeneratorId,
    generatorVersion: registryGeneratorVersion,
    manifest: { schemaVersion: "a-survival.creator-domain-artifact.v1", artifactId: registryArtifactId, artifactVersion: registryArtifactVersion, domain: registryDomain },
    summary: { label: "creator preview metadata", source: registrySource },
    sources: [registrySource],
    provenanceRefs: [registryProvenanceRef],
  });

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
    if (domain === "composition") {
      compositionPreview.mutate(buildCompositionRequest(), { onSuccess: result => setStatus(`composition preview สำเร็จ · ${result.summary.paintedPixelCount} pixel · ${result.registryMetadata.contentSha256.slice(0, 12)}…`) });
      return;
    }
    if (domain === "quest") {
      questPreview.mutate({ mapCount: Number(questMapCount), seed: questSeed }, { onSuccess: result => setStatus(`โครงเรื่องผ่าน · ${result.summary.totalQuests} เควส · อนาคตยังล็อกอยู่`) });
      return;
    }
    if (domain === "profiler") {
      profilerPreview.mutate({
        tier: profilerTier as "low" | "balanced" | "high",
        effectiveTargetFps: Number(profilerTargetFps),
        viewDistanceBlocks: Number(profilerViewDistance),
        sampleWindowMs: Number(profilerWindowMs),
        renderedFrames: Number(profilerRenderedFrames),
        throttledFrames: Number(profilerThrottledFrames),
        averageFrameMs: profilerAverageFrameMs.trim() ? Number(profilerAverageFrameMs) : null,
        p95FrameMs: profilerP95FrameMs.trim() ? Number(profilerP95FrameMs) : null,
        worstFrameMs: profilerWorstFrameMs.trim() ? Number(profilerWorstFrameMs) : null,
        totalMeshes: Number(profilerTotalMeshes),
        activeMeshes: Number(profilerActiveMeshes),
      }, { onSuccess: result => setStatus(`profiler preview สำเร็จ · ${result.status} · observed ${result.observedFps ?? "—"} FPS`) });
      return;
    }
    if (domain === "registry") {
      artifactPreview.mutate(buildRegistryInput(), { onSuccess: result => setStatus(`metadata preview สำเร็จ · ${result.artifactKey.slice(0, 28)}…`) });
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
    if (domain === "quest" && questPreview.data) {
      const summary = questPreview.data.summary;
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="จำนวนแผนที่" value={summary.mapCount} /><ResultPill label="เควสต่อแผนที่" value={summary.questsPerMap} /><ResultPill label="เควสทั้งหมด" value={summary.totalQuests} /><ResultPill label="แผนที่เล่นได้" value={summary.playableMap} /><ResultPill label="เควสที่ต้องผ่านก่อนแผนที่ถัดไป" value={summary.nextMapGateQuestCount} /><ResultPill label="future runtime import" value={summary.futureMapRuntimeImportAllowed ? "เปิด" : "ปิด"} /></div><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="text-xs font-bold text-white">{summary.firstChapter}</p><p className="mt-2 text-xs leading-relaxed text-slate-400">ตัวอย่างเควสของบทแรก</p><div className="mt-3 grid gap-2">{summary.questSample.slice(0, 5).map(quest => <div key={quest.id} className="rounded-lg border border-white/8 px-3 py-2"><p className="text-xs text-slate-200">{quest.title}</p><p className="mt-1 text-[10px] text-slate-500">{quest.objective} · รางวัล {quest.reward}</p></div>)}</div></div></div>;
    }
    if (domain === "animation" && animationPreview.data) {
      const result = readAnimationPreviewSummary(animationPreview.data);
      if (!result) return <p className="text-sm text-amber-200">ผลลัพธ์ animation ไม่ครบตาม contract</p>;
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="โปรไฟล์" value={result.id} /><ResultPill label="จำนวน state" value={result.stateCount} /><ResultPill label="เฟรมต่อวินาที" value={result.fps} /><ResultPill label="off-screen" value={result.sleepsOffscreen ? "หยุดพัก" : "ทำงานต่อ"} /><ResultPill label="dead state" value={result.deadVisible ? "แสดง" : "ซ่อน"} /><ResultPill label="asset" value={result.assetId} /></div>;
    }
    if (domain === "composition" && compositionTextureByteCompatibility.data) {
      const result = compositionTextureByteCompatibility.data;
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultPill label="byte compatibility" value={result.decision} /><ResultPill label="ไฟล์ที่ตรวจ" value={result.checkedFiles.length} /><ResultPill label="ข้อสังเกต" value={result.reasons.length} /><ResultPill label="runtime import" value={result.runtimePolicy.runtimeImportAllowed ? "เปิด" : "ปิด"} /><ResultPill label="player visible" value={result.runtimePolicy.playerVisible ? "เปิด" : "ปิด"} /><ResultPill label="cache" value={result.runtimePolicy.cacheable ? "เปิด" : "ปิด"} /></div>{result.reasons.length > 0 && <div className="space-y-2">{result.reasons.map(item => <div key={`${item.code}-${item.detail}`} className="rounded-lg border border-rose-300/15 bg-rose-300/[0.04] p-3"><p className="text-xs font-bold text-rose-100">{item.code} · {item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-rose-100/70">{item.detail}</p></div>)}</div>}{result.reasons.length === 0 && <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-xs leading-relaxed text-emerald-100/80"><CheckCircle2 size={15} className="mr-2 inline" /> manifest, PNG และ ZIP ผ่านการตรวจ bytes/hash/file list แล้ว แต่ยังต้อง review/register แยก</div>}</div>;
    }
    if (domain === "composition" && compositionTextureExportPreview.data) {
      const result = compositionTextureExportPreview.data;
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultPill label="export id" value={`${result.exportId.slice(0, 16)}…`} /><ResultPill label="composition sha256" value={`${result.compositionHash.slice(0, 16)}…`} /><ResultPill label="pack sha256" value={`${result.packSha256.slice(0, 16)}…`} /><ResultPill label="manifest sha256" value={`${result.manifestSha256.slice(0, 16)}…`} /><ResultPill label="bundle sha256" value={`${result.bundleFile.sha256.slice(0, 16)}…`} /><ResultPill label="จำนวน PNG" value={result.assets.length} /><ResultPill label="download" value={result.downloadable ? "พร้อมกด" : "ปิด"} /><ResultPill label="runtime import" value={result.runtimePolicy.runtimeImportAllowed ? "เปิด" : "ปิด"} /></div>{result.assets.map(asset => <div key={asset.assetId} className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><div className="grid size-32 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#050a12] p-3"><img src={`data:${asset.mime};base64,${asset.pngBase64}`} alt={`export preview ${asset.assetId}`} className="size-full object-contain [image-rendering:pixelated]" /></div><div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-400"><p className="font-bold text-amber-100">export PNG ผ่าน validation แล้ว</p><p className="mt-1 truncate font-mono text-[10px] text-slate-500">{asset.downloadFileName} · sha256 {asset.sha256.slice(0, 16)}…</p><p className="mt-1">กดดาวน์โหลดเมื่อพร้อมเท่านั้น ระบบจะไม่อัปโหลดหรือ register ให้อัตโนมัติ</p><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => downloadCompositionAsset(asset)} disabled={busy} variant="outline" className="gap-2 border-amber-300/30 text-amber-100"><Download size={14} /> ดาวน์โหลด PNG preview</Button>{asset === result.assets[0] && <><Button onClick={() => downloadCompositionManifest(result.manifestFile)} disabled={busy} variant="outline" className="gap-2 border-cyan-300/30 text-cyan-100"><Download size={14} /> ดาวน์โหลด manifest.json</Button><Button onClick={() => downloadCompositionBundle(result.bundleFile)} disabled={busy} variant="outline" className="gap-2 border-violet-300/30 text-violet-100"><Download size={14} /> ดาวน์โหลด ZIP texture pack</Button></>}</div></div></div>)}<div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3 text-[11px] leading-relaxed text-cyan-100/70">export schema {result.exportSchemaVersion} · provenance/hash ถูกผูกกับ composition · review/register ต้องทำแยก · runtime import/player visibility/cache ปิด</div></div>;
    }
    if (domain === "composition" && compositionTexturePreview.data) {
      const result = compositionTexturePreview.data;
      const asset = result.output.assets[0];
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultPill label="composition sha256" value={`${result.compositionHash.slice(0, 16)}…`} /><ResultPill label="texture sha256" value={`${asset?.sha256.slice(0, 16) ?? "—"}…`} /><ResultPill label="ขนาด pixel" value={`${asset?.width ?? "—"} × ${asset?.height ?? "—"}`} /><ResultPill label="ตรวจ texture" value={result.validation.valid ? "ผ่าน" : "ต้องแก้"} /><ResultPill label="source" value={asset?.source ?? "—"} /><ResultPill label="register" value={result.registerRequiresSeparateAction ? "ต้องทำแยก" : "ไม่ใช่"} /></div>{asset?.pngBase64 && <div className="flex items-center gap-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4"><div className="grid size-32 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#050a12] p-3"><img src={`data:image/png;base64,${asset.pngBase64}`} alt="texture preview จาก composition" className="size-full object-contain [image-rendering:pixelated]" /></div><div className="text-xs leading-relaxed text-slate-400"><p className="font-bold text-cyan-100">ส่งผ่าน texture.pack builder แล้ว</p><p className="mt-1">PNG นี้เป็นผล preview ชั่วคราวสำหรับผู้ดูแล พร้อม hash และ provenance ที่ผูกกับ composition; ยังไม่ upload, register, review หรือ import เข้า player</p></div></div>}</div>;
    }
    if (domain === "composition" && compositionPreview.data) {
      const result = compositionPreview.data;
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultPill label="template" value={result.composition.templateId} /><ResultPill label="subject" value={result.composition.subject} /><ResultPill label="ขนาด pixel" value={`${result.composition.canvas.width} × ${result.composition.canvas.height}`} /><ResultPill label="pixel budget" value={result.summary.pixelBudget} /><ResultPill label="เลเยอร์" value={result.summary.layerCount} /><ResultPill label="ส่วนประกอบ" value={result.summary.partCount} /><ResultPill label="สีใน palette" value={result.summary.paletteCount} /><ResultPill label="pixel ที่ระบาย" value={result.summary.paintedPixelCount} /><ResultPill label="ต้องใช้ triangle mesh" value={result.summary.meshRequired ? "ใช่" : "ไม่ต้องใช้"} /></div><div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-xs leading-relaxed text-emerald-100/80">ระบบประกอบเป็น metadata manifest สำหรับ generator ต่อไป · runtime import ปิด · player มองไม่เห็น · registry hash {result.registryMetadata.contentSha256.slice(0, 16)}…</div></div>;
    }
    if (domain === "profiler" && profilerPreview.data) {
      const result = profilerPreview.data;
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultPill label="สถานะ" value={result.status} /><ResultPill label="observed FPS" value={result.observedFps ?? "—"} /><ResultPill label="frame budget" value={`${result.targetFrameMs} ms`} /><ResultPill label="active mesh ratio" value={result.activeMeshRatio === null ? "—" : `${Math.round(result.activeMeshRatio * 100)}%`} /></div><div className="grid gap-2">{result.recommendations.map(item => <div key={item.code} className="rounded-lg border border-white/8 bg-black/15 p-3"><p className="text-xs font-bold text-cyan-100">{item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.detail}</p></div>)}</div><div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] leading-relaxed text-amber-100/70">preview only · ไม่ benchmark อุปกรณ์ · ไม่ปรับ tier อัตโนมัติ · ไม่แก้ save/player runtime · ไม่เขียน network</div></div>;
    }
    if (domain === "registry" && artifactPreview.data) {
      const result = artifactPreview.data;
      const reviewedArtifact = artifactReview.data?.artifact;
      const reviewStatus = reviewedArtifact?.reviewStatus ?? "draft";
      const artifactKey = reviewedArtifact?.artifactKey ?? result.artifactKey;
      const review = (action: "approve" | "reject" | "reopen") => artifactReview.mutate({ artifactKey, action, note: registryReviewNote }, { onSuccess: saved => { setStatus(`review เปลี่ยนเป็น ${saved.artifact.reviewStatus}`); void artifactList.refetch(); void artifactAudit.refetch(); } });
      const exportPreview = () => artifactExport.mutate({ artifactKey }, { onSuccess: result => setStatus(`ส่งออก metadata preview แล้ว · ${result.exportSchemaVersion}`) });
      const validateCompatibility = () => artifactCompatibility.mutate({ artifactKey, targetMapId: compatibilityTargetMap }, { onSuccess: result => setStatus(`compatibility: ${result.decision} · ${result.reasons.length} เหตุผล`) });
      return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ResultPill label="domain" value={result.domain} /><ResultPill label="artifact key" value={`${result.artifactKey.slice(0, 22)}…`} /><ResultPill label="content sha256" value={`${result.contentSha256.slice(0, 16)}…`} /><ResultPill label="generator" value={`${result.generatorId}@${result.generatorVersion}`} /><ResultPill label="review" value={reviewStatus} /><ResultPill label="runtime import" value={result.runtimePolicy.runtimeImportAllowed ? "เปิด" : "ปิด"}
 /></div><div className="flex flex-wrap items-end gap-3"><Button onClick={() => artifactRegister.mutate(buildRegistryInput(), { onSuccess: saved => { setStatus(`บันทึก metadata แล้ว · id ${saved.artifact.id}`); void artifactList.refetch(); void artifactAudit.refetch(); } })} disabled={busy} className="gap-2 bg-emerald-300 text-[#061810] hover:bg-emerald-200"><CheckCircle2 size={15} /> บันทึก metadata เข้า registry</Button><Field label="หมายเหตุ review" htmlFor="registry-review-note"><Input id="registry-review-note" value={registryReviewNote} onChange={event => setRegistryReviewNote(event.target.value)} placeholder="จำเป็นเมื่อปฏิเสธหรือเปิดกลับมาตรวจใหม่" className="min-w-64 border-white/10 bg-white/[0.04]" /></Field><div className="flex flex-wrap gap-2">{reviewStatus === "draft" && <><Button onClick={() => review("approve")} disabled={busy} variant="outline" className="border-emerald-300/30 text-emerald-200">อนุมัติ</Button><Button onClick={() => review("reject")} disabled={busy} variant="outline" className="border-rose-300/30 text-rose-200">ปฏิเสธ</Button></>}{reviewStatus === "rejected" && <Button onClick={() => review("reopen")} disabled={busy} variant="outline" className="border-amber-300/30 text-amber-200">เปิดกลับมาตรวจ</Button>}</div>{reviewStatus === "approved" && <Button onClick={exportPreview} disabled={busy} variant="outline" className="border-cyan-300/30 text-cyan-200">ส่งออก metadata preview</Button>}<Button onClick={validateCompatibility} disabled={busy} variant="outline" className="border-violet-300/30 text-violet-200">ตรวจ runtime compatibility</Button><span className="text-[11px] text-slate-500">DB ต้องพร้อม · ไม่มี bytes · approved ไม่ได้ publish เข้าเกม</span></div>{artifactList.data && <div className="space-y-2"><p className="text-xs font-bold text-slate-200">รายการล่าสุด ({artifactList.data.length})</p>{artifactList.data.map(item => <div key={item.artifactKey} className="rounded-lg border border-white/8 bg-black/15 px-3 py-2"><p className="text-xs text-slate-200">{item.domain} · {item.artifactId}@{item.artifactVersion} · review {item.reviewStatus}</p><p className="mt-1 text-[10px] text-slate-500">{item.artifactKey.slice(0, 32)}… · runtime import ปิด</p></div>)}</div>}{artifactAudit.data && <div className="space-y-2"><p className="text-xs font-bold text-slate-200">ประวัติ review ({artifactAudit.data.length})</p>{artifactAudit.data.map(event => <div key={event.id} className="rounded-lg border border-white/8 bg-black/15 px-3 py-2"><p className="text-xs text-slate-200">{event.action} · {event.fromStatus} → {event.toStatus}</p><p className="mt-1 text-[10px] text-slate-500">ผู้ตรวจ #{event.reviewerUserId} · {event.note || "ไม่มีหมายเหตุ"}</p></div>)}</div>}{artifactExport.data && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3"><p className="text-xs font-bold text-cyan-100">metadata export preview พร้อมตรวจต่อ</p><p className="mt-1 text-[11px] text-slate-400">schema {artifactExport.data.exportSchemaVersion} · publish-ready: ไม่ใช่ · assets: {artifactExport.data.assets.length} · runtime import: ปิด</p></div>}{artifactCompatibility.data && <div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-3"><p className="text-xs font-bold text-violet-100">runtime compatibility · {artifactCompatibility.data.decision}</p><p className="mt-1 text-[11px] text-slate-400">target {artifactCompatibility.data.targetMapId} · publish-ready: ไม่ใช่ · runtime import: ปิด</p>{artifactCompatibility.data.reasons.length > 0 && <div className="mt-2 space-y-1">{artifactCompatibility.data.reasons.map(reason => <p key={reason.code} className="text-[11px] text-amber-200/80">{reason.code} · {reason.detail}</p>)}</div>}</div>}</div>;
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
            {domain === "quest" && <div className="grid gap-4 md:grid-cols-2"><Field label="จำนวนแผนที่ในแผนเรื่อง" htmlFor="quest-map-count"><SelectField id="quest-map-count" value={questMapCount} onChange={setQuestMapCount}><option value="100">100 แผนที่</option><option value="10">10 แผนที่สำหรับตรวจบทแรก</option><option value="3">3 แผนที่สำหรับตรวจ gate</option></SelectField></Field><Field label="seed เส้นเรื่อง" htmlFor="quest-seed"><Input id="quest-seed" value={questSeed} onChange={event => setQuestSeed(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-relaxed text-amber-100/70 md:col-span-2">แผนที่ 1 คือ Obsidian Frontier ที่เล่นได้ ส่วนแผนที่ 2–100 เป็น planned data และจะไม่ถูก import, cache หรือเปิดให้เลือกใน player runtime จนกว่าจะมีระบบปลดล็อกและ asset/runtime acceptance แยกต่างหาก</div></div>}
                        {domain === "composition" && <div className="space-y-4"><div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-3 text-xs leading-relaxed text-violet-100/80">เครื่องมือประกอบ pixel/template สำหรับผู้พัฒนา เลือกสัดส่วน เลเยอร์ สี และส่วนประกอบจากช่องที่กำหนด ไม่ต้องเขียน JSON ไม่สร้าง triangle mesh และยังไม่ publish เข้า player</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="template จากคลังกลาง" htmlFor="composition-template-id"><SelectField id="composition-template-id" value={compositionTemplateId} onChange={selectCompositionTemplate}>{compositionTemplates.map(template => <option key={template.id} value={template.id}>{template.title} · {template.width}×{template.height}</option>)}</SelectField><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{compositionTemplate.description} · หมวด {compositionTemplate.category} · kind {compositionTemplate.kind}</p></Field><Field label="ประเภทสิ่งที่จะประกอบ" htmlFor="composition-subject"><SelectField id="composition-subject" value={compositionSubject} onChange={setCompositionSubject}><option value="animation">สกิน/แอนิเมชัน</option><option value="block">บล็อก</option><option value="structure">สิ่งปลูกสร้าง</option><option value="item">ไอเทม</option><option value="weapon">อาวุธ</option></SelectField></Field><Field label="ความกว้าง pixel" htmlFor="composition-width"><Input id="composition-width" value={compositionWidth} onChange={event => setCompositionWidth(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="ความสูง pixel" htmlFor="composition-height"><Input id="composition-height" value={compositionHeight} onChange={event => setCompositionHeight(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="สีพื้น · layer base" htmlFor="composition-base-hex"><Input id="composition-base-hex" value={compositionBaseHex} onChange={event => setCompositionBaseHex(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="สีเส้นขอบ · layer outline" htmlFor="composition-outline-hex"><Input id="composition-outline-hex" value={compositionOutlineHex} onChange={event => setCompositionOutlineHex(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field></div><div className="grid gap-4 md:grid-cols-3"><Field label="แหล่งที่มา" htmlFor="composition-source"><SelectField id="composition-source" value={compositionSource} onChange={value => setCompositionSource(value as "generated" | "starter-authored" | "provided" | "reference-only")}><option value="starter-authored">ไฟล์เริ่มต้นที่ทีมทำเอง</option><option value="generated">สร้างจากระบบ</option><option value="provided">ไฟล์ที่เจ้าของให้มา</option><option value="reference-only">ใช้อ้างอิงเท่านั้น</option></SelectField></Field><Field label="provenance ref" htmlFor="composition-provenance"><Input id="composition-provenance" value={compositionProvenanceRef} onChange={event => setCompositionProvenanceRef(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="การแสดง pixel" htmlFor="composition-texture-sampling"><SelectField id="composition-texture-sampling" value={compositionTextureSampling} onChange={value => setCompositionTextureSampling(value as "nearest" | "linear")}><option value="nearest">คม / nearest</option><option value="linear">นุ่ม / linear</option></SelectField></Field></div><div className="grid gap-4 md:grid-cols-4"><Field label="ส่วนหลัก X" htmlFor="composition-part-x"><Input id="composition-part-x" value={compositionPartX} onChange={event => setCompositionPartX(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="ส่วนหลัก Y" htmlFor="composition-part-y"><Input id="composition-part-y" value={compositionPartY} onChange={event => setCompositionPartY(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="กว้างส่วนหลัก" htmlFor="composition-part-width"><Input id="composition-part-width" value={compositionPartWidth} onChange={event => setCompositionPartWidth(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="สูงส่วนหลัก" htmlFor="composition-part-height"><Input id="composition-part-height" value={compositionPartHeight} onChange={event => setCompositionPartHeight(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field></div><CreatorPixelGridEditor width={Number(compositionWidth)} height={Number(compositionHeight)} palette={compositionPalette} layers={compositionLayers.map(({ id, label }) => ({ id, label }))} selectedColorId={compositionSelectedColor} selectedLayerId={compositionSelectedLayer} cells={compositionPixels} onSelectColor={setCompositionSelectedColor} onSelectLayer={setCompositionSelectedLayer} onToggleCell={toggleCompositionPixel} onClear={() => setCompositionPixels({})} /><div className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs leading-relaxed text-slate-400">ระบบจะประกอบ layer `base` และ `outline` เข้ากับ part `body` ให้เอง พร้อม palette สีที่มี semantic และตรวจ bounds ก่อนสร้าง manifest</div><div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3"><Button onClick={runCompositionTexturePreview} disabled={busy || !compositionProvenanceRef.trim()} variant="outline" className="gap-2 border-cyan-300/30 text-cyan-100"><Boxes size={15} /> {compositionTexturePreview.isPending ? "กำลังสร้าง texture preview…" : "ส่งต่อเข้า texture Builder (preview)"}</Button><Button onClick={runCompositionTextureExportPreview} disabled={busy || !compositionProvenanceRef.trim()} variant="outline" className="gap-2 border-amber-300/30 text-amber-100"><Download size={15} /> {compositionTextureExportPreview.isPending ? "กำลังเตรียม export…" : "เตรียม export PNG (กดดาวน์โหลดเอง)"}</Button><Button onClick={runCompositionTextureByteCompatibility} disabled={busy || !compositionProvenanceRef.trim()} variant="outline" className="gap-2 border-violet-300/30 text-violet-100"><ShieldCheck size={15} /> {compositionTextureByteCompatibility.isPending ? "กำลังตรวจ bytes…" : "ตรวจ PNG/manifest/ZIP bytes"}</Button><Button onClick={runCompositionTextureRegister} disabled={busy || !compositionProvenanceRef.trim()} variant="outline" className="gap-2 border-emerald-300/30 text-emerald-100"><Database size={15} /> {compositionTextureRegister.isPending ? "กำลังลงทะเบียน…" : "ลงทะเบียน texture pack (สั่งเอง)"}</Button><span className="text-[11px] leading-relaxed text-slate-500">สร้าง PNG/manifest/ZIP จาก cells + palette เท่านั้น · ปุ่มดาวน์โหลดแยกจาก preview · ต้อง review/register/compatibility แยก · ไม่เข้า player อัตโนมัติ</span></div></div>}
            {domain === "profiler" && <div className="space-y-4"><div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3 text-xs leading-relaxed text-cyan-100/80">วางค่าจาก QA snapshot หนึ่ง window เพื่ออ่านคำแนะนำเชิงนโยบายเท่านั้น ช่องนี้ไม่เชื่อม player HUD, ไม่บันทึก save และไม่ส่ง snapshot เข้า network อัตโนมัติ</div>
<div className="grid gap-4 md:grid-cols-3"><Field label="tier ที่ snapshot ใช้" htmlFor="profiler-tier"><SelectField id="profiler-tier" value={profilerTier} onChange={setProfilerTier}><option value="low">ประหยัดอุปกรณ์</option><option value="balanced">สมดุล</option><option value="high">คุณภาพสูง</option></SelectField></Field><Field label="effective target FPS" htmlFor="profiler-target-fps"><Input id="profiler-target-fps" value={profilerTargetFps} onChange={event => setProfilerTargetFps(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="view distance (blocks)" htmlFor="profiler-view-distance"><Input id="profiler-view-distance" value={profilerViewDistance} onChange={event => setProfilerViewDistance(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="sample window (ms)" htmlFor="profiler-window"><Input id="profiler-window" value={profilerWindowMs} onChange={event => setProfilerWindowMs(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="rendered frames" htmlFor="profiler-rendered"><Input id="profiler-rendered" value={profilerRenderedFrames} onChange={event => setProfilerRenderedFrames(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="throttled callbacks" htmlFor="profiler-throttled"><Input id="profiler-throttled" value={profilerThrottledFrames} onChange={event => setProfilerThrottledFrames(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="average frame (ms) · ว่างได้" htmlFor="profiler-average"><Input id="profiler-average" value={profilerAverageFrameMs} onChange={event => setProfilerAverageFrameMs(event.target.value)} inputMode="decimal" className="border-white/10 bg-white/[0.04]" /></Field><Field label="p95 frame (ms) · ว่างได้" htmlFor="profiler-p95"><Input id="profiler-p95" value={profilerP95FrameMs} onChange={event => setProfilerP95FrameMs(event.target.value)} inputMode="decimal" className="border-white/10 bg-white/[0.04]" /></Field><Field label="worst frame (ms) · ว่างได้" htmlFor="profiler-worst"><Input id="profiler-worst" value={profilerWorstFrameMs} onChange={event => setProfilerWorstFrameMs(event.target.value)} inputMode="decimal" className="border-white/10 bg-white/[0.04]" /></Field><Field label="total meshes" htmlFor="profiler-total-meshes"><Input id="profiler-total-meshes" value={profilerTotalMeshes} onChange={event => setProfilerTotalMeshes(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field><Field label="active meshes" htmlFor="profiler-active-meshes"><Input id="profiler-active-meshes" value={profilerActiveMeshes} onChange={event => setProfilerActiveMeshes(event.target.value)} inputMode="numeric" className="border-white/10 bg-white/[0.04]" /></Field></div></div>}
            {domain === "registry" && <div className="space-y-4"><div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-relaxed text-amber-100/80">กรอก metadata แบบฟอร์ม ไม่ต้องเขียน JSON และไม่ต้องอัปโหลด bytes. ระบบจะสร้าง hash จาก manifest/summary/provenance แล้วเก็บเป็น developer registry เท่านั้น</div><div className="grid gap-4 md:grid-cols-3"><Field label="ประเภท artifact" htmlFor="registry-domain"><SelectField id="registry-domain" value={registryDomain} onChange={setRegistryDomain}><option value="animation">แอนิเมชัน</option><option value="world">โลก</option><option value="block">บล็อก</option><option value="structure">สิ่งปลูกสร้าง</option><option value="item">ไอเทม</option><option value="weapon">อาวุธ</option><option value="quest">เควส</option><option value="profiler">โปรไฟล์ runtime</option></SelectField></Field><Field label="รหัส artifact" htmlFor="registry-artifact-id"><Input id="registry-artifact-id" value={registryArtifactId} onChange={event => setRegistryArtifactId(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="เวอร์ชัน artifact" htmlFor="registry-artifact-version"><Input id="registry-artifact-version" value={registryArtifactVersion} onChange={event => setRegistryArtifactVersion(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="generator id" htmlFor="registry-generator-id"><Input id="registry-generator-id" value={registryGeneratorId} onChange={event => setRegistryGeneratorId(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /></Field><Field label="generator version" htmlFor="registry-generator-version"><Input id="registry-generator-version" value={registryGeneratorVersion} onChange={event => setRegistryGeneratorVersion(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="แหล่งที่มา" htmlFor="registry-source"><Input id="registry-source" value={registrySource} onChange={event => setRegistrySource(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="provenance ref" htmlFor="registry-provenance-ref"><Input id="registry-provenance-ref" value={registryProvenanceRef} onChange={event => setRegistryProvenanceRef(event.target.value)} className="border-white/10 bg-white/[0.04]" /></Field><Field label="target runtime map" htmlFor="compatibility-target-map"><SelectField id="compatibility-target-map" value={compatibilityTargetMap} onChange={setCompatibilityTargetMap}><option value="obsidian-frontier">Obsidian Frontier · playable</option><option value="map-002">Map 002 · future / blocked</option></SelectField></Field></div></div>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3"><p className="flex items-center gap-2 text-xs text-slate-300"><Sparkles size={15} className="text-cyan-300" /> {status}</p><Button onClick={runPreview} disabled={busy} className="gap-2 bg-emerald-300 text-[#061810] hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"><ShieldCheck size={15} /> {busy ? "กำลังตรวจ…" : "ทดลอง preview"}</Button></div>
            {lastError && <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-300/20 bg-red-300/[0.05] p-3 text-xs text-red-200" role="alert"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> {lastError.message}</div>}
          </CardContent></Card>

          <Card className="border-white/10 bg-[#0c1422]/90"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-emerald-300" /> ผลลัพธ์ที่ตรวจแล้ว</CardTitle><Badge className="border-white/10 bg-white/5 text-[10px] text-slate-400">ไม่บันทึกเข้าเกม</Badge></div><Separator className="mt-3 bg-white/8" /></CardHeader><CardContent>{renderResult()}</CardContent></Card>
        </section>
      </div>
    </main>
  );
}
