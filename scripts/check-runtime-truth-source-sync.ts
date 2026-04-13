import { synchronizeRuntimeTruthSources } from "./lib/runtime-truth-source-sync.mjs";

function main() {
  const customizations = {
    geometryRecipes: [
      {
        recipeId: "recipe-scarf",
        requestId: "req-0",
        variantId: "scarf-wrap-forward",
        readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
        profileVariantId: "scarf-wrap-forward",
        outlineProjectionVariantId: "scarf-wrap-forward",
        attachmentAnchors: [
          {
            anchorId: "scarf-knot-center",
            preferredOffset: [0, 0.0016, -0.008],
          },
        ],
      },
    ],
    partGraphs: [
      {
        graphId: "graph-scarf",
        requestId: "req-0",
        readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
      },
    ],
    accessoryCustomization: {
      geometryRecipes: [
        {
          recipeId: "recipe-scarf",
          requestId: "req-0",
          variantId: "scarf-wrap-forward",
          readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
        },
      ],
      partGraphs: [
        {
          graphId: "graph-scarf",
          requestId: "req-0",
          readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
        },
      ],
    },
    resolvedExecutionPlan: {
      addAccessories: [
        {
          executionId: "req-0:acc-0-chest-center-1",
          requestId: "req-0",
          geometryRecipeId: "recipe-scarf",
          partGraphId: "graph-scarf",
          variantId: "scarf-wrap-forward",
          readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
        },
      ],
    },
  };

  const result = synchronizeRuntimeTruthSources(customizations, [
    {
      execution: {
        executionId: "req-0:acc-0-chest-center-1",
        requestId: "req-0",
        geometryRecipeId: "recipe-scarf",
        partGraphId: "graph-scarf",
      },
      geometryRecipe: {
        recipeId: "recipe-scarf",
        requestId: "req-0",
        variantId: "scarf-knot-compact",
        readOrderTargets: ["knot", "wrap-band", "tail-left"],
        profileVariantId: "scarf-knot-compact",
        outlineProjectionVariantId: "scarf-knot-compact",
        criticalViewGoals: ["knot must read before tail"],
        attachmentAnchors: [
          {
            anchorId: "scarf-knot-center",
            preferredOffset: [0, 0.0028, -0.0122],
          },
        ],
      },
      partGraph: {
        graphId: "graph-scarf",
        requestId: "req-0",
        readOrderTargets: ["knot", "wrap-band", "tail-left"],
      },
    },
  ]);

  const failures: string[] = [];
  const syncedRecipe = customizations.geometryRecipes[0] as any;
  const syncedNestedRecipe = customizations.accessoryCustomization.geometryRecipes[0] as any;
  const syncedGraph = customizations.partGraphs[0] as any;
  const syncedExecution = customizations.resolvedExecutionPlan.addAccessories[0] as any;

  if (syncedRecipe.variantId !== "scarf-knot-compact") {
    failures.push("top-level geometryRecipes should be replaced with the selected runtime recipe");
  }

  if (syncedRecipe.readOrderTargets?.[0] !== "knot") {
    failures.push("top-level geometry recipe should carry the compact read order");
  }

  if (syncedRecipe.attachmentAnchors?.[0]?.preferredOffset?.[1] !== 0.0028) {
    failures.push("top-level geometry recipe should carry the selected attachment anchor offsets");
  }

  if (syncedNestedRecipe.variantId !== "scarf-knot-compact") {
    failures.push("nested accessoryCustomization.geometryRecipes should stay in sync");
  }

  if (syncedGraph.readOrderTargets?.[0] !== "knot") {
    failures.push("top-level partGraphs should be replaced with the selected runtime graph");
  }

  if (syncedExecution.variantId !== "scarf-knot-compact") {
    failures.push("resolved execution rows should surface the selected runtime variant");
  }

  if (syncedExecution.readOrderTargets?.[0] !== "knot") {
    failures.push("resolved execution rows should surface the selected runtime read order");
  }

  if (
    result.geometryRecipesUpdated !== 1 ||
    result.partGraphsUpdated !== 1 ||
    result.executionsUpdated !== 1
  ) {
    failures.push("sync result counters should report exactly one geometry, graph, and execution update");
  }

  if (failures.length > 0) {
    console.error("[runtime-truth-source-sync] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[runtime-truth-source-sync] passed");
}

main();
