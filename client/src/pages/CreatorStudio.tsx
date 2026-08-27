import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  Eraser,
  FlipHorizontal2,
  Grid3X3,
  History,
  ImageIcon,
  Layers3,
  LockKeyhole,
  MousePointer2,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  SquareDashedMousePointer,
  TriangleAlert,
  UserRound,
  Wand2,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";


type CreatorKind = "icon" | "tile" | "skin" | "atlas";
type AssetSource = "generated" | "starter-authored" | "provided" | "reference-only";
type ToolMode = "paint" | "erase";
type SymmetryMode = "none" | "horizontal" | "vertical";
type Rgba = [number, number, number, number];

type TemplatePreset = {
  id: string;
  title: string;
  description: string;
  category: string;
  kind: CreatorKind;
  width: number;
  height: number;
  symbol: string;
};

type LayerState = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  pixels: Rgba[];
};

type SkinPart = {
  id: string;
  label: string;
  detail: string;
};

const PALETTE = [
  "#0b1220",
  "#1b2a41",
  "#2f4858",
  "#4f772d",
  "#90a955",
  "#d9ed92",
  "#00a896",
  "#02c39a",
  "#80ed99",
  "#8ecae6",
  "#219ebc",
  "#ffb703",
  "#fb8500",
  "#e63946",
  "#9b5de5",
  "#f1faee",
];

const TEMPLATES: TemplatePreset[] = [
  {
    id: "plant-icon",
    title: "พืช / ใบไม้",
    description: "ไอคอนพิกเซลสำหรับพืช เมล็ด และผลผลิต",
    category: "พืช",
    kind: "icon",
    width: 16,
    height: 16,
    symbol: "✦",
  },
  {
    id: "weapon-icon",
    title: "อาวุธ",
    description: "ช่องวาดทรงอาวุธพร้อมพื้นที่เผื่อเงา",
    category: "อาวุธ",
    kind: "icon",
    width: 24,
    height: 24,
    symbol: "⚔",
  },
  {
    id: "item-icon",
    title: "ไอเทม",
    description: "ไอคอนของใช้ วัตถุดิบ และของสะสม",
    category: "ไอเทม",
    kind: "icon",
    width: 16,
    height: 16,
    symbol: "◆",
  },
  {
    id: "terrain-tile",
    title: "พื้น / บล็อก",
    description: "พื้นผิว tile สำหรับบล็อกและภูมิประเทศ",
    category: "สิ่งแวดล้อม",
    kind: "tile",
    width: 16,
    height: 16,
    symbol: "▦",
  },
  {
    id: "character-skin",
    title: "สกินตัวละคร",
    description: "ผิวตัวละครแบบแยกชิ้นส่วน ไม่ต้องวาดสามเหลี่ยม",
    category: "ตัวละคร",
    kind: "skin",
    width: 64,
    height: 64,
    symbol: "♙",
  },
  {
    id: "atlas-sheet",
    title: "Atlas / ชุดภาพ",
    description: "รวมหน้าภาพหลายช่องสำหรับ asset ที่ใช้ร่วมกัน",
    category: "ชุดภาพ",
    kind: "atlas",
    width: 64,
    height: 64,
    symbol: "▤",
  },
];

const SKIN_PARTS: SkinPart[] = [
  { id: "head", label: "หัว", detail: "ทรงและสีผม/หมวก" },
  { id: "face", label: "ใบหน้า", detail: "ตา ปาก และรายละเอียดหน้า" },
  { id: "torso", label: "ลำตัว", detail: "เสื้อ เกราะ หรือชุดหลัก" },
  { id: "left-arm", label: "แขนซ้าย", detail: "แขนและส่วนต่ออุปกรณ์" },
  { id: "right-arm", label: "แขนขวา", detail: "แขนและส่วนต่ออุปกรณ์" },
  { id: "left-leg", label: "ขาซ้าย", detail: "กางเกง รองเท้า และเงา" },
  { id: "right-leg", label: "ขาขวา", detail: "กางเกง รองเท้า และเงา" },
];

const SKIN_LAYOUT_PARTS: Record<string, SkinPart & { x: number; y: number; width: number; height: number }> = {
  head: { id: "head", label: "หัว", detail: "ทรงและสีผม/หมวก", x: 0, y: 0, width: 32, height: 16 },
  face: { id: "face", label: "ใบหน้า", detail: "ตา ปาก และรายละเอียดหน้า", x: 32, y: 0, width: 32, height: 16 },
  torso: { id: "torso", label: "ลำตัว", detail: "เสื้อ เกราะ หรือชุดหลัก", x: 0, y: 16, width: 32, height: 24 },
  "left-arm": { id: "left-arm", label: "แขนซ้าย", detail: "แขนและส่วนต่ออุปกรณ์", x: 32, y: 16, width: 16, height: 24 },
  "right-arm": { id: "right-arm", label: "แขนขวา", detail: "แขนและส่วนต่ออุปกรณ์", x: 48, y: 16, width: 16, height: 24 },
  "left-leg": { id: "left-leg", label: "ขาซ้าย", detail: "กางเกง รองเท้า และเงา", x: 0, y: 40, width: 16, height: 24 },
  "right-leg": { id: "right-leg", label: "ขาขวา", detail: "กางเกง รองเท้า และเงา", x: 16, y: 40, width: 16, height: 24 },
};

function makePixels(width: number, height: number): Rgba[] {
  return Array.from({ length: width * height }, () => [0, 0, 0, 0] as Rgba);
}

function hexToRgba(hex: string): Rgba {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
    255,
  ];
}

function rgbaToCss([red, green, blue, alpha]: Rgba) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

function rgbaToHex([red, green, blue]: Rgba) {
  return `#${[red, green, blue].map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "new-asset";
}

function getSymmetryCells(index: number, width: number, height: number, mode: SymmetryMode) {
  const x = index % width;
  const y = Math.floor(index / width);
  const cells = new Set([index]);
  if (mode === "horizontal") cells.add((height - y - 1) * width + x);
  if (mode === "vertical") cells.add(y * width + (width - x - 1));
  return Array.from(cells);
}

function blendPixel(base: Rgba, overlay: Rgba, opacity: number): Rgba {
  const alpha = (overlay[3] / 255) * (opacity / 100);
  if (alpha <= 0) return base;
  if (alpha >= 1) return overlay;
  const inverse = 1 - alpha;
  const outAlpha = alpha + (base[3] / 255) * inverse;
  if (outAlpha <= 0) return [0, 0, 0, 0];
  return [
    Math.round((overlay[0] * alpha + base[0] * (base[3] / 255) * inverse) / outAlpha),
    Math.round((overlay[1] * alpha + base[1] * (base[3] / 255) * inverse) / outAlpha),
    Math.round((overlay[2] * alpha + base[2] * (base[3] / 255) * inverse) / outAlpha),
    Math.round(outAlpha * 255),
  ];
}

function createLayers(width: number, height: number): LayerState[] {
  return [{ id: "base", name: "สีพื้น", visible: true, opacity: 100, pixels: makePixels(width, height) }];
}

function getPartClass(partId: string) {
  return `creator-model-part creator-model-${partId}`;
}

export default function CreatorStudio() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0]!.id);
  const [assetName, setAssetName] = useState("ใบเฟิร์นผลึก");
  const [assetId, setAssetId] = useState("crystal-fern");
  const [packName, setPackName] = useState("A_Survival Content Library");
  const [provenanceRef, setProvenanceRef] = useState("procedural-starter-authored");
  const [sampling, setSampling] = useState<"nearest" | "linear">("nearest");
  const [assetSource, setAssetSource] = useState<AssetSource>("generated");
  const [selectedColor, setSelectedColor] = useState(PALETTE[8]!);
  const [customColor, setCustomColor] = useState(PALETTE[8]!);
  const [tool, setTool] = useState<ToolMode>("paint");
  const [symmetry, setSymmetry] = useState<SymmetryMode>("none");
  const [layers, setLayers] = useState<LayerState[]>(() => createLayers(16, 16));
  const [activeLayerId, setActiveLayerId] = useState("base");
  const [zoom, setZoom] = useState(16);
  const [validationRun, setValidationRun] = useState(false);
  const [status, setStatus] = useState("ยังไม่ได้บันทึกงาน");
  const [skinMapping, setSkinMapping] = useState<Record<string, boolean>>(
    Object.fromEntries(SKIN_PARTS.map(part => [part.id, true])),
  );

  const template = useMemo(
    () => TEMPLATES.find(candidate => candidate.id === selectedTemplateId) ?? TEMPLATES[0]!,
    [selectedTemplateId],
  );

  const composedPixels = useMemo(() => {
    const result = makePixels(template.width, template.height);
    for (const layer of layers) {
      if (!layer.visible) continue;
      for (let index = 0; index < result.length; index += 1) {
        result[index] = blendPixel(result[index]!, layer.pixels[index]!, layer.opacity);
      }
    }
    return result;
  }, [layers, template.height, template.width]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!assetName.trim()) issues.push("ต้องใส่ชื่อ asset ที่อ่านรู้เรื่อง");
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(assetId)) issues.push("ระบบสร้าง ID ไม่ถูกต้อง กรุณาเปลี่ยนชื่อ asset");
    if (!provenanceRef.trim()) issues.push("ต้องระบุที่มาของ asset ก่อนส่งเข้า registry");
    if (assetSource === "reference-only" && !provenanceRef.trim()) issues.push("reference-only ต้องมีที่มาอ้างอิง");
    if (layers.length === 0) issues.push("ต้องมีอย่างน้อยหนึ่ง layer");
    if (template.kind === "skin" && Object.values(skinMapping).every(value => !value)) issues.push("สกินต้องเลือกส่วนประกอบอย่างน้อยหนึ่งส่วน");
    return issues;
  }, [assetId, assetName, assetSource, layers.length, provenanceRef, skinMapping, template.kind]);

  const registryQuery = trpc.creator.texture.list.useQuery({ limit: 12 }, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const buildMutation = trpc.creator.texture.build.useMutation({
    onSuccess: response => {
      setValidationRun(true);
      if (response.validation.valid) {
        const digest = response.output.assets[0]?.sha256.slice(0, 12) ?? "ไม่มี digest";
        setStatus(`Builder สร้าง PNG และตรวจ manifest ผ่านแล้ว · sha256 ${digest}…`);
      } else {
        setStatus(`Builder ตรวจแล้วพบ ${response.validation.issues.length} จุดที่ต้องแก้`);
      }
    },
    onError: error => {
      setValidationRun(true);
      setStatus(`ส่งให้ Builder ไม่สำเร็จ: ${error.message}`);
    },
  });

  const registerMutation = trpc.creator.texture.register.useMutation({
    onSuccess: response => {
      setStatus(`บันทึก artifact เข้า registry แล้ว · ${response.artifact.artifactKey.slice(0, 48)}…`);
      void registryQuery.refetch();
    },
    onError: error => {
      setStatus(`บันทึก registry ไม่สำเร็จ: ${error.message}`);
    },
  });

  const makeBuilderInput = (): Parameters<typeof buildMutation.mutate>[0] => ({
    id: "creator-studio-pack",
    namespace: "creator",
    version: "0.1.0",
    displayName: packName,
    textureSampling: sampling,
    assets: [{
      assetId,
      kind: template.kind,
      width: template.width,
      height: template.height,
      layers: layers.map(layer => ({ id: layer.id, x: 0, y: 0, width: template.width, height: template.height, rgba: layer.pixels.flat() })),
      source: assetSource,
      provenanceRef,
      skinLayout: template.kind === "skin" ? {
        id: "humanoid-skin-v1",
        allowPartOverlap: false,
        parts: Object.entries(skinMapping).filter(([, enabled]) => enabled).map(([partId]) => {
          const part = SKIN_LAYOUT_PARTS[partId]!;
          return { id: part.id, x: part.x, y: part.y, width: part.width, height: part.height };
        }),
      } : undefined,
    }],
  });

  const sendToBuilder = () => {
    setValidationRun(true);
    if (validationIssues.length > 0) {
      setStatus("แก้ข้อมูลที่แจ้งก่อนส่งให้ Builder");
      return;
    }
    setStatus("กำลังให้ server-side Builder ประกอบ PNG และตรวจ manifest…");
    buildMutation.mutate(makeBuilderInput());
  };

  const registerArtifact = () => {
    if (!buildMutation.data?.validation.valid) {
      setStatus("ต้องส่งให้ Builder และตรวจผ่านก่อนบันทึก artifact");
      return;
    }
    setStatus("กำลังอัปโหลด PNG และบันทึก manifest/hash/provenance…");
    registerMutation.mutate(makeBuilderInput());
  };

  const applyPreset = (nextId: string) => {
    const nextTemplate = TEMPLATES.find(candidate => candidate.id === nextId) ?? TEMPLATES[0]!;
    setSelectedTemplateId(nextId);
    setLayers(createLayers(nextTemplate.width, nextTemplate.height));
    setActiveLayerId("base");
    setZoom(nextTemplate.width >= 64 ? 8 : nextTemplate.width >= 24 ? 12 : 16);
    setValidationRun(false);
    setStatus(`เริ่มจากแม่แบบ ${nextTemplate.title}`);
  };

  const paintCell = (index: number) => {
    setLayers(currentLayers => currentLayers.map(layer => {
      if (layer.id !== activeLayerId) return layer;
      const nextPixels = [...layer.pixels];
      const fill = tool === "erase" ? ([0, 0, 0, 0] as Rgba) : hexToRgba(selectedColor);
      for (const cell of getSymmetryCells(index, template.width, template.height, symmetry)) nextPixels[cell] = fill;
      return { ...layer, pixels: nextPixels };
    }));
    setStatus(tool === "erase" ? "ลบพิกเซลแล้ว" : "ลงสีพิกเซลแล้ว");
  };

  const addLayer = () => {
    const nextLayer: LayerState = {
      id: `layer-${Date.now()}`,
      name: `ชั้นใหม่ ${layers.length + 1}`,
      visible: true,
      opacity: 100,
      pixels: makePixels(template.width, template.height),
    };
    setLayers(current => [...current, nextLayer]);
    setActiveLayerId(nextLayer.id);
    setStatus("เพิ่มชั้นภาพแล้ว");
  };

  const resetCanvas = () => {
    setLayers(current => current.map(layer => ({ ...layer, pixels: makePixels(template.width, template.height) })));
    setStatus("ล้างพื้นที่วาดแล้ว");
  };

  const toggleLayer = (layerId: string) => {
    setLayers(current => current.map(layer => layer.id === layerId ? { ...layer, visible: !layer.visible } : layer));
  };

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(current => current.map(layer => layer.id === layerId ? { ...layer, opacity } : layer));
  };

  const saveDraft = () => {
    const draft = {
      schemaVersion: "a-survival.creator-draft.v1",
      packName,
      assetName,
      assetId,
      template: { id: template.id, kind: template.kind, width: template.width, height: template.height },
      sampling,
      symmetry,
      provenanceRef,
      skinMapping: template.kind === "skin" ? skinMapping : undefined,
      layers: layers.map(layer => ({ ...layer, pixels: layer.pixels.flat() })),
    };
    window.localStorage.setItem("a-survival.creator-studio.draft.v1", JSON.stringify(draft));
    setStatus("บันทึกแบบร่างไว้ในเครื่องแล้ว");
  };

  const exportDraft = () => {
    const draft = {
      schemaVersion: "a-survival.creator-draft.v1",
      packName,
      assetName,
      assetId,
      template: { id: template.id, kind: template.kind, width: template.width, height: template.height },
      sampling,
      provenanceRef,
      skinMapping: template.kind === "skin" ? skinMapping : undefined,
      layers: layers.map(layer => ({ id: layer.id, name: layer.name, visible: layer.visible, opacity: layer.opacity, rgba: layer.pixels.flat() })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${assetId || "asset"}.creator-draft.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("ส่งออกแบบร่างให้ทีมตรวจแล้ว");
  };

  const handleAssetNameChange = (value: string) => {
    setAssetName(value);
    setAssetId(slugify(value));
  };

  return (
    <main className="creator-studio min-h-dvh bg-[#070a10] text-slate-100">
      <header className="creator-studio-header flex items-center justify-between gap-4 border-b border-cyan-200/10 bg-[#0a111e]/95 px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="creator-studio-mark grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/30">
            <Wand2 size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black tracking-[0.18em] text-white">A_SURVIVAL CREATOR STUDIO</p>
              <Badge className="border-amber-300/30 bg-amber-300/10 text-[10px] text-amber-200">DEVELOPER ONLY</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-400">พื้นที่สร้าง asset แบบไม่ต้องเขียนโค้ด แยกออกจากหน้าผู้เล่น</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
          <LockKeyhole size={14} className="text-emerald-300" />
          <span>ยังไม่เปิดเป็นเมนูในเกม</span>
          <Separator orientation="vertical" className="mx-2 h-5 bg-white/10" />
          <span className="font-mono text-[10px]">studio / draft</span>
        </div>
      </header>

      <div className="creator-studio-layout grid min-h-[calc(100dvh-73px)] lg:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="creator-template-panel border-b border-white/10 bg-[#0a111e] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="creator-kicker">ขั้นที่ 1</p>
              <h1 className="mt-1 text-lg font-bold text-white">เลือกแม่แบบ</h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">เลือกตามประเภท asset ระบบจะเตรียมสัดส่วนและทางเดินไฟล์ให้</p>
            </div>
            <CircleHelp size={16} className="mt-1 shrink-0 text-slate-500" />
          </div>
          <div className="grid gap-2">
            {TEMPLATES.map(candidate => {
              const selected = candidate.id === selectedTemplateId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => applyPreset(candidate.id)}
                  className={`creator-template-card group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300/60 bg-cyan-300/10 shadow-lg shadow-cyan-950/20" : "border-white/8 bg-white/[0.025] hover:border-cyan-300/30 hover:bg-cyan-300/[0.05]"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg ${selected ? "bg-cyan-200/15 text-cyan-100" : "bg-white/5 text-slate-300"}`}>{candidate.symbol}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-100">
                      {candidate.title}
                      {selected && <Check size={13} className="text-emerald-300" />}
                    </span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{candidate.description}</span>
                  </span>
                  <ChevronRight size={14} className={`shrink-0 transition ${selected ? "text-cyan-200" : "text-slate-600 group-hover:text-cyan-300"}`} />
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[10px] leading-relaxed text-amber-100/70">
            <div className="mb-1 flex items-center gap-2 font-bold text-amber-200"><ShieldCheck size={13} /> ขอบเขตที่ตั้งใจไว้</div>
            มนุษย์วาดเฉพาะพิกเซลและกำหนดชิ้นส่วน ระบบเป็นคนประกอบ asset และเตรียม manifest ให้ ไม่ต้องสร้าง triangle mesh เอง
          </div>
        </aside>

        <section className="creator-workspace min-w-0 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(0,210,230,0.10),transparent_32%),#070a10] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="creator-kicker">ขั้นที่ 2 · วาดและประกอบ</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{template.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">ลงสีทีละพิกเซล เลือกเฉด เพิ่มชั้น และดูตัวอย่างการประกอบได้ทันที ทุกอย่างยังอยู่ในพื้นที่พัฒนาแยกจากเกมจริง</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] text-slate-400">
                <Grid3X3 size={14} className="text-cyan-300" />
                <span>{template.width} × {template.height} px</span>
                <span className="text-slate-600">•</span>
                <span>{template.kind}</span>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
              <Card className="border-white/10 bg-[#0c1422]/90 shadow-2xl shadow-black/20">
                <CardHeader className="gap-3 border-b border-white/8 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-white"><Pencil size={16} className="text-cyan-300" /> กระดานพิกเซล</CardTitle>
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                      <Button size="sm" variant={tool === "paint" ? "secondary" : "ghost"} onClick={() => setTool("paint")} className="h-8 gap-1.5 text-xs"><Pencil size={13} /> วาด</Button>
                      <Button size="sm" variant={tool === "erase" ? "secondary" : "ghost"} onClick={() => setTool("erase")} className="h-8 gap-1.5 text-xs"><Eraser size={13} /> ลบ</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <Button size="sm" variant="outline" onClick={() => setSymmetry(current => current === "none" ? "vertical" : current === "vertical" ? "horizontal" : "none")} className="h-8 gap-1.5 border-white/10 bg-white/[0.02] text-xs">
                      <FlipHorizontal2 size={13} /> สมมาตร: {symmetry === "none" ? "ปิด" : symmetry === "vertical" ? "ซ้าย–ขวา" : "บน–ล่าง"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetCanvas} className="h-8 gap-1.5 border-white/10 bg-white/[0.02] text-xs"><RotateCcw size={13} /> ล้างกระดาน</Button>
                    <div className="ml-auto flex items-center gap-2 rounded-lg border border-white/8 bg-black/15 px-2 py-1.5">
                      <ZoomIn size={13} className="text-slate-500" />
                      <input aria-label="ขนาดพิกเซลบนหน้าจอ" type="range" min="8" max="24" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="w-24 accent-cyan-300" />
                      <span className="w-7 text-right font-mono text-[10px] text-slate-500">{zoom}px</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="creator-canvas-board flex min-h-[330px] items-center justify-center overflow-auto rounded-xl border border-cyan-300/10 bg-[#050a12] p-5 sm:min-h-[460px]">
                    <div className="creator-grid" role="grid" aria-label="กระดานวาดพิกเซล" style={{ gridTemplateColumns: `repeat(${template.width}, ${zoom}px)`, gridAutoRows: `${zoom}px` }}>
                      {composedPixels.map((pixel, index) => (
                        <button
                          key={`${template.id}-${index}`}
                          type="button"
                          role="gridcell"
                          aria-label={`พิกเซล ${index + 1}`}
                          onClick={() => paintCell(index)}
                          className="creator-grid-cell"
                          style={{ backgroundColor: rgbaToCss(pixel) }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-2"><MousePointer2 size={13} className="text-cyan-300" /> คลิกช่องเพื่อวาด · สมมาตรช่วยลดงานซ้ำ</span>
                    <span className="font-mono">ชั้นที่ใช้งาน: {layers.find(layer => layer.id === activeLayerId)?.name ?? "สีพื้น"}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid content-start gap-5">
                <Card className="border-white/10 bg-[#0c1422]/90">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Palette size={16} className="text-fuchsia-300" /> สีและเฉด</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-8 gap-1.5">
                      {PALETTE.map(color => (
                        <button key={color} type="button" aria-label={`เลือกสี ${color}`} onClick={() => { setSelectedColor(color); setCustomColor(color); }} className={`creator-swatch size-6 rounded-md border transition ${selectedColor === color ? "scale-110 border-white ring-2 ring-cyan-300/60" : "border-white/10 hover:border-white/50"}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/15 p-2">
                      <input aria-label="เลือกสีแบบกำหนดเอง" type="color" value={customColor} onChange={event => { setCustomColor(event.target.value); setSelectedColor(event.target.value); }} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <div className="min-w-0"><p className="text-[10px] font-bold text-slate-200">สีที่เลือก</p><p className="font-mono text-[10px] text-slate-500">{selectedColor}</p></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-[#0c1422]/90">
                  <CardHeader className="flex-row items-center justify-between pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Layers3 size={16} className="text-amber-300" /> ชั้นภาพ</CardTitle><Button size="icon" variant="ghost" onClick={addLayer} className="size-8" aria-label="เพิ่มชั้นภาพ"><Plus size={15} /></Button></CardHeader>
                  <CardContent className="space-y-2">
                    {layers.map(layer => (
                      <div key={layer.id} className={`rounded-lg border p-2 transition ${activeLayerId === layer.id ? "border-cyan-300/50 bg-cyan-300/[0.07]" : "border-white/8 bg-black/10"}`}>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`${layer.visible ? "ซ่อน" : "แสดง"} ${layer.name}`} onClick={() => toggleLayer(layer.id)} className="text-slate-400 hover:text-white">{layer.visible ? <Eye size={14} /> : <SquareDashedMousePointer size={14} />}</button>
                          <button type="button" onClick={() => setActiveLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-xs font-bold text-slate-200">{layer.name}</button>
                          {activeLayerId === layer.id && <Badge className="border-cyan-300/20 bg-cyan-300/10 text-[9px] text-cyan-200">กำลังใช้</Badge>}
                        </div>
                        <div className="mt-2 flex items-center gap-2"><span className="w-12 text-[9px] text-slate-500">ความทึบ</span><input aria-label={`ความทึบ ${layer.name}`} type="range" min="0" max="100" value={layer.opacity} onChange={event => updateLayerOpacity(layer.id, Number(event.target.value))} className="w-full accent-cyan-300" /><span className="w-8 text-right font-mono text-[9px] text-slate-500">{layer.opacity}%</span></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {template.kind === "skin" && (
              <Card className="mt-5 border-white/10 bg-[#0c1422]/90">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><UserRound size={16} className="text-emerald-300" /> การแมปส่วนประกอบสกิน</CardTitle><p className="text-xs leading-relaxed text-slate-400">เลือกชิ้นส่วนที่ asset นี้จะใช้ ระบบจะนำ texture ไปประกอบกับโมเดลตัวละครตาม layout ไม่ต้องวาดรูปทรง 3D เอง</p></CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-[1fr_260px]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SKIN_PARTS.map(part => {
                      const enabled = skinMapping[part.id] ?? false;
                      return <button key={part.id} type="button" onClick={() => setSkinMapping(current => ({ ...current, [part.id]: !enabled }))} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${enabled ? "border-emerald-300/40 bg-emerald-300/[0.07]" : "border-white/8 bg-black/10 opacity-60"}`}><span className={`grid size-7 place-items-center rounded-md ${enabled ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-slate-500"}`}>{enabled ? <Check size={14} /> : <span className="size-2 rounded-full bg-slate-600" />}</span><span><span className="block text-xs font-bold text-slate-200">{part.label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{part.detail}</span></span></button>;
                    })}
                  </div>
                  <div className="creator-model-stage relative min-h-[230px] overflow-hidden rounded-xl border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_42%,rgba(71,190,150,0.18),transparent_45%),#07120f]">
                    <div className="absolute inset-x-0 bottom-5 text-center text-[10px] font-bold tracking-[0.16em] text-emerald-200/60">COMPOSITION PREVIEW</div>
                    <div className="creator-model-avatar" aria-label="ตัวอย่างโมเดลที่ประกอบจากชิ้นส่วน texture">
                      {SKIN_PARTS.map(part => <div key={part.id} className={getPartClass(part.id)} style={{ opacity: skinMapping[part.id] ? 1 : 0.13 }} />)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mt-5 border-white/10 bg-[#0c1422]/90">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><ImageIcon size={16} className="text-cyan-300" /> ตัวอย่างภาพที่ประกอบเสร็จ</CardTitle></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
                <div className="creator-preview-frame grid aspect-square place-items-center rounded-xl border border-cyan-300/15 bg-[#050a12] p-4">{buildMutation.data?.output.assets[0]?.pngBase64 ? <img src={`data:image/png;base64,${buildMutation.data.output.assets[0].pngBase64}`} alt="ภาพ PNG ที่ Builder ประกอบแล้ว" className="aspect-square w-full object-contain [image-rendering:pixelated]" /> : <div className="creator-preview-grid" style={{ gridTemplateColumns: `repeat(${template.width}, 1fr)`, backgroundSize: `${100 / template.width}% ${100 / template.height}%` }}>{composedPixels.map((pixel, index) => <span key={`preview-${index}`} style={{ backgroundColor: rgbaToCss(pixel) }} />)}</div>}</div>
                <div><p className="text-sm font-bold text-white">{assetName || "ยังไม่ได้ตั้งชื่อ"}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">ระบบจะใช้ภาพรวมจากทุกชั้นที่เปิดอยู่และส่งต่อผ่าน <span className="font-mono text-cyan-200/80">texture.pack</span> ตาม template <span className="font-mono text-cyan-200/80">{template.kind}</span></p><div className="mt-4 flex flex-wrap gap-2"><Badge className="border-white/10 bg-white/5 text-[10px] text-slate-300">sampling: {sampling}</Badge><Badge className="border-white/10 bg-white/5 text-[10px] text-slate-300">layers: {layers.length}</Badge><Badge className="border-white/10 bg-white/5 text-[10px] text-slate-300">{template.width}×{template.height}</Badge>{buildMutation.data?.output.assets[0]?.sha256 && <Badge className="border-emerald-300/20 bg-emerald-300/10 font-mono text-[10px] text-emerald-200">sha256: {buildMutation.data.output.assets[0].sha256.slice(0, 12)}…</Badge>}</div></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="creator-inspector border-t border-white/10 bg-[#0a111e] p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-5">
          <div className="sticky top-0 space-y-5">
            <div><p className="creator-kicker">ขั้นที่ 3 · เตรียมส่ง</p><h2 className="mt-1 text-lg font-bold text-white">ข้อมูล asset</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">กรอกเป็นภาษาคน ระบบจะสร้างชื่ออ้างอิงและเส้นทางให้ภายหลัง</p></div>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="creator-pack-name" className="text-xs text-slate-300">ชื่อชุดภาพ</Label><Input id="creator-pack-name" value={packName} onChange={event => setPackName(event.target.value)} className="border-white/10 bg-white/[0.04] text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="creator-asset-name" className="text-xs text-slate-300">ชื่อ asset ที่คนจะเห็น</Label><Input id="creator-asset-name" value={assetName} onChange={event => handleAssetNameChange(event.target.value)} className="border-white/10 bg-white/[0.04] text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="creator-asset-id" className="flex items-center gap-2 text-xs text-slate-300">รหัสภายในที่ระบบสร้าง <Badge className="border-cyan-300/15 bg-cyan-300/10 text-[9px] text-cyan-200">อัตโนมัติ</Badge></Label><Input id="creator-asset-id" value={assetId} readOnly className="border-white/10 bg-black/20 font-mono text-xs text-cyan-100/80" /><p className="text-[10px] leading-relaxed text-slate-500">ใช้เป็น logical ID เท่านั้น ไม่ต้องจำเพื่อเล่นเกม</p></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="creator-sampling" className="text-xs text-slate-300">การแสดงพิกเซล</Label><select id="creator-sampling" value={sampling} onChange={event => setSampling(event.target.value as "nearest" | "linear")} className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"><option value="nearest">คม / nearest</option><option value="linear">นุ่ม / linear</option></select></div><div className="space-y-2"><Label className="text-xs text-slate-300">ขนาด canvas</Label><div className="flex h-9 items-center rounded-md border border-white/10 bg-black/20 px-2 font-mono text-xs text-cyan-100">{template.width} × {template.height}</div></div></div>
              <div className="space-y-2"><Label htmlFor="creator-source" className="text-xs text-slate-300">สถานะที่มาของไฟล์</Label><select id="creator-source" value={assetSource} onChange={event => setAssetSource(event.target.value as AssetSource)} className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"><option value="generated">สร้างจากระบบ</option><option value="starter-authored">ไฟล์เริ่มต้นที่ทีมทำเอง</option><option value="provided">ไฟล์ที่เจ้าของให้มา</option><option value="reference-only">ใช้อ้างอิงเท่านั้น</option></select></div>
              <div className="space-y-2"><Label htmlFor="creator-provenance" className="text-xs text-slate-300">ที่มาของ asset</Label><Input id="creator-provenance" value={provenanceRef} onChange={event => setProvenanceRef(event.target.value)} className="border-white/10 bg-white/[0.04] font-mono text-xs" /><p className="text-[10px] leading-relaxed text-slate-500">ต้องระบุให้ตรวจสอบย้อนกลับได้ เช่น procedural-starter-authored หรือ reference-only</p></div>
            </div>

            <Separator className="bg-white/10" />

            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-xs font-bold text-white"><ShieldCheck size={15} className="text-emerald-300" /> ตรวจความพร้อม</p><Badge className={validationRun && validationIssues.length === 0 ? "border-emerald-300/20 bg-emerald-300/10 text-[9px] text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-[9px] text-amber-200"}>{validationRun ? (validationIssues.length === 0 ? "ผ่าน" : "ต้องแก้") : "ยังไม่ตรวจ"}</Badge></div>
              <div className="mt-3 space-y-2 text-[10px]">{validationIssues.length === 0 ? <p className="flex items-center gap-2 text-emerald-200/80"><Check size={13} /> ข้อมูลพื้นฐานครบ พร้อมส่งต่อให้ Builder ตรวจซ้ำ</p> : validationIssues.map(issue => <p key={issue} className="flex items-start gap-2 text-amber-200/80"><TriangleAlert size={13} className="mt-0.5 shrink-0" /> {issue}</p>)}</div>
              <Button size="sm" variant="outline" onClick={() => { setValidationRun(true); setStatus(validationIssues.length === 0 ? "ตรวจเบื้องต้นผ่านแล้ว" : "พบข้อมูลที่ต้องแก้ก่อนส่ง"); }} className="mt-3 h-8 w-full gap-2 border-white/10 bg-black/10 text-xs"><ShieldCheck size={13} /> ตรวจงานตอนนี้</Button>
            </div>

            <div className="grid gap-2"><Button onClick={saveDraft} className="h-10 w-full gap-2 bg-cyan-300 text-[#031319] hover:bg-cyan-200"><Save size={15} /> บันทึกแบบร่าง</Button><Button onClick={exportDraft} variant="outline" className="h-10 w-full gap-2 border-white/10 bg-white/[0.03] text-slate-200"><ArrowDownToLine size={15} /> ส่งออกแบบร่าง</Button><Button onClick={sendToBuilder} disabled={buildMutation.isPending || registerMutation.isPending} className="h-10 w-full gap-2 bg-emerald-300 text-[#061810] hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"><Boxes size={15} /> {buildMutation.isPending ? "กำลังสร้างด้วย Builder…" : "ส่งเข้า Builder เพื่อตรวจ"}</Button><Button onClick={registerArtifact} disabled={registerMutation.isPending || !buildMutation.data?.validation.valid} variant="outline" className="h-10 w-full gap-2 border-amber-300/30 bg-amber-300/[0.06] text-amber-100 hover:bg-amber-300/[0.12] disabled:cursor-not-allowed disabled:opacity-50"><History size={15} /> {registerMutation.isPending ? "กำลังบันทึก registry…" : "บันทึก artifact เข้า registry"}</Button></div>
            <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3"><p className="flex items-center gap-2 text-[10px] font-bold text-cyan-200"><Sparkles size={13} /> สถานะพื้นที่ทำงาน</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">{status}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Builder จะประกอบ PNG และตรวจ manifest/hash/provenance ก่อน ปุ่ม registry จะอัปโหลด bytes และบันทึก metadata เมื่อ environment มี DB กับ object storage พร้อม โดยยังไม่แตะ playable runtime</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><p className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><History size={13} className="text-amber-200" /> registry ล่าสุด</p>{registryQuery.isLoading ? <p className="mt-2 text-[10px] text-slate-500">กำลังอ่านทะเบียน…</p> : registryQuery.isError ? <p className="mt-2 text-[10px] leading-relaxed text-slate-500">ยังอ่านทะเบียนไม่ได้ใน environment นี้ ต้องตั้งค่า DB และเปิดสิทธิ์ admin ก่อน</p> : registryQuery.data?.length ? <div className="mt-2 space-y-2">{registryQuery.data.slice(0, 4).map(artifact => <div key={artifact.artifactKey} className="rounded-lg border border-white/8 bg-black/15 p-2"><p className="truncate font-mono text-[9px] text-cyan-100/80">{artifact.artifactKey}</p><p className="mt-1 text-[9px] text-slate-500">hash {artifact.packSha256.slice(0, 12)}…</p></div>)}</div> : <p className="mt-2 text-[10px] text-slate-500">ยังไม่มี artifact ที่บันทึกไว้</p>}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
