import {
  getPreferredRecoveryVariantId,
  syncPartGraphLocalOffsetsWithGeometryRecipe,
  shouldSwitchBlueprintVariant,
} from "./lib/hard-surface-runtime-policy.mjs";

type VariantRecoveryCase = {
  id: string;
  execution: Record<string, unknown>;
  geometryRecipe: Record<string, unknown>;
  currentVariantId: string;
  qualityReport: {
    visualCritiqueReport: Record<string, unknown>;
  };
  expect: string | null;
};

type VariantSwitchCase = {
  id: string;
  execution: Record<string, unknown>;
  geometryRecipe: Record<string, unknown>;
  qualityReport: {
    visualCritiqueReport: Record<string, unknown>;
  };
  passIndex: number;
  expect: boolean;
};

type GraphSyncCase = {
  id: string;
  geometryRecipe: Record<string, unknown>;
  partGraph: Record<string, unknown>;
  targetChildPartId: string;
  expectLocalOffset: [number, number, number];
};

const cases: VariantRecoveryCase[] = [
  {
    id: "flower-generic-read-falls-back-to-next-variant",
    execution: {
      family: "flower",
      runtimeShapeClass: "flower",
    },
    geometryRecipe: {
      runtimeShapeClass: "flower",
      variantCandidates: [
        { variantId: "flower-wide-petal" },
        { variantId: "flower-layered-petal" },
      ],
      parts: [
        { partId: "core", role: "flower-core" },
        { partId: "petal-left", role: "petal" },
        { partId: "petal-right", role: "petal" },
      ],
    },
    currentVariantId: "flower-wide-petal",
    qualityReport: {
      visualCritiqueReport: {
        canonicalFirstRead: "generic-unreadable",
        firstReadResult: "generic-unreadable",
        dominantFailureLayer: "attachment-cohesion",
        representationFailureKind: "host-intrusion",
        variantSwitchRecommended: true,
        faceIntrusionSeverity: 1,
      },
    },
    expect: null,
  },
  {
    id: "camera-generic-read-keeps-hard-surface-preferred-recovery",
    execution: {
      family: "camera-charm",
      runtimeShapeClass: "camera-charm",
    },
    geometryRecipe: {
      runtimeShapeClass: "camera-charm",
      parts: [
        { partId: "device-body", role: "device-body" },
        { partId: "camera-lens", role: "camera-lens" },
      ],
    },
    currentVariantId: "camera-profile-wide",
    qualityReport: {
      visualCritiqueReport: {
        canonicalFirstRead: "generic-slab",
        firstReadResult: "generic-slab",
        dominantFailureLayer: "render-readability",
      },
    },
    expect: "camera-body-lens-forward",
  },
];

const switchCases: VariantSwitchCase[] = [
  {
    id: "flower-detached-assembly-allows-variant-switch",
    execution: {
      family: "flower",
      runtimeShapeClass: "flower",
    },
    geometryRecipe: {
      runtimeShapeClass: "flower",
      variantCandidates: [
        { variantId: "flower-wide-petal" },
        { variantId: "flower-layered-petal" },
      ],
      parts: [
        { partId: "core", role: "flower-core" },
        { partId: "petal-left", role: "petal" },
        { partId: "petal-right", role: "petal" },
      ],
    },
    qualityReport: {
      visualCritiqueReport: {
        canonicalFirstRead: "小花",
        firstReadResult: "小花",
        dominantFailureLayer: "assembly",
        representationFailureKind: "detached-assembly",
        canonicalDetachedPartIds: ["petal-left", "petal-right"],
      },
    },
    passIndex: 3,
    expect: true,
  },
  {
    id: "clover-face-intrusion-allows-variant-switch",
    execution: {
      family: "clover-charm",
      runtimeShapeClass: "clover-charm",
    },
    geometryRecipe: {
      runtimeShapeClass: "clover-charm",
      variantCandidates: [
        { variantId: "clover-wide-leaf" },
        { variantId: "clover-compact-charm" },
      ],
      parts: [
        { partId: "core", role: "clover-core" },
        { partId: "leaf-left", role: "leaf" },
        { partId: "leaf-right", role: "leaf" },
      ],
    },
    qualityReport: {
      visualCritiqueReport: {
        canonicalFirstRead: "四叶草",
        firstReadResult: "四叶草",
        dominantFailureLayer: "host-fit",
        faceIntrusionSeverity: 0.62,
      },
    },
    passIndex: 4,
    expect: true,
  },
  {
    id: "camera-detached-assembly-still-prefers-structural-repair",
    execution: {
      family: "camera-charm",
      runtimeShapeClass: "camera-charm",
    },
    geometryRecipe: {
      runtimeShapeClass: "camera-charm",
      variantCandidates: [
        { variantId: "camera-profile-wide" },
        { variantId: "camera-body-lens-forward" },
      ],
      parts: [
        { partId: "device-body", role: "device-body" },
        { partId: "camera-lens", role: "camera-lens" },
      ],
    },
    qualityReport: {
      visualCritiqueReport: {
        canonicalFirstRead: "相机",
        firstReadResult: "相机",
        dominantFailureLayer: "assembly",
        representationFailureKind: "detached-assembly",
        attachmentFailureKind: "free-hang",
      },
    },
    passIndex: 3,
    expect: false,
  },
];

const graphSyncCases: GraphSyncCase[] = [
  {
    id: "flower-layered-variant-syncs-edge-local-offsets",
    geometryRecipe: {
      runtimeShapeClass: "flower",
      parts: [
        { partId: "core", offset: [0, 0, 0.002] },
        { partId: "petal-left", offset: [-0.014, 0, 0.003] },
        { partId: "petal-right", offset: [0.014, 0, 0.003] },
      ],
    },
    partGraph: {
      rootPartId: "core",
      edges: [
        {
          parentPartId: "core",
          childPartId: "petal-left",
          localOffset: [-0.024, 0, 0.002],
        },
      ],
    },
    targetChildPartId: "petal-left",
    expectLocalOffset: [-0.014, 0, 0.001],
  },
  {
    id: "clover-compact-variant-syncs-edge-local-offsets",
    geometryRecipe: {
      runtimeShapeClass: "clover-charm",
      parts: [
        { partId: "core", offset: [0, 0, 0.002] },
        { partId: "leaf-left", offset: [-0.012, 0, 0.008] },
      ],
    },
    partGraph: {
      rootPartId: "core",
      edges: [
        {
          parentPartId: "core",
          childPartId: "leaf-left",
          localOffset: [-0.017, 0, 0.008],
        },
      ],
    },
    targetChildPartId: "leaf-left",
    expectLocalOffset: [-0.012, 0, 0.006],
  },
];

function main() {
  const failures: string[] = [];

  for (const entry of cases) {
    const actual = getPreferredRecoveryVariantId(
      entry.execution,
      entry.geometryRecipe,
      entry.currentVariantId,
      entry.qualityReport,
    );

    if (actual !== entry.expect) {
      failures.push(
        `${entry.id}: expected ${entry.expect ?? "null"}, got ${actual ?? "null"}`,
      );
    }
  }

  for (const entry of switchCases) {
    const actual = shouldSwitchBlueprintVariant(
      entry.execution,
      entry.qualityReport,
      entry.geometryRecipe,
      entry.passIndex,
    );

    if (actual !== entry.expect) {
      failures.push(
        `${entry.id}: expected ${String(entry.expect)}, got ${String(actual)}`,
      );
    }
  }

  for (const entry of graphSyncCases) {
    const synced = syncPartGraphLocalOffsetsWithGeometryRecipe(
      entry.partGraph,
      entry.geometryRecipe,
    ) as { edges?: Array<Record<string, unknown>> };
    const targetEdge = Array.isArray(synced.edges)
      ? synced.edges.find((edge) => edge.childPartId === entry.targetChildPartId)
      : null;
    const actual = Array.isArray(targetEdge?.localOffset)
      ? targetEdge.localOffset
      : null;

    if (
      !actual ||
      actual.length !== entry.expectLocalOffset.length ||
      actual.some((value, index) => value !== entry.expectLocalOffset[index])
    ) {
      failures.push(
        `${entry.id}: expected ${entry.expectLocalOffset.join(",")}, got ${Array.isArray(actual) ? actual.join(",") : "null"}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("[runtime-variant-recovery] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("[runtime-variant-recovery] all cases passed");
}

main();
