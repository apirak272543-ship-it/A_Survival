import {
  CommonGeneratorRegistry,
  type GeneratorAssetRef,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export const ANIMATION_PROFILE_VERSION = "1.0.0" as const;
export const ANIMATION_PROFILE_SCHEMA_VERSION = "a-survival.animation-profile.v1" as const;

export type AnimationStateId = "idle" | "walk" | "run" | "dash" | "attack" | "hurt" | "dead";
export type AnimationAssetSource = "generated" | "starter-authored" | "provided" | "reference-only";

export type AnimationStateOverride = {
  glbClip?: string | null;
  bobAmplitude?: number;
  cyclesPerSecond?: number;
  loop?: boolean;
  visible?: boolean;
  trailEffect?: string;
  impactEffect?: string;
  flash?: boolean;
};

export type AnimationProfileInput = {
  id: string;
  displayName: string;
  assetId: string;
  assetSource: AnimationAssetSource;
  provenanceRef: string;
  fps?: number;
  states?: Partial<Record<AnimationStateId, AnimationStateOverride>>;
};

export type AnimationStateDefinition = {
  glbClip: string | null;
  bobAmplitude: number;
  cyclesPerSecond: number;
  loop: boolean;
  visible: boolean;
  trailEffect?: string;
  impactEffect?: string;
  flash?: boolean;
};

export type AnimationProfileOutput = {
  schemaVersion: typeof ANIMATION_PROFILE_SCHEMA_VERSION;
  id: string;
  displayName: string;
  assetId: string;
  assetSource: AnimationAssetSource;
  provenanceRef: string;
  fps: number;
  states: Record<AnimationStateId, AnimationStateDefinition>;
  playbackPolicy: {
    generateOnLoad: false;
    distanceBasedUpdate: true;
    sleepWhenOffscreen: true;
    runtimeAssetReuse: true;
  };
};

const STATE_IDS: readonly AnimationStateId[] = ["idle", "walk", "run", "dash", "attack", "hurt", "dead"];

const DEFAULT_STATES: Record<AnimationStateId, AnimationStateDefinition> = {
  idle: { glbClip: null, bobAmplitude: 0.018, cyclesPerSecond: 0.65, loop: true, visible: true },
  walk: { glbClip: null, bobAmplitude: 0.045, cyclesPerSecond: 2.4, loop: true, visible: true },
  run: { glbClip: null, bobAmplitude: 0.065, cyclesPerSecond: 3.4, loop: true, visible: true },
  dash: { glbClip: null, bobAmplitude: 0.02, cyclesPerSecond: 6, loop: false, visible: true, trailEffect: "effects.arcaneTrail" },
  attack: { glbClip: null, bobAmplitude: 0.01, cyclesPerSecond: 3, loop: false, visible: true, impactEffect: "effects.runeImpact" },
  hurt: { glbClip: null, bobAmplitude: 0, cyclesPerSecond: 0, loop: false, visible: true, flash: true },
  dead: { glbClip: null, bobAmplitude: 0, cyclesPerSecond: 0, loop: false, visible: false },
};

function validIdentifier(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(value);
}

function normalizeState(state: AnimationStateId, override: AnimationStateOverride | undefined): AnimationStateDefinition {
  const base = DEFAULT_STATES[state];
  return {
    ...base,
    ...override,
    glbClip: override?.glbClip === undefined ? base.glbClip : override.glbClip,
    bobAmplitude: Number((override?.bobAmplitude ?? base.bobAmplitude).toFixed(4)),
    cyclesPerSecond: Number((override?.cyclesPerSecond ?? base.cyclesPerSecond).toFixed(3)),
  };
}

export function generateAnimationProfile(input: AnimationProfileInput): AnimationProfileOutput {
  const states = Object.fromEntries(STATE_IDS.map(state => [state, normalizeState(state, input.states?.[state])])) as Record<AnimationStateId, AnimationStateDefinition>;
  return {
    schemaVersion: ANIMATION_PROFILE_SCHEMA_VERSION,
    id: input.id,
    displayName: input.displayName,
    assetId: input.assetId,
    assetSource: input.assetSource,
    provenanceRef: input.provenanceRef,
    fps: input.fps ?? 12,
    states,
    playbackPolicy: {
      generateOnLoad: false,
      distanceBasedUpdate: true,
      sleepWhenOffscreen: true,
      runtimeAssetReuse: true,
    },
  };
}

export function validateAnimationProfileInput(input: AnimationProfileInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (!validIdentifier(input.id)) issues.push("animation profile id is invalid");
  if (input.displayName.trim().length < 3 || input.displayName.trim().length > 120) issues.push("animation profile displayName must be 3–120 characters");
  if (!validIdentifier(input.assetId)) issues.push("animation profile assetId is invalid");
  if (!input.provenanceRef.trim() || input.provenanceRef.length > 512) issues.push("animation profile provenanceRef is required");
  const fps = input.fps ?? 12;
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) issues.push("animation profile fps must be an integer from 1 to 60");
  if (input.assetSource === "reference-only" && !input.provenanceRef.trim()) issues.push("reference-only animation needs provenanceRef");
  return { valid: issues.length === 0, issues };
}

export function validateAnimationProfileOutput(output: AnimationProfileOutput, input?: AnimationProfileInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (output.schemaVersion !== ANIMATION_PROFILE_SCHEMA_VERSION) issues.push("unsupported animation profile schema");
  if (input && output.id !== input.id) issues.push("animation profile id does not match input");
  if (!Number.isInteger(output.fps) || output.fps < 1 || output.fps > 60) issues.push("animation profile fps is invalid");
  for (const state of STATE_IDS) {
    const definition = output.states[state];
    if (!definition) {
      issues.push(`missing animation state: ${state}`);
      continue;
    }
    if (definition.bobAmplitude < 0 || definition.bobAmplitude > 0.2) issues.push(`bob amplitude out of range: ${state}`);
    if (definition.cyclesPerSecond < 0 || definition.cyclesPerSecond > 12) issues.push(`cycle rate out of range: ${state}`);
    if (state === "dead" && (definition.visible || definition.loop)) issues.push("dead state must be hidden and non-looping");
    if ((state === "dash" || state === "attack" || state === "hurt" || state === "dead") && definition.loop) issues.push(`${state} state must be non-looping`);
  }
  return { valid: issues.length === 0, issues };
}

export function animationProfileAssetRefs(input: AnimationProfileInput): GeneratorAssetRef[] {
  return [{ assetId: input.assetId, kind: "animation", source: input.assetSource, provenanceRef: input.provenanceRef }];
}

export const animationProfileGeneratorPlugin: GeneratorPlugin<AnimationProfileInput, AnimationProfileOutput> = {
  id: "animation.profile",
  version: ANIMATION_PROFILE_VERSION,
  kind: "animation",
  generate: input => generateAnimationProfile(input),
  validate: (output, input) => {
    const inputValidation = validateAnimationProfileInput(input);
    const outputValidation = validateAnimationProfileOutput(output, input);
    return { valid: inputValidation.valid && outputValidation.valid, issues: [...inputValidation.issues, ...outputValidation.issues] };
  },
  preview: output => ({ recordCount: STATE_IDS.length, ids: [output.id, ...STATE_IDS.map(state => `${output.id}.${state}`)], assetRefs: [{ assetId: output.assetId, kind: "animation", source: output.assetSource, provenanceRef: output.provenanceRef }] }),
};

export function createAnimationProfileRegistry() {
  return new CommonGeneratorRegistry().register(animationProfileGeneratorPlugin);
}
