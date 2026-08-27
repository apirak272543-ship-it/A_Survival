import { describe, expect, it } from "vitest";
import { GeneratorValidationError } from "./generators/commonGeneratorApi";
import {
  createAnimationProfileRegistry,
  generateAnimationProfile,
  validateAnimationProfileInput,
  validateAnimationProfileOutput,
  type AnimationProfileInput,
} from "./generators/animationProfileGenerator";

const validInput: AnimationProfileInput = {
  id: "survivor.default",
  displayName: "Survivor Default Motion",
  assetId: "animation.survivor.default",
  assetSource: "starter-authored",
  provenanceRef: "procedural-starter-authored",
};

describe("animation profile generator", () => {
  it("creates all gameplay states from data with reusable runtime policy", () => {
    const output = generateAnimationProfile(validInput);
    expect(Object.keys(output.states)).toEqual(["idle", "walk", "run", "dash", "attack", "hurt", "dead"]);
    expect(output.states.idle.loop).toBe(true);
    expect(output.states.attack.loop).toBe(false);
    expect(output.states.dead).toMatchObject({ visible: false, loop: false });
    expect(output.playbackPolicy).toEqual({ generateOnLoad: false, distanceBasedUpdate: true, sleepWhenOffscreen: true, runtimeAssetReuse: true });
    expect(validateAnimationProfileInput(validInput)).toEqual({ valid: true, issues: [] });
    expect(validateAnimationProfileOutput(output, validInput)).toEqual({ valid: true, issues: [] });
  });

  it("keeps asset provenance in the common generator artifact and remains deterministic", () => {
    const registry = createAnimationProfileRegistry();
    const first = registry.generate("animation.profile", validInput, { seed: "animation-seed", generatedAt: 1 });
    const second = registry.generate("animation.profile", validInput, { seed: "animation-seed", generatedAt: 99 });

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.output).toEqual(second.output);
    expect(first.assetRefs).toEqual([{ assetId: validInput.assetId, kind: "animation", source: validInput.assetSource, provenanceRef: validInput.provenanceRef }]);
    expect(registry.preview(first)).toMatchObject({ recordCount: 7 });
    expect(registry.preview(first).ids).toEqual([validInput.id, "survivor.default.idle", "survivor.default.walk", "survivor.default.run", "survivor.default.dash", "survivor.default.attack", "survivor.default.hurt", "survivor.default.dead"]);
  });

  it("rejects unsafe animation overrides before an artifact can be created", () => {
    const unsafe: AnimationProfileInput = { ...validInput, fps: 0, states: { dead: { visible: true, loop: true, bobAmplitude: 0.5 } } };
    expect(validateAnimationProfileInput(unsafe).valid).toBe(false);
    expect(validateAnimationProfileOutput(generateAnimationProfile(unsafe), unsafe).valid).toBe(false);
    expect(() => createAnimationProfileRegistry().generate("animation.profile", unsafe, { seed: "unsafe" })).toThrow(GeneratorValidationError);
  });
});
