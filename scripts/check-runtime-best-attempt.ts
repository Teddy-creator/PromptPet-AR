import {
  selectPreferredExecutionSnapshots,
  shouldPreferExecutionSnapshot,
} from "./lib/runtime-best-attempt.mjs";

type Snapshot = {
  execution: {
    executionId: string;
  };
  passIndex: number;
  qualityAccepted?: boolean;
  createdNames?: string[];
  qualityReport: {
    hardGatePassed?: boolean;
    qualityScore?: number;
    renderCritiqueAvailable?: boolean;
    visualAcceptanceGatePassed?: boolean;
    dominantFailureModes?: string[];
    controllerFailureLayer?: string;
    controllerDirective?: string;
    qualityMetrics?: {
      criticalPartsPresent?: number;
    };
    visualCritiqueReport?: {
      renderNounFidelity?: number;
      nounFidelity?: number;
      silhouetteReadability?: number;
      visualAcceptanceGatePassed?: boolean;
      outlineProjectionVariantId?: string;
      finalReadOrder?: string[];
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
      visualAcceptanceGatePassed: false,
      dominantFailureModes: [],
      controllerFailureLayer: undefined,
      controllerDirective: undefined,
      qualityMetrics: {
        criticalPartsPresent: 0,
      },
      visualCritiqueReport: undefined,
    },
    ...overrides,
  };
}

function main() {
  const failures: string[] = [];

  const earlyComplete = snapshot("flower-1", 6, {
    createdNames: [
      "flower_core",
      "flower_petal_left",
      "flower_petal_right",
      "flower_petal_top",
      "flower_petal_bottom",
      "flower_petal_top_left",
      "flower_petal_top_right",
    ],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.63,
      renderCritiqueAvailable: true,
      dominantFailureModes: ["visual-veto"],
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
    },
  });
  const lateTimeoutRegression = snapshot("flower-1", 9, {
    createdNames: ["flower_core", "flower_petal_top"],
    qualityReport: {
      hardGatePassed: false,
      qualityScore: 0.64,
      renderCritiqueAvailable: false,
      dominantFailureModes: ["render-critique-timeout", "critical-parts-underweight"],
      qualityMetrics: {
        criticalPartsPresent: 0.42,
      },
    },
  });

  if (!shouldPreferExecutionSnapshot(earlyComplete, lateTimeoutRegression)) {
    failures.push(
      "shouldPreferExecutionSnapshot should keep an earlier complete snapshot over a later timeout-degraded snapshot",
    );
  }

  const laterBetter = snapshot("clover-1", 8, {
    createdNames: [
      "clover_core",
      "clover_leaf_left",
      "clover_leaf_right",
      "clover_leaf_top",
      "clover_leaf_bottom",
      "clover_stem",
      "clover_ring",
    ],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.71,
      renderCritiqueAvailable: true,
      dominantFailureModes: [],
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
    },
  });
  const earlierWeaker = snapshot("clover-1", 5, {
    createdNames: ["clover_core", "clover_leaf_top", "clover_ring"],
    qualityReport: {
      hardGatePassed: false,
      qualityScore: 0.52,
      renderCritiqueAvailable: true,
      dominantFailureModes: ["critical-parts-underweight"],
      qualityMetrics: {
        criticalPartsPresent: 0.45,
      },
    },
  });

  if (!shouldPreferExecutionSnapshot(laterBetter, earlierWeaker)) {
    failures.push(
      "shouldPreferExecutionSnapshot should upgrade to a later snapshot when it clearly improves critical parts and hard-gate quality",
    );
  }

  const preferred = selectPreferredExecutionSnapshots([
    earlyComplete,
    lateTimeoutRegression,
    earlierWeaker,
    laterBetter,
  ]);

  if (preferred.get("flower-1") !== earlyComplete) {
    failures.push("selectPreferredExecutionSnapshots did not preserve the best flower snapshot");
  }

  if (preferred.get("clover-1") !== laterBetter) {
    failures.push("selectPreferredExecutionSnapshots did not preserve the best clover snapshot");
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
      "shouldPreferExecutionSnapshot should keep an earlier stable snapshot over a later stagnated snapshot",
    );
  }

  const earlierWrapForward = snapshot("scarf-mainline", 5, {
    createdNames: ["wrap-band", "knot", "tail-left", "tail-right"],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.67,
      renderCritiqueAvailable: true,
      visualAcceptanceGatePassed: true,
      dominantFailureModes: ["minor-polish", "silhouette-not-readable"],
      qualityMetrics: {
        criticalPartsPresent: 1,
      },
      visualCritiqueReport: {
        renderNounFidelity: 0.72,
        silhouetteReadability: 0.06,
        visualAcceptanceGatePassed: true,
        outlineProjectionVariantId: "scarf-wrap-forward",
        finalReadOrder: ["wrap-band", "tail-left", "tail-right"],
      },
    },
  });
  const laterCompactRecovery = snapshot("scarf-mainline", 6, {
    createdNames: ["wrap-band", "knot", "tail-left", "tail-right"],
    qualityReport: {
      hardGatePassed: true,
      qualityScore: 0.68,
      renderCritiqueAvailable: true,
      visualAcceptanceGatePassed: true,
      dominantFailureModes: ["minor-polish", "host-scale-misaligned"],
      controllerFailureLayer: "stagnation",
      controllerDirective: "escalate-capability",
      qualityMetrics: {
        criticalPartsPresent: 0.94,
      },
      visualCritiqueReport: {
        renderNounFidelity: 0.74,
        silhouetteReadability: 0.17,
        visualAcceptanceGatePassed: true,
        outlineProjectionVariantId: "scarf-knot-compact",
        finalReadOrder: ["wrap-band", "knot", "tail-left"],
      },
    },
  });

  if (!shouldPreferExecutionSnapshot(laterCompactRecovery, earlierWrapForward)) {
    failures.push(
      "shouldPreferExecutionSnapshot should preserve the later compact chest-wrap recovery when visual quality improves even if the controller has already marked the pass as stagnated",
    );
  }

  if (failures.length > 0) {
    console.error("[runtime-best-attempt] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[runtime-best-attempt] all cases passed");
}

main();
