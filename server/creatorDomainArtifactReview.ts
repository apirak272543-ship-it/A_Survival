export type CreatorArtifactReviewStatus = "draft" | "approved" | "rejected";
export type CreatorArtifactReviewAction = "approve" | "reject" | "reopen";

export type CreatorArtifactReviewTransition = {
  from: CreatorArtifactReviewStatus;
  action: CreatorArtifactReviewAction;
  to: CreatorArtifactReviewStatus;
  note: string | null;
};

export function transitionCreatorDomainArtifactReview(input: {
  status: CreatorArtifactReviewStatus;
  action: CreatorArtifactReviewAction;
  note?: string;
}): CreatorArtifactReviewTransition {
  const note = input.note?.trim() || null;
  if (input.action === "approve" && input.status === "draft") return { from: input.status, action: input.action, to: "approved", note };
  if (input.action === "reject" && input.status === "draft") {
    if (!note) throw new Error("Rejecting an artifact requires a review note");
    return { from: input.status, action: input.action, to: "rejected", note };
  }
  if (input.action === "reopen" && input.status === "rejected") {
    if (!note) throw new Error("Reopening an artifact requires a review note");
    return { from: input.status, action: input.action, to: "draft", note };
  }
  throw new Error(`Invalid artifact review transition: ${input.status} -> ${input.action}`);
}
