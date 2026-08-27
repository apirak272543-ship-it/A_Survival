import { describe, expect, it } from "vitest";
import { transitionCreatorDomainArtifactReview } from "./creatorDomainArtifactReview";

describe("creator domain artifact review policy", () => {
  it("approves a draft and keeps an optional note", () => {
    expect(transitionCreatorDomainArtifactReview({ status: "draft", action: "approve", note: "ผ่าน manifest review" })).toEqual({ from: "draft", action: "approve", to: "approved", note: "ผ่าน manifest review" });
  });

  it("requires a note for reject and reopen", () => {
    expect(() => transitionCreatorDomainArtifactReview({ status: "draft", action: "reject" })).toThrow("requires a review note");
    expect(() => transitionCreatorDomainArtifactReview({ status: "rejected", action: "reopen", note: "   " })).toThrow("requires a review note");
    expect(transitionCreatorDomainArtifactReview({ status: "rejected", action: "reopen", note: "แก้ provenance แล้ว" }).to).toBe("draft");
  });

  it("does not allow approved artifacts to be silently reopened or rejected", () => {
    expect(() => transitionCreatorDomainArtifactReview({ status: "approved", action: "reopen", note: "แก้" })).toThrow("Invalid artifact review transition");
    expect(() => transitionCreatorDomainArtifactReview({ status: "approved", action: "reject", note: "แก้" })).toThrow("Invalid artifact review transition");
  });
});
