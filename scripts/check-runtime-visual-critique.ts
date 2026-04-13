import assert from "node:assert/strict";

import { canonicalizeVisualCritiqueReport } from "./lib/runtime-visual-critique.mjs";

const scarfExecution: any = {
  requestedNoun: "小围巾",
  familyResolutionSource: "known-family",
  designArchetype: "soft-accessory",
  runtimeShapeClass: "scarf",
  runtimeDesignContract: {
    contractId: "host-coupled-chest-wrap/v1",
    capabilityClass: "host-coupled-chest-wrap",
    requiredCapabilities: ["host-coupled", "chest-wrap"],
    primaryReadTarget: "scarf",
    requiredVisibleParts: ["wrap-band", "knot", "tail-left", "tail-right"],
    hostNoGoZones: ["eye-band", "face-core", "nose-zone"],
  },
};

const scarfGeometryRecipe: any = {
  runtimeShapeClass: "scarf",
  criticalParts: ["wrap-band", "knot", "tail-left", "tail-right"],
  readOrderTargets: ["wrap-band", "knot", "tail-left"],
  structuralBlueprint: {
    readOrderTargets: ["wrap-band", "knot", "tail-left"],
    outlineProjectionVariantId: "scarf-knot-compact",
    profileVariantId: "scarf-knot-compact",
  },
};

function main() {
  const stalledCompactReview = canonicalizeVisualCritiqueReport(
    scarfExecution,
    scarfGeometryRecipe,
    {
      requestedNoun: "小围巾",
      firstReadResult: "小围巾",
      firstReadPart: "wrap-band",
      dominantSpanOwner: "wrap-band",
      renderNounFidelity: 0.72,
      criticalPartsVisible: 1,
      silhouetteReadability: 0.08,
      lookalikeRisk: 0.31,
      cohesionScore: 0.9,
      dominantFailureMode: "minor-polish",
      dominantFailureLayer: "render-readability",
      faceIntrusionSeverity: 0.15,
      partAttachmentCredibility: 0.76,
      flattenedPartIds: ["wrap-band", "knot"],
      detachedPartIds: ["tail-fold-left", "tail-fold-right"],
      hostIntrusionZones: [],
      visualVeto: false,
      visualVetoReason: "主轮廓或前表面对比不足，当前首读不可接受。",
      nextPassPriority: "final-review",
      summary: "compact scarf 仍然是 chest bar first read。",
    },
    true,
  );

  assert.equal(
    stalledCompactReview.nextPassPriority,
    "render-driven-rebuild",
    "visual critique should not preserve final-review when render-readability failures are still active",
  );

  const stableReview = canonicalizeVisualCritiqueReport(
    scarfExecution,
    scarfGeometryRecipe,
    {
      requestedNoun: "小围巾",
      firstReadResult: "小围巾",
      firstReadPart: "wrap-band",
      dominantSpanOwner: "wrap-band",
      renderNounFidelity: 0.96,
      criticalPartsVisible: 1,
      silhouetteReadability: 0.92,
      lookalikeRisk: 0.08,
      cohesionScore: 0.96,
      dominantFailureMode: "none",
      faceIntrusionSeverity: 0,
      partAttachmentCredibility: 0.98,
      flattenedPartIds: [],
      detachedPartIds: [],
      hostIntrusionZones: [],
      visualVeto: false,
      nextPassPriority: "final-review",
      summary: "compact scarf 已经稳定可读。",
    },
    true,
  );

  assert.equal(
    stableReview.nextPassPriority,
    "final-review",
    "visual critique should keep final-review when no active failure signal remains",
  );

  console.log("[runtime-visual-critique] all cases passed");
}

main();
