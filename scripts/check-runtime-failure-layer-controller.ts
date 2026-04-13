import fs from "node:fs/promises";
import {
  buildRuntimeFailureLayerController,
  countConsecutiveExecutionFailureLayerSnapshots,
  detectExecutionSnapshotPlateau,
} from "./lib/runtime-stop-diagnostics.mjs";
import {
  buildCapabilityEscalationBootstrapRepairActions,
  getCapabilityPlacementRecoveryOffset,
  getCapabilityRootEmbedStrength,
  getPreferredRecoveryVariantId as getPreferredRecoveryVariantIdFromLib,
  shouldSwitchBlueprintVariant as shouldSwitchBlueprintVariantFromLib,
} from "./lib/hard-surface-runtime-policy.mjs";
import {
  selectPreferredExecutionSnapshots,
  shouldPreferExecutionSnapshot,
} from "./lib/runtime-best-attempt.mjs";

type Snapshot = {
  execution: {
    executionId: string;
    variantId?: string;
  };
  executionId?: string;
  passIndex: number;
  usedVariantId?: string;
  qualityAccepted?: boolean;
  createdNames?: string[];
  geometryRecipe?: {
    capabilityRerouteId?: string;
  };
  qualityReport: {
    hardGatePassed?: boolean;
    qualityScore?: number;
    renderCritiqueAvailable?: boolean;
    dominantFailureModes?: string[];
    controllerFailureLayer?: string;
    controllerDirective?: string;
    visualCritiqueReport?: {
      dominantFailureLayer?: string;
      dominantFailureModes?: string[];
      controllerFailureLayer?: string;
      nounFidelity?: number;
    };
    qualityMetrics?: {
      criticalPartsPresent?: number;
      visualReadability?: number;
      silhouetteStrength?: number;
      scaleFit?: number;
      hostComposition?: number;
    };
  };
};

function snapshot(
  executionId: string,
  passIndex: number,
  overrides: Partial<Snapshot>,
): Snapshot {
  return {
    execution: {
      executionId,
    },
    passIndex,
    createdNames: [],
    qualityReport: {
      hardGatePassed: false,
      qualityScore: 0,
      renderCritiqueAvailable: false,
      dominantFailureModes: [],
      qualityMetrics: {
        criticalPartsPresent: 0,
      },
    },
    ...overrides,
  };
}

async function main() {
  const failures: string[] = [];

  const silhouetteController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "silhouette",
    dominantFailureModes: ["silhouette-not-readable"],
    repeatedFailureCount: 2,
  });
  if (silhouetteController.failureLayer !== "silhouette") {
    failures.push(
      `expected silhouette controller layer=silhouette, got ${silhouetteController.failureLayer}`,
    );
  }
  if (silhouetteController.rebuildDirective !== "rebuild-geometry-contract") {
    failures.push(
      `expected repeated silhouette failure to rebuild geometry contract, got ${silhouetteController.rebuildDirective}`,
    );
  }

  const hostFitController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "anchor-projection",
    dominantFailureModes: ["face-intrusion", "host-scale-misaligned"],
    repeatedFailureCount: 2,
  });
  if (hostFitController.failureLayer !== "host-fit") {
    failures.push(
      `expected anchor-projection to normalize to host-fit, got ${hostFitController.failureLayer}`,
    );
  }
  if (hostFitController.rebuildDirective !== "re-run-host-fit") {
    failures.push(
      `expected repeated host-fit failure to re-run host-fit, got ${hostFitController.rebuildDirective}`,
    );
  }

  const renderReadabilitySilhouetteController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "render-readability",
    dominantFailureModes: [
      "noun-fidelity-too-low",
      "silhouette-not-readable",
      "host-scale-misaligned",
      "host-composition-poor",
    ],
    repeatedFailureCount: 0,
  });
  if (renderReadabilitySilhouetteController.failureLayer !== "silhouette") {
    failures.push(
      `expected render-readability silhouette stall to normalize to silhouette, got ${renderReadabilitySilhouetteController.failureLayer}`,
    );
  }
  if (renderReadabilitySilhouetteController.rebuildDirective !== "micro-tune") {
    failures.push(
      `expected first silhouette readability stall to stay on micro-tune before repeats, got ${renderReadabilitySilhouetteController.rebuildDirective}`,
    );
  }

  const repeatedRenderReadabilitySilhouetteController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "render-readability",
    dominantFailureModes: [
      "noun-fidelity-too-low",
      "silhouette-not-readable",
      "host-scale-misaligned",
      "host-composition-poor",
    ],
    repeatedFailureCount: 2,
  });
  if (repeatedRenderReadabilitySilhouetteController.failureLayer !== "silhouette") {
    failures.push(
      `expected repeated render-readability silhouette stall to stay on silhouette, got ${repeatedRenderReadabilitySilhouetteController.failureLayer}`,
    );
  }
  if (
    repeatedRenderReadabilitySilhouetteController.rebuildDirective !==
    "rebuild-geometry-contract"
  ) {
    failures.push(
      `expected repeated render-readability silhouette stall to rebuild geometry contract, got ${repeatedRenderReadabilitySilhouetteController.rebuildDirective}`,
    );
  }

  const stagnationController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "composition",
    dominantFailureModes: ["visual-veto", "host-composition-poor"],
    repeatedFailureCount: 3,
    plateauReason: "same failure layer repeated without improving the visible read",
  });
  if (stagnationController.failureLayer !== "stagnation") {
    failures.push(
      `expected repeated plateau failure to normalize to stagnation, got ${stagnationController.failureLayer}`,
    );
  }
  if (stagnationController.rebuildDirective !== "escalate-capability") {
    failures.push(
      `expected stagnation to escalate capability, got ${stagnationController.rebuildDirective}`,
    );
  }

  const repeatedLayerHistory = countConsecutiveExecutionFailureLayerSnapshots({
    executionId: "scarf-1",
    failureLayer: "host-fit",
    snapshots: [
      snapshot("camera-1", 2, {
        qualityReport: {
          dominantFailureModes: ["silhouette-not-readable"],
          visualCritiqueReport: {
            dominantFailureLayer: "silhouette",
          },
        },
      }),
      snapshot("scarf-1", 3, {
        qualityReport: {
          dominantFailureModes: ["face-intrusion", "host-scale-misaligned"],
          visualCritiqueReport: {
            dominantFailureLayer: "anchor-projection",
          },
        },
      }),
      snapshot("scarf-1", 4, {
        qualityReport: {
          dominantFailureModes: ["face-intrusion", "host-composition-poor"],
          visualCritiqueReport: {
            dominantFailureLayer: "host-fit",
          },
        },
      }),
      snapshot("scarf-1", 5, {
        qualityReport: {
          dominantFailureModes: ["host-scale-misaligned", "visual-veto"],
          visualCritiqueReport: {
            dominantFailureLayer: "anchor-projection",
          },
        },
      }),
    ],
  });
  if (repeatedLayerHistory !== 3) {
    failures.push(
      `expected repeated host-fit history to count trailing same-layer passes, got ${repeatedLayerHistory}`,
    );
  }

  const brokenHistoryReset = countConsecutiveExecutionFailureLayerSnapshots({
    executionId: "scarf-1",
    failureLayer: "host-fit",
    snapshots: [
      snapshot("scarf-1", 3, {
        qualityReport: {
          dominantFailureModes: ["face-intrusion"],
          visualCritiqueReport: {
            dominantFailureLayer: "host-fit",
          },
        },
      }),
      snapshot("scarf-1", 4, {
        qualityReport: {
          dominantFailureModes: ["detached-tail", "assembly-failed"],
          visualCritiqueReport: {
            dominantFailureLayer: "assembly",
          },
        },
      }),
    ],
  });
  if (brokenHistoryReset !== 0) {
    failures.push(
      `expected repeated failure history to reset after a different layer, got ${brokenHistoryReset}`,
    );
  }

  const plateauSnapshots = [
    snapshot("scarf-plateau", 5, {
      executionId: "scarf-plateau",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-plateau",
        variantId: "scarf-knot-compact",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.81,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.63,
        },
        qualityMetrics: {
          visualReadability: 0.48,
          silhouetteStrength: 0.54,
          scaleFit: 0.45,
          hostComposition: 0.61,
        },
      },
    }),
    snapshot("scarf-plateau", 6, {
      executionId: "scarf-plateau",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-plateau",
        variantId: "scarf-knot-compact",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.81,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.64,
        },
        qualityMetrics: {
          visualReadability: 0.49,
          silhouetteStrength: 0.55,
          scaleFit: 0.45,
          hostComposition: 0.61,
        },
      },
    }),
    snapshot("scarf-plateau", 7, {
      executionId: "scarf-plateau",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-plateau",
        variantId: "scarf-knot-compact",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.82,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.64,
        },
        qualityMetrics: {
          visualReadability: 0.49,
          silhouetteStrength: 0.55,
          scaleFit: 0.45,
          hostComposition: 0.62,
        },
      },
    }),
  ];
  const plateauCurrentSnapshot = snapshot("scarf-plateau", 8, {
    executionId: "scarf-plateau",
    usedVariantId: "scarf-knot-compact",
    execution: {
      executionId: "scarf-plateau",
      variantId: "scarf-knot-compact",
    },
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.82,
      renderCritiqueAvailable: true,
      dominantFailureModes: [
        "minor-polish",
        "silhouette-not-readable",
        "host-scale-misaligned",
      ],
      visualCritiqueReport: {
        dominantFailureLayer: "silhouette",
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        nounFidelity: 0.63,
      },
      qualityMetrics: {
        visualReadability: 0.49,
        silhouetteStrength: 0.55,
        scaleFit: 0.45,
        hostComposition: 0.61,
      },
    },
  });
  const plateauEvidence = detectExecutionSnapshotPlateau({
    executionId: "scarf-plateau",
    currentVariantId: "scarf-knot-compact",
    failureLayer: "silhouette",
    snapshots: plateauSnapshots,
    currentSnapshot: plateauCurrentSnapshot,
  });
  if (!plateauEvidence.stagnationDetected) {
    failures.push("expected stable same-variant silhouette window to trigger plateau detection");
  }
  if (plateauEvidence.stableSnapshotCount !== 4) {
    failures.push(
      `expected plateau window to include current snapshot and span 4 passes, got ${plateauEvidence.stableSnapshotCount}`,
    );
  }
  const repeatedPlateauCount = countConsecutiveExecutionFailureLayerSnapshots({
    executionId: "scarf-plateau",
    failureLayer: "silhouette",
    currentVariantId: "scarf-knot-compact",
    snapshots: plateauSnapshots,
    currentSnapshot: plateauCurrentSnapshot,
  });
  if (repeatedPlateauCount !== 4) {
    failures.push(
      `expected repeated silhouette history to include current snapshot, got ${repeatedPlateauCount}`,
    );
  }
  const plateauController = buildRuntimeFailureLayerController({
    dominantFailureLayer: "silhouette",
    dominantFailureModes: [
      "minor-polish",
      "silhouette-not-readable",
      "host-scale-misaligned",
    ],
    repeatedFailureCount: repeatedPlateauCount,
    plateauReason: plateauEvidence.plateauReason,
  });
  if (plateauController.failureLayer !== "stagnation") {
    failures.push(
      `expected plateau-backed controller to normalize to stagnation, got ${plateauController.failureLayer}`,
    );
  }
  if (plateauController.rebuildDirective !== "escalate-capability") {
    failures.push(
      `expected plateau-backed controller to escalate capability, got ${plateauController.rebuildDirective}`,
    );
  }

  const reroutePlateauSnapshots = [
    snapshot("scarf-reroute", 8, {
      executionId: "scarf-reroute",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-reroute",
        variantId: "scarf-knot-compact",
      },
      geometryRecipe: {
        capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.85,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.9,
        },
        qualityMetrics: {
          visualReadability: 0.63,
          silhouetteStrength: 0.65,
          scaleFit: 0.46,
          hostComposition: 0.81,
        },
      },
    }),
    snapshot("scarf-reroute", 9, {
      executionId: "scarf-reroute",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-reroute",
        variantId: "scarf-knot-compact",
      },
      geometryRecipe: {
        capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.85,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.91,
        },
        qualityMetrics: {
          visualReadability: 0.66,
          silhouetteStrength: 0.68,
          scaleFit: 0.49,
          hostComposition: 0.82,
        },
      },
    }),
    snapshot("scarf-reroute", 10, {
      executionId: "scarf-reroute",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-reroute",
        variantId: "scarf-knot-compact",
      },
      geometryRecipe: {
        capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.85,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.9,
        },
        qualityMetrics: {
          visualReadability: 0.63,
          silhouetteStrength: 0.65,
          scaleFit: 0.46,
          hostComposition: 0.81,
        },
      },
    }),
    snapshot("scarf-reroute", 11, {
      executionId: "scarf-reroute",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-reroute",
        variantId: "scarf-knot-compact",
      },
      geometryRecipe: {
        capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.85,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.91,
        },
        qualityMetrics: {
          visualReadability: 0.66,
          silhouetteStrength: 0.68,
          scaleFit: 0.49,
          hostComposition: 0.82,
        },
      },
    }),
    snapshot("scarf-reroute", 12, {
      executionId: "scarf-reroute",
      usedVariantId: "scarf-knot-compact",
      execution: {
        executionId: "scarf-reroute",
        variantId: "scarf-knot-compact",
      },
      geometryRecipe: {
        capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
      },
      qualityReport: {
        hardGatePassed: true,
        qualityScore: 0.85,
        renderCritiqueAvailable: true,
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        visualCritiqueReport: {
          dominantFailureLayer: "silhouette",
          dominantFailureModes: [
            "minor-polish",
            "silhouette-not-readable",
            "host-scale-misaligned",
          ],
          nounFidelity: 0.9,
        },
        qualityMetrics: {
          visualReadability: 0.63,
          silhouetteStrength: 0.65,
          scaleFit: 0.46,
          hostComposition: 0.81,
        },
      },
    }),
  ];
  const reroutePlateauCurrentSnapshot = snapshot("scarf-reroute", 13, {
    executionId: "scarf-reroute",
    usedVariantId: "scarf-knot-compact",
    execution: {
      executionId: "scarf-reroute",
      variantId: "scarf-knot-compact",
    },
    geometryRecipe: {
      capabilityRerouteId: "chest-wrap-compact-knot-tail-front",
    },
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.85,
      renderCritiqueAvailable: true,
      dominantFailureModes: [
        "minor-polish",
        "silhouette-not-readable",
        "host-scale-misaligned",
      ],
      visualCritiqueReport: {
        dominantFailureLayer: "silhouette",
        dominantFailureModes: [
          "minor-polish",
          "silhouette-not-readable",
          "host-scale-misaligned",
        ],
        nounFidelity: 0.91,
      },
      qualityMetrics: {
        visualReadability: 0.66,
        silhouetteStrength: 0.68,
        scaleFit: 0.49,
        hostComposition: 0.82,
      },
    },
  });
  const reroutePlateauEvidence = detectExecutionSnapshotPlateau({
    executionId: "scarf-reroute",
    currentVariantId: "scarf-knot-compact",
    failureLayer: "silhouette",
    snapshots: reroutePlateauSnapshots,
    currentSnapshot: reroutePlateauCurrentSnapshot,
  });
  if (!reroutePlateauEvidence.stagnationDetected) {
    failures.push(
      "expected capability reroute steady-state oscillation to trigger plateau detection",
    );
  }
  if (
    typeof reroutePlateauEvidence.plateauReason !== "string" ||
    !reroutePlateauEvidence.plateauReason.includes("capability reroute")
  ) {
    failures.push(
      `expected reroute plateau reason to mention capability reroute, got ${reroutePlateauEvidence.plateauReason ?? "none"}`,
    );
  }

  const chestWrapExecution = {
    runtimeShapeClass: "scarf",
    variantId: "scarf-wrap-forward",
  };
  const chestWrapGeometryRecipe = {
    runtimeShapeClass: "scarf",
    variantId: "scarf-wrap-forward",
    variantCandidates: [
      { variantId: "scarf-wrap-forward" },
      { variantId: "scarf-knot-compact" },
    ],
    runtimeDesignContract: {
      capabilityClass: "host-coupled-chest-wrap",
      requiredCapabilities: ["host-coupled", "chest-wrap"],
    },
  };
  const chestWrapQualityReport = {
    visualCritiqueReport: {
      dominantFailureLayer: "attachment-cohesion",
      controllerFailureLayer: "stagnation",
      controllerDirective: "escalate-capability",
      stagnationDetected: true,
      repeatedFailureCount: 48,
      faceIntrusionSeverity: 0.33,
      visualVeto: true,
      canonicalDetachedPartIds: ["tail-left", "tail-right"],
      dominantFailureModes: [
        "host-composition-poor",
        "face-intrusion-too-high",
        "visual-veto",
      ],
    },
  };

  if (
    !shouldSwitchBlueprintVariantFromLib(
      chestWrapExecution,
      chestWrapQualityReport,
      chestWrapGeometryRecipe,
      6,
    )
  ) {
    failures.push(
      "expected host-coupled chest-wrap stagnation to force blueprint variant recovery",
    );
  }

  const chestWrapRecoveryVariant = getPreferredRecoveryVariantIdFromLib(
    chestWrapExecution,
    chestWrapGeometryRecipe,
    "scarf-wrap-forward",
    chestWrapQualityReport,
  );
  if (chestWrapRecoveryVariant !== "scarf-knot-compact") {
    failures.push(
      `expected host-coupled chest-wrap recovery variant=scarf-knot-compact, got ${chestWrapRecoveryVariant}`,
    );
  }

  const chestWrapRootEmbedStrength = getCapabilityRootEmbedStrength(
    chestWrapExecution,
    chestWrapGeometryRecipe,
    "tail-left",
    "knot",
    "wrap-band",
    [
      {
        actionType: "re-parent-part",
        targetPartIds: ["tail-left", "tail-right"],
        intensity: 0.82,
      },
      {
        actionType: "tighten-cohesion",
        targetPartIds: ["tail-left", "tail-right"],
        intensity: 0.76,
      },
      {
        actionType: "rebuild-from-root",
        intensity: 0.9,
      },
    ],
  );
  if (chestWrapRootEmbedStrength < 0.3) {
    failures.push(
      `expected host-coupled chest-wrap detached tail to get strong root embed, got ${chestWrapRootEmbedStrength}`,
    );
  }

  const nonChestWrapRootEmbedStrength = getCapabilityRootEmbedStrength(
    { runtimeShapeClass: "generic-ornament" },
    { runtimeShapeClass: "generic-ornament" },
    "tail-left",
    "knot",
    "wrap-band",
    [
      {
        actionType: "re-parent-part",
        targetPartIds: ["tail-left"],
        intensity: 0.82,
      },
    ],
  );
  if (nonChestWrapRootEmbedStrength !== 0) {
    failures.push(
      `expected non chest-wrap execution to keep root embed disabled, got ${nonChestWrapRootEmbedStrength}`,
    );
  }

  const chestWrapPlacementRecoveryOffset = getCapabilityPlacementRecoveryOffset(
    {
      ...chestWrapExecution,
      variantId: "scarf-knot-compact",
    },
    {
      ...chestWrapGeometryRecipe,
      variantId: "scarf-knot-compact",
    },
    [
      {
        actionType: "re-anchor",
        intensity: 0.82,
      },
      {
        actionType: "rebuild-from-root",
        intensity: 0.9,
      },
      {
        actionType: "re-parent-part",
        targetPartIds: ["tail-left", "tail-right"],
        intensity: 0.86,
      },
    ],
  );
  if (!(Array.isArray(chestWrapPlacementRecoveryOffset) && chestWrapPlacementRecoveryOffset[1] < -0.004)) {
    failures.push(
      `expected host-coupled chest-wrap recovery offset to push the accessory down on the chest, got ${JSON.stringify(chestWrapPlacementRecoveryOffset)}`,
    );
  }

  const chestWrapCapabilityBootstrap =
    buildCapabilityEscalationBootstrapRepairActions(
      {
        ...chestWrapExecution,
        variantId: "scarf-knot-compact",
      },
      {
        ...chestWrapGeometryRecipe,
        variantId: "scarf-knot-compact",
      },
      {
        visualCritiqueReport: {
          controllerFailureLayer: "stagnation",
          controllerDirective: "escalate-capability",
          stagnationDetected: true,
          canonicalFlattenedPartIds: ["wrap-band"],
          canonicalDetachedPartIds: [],
        },
      },
      "scarf-knot-compact",
    );
  if (chestWrapCapabilityBootstrap.length < 5) {
    failures.push(
      `expected chest-wrap stagnation bootstrap to emit a capability repair bundle, got ${chestWrapCapabilityBootstrap.length} actions`,
    );
  }
  if (
    !chestWrapCapabilityBootstrap.some(
      (action) => action.actionType === "rebuild-from-root" && action.intensity >= 0.9,
    )
  ) {
    failures.push(
      "expected chest-wrap stagnation bootstrap to force a strong rebuild-from-root action",
    );
  }
  if (
    !chestWrapCapabilityBootstrap.some(
      (action) =>
        action.actionType === "promote-critical-part" &&
        Array.isArray(action.targetPartIds) &&
        action.targetPartIds.includes("knot"),
    )
  ) {
    failures.push(
      "expected chest-wrap stagnation bootstrap to promote knot readability targets",
    );
  }
  if (
    !chestWrapCapabilityBootstrap.some(
      (action) =>
        action.actionType === "reroute-trait-profile" &&
        action.targetTraitProfile === "chest-wrap-compact-knot-tail-front",
    )
  ) {
    failures.push(
      "expected chest-wrap stagnation bootstrap to emit a compact trait reroute signal",
    );
  }

  const nonChestWrapPlacementRecoveryOffset = getCapabilityPlacementRecoveryOffset(
    { runtimeShapeClass: "generic-ornament" },
    { runtimeShapeClass: "generic-ornament" },
    [
      {
        actionType: "re-anchor",
        intensity: 0.82,
      },
    ],
  );
  if (JSON.stringify(nonChestWrapPlacementRecoveryOffset) !== JSON.stringify([0, 0, 0])) {
    failures.push(
      `expected non chest-wrap placement recovery offset to stay neutral, got ${JSON.stringify(nonChestWrapPlacementRecoveryOffset)}`,
    );
  }

  const earlierStable = snapshot("scarf-1", 6, {
    createdNames: ["wrap-band", "knot", "tail-left", "tail-right"],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.63,
      renderCritiqueAvailable: true,
      dominantFailureModes: ["visual-veto"],
      controllerFailureLayer: "silhouette",
      controllerDirective: "rebuild-geometry-contract",
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
    },
  });
  const laterStagnated = snapshot("scarf-1", 8, {
    createdNames: ["wrap-band", "knot", "tail-left", "tail-right"],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.66,
      renderCritiqueAvailable: true,
      dominantFailureModes: ["visual-veto", "quality-plateau"],
      controllerFailureLayer: "stagnation",
      controllerDirective: "escalate-capability",
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
    },
  });

  if (!shouldPreferExecutionSnapshot(earlierStable, laterStagnated)) {
    failures.push(
      "shouldPreferExecutionSnapshot should keep an earlier stable scaffold over a later stagnated snapshot",
    );
  }

  const laterRebuildRecovery = snapshot("camera-1", 7, {
    createdNames: ["device-body", "camera-lens", "camera-top"],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.7,
      renderCritiqueAvailable: true,
      dominantFailureModes: [],
      controllerFailureLayer: "silhouette",
      controllerDirective: "rebuild-geometry-contract",
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
    },
  });
  const earlierWeakScaffold = snapshot("camera-1", 4, {
    createdNames: ["device-body", "camera-top"],
    qualityReport: {
      hardGatePassed: false,
      qualityScore: 0.49,
      renderCritiqueAvailable: true,
      dominantFailureModes: ["critical-parts-underweight"],
      controllerFailureLayer: "topology",
      controllerDirective: "rebuild-geometry-contract",
      qualityMetrics: {
        criticalPartsPresent: 0.58,
      },
    },
  });

  if (!shouldPreferExecutionSnapshot(laterRebuildRecovery, earlierWeakScaffold)) {
    failures.push(
      "shouldPreferExecutionSnapshot should upgrade to a later rebuild recovery when critical parts and hard-gate quality improve",
    );
  }

  const preferred = selectPreferredExecutionSnapshots([
    earlierStable,
    laterStagnated,
    earlierWeakScaffold,
    laterRebuildRecovery,
  ]);

  if (preferred.get("scarf-1") !== earlierStable) {
    failures.push(
      "selectPreferredExecutionSnapshots did not keep the earlier stable snapshot over stagnation",
    );
  }

  if (preferred.get("camera-1") !== laterRebuildRecovery) {
    failures.push(
      "selectPreferredExecutionSnapshots did not upgrade to the later rebuild recovery snapshot",
    );
  }

  const workerSource = await fs.readFile(
    new URL("./blender-mcp-worker.mjs", import.meta.url),
    "utf8",
  );
  if (!workerSource.includes("buildRuntimeFailureLayerController(")) {
    failures.push("worker is not consuming buildRuntimeFailureLayerController");
  }
  if (!workerSource.includes("applyFailureLayerControllerEscalation(")) {
    failures.push("worker is not escalating repair actions from the failure-layer controller");
  }
  if (!workerSource.includes("countConsecutiveExecutionFailureLayerSnapshots(")) {
    failures.push("worker is not deriving repeated failure counts from snapshot history");
  }
  if (!workerSource.includes("detectExecutionSnapshotPlateau(")) {
    failures.push("worker is not deriving plateau evidence from the current execution snapshot");
  }
  if (!workerSource.includes("const diagnosticPassResult = passResult;")) {
    failures.push("worker is not keeping terminal diagnostics separate from restored export snapshots");
  }
  if (!workerSource.includes("dominantRuntimeController?.plateauReason")) {
    failures.push("worker is not propagating plateauReason into final stop diagnostics");
  }
  if (!workerSource.includes("buildCapabilityEscalationBootstrapRepairActions(")) {
    failures.push("worker is not invoking capability reroute bootstrap after stagnation");
  }
  if (!workerSource.includes("capabilityTraitRerouteStateByExecutionId")) {
    failures.push("worker is not persisting capability trait reroute state across passes");
  }
  if (!workerSource.includes("capabilityRerouteId: activeCapabilityRerouteId")) {
    failures.push("worker is not feeding the persisted capability trait reroute state back into generation");
  }

  if (failures.length > 0) {
    console.error("[runtime-failure-layer-controller] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[runtime-failure-layer-controller] all cases passed");
}

void main();
