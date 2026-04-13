function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  return structuredClone(value);
}

function buildIdentityCandidates(values) {
  return values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim());
}

function replaceOrAppendByIdentity(collection, replacement, identities) {
  const candidates = buildIdentityCandidates(identities);

  if (!isRecord(replacement)) {
    return Array.isArray(collection) ? collection : [];
  }

  if (!Array.isArray(collection)) {
    return [cloneValue(replacement)];
  }

  let replaced = false;
  const nextCollection = collection.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const entryIds = buildIdentityCandidates([
      entry.recipeId,
      entry.graphId,
      entry.requestId,
      entry.taskId,
      entry.briefId,
    ]);
    const matches = entryIds.some((value) => candidates.includes(value));

    if (!matches) {
      return entry;
    }

    replaced = true;
    return cloneValue(replacement);
  });

  if (!replaced) {
    nextCollection.push(cloneValue(replacement));
  }

  return nextCollection;
}

function synchronizeExecutionSnapshotFields(execution, report) {
  if (!isRecord(execution) || !isRecord(report)) {
    return false;
  }

  const geometryRecipe = isRecord(report.geometryRecipe) ? report.geometryRecipe : null;
  const partGraph = isRecord(report.partGraph) ? report.partGraph : null;
  let changed = false;

  const assignArray = (key, value) => {
    if (!Array.isArray(value)) {
      return;
    }

    execution[key] = cloneValue(value);
    changed = true;
  };

  const assignScalar = (key, value) => {
    if (typeof value !== "string" || !value.trim()) {
      return;
    }

    execution[key] = value;
    changed = true;
  };

  if (geometryRecipe) {
    assignScalar("variantId", geometryRecipe.variantId);
    assignScalar("assemblyRootPartId", geometryRecipe.assemblyRootPartId);
    assignScalar("attachmentPartId", geometryRecipe.attachmentPartId);
    assignScalar("primarySilhouette", geometryRecipe.primarySilhouette);
    assignArray("criticalParts", geometryRecipe.criticalParts);
    assignArray("negativeLookalikes", geometryRecipe.negativeLookalikes);
    assignArray("readOrderTargets", geometryRecipe.readOrderTargets);
    assignArray("criticalViewGoals", geometryRecipe.criticalViewGoals);

    if (isRecord(geometryRecipe.compilerIntent)) {
      execution.compilerIntent = cloneValue(geometryRecipe.compilerIntent);
      changed = true;
    }

    if (typeof geometryRecipe.recipeId === "string" && geometryRecipe.recipeId.trim()) {
      execution.geometryRecipeId = geometryRecipe.recipeId;
      changed = true;
    }
  }

  if (partGraph) {
    if (typeof partGraph.graphId === "string" && partGraph.graphId.trim()) {
      execution.partGraphId = partGraph.graphId;
      changed = true;
    }

    if (
      (!Array.isArray(execution.readOrderTargets) || execution.readOrderTargets.length === 0) &&
      Array.isArray(partGraph.readOrderTargets)
    ) {
      execution.readOrderTargets = cloneValue(partGraph.readOrderTargets);
      changed = true;
    }
  }

  return changed;
}

export function synchronizeRuntimeTruthSources(customizations, executionReports = []) {
  if (!isRecord(customizations) || !Array.isArray(executionReports) || executionReports.length === 0) {
    return {
      geometryRecipesUpdated: 0,
      partGraphsUpdated: 0,
      executionsUpdated: 0,
    };
  }

  let geometryRecipesUpdated = 0;
  let partGraphsUpdated = 0;
  let executionsUpdated = 0;

  const executionById = isRecord(customizations.resolvedExecutionPlan) &&
    Array.isArray(customizations.resolvedExecutionPlan.addAccessories)
    ? new Map(
        customizations.resolvedExecutionPlan.addAccessories
          .filter((entry) => isRecord(entry) && typeof entry.executionId === "string")
          .map((entry) => [entry.executionId, entry]),
      )
    : new Map();

  for (const report of executionReports) {
    if (!isRecord(report) || !isRecord(report.execution)) {
      continue;
    }

    const execution = report.execution;
    const geometryRecipe = isRecord(report.geometryRecipe) ? report.geometryRecipe : null;
    const partGraph = isRecord(report.partGraph) ? report.partGraph : null;
    const recipeIdentities = [
      execution.geometryRecipeId,
      geometryRecipe?.recipeId,
      execution.requestId,
      geometryRecipe?.requestId,
    ];
    const graphIdentities = [
      execution.partGraphId,
      partGraph?.graphId,
      execution.requestId,
      partGraph?.requestId,
    ];

    if (geometryRecipe) {
      customizations.geometryRecipes = replaceOrAppendByIdentity(
        customizations.geometryRecipes,
        geometryRecipe,
        recipeIdentities,
      );
      geometryRecipesUpdated += 1;

      if (isRecord(customizations.accessoryCustomization)) {
        customizations.accessoryCustomization.geometryRecipes = replaceOrAppendByIdentity(
          customizations.accessoryCustomization.geometryRecipes,
          geometryRecipe,
          recipeIdentities,
        );
      }
    }

    if (partGraph) {
      customizations.partGraphs = replaceOrAppendByIdentity(
        customizations.partGraphs,
        partGraph,
        graphIdentities,
      );
      partGraphsUpdated += 1;

      if (isRecord(customizations.accessoryCustomization)) {
        customizations.accessoryCustomization.partGraphs = replaceOrAppendByIdentity(
          customizations.accessoryCustomization.partGraphs,
          partGraph,
          graphIdentities,
        );
      }
    }

    const persistedExecution = executionById.get(execution.executionId);
    if (synchronizeExecutionSnapshotFields(persistedExecution, report)) {
      executionsUpdated += 1;
    }
  }

  return {
    geometryRecipesUpdated,
    partGraphsUpdated,
    executionsUpdated,
  };
}
