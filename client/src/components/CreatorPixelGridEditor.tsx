type PaletteEntry = { id: string; label: string; hex: string };
type LayerEntry = { id: string; label: string };
type CellEntry = { colorId: string; layerId: string };

type CreatorPixelGridEditorProps = {
  width: number;
  height: number;
  palette: PaletteEntry[];
  layers: LayerEntry[];
  selectedColorId: string;
  selectedLayerId: string;
  cells: Record<string, CellEntry>;
  onSelectColor: (colorId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onToggleCell: (x: number, y: number) => void;
  onClear: () => void;
};

export function CreatorPixelGridEditor({ width, height, palette, layers, selectedColorId, selectedLayerId, cells, onSelectColor, onSelectLayer, onToggleCell, onClear }: CreatorPixelGridEditorProps) {
  const isRenderable = Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 && width <= 32 && height <= 32;
  return <div className="space-y-3 rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-slate-200">วาด pixel ใน template</p><p className="mt-1 text-[10px] text-slate-500">เลือกสีแล้วกดช่องเพื่อเติม กดซ้ำเพื่อลบ · เก็บเป็นพิกัดกับ color id ไม่ใช่ไฟล์รูป</p></div><button type="button" onClick={onClear} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400 transition hover:border-rose-300/30 hover:text-rose-200">ล้าง pixel</button></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-[10px] text-slate-500">วาดลงชั้น<select value={selectedLayerId} onChange={event => onSelectLayer(event.target.value)} className="rounded-md border border-white/10 bg-[#0d1a25] px-2 py-1 text-[10px] text-slate-200 outline-none focus:border-cyan-300/50">{layers.map(layer => <option key={layer.id} value={layer.id}>{layer.label}</option>)}</select></label><div className="flex flex-wrap gap-2">{palette.map(color => <button key={color.id} type="button" onClick={() => onSelectColor(color.id)} className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] transition ${selectedColorId === color.id ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:border-cyan-300/30"}`} aria-pressed={selectedColorId === color.id}><span className="size-3 rounded-sm border border-white/20" style={{ backgroundColor: color.hex }} />{color.label}</button>)}</div></div>{isRenderable ? <div className="max-w-[560px] overflow-auto rounded-lg border border-white/10 bg-[#071018] p-2"><div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>{Array.from({ length: width * height }, (_, index) => { const x = index % width; const y = Math.floor(index / width); const cell = cells[`${selectedLayerId}:${x}:${y}`]; const color = palette.find(entry => entry.id === cell?.colorId); const layer = layers.find(entry => entry.id === cell?.layerId); return <button key={`${x}:${y}`} type="button" onClick={() => onToggleCell(x, y)} aria-label={`pixel ${x},${y}`} title={color ? `${x},${y} · ${color.label} · ${layer?.label ?? "ชั้นไม่ทราบ"}` : `${x},${y} · ว่าง`} className="aspect-square min-w-2 rounded-[1px] border border-white/[0.04] transition hover:border-cyan-200/70" style={{ backgroundColor: color?.hex ?? "#0d1a25" }} />; })}</div></div> : <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] text-amber-100/70">ช่องแสดงผล pixel รองรับไม่เกิน 32 × 32 ในรอบนี้; validator ยังรองรับ manifest สูงสุด 128 × 128 และจะตรวจพิกัดให้ก่อน preview</p>}</div>;
}
