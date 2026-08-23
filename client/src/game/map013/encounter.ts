export type Map013Memory = { state: "idle" | "geyser-warning" | "geyser-active" | "cooldown" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map013Input = { x: number; z: number; health: number; harvestedCrust: number; defeatedLeapers: number; interacted: boolean; now: number; menuOpen?: boolean };
export const MAP013_THERON_BOARDWALK = { x: -10, z: -14, radius: 7 };
export const MAP013_SULFUR_FALLS = { x: 30, z: 20, radius: 8 };
const period = 60000, warningDuration = 4000, geyserDuration = 8000;
export const initialMap013Encounter = (): Map013Memory => ({ state: "idle", eliteRevealed: false });
export function resolveMap013Encounter(memory: Map013Memory, input: Map013Input) {
  const clock = Math.max(0, input.now) % period; const warning = clock >= period - warningDuration; const active = clock < geyserDuration;
  const sheltered = Math.hypot(input.x - MAP013_THERON_BOARDWALK.x, input.z - MAP013_THERON_BOARDWALK.z) <= MAP013_THERON_BOARDWALK.radius;
  const common = { geyserActive: active, sheltered, corrodeDamagePerSecond: active && !sheltered && !input.menuOpen ? 4 : 0, geyserTimerMs: active ? geyserDuration - clock : period - clock, inventoryMutation: false as const };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" as const }, event: "safe-reset" as const, activateElite: false, activateBoss: false, warning: "CORROSION CRITICAL · returning to Theron Boardwalk", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= 2600) return { memory: { ...memory, state: "boss-active" as const }, event: "bile-mother-vile" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "BILE-MOTHER VILE SURFACES", ...common };
  if (memory.state === "boss-active") return { memory, event: "none" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "BILE-MOTHER VILE ENGAGED · STAY ON HIGH GROUND", ...common };
  const atFalls = Math.hypot(input.x - MAP013_SULFUR_FALLS.x, input.z - MAP013_SULFUR_FALLS.z) <= MAP013_SULFUR_FALLS.radius;
  if (memory.eliteRevealed && input.harvestedCrust >= 10 && !active && input.interacted && atFalls) return { memory: { ...memory, state: "boss-telegraph" as const, telegraphStartedAt: input.now }, event: "bile-mother-vile" as const, activateElite: true, activateBoss: false, warning: "10 SULFUR CRUST DISSOLVE · SULFUR FALLS BOILING", ...common };
  const elite = input.harvestedCrust >= 5 || input.defeatedLeapers >= 4;
  if (!memory.eliteRevealed && elite) return { memory: { ...memory, state: "elite-active" as const, eliteRevealed: true }, event: "elite-revealed" as const, activateElite: true, activateBoss: false, warning: "CORROSIVE ABERRATION DETECTED", ...common };
  const state: Map013Memory["state"] = active ? "geyser-active" : warning ? "geyser-warning" : clock < geyserDuration + 6000 ? "cooldown" : memory.eliteRevealed ? "elite-active" : "idle";
  return { memory: { ...memory, state }, event: memory.state !== "geyser-warning" && state === "geyser-warning" ? "geyser-warning" as const : memory.state !== "geyser-active" && state === "geyser-active" ? "sulfur-geyser" as const : "none" as const, activateElite: memory.eliteRevealed, activateBoss: false, warning: active ? (sheltered ? "SULFUR GEYSER · boardwalk plating intact" : "SULFUR GEYSER ACTIVE · corrode stacking") : warning ? "SULFUR GEYSER INCOMING · 4s" : "", ...common };
}
