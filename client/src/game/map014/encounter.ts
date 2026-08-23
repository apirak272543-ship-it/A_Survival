export type Map014Memory = { state: "idle" | "tremor-warning" | "tremor-active" | "cooldown" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map014Input = { x: number; z: number; health: number; harvestedMagma: number; defeatedHounds: number; interacted: boolean; now: number; menuOpen?: boolean };
export const MAP014_WARDEN_POST = { x: -14, z: 8, radius: 7 };
export const MAP014_CITADEL_GATE = { x: 26, z: -20, radius: 8 };
export const MAP014_BRIDGE_ZONE = { x: 4, z: -4, halfWidth: 6, halfDepth: 10 };
const period = 45000, warningDuration = 3500, tremorDuration = 5000;
export const initialMap014Encounter = (): Map014Memory => ({ state: "idle", eliteRevealed: false });
export function resolveMap014Encounter(memory: Map014Memory, input: Map014Input) {
  const clock = Math.max(0, input.now) % period; const warning = clock >= period - warningDuration; const active = clock < tremorDuration;
  const sheltered = Math.hypot(input.x - MAP014_WARDEN_POST.x, input.z - MAP014_WARDEN_POST.z) <= MAP014_WARDEN_POST.radius;
  const onBridge = Math.abs(input.x - MAP014_BRIDGE_ZONE.x) <= MAP014_BRIDGE_ZONE.halfWidth && Math.abs(input.z - MAP014_BRIDGE_ZONE.z) <= MAP014_BRIDGE_ZONE.halfDepth;
  const common = { tremorActive: active, sheltered, onBridge, trenchDamagePerSecond: active && onBridge && !sheltered && !input.menuOpen ? 7 : 0, tremorTimerMs: active ? tremorDuration - clock : period - clock, inventoryMutation: false as const };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" as const }, event: "safe-reset" as const, activateElite: false, activateBoss: false, warning: "TRENCH FALL CRITICAL · returning to Warden Post", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= 2600) return { memory: { ...memory, state: "boss-active" as const }, event: "trench-lord-baelrok" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "TRENCH-LORD BAELROK RISES", ...common };
  if (memory.state === "boss-active") return { memory, event: "none" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "TRENCH-LORD BAELROK ENGAGED · HOLD THE BRIDGES", ...common };
  const atGate = Math.hypot(input.x - MAP014_CITADEL_GATE.x, input.z - MAP014_CITADEL_GATE.z) <= MAP014_CITADEL_GATE.radius;
  if (memory.eliteRevealed && input.harvestedMagma >= 10 && !active && input.interacted && atGate) return { memory: { ...memory, state: "boss-telegraph" as const, telegraphStartedAt: input.now }, event: "trench-lord-baelrok" as const, activateElite: true, activateBoss: false, warning: "10 HARDENED MAGMA CRACK · CITADEL GATE SPLITTING", ...common };
  const elite = input.harvestedMagma >= 5 || input.defeatedHounds >= 4;
  if (!memory.eliteRevealed && elite) return { memory: { ...memory, state: "elite-active" as const, eliteRevealed: true }, event: "elite-revealed" as const, activateElite: true, activateBoss: false, warning: "MAGMA DRAKE SENTINEL DETECTED", ...common };
  const state: Map014Memory["state"] = active ? "tremor-active" : warning ? "tremor-warning" : clock < tremorDuration + 6000 ? "cooldown" : memory.eliteRevealed ? "elite-active" : "idle";
  return { memory: { ...memory, state }, event: memory.state !== "tremor-warning" && state === "tremor-warning" ? "tremor-warning" as const : memory.state !== "tremor-active" && state === "tremor-active" ? "bridge-tremor" as const : "none" as const, activateElite: memory.eliteRevealed, activateBoss: false, warning: active ? (onBridge && !sheltered ? "TREMOR ACTIVE · BRIDGE CRUMBLING" : "TREMOR ACTIVE · bridges unstable") : warning ? "BRIDGE TREMOR INCOMING · 3.5s" : "", ...common };
}
