import Module from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type CorpusEntry = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  generationMode: "dynamic-custom";
  customizationProfile: "safe-overlay" | "experimental-addon";
  expect: {
    themeSlot?: string;
    paletteMode?: "single-tone" | "dual-tone" | "gradient" | "theme-default";
    bodyColor?: string;
    secondaryColor?: string;
    accessoryColor?: string;
    accessoryColorAbsent?: boolean;
    glowColor?: string;
    requestedAccessoryCount?: number;
    executedAccessoryCount?: number;
    accessoryRequestLabelsIncludes?: string[];
    accessoryRequestNounsIncludes?: string[];
    accessoryRequestColorsIncludes?: string[];
    accessoryFamiliesIncludes?: string[];
    accessoryFamiliesExcludes?: string[];
    runtimeDesignRequestedNounsIncludes?: string[];
    runtimeDesignArchetypesIncludes?: string[];
    runtimeShapeClassesIncludes?: string[];
    runtimeDesignSourceModesIncludes?: string[];
    referenceIdsIncludes?: string[];
    blueprintFamiliesIncludes?: string[];
    geometryVariantIdsIncludes?: string[];
    geometrySourceModesIncludes?: string[];
    geometryPartScaleMaxByPart?: Record<string, [number, number, number]>;
    runtimeDesignCriticalPartsIncludes?: string[];
    runtimeDesignNegativeLookalikesIncludes?: string[];
    geometryPrimarySilhouettesIncludes?: string[];
    structuralBlueprintSilhouetteTemplatesIncludes?: string[];
    structuralBlueprintSilhouetteBlockRolesIncludes?: string[];
    structuralBlueprintAssemblyRelationsIncludes?: string[];
    structuralBlueprintReadOrderTargetsIncludes?: string[];
    structuralBlueprintCriticalViewGoalsIncludes?: string[];
    structuralBlueprintSpanTargetPartIdsIncludes?: string[];
    structuralBlueprintDepthTargetPartIdsIncludes?: string[];
    structuralBlueprintAttachmentAnchorPartIdsIncludes?: string[];
    structuralBlueprintKeepoutPartIdsIncludes?: string[];
    structuralBlueprintDominantContoursIncludes?: string[];
    structuralBlueprintSideDepthProfilesIncludes?: string[];
    structuralBlueprintDominantSpanOwnersIncludes?: string[];
    partGraphEdgesIncludes?: Array<{
      parentPartId: string;
      childPartId: string;
      mountFace?: string;
      edgeConstraint?: string;
    }>;
    nounDesignBriefCountAtLeast?: number;
    partGraphCountAtLeast?: number;
    partGraphRootIdsIncludes?: string[];
    partGraphAttachmentIdsIncludes?: string[];
    removedDefaultAccessoriesIncludes?: string[];
    keptThemeDefaultsIncludes?: string[];
    approximatedAccessoryFamiliesIncludes?: string[];
    requestedAccessoriesIncludes?: string[];
    executedAccessoriesIncludes?: string[];
    runtimeGeneratedAccessoriesIncludes?: string[];
    executedIncludes?: string[];
    approximatedIncludes?: string[];
    unsupportedIncludes?: string[];
  };
};

type CorpusFile = {
  goldenPrompts: CorpusEntry[];
  conflictPrompts: CorpusEntry[];
};

type RegressionCaseStatus = "passed" | "failed" | "error";

type RegressionCaseReport = {
  id: string;
  prompt: string;
  status: RegressionCaseStatus;
  durationMs: number;
  failureCount: number;
  failureMessages: string[];
  unexpectedError?: string;
};

type RegressionRunReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCorpusCases: number;
  selectedCaseCount: number;
  selectedCaseIds: string[];
  caseFilterIds: string[];
  progressEnabled: boolean;
  passedCaseCount: number;
  failedCaseCount: number;
  errorCaseCount: number;
  failures: string[];
  cases: RegressionCaseReport[];
};

const caseFilter = new Set(
  (process.env.PROMPTPET_DYNAMIC_REGRESSION_ONLY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const progressEnabled = process.env.PROMPTPET_DYNAMIC_REGRESSION_PROGRESS !== "0";
const reportPathSetting =
  process.env.PROMPTPET_DYNAMIC_REGRESSION_REPORT ??
  "output/verification/dynamic-custom-regression-latest.json";

function resolveReportPath(reportPath: string | null | undefined) {
  if (typeof reportPath !== "string" || reportPath.trim().length === 0) {
    return null;
  }

  return path.isAbsolute(reportPath)
    ? reportPath
    : path.join(process.cwd(), reportPath);
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function writeRegressionReport(reportPath: string | null, report: RegressionRunReport) {
  if (!reportPath) {
    return;
  }

  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function includesAll(haystack: Array<string | undefined>, needles: string[]) {
  return needles.every((needle) =>
    haystack.some((entry) => typeof entry === "string" && entry.includes(needle)),
  );
}

function getAnchorLabel(anchor: unknown) {
  if (anchor === "left-ear") {
    return "左耳";
  }

  if (anchor === "right-ear") {
    return "右耳";
  }

  if (anchor === "forehead") {
    return "额头";
  }

  if (anchor === "head-top") {
    return "头顶";
  }

  if (anchor === "back-head") {
    return "头后面";
  }

  if (anchor === "chest-left") {
    return "左胸前";
  }

  if (anchor === "chest-right") {
    return "右胸前";
  }

  if (anchor === "tail-top") {
    return "尾巴上面";
  }

  if (anchor === "tail-left") {
    return "尾巴左边";
  }

  if (anchor === "tail-right") {
    return "尾巴右边";
  }

  if (anchor === "tail-base") {
    return "尾巴根部";
  }

  return "胸前";
}

async function main() {
  process.env.LLM_API_KEY = "";
  process.env.DEEPSEEK_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  const moduleLoader = Module as unknown as {
    _load: (...args: unknown[]) => unknown;
  };
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function patchedLoad(...args: unknown[]) {
    const [request] = args;
    if (request === "server-only") {
      return {};
    }

    if (request === "node:child_process") {
      return {
        execFileSync() {
          throw new Error("Keychain disabled for regression");
        },
      };
    }

    return originalLoad(...args);
  };
  const { parsePromptCustomizationRecipe } = await import(
    "../src/lib/prompt-customization"
  );

  const corpusPath = path.join(
    process.cwd(),
    "src",
    "data",
    "dynamic-custom-regression.json",
  );
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const cases = [...corpus.goldenPrompts, ...corpus.conflictPrompts];
  const selectedCases = cases.filter((entry) =>
    caseFilter.size === 0 ? true : caseFilter.has(entry.id),
  );

  if (selectedCases.length === 0) {
    throw new Error("PROMPTPET_DYNAMIC_REGRESSION_ONLY 过滤后没有匹配的 regression case。");
  }

  const reportPath = resolveReportPath(reportPathSetting);
  const failures: string[] = [];
  const caseReports: RegressionCaseReport[] = [];
  const suiteStartMs = Date.now();
  const startedAt = new Date(suiteStartMs).toISOString();

  if (progressEnabled) {
    console.log(
      `[dynamic-custom-regression] running ${selectedCases.length}/${cases.length} cases`,
    );
    if (caseFilter.size > 0) {
      console.log(
        `[dynamic-custom-regression] filter: ${[...caseFilter].join(", ")}`,
      );
    }
    if (reportPath) {
      console.log(`[dynamic-custom-regression] report: ${reportPath}`);
    }
  }

  for (const [index, entry] of selectedCases.entries()) {
    const casePrefix = `[dynamic-custom-regression] [${index + 1}/${selectedCases.length}]`;
    const caseStartMs = Date.now();
    const failureStartIndex = failures.length;

    if (progressEnabled) {
      console.log(`${casePrefix} START ${entry.id}`);
    }

    try {
      const recipe = await parsePromptCustomizationRecipe({
        prompt: entry.prompt,
        style: entry.style,
        generationMode: entry.generationMode,
        customizationProfile: entry.customizationProfile,
      });

      const scorecard = recipe.executionScorecard;
      const executed = recipe.executedCustomizations;
      const approximated = scorecard.approximated;
      const unsupported = scorecard.unsupported;
      const accessoryRequestLabels = recipe.accessoryRequests.map(
        (request) => request.requestedLabel ?? request.label,
      );
      const accessoryRequestNouns = recipe.accessoryRequests
        .map((request) => request.requestedNoun)
        .filter((value): value is string => typeof value === "string");
      const accessoryRequestColors = recipe.accessoryRequests
        .map((request) => {
          const label = request.requestedLabel ?? request.label;
          const color =
            request.requestedColor?.label ??
            request.colorIntent?.label ??
            request.instances.find((instance) => instance.colorIntent)?.colorIntent?.label;

          return label && color ? `${label}:${color}` : undefined;
        })
        .filter((value): value is string => typeof value === "string");
      const accessoryFamilies = recipe.accessoryRequests.map((request) => request.family);
      const runtimeDesignRequestedNouns = recipe.runtimeDesignTasks
        .map((task) => task.requestedNoun)
        .filter((value): value is string => typeof value === "string");
      const runtimeDesignArchetypes = recipe.runtimeDesignTasks.map(
        (task) => task.designArchetype,
      );
      const runtimeShapeClasses = recipe.runtimeDesignTasks
        .map((task) => task.runtimeShapeClass)
        .filter((value): value is NonNullable<typeof value> => typeof value === "string");
      const runtimeDesignSourceModes = recipe.runtimeDesignTasks
        .map((task) => task.sourceMode)
        .filter((value): value is NonNullable<typeof value> => typeof value === "string");
      const referenceIds = recipe.geometryRecipes
        .map((geometryRecipe) => geometryRecipe.referenceId)
        .filter((value): value is string => typeof value === "string");
      const geometrySourceModes = recipe.geometryRecipes
        .map((geometryRecipe) => geometryRecipe.sourceMode)
        .filter((value): value is NonNullable<typeof value> => typeof value === "string");
      const blueprintFamilies = recipe.geometryRecipes
        .map((geometryRecipe) => geometryRecipe.blueprintFamily)
        .filter(
          (
            value,
          ): value is NonNullable<(typeof recipe.geometryRecipes)[number]["blueprintFamily"]> =>
            typeof value === "string",
        );
      const geometryVariantIds = recipe.geometryRecipes
        .map((geometryRecipe) => geometryRecipe.variantId)
        .filter((value): value is string => typeof value === "string");
      const geometryPartScaleMaxByPart = new Map<string, [number, number, number]>();
      for (const geometryRecipe of recipe.geometryRecipes) {
        for (const part of geometryRecipe.parts ?? []) {
          if (
            typeof part.partId !== "string" ||
            !Array.isArray(part.scale) ||
            part.scale.length < 3
          ) {
            continue;
          }

          const nextScale = [
            Number(part.scale[0] ?? 0),
            Number(part.scale[1] ?? 0),
            Number(part.scale[2] ?? 0),
          ] as [number, number, number];
          const previousScale = geometryPartScaleMaxByPart.get(part.partId);

          if (!previousScale) {
            geometryPartScaleMaxByPart.set(part.partId, nextScale);
            continue;
          }

          geometryPartScaleMaxByPart.set(part.partId, [
            Math.max(previousScale[0], nextScale[0]),
            Math.max(previousScale[1], nextScale[1]),
            Math.max(previousScale[2], nextScale[2]),
          ]);
        }
      }
      const runtimeDesignCriticalParts = recipe.runtimeDesignTasks.flatMap((task) =>
        Array.isArray(task.criticalParts) ? task.criticalParts : [],
      );
    const runtimeDesignNegativeLookalikes = recipe.runtimeDesignTasks.flatMap((task) =>
      Array.isArray(task.negativeLookalikes) ? task.negativeLookalikes : [],
    );
    const geometryPrimarySilhouettes = recipe.geometryRecipes
      .map((recipe) => recipe.primarySilhouette)
      .filter(
        (value): value is NonNullable<typeof value> => typeof value === "string",
      );
    const structuralBlueprintSilhouetteTemplates = recipe.geometryRecipes
      .map((geometryRecipe) => geometryRecipe.structuralBlueprint?.silhouetteTemplate)
      .filter(
        (
          value,
        ): value is NonNullable<
          NonNullable<(typeof recipe.geometryRecipes)[number]["structuralBlueprint"]>["silhouetteTemplate"]
        > => typeof value === "string",
      );
    const structuralBlueprintSilhouetteBlockRoles = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.silhouetteBlocks)
          ? geometryRecipe.structuralBlueprint.silhouetteBlocks
              .map((entry) => entry?.semanticRole)
              .filter((value) => typeof value === "string")
          : [],
    );
    const structuralBlueprintAssemblyRelations = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.assemblySegments)
          ? geometryRecipe.structuralBlueprint.assemblySegments
              .map((entry) => entry?.relation)
              .filter((value) => typeof value === "string")
          : [],
    );
    const structuralBlueprintReadOrderTargets = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.readOrderTargets)
          ? geometryRecipe.structuralBlueprint.readOrderTargets.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
    );
    const structuralBlueprintCriticalViewGoals = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.criticalViewGoals)
          ? geometryRecipe.structuralBlueprint.criticalViewGoals.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
    );
    const structuralBlueprintSpanTargetPartIds = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.partSpanTargets)
          ? geometryRecipe.structuralBlueprint.partSpanTargets
              .map((entry) => entry?.partId)
              .filter((value): value is string => typeof value === "string")
          : [],
    );
    const structuralBlueprintDepthTargetPartIds = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.partDepthTargets)
          ? geometryRecipe.structuralBlueprint.partDepthTargets
              .map((entry) => entry?.partId)
              .filter((value): value is string => typeof value === "string")
          : [],
    );
    const structuralBlueprintAttachmentAnchorPartIds = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.attachmentAnchors)
          ? geometryRecipe.structuralBlueprint.attachmentAnchors
              .map((entry) => entry?.partId)
              .filter((value): value is string => typeof value === "string")
          : [],
    );
    const structuralBlueprintKeepoutPartIds = recipe.geometryRecipes.flatMap(
      (geometryRecipe) =>
        Array.isArray(geometryRecipe.structuralBlueprint?.silhouetteKeepouts)
          ? geometryRecipe.structuralBlueprint.silhouetteKeepouts
              .map((entry) => entry?.partId)
              .filter((value): value is string => typeof value === "string")
          : [],
    );
    const structuralBlueprintDominantContours = recipe.geometryRecipes
      .map((geometryRecipe) => geometryRecipe.structuralBlueprint?.dominantContour)
      .filter((value): value is string => typeof value === "string");
    const structuralBlueprintSideDepthProfiles = recipe.geometryRecipes
      .map((geometryRecipe) => geometryRecipe.structuralBlueprint?.sideDepthProfile)
      .filter(
        (
          value,
        ): value is NonNullable<
          NonNullable<(typeof recipe.geometryRecipes)[number]["structuralBlueprint"]>["sideDepthProfile"]
        > => typeof value === "string",
      );
    const structuralBlueprintDominantSpanOwners = recipe.geometryRecipes
      .map((geometryRecipe) => geometryRecipe.structuralBlueprint?.dominantSpanOwner)
      .filter((value): value is string => typeof value === "string");
    const runtimeGeneratedAccessories = recipe.resolvedExecutionPlan.addAccessories
      .filter((entry) => entry.executionMode === "runtime-generated")
      .map((entry) => {
        return `${getAnchorLabel(entry.anchor)} · ${entry.resolvedLabel ?? entry.shapeLabel}`;
      });
    const partGraphRootIds = recipe.partGraphs
      .map((graph) => graph.rootPartId)
      .filter((value): value is string => typeof value === "string");
    const partGraphAttachmentIds = recipe.partGraphs
      .map((graph) => graph.attachmentPartId)
      .filter((value): value is string => typeof value === "string");
    const partGraphEdges = recipe.partGraphs.flatMap((graph) =>
      Array.isArray(graph.edges)
        ? graph.edges.map((edge) => ({
            parentPartId: edge.parentPartId,
            childPartId: edge.childPartId,
            mountFace: edge.mountFace,
            edgeConstraint: edge.edgeConstraint,
          }))
        : [],
    );

    if (
      entry.customizationProfile === "experimental-addon" &&
      (typeof recipe.runtimeAttemptBudgetMs !== "number" ||
        recipe.runtimeAttemptBudgetMs < 240000)
    ) {
      failures.push(
        `${entry.id}: expected runtimeAttemptBudgetMs>=240000 for experimental-addon, got ${recipe.runtimeAttemptBudgetMs ?? "undefined"}`,
      );
    }

    if (entry.expect.themeSlot && recipe.themeSlot !== entry.expect.themeSlot) {
      failures.push(
        `${entry.id}: expected themeSlot=${entry.expect.themeSlot}, got ${recipe.themeSlot}`,
      );
    }

    if (
      entry.expect.paletteMode &&
      recipe.bodyCustomization.paletteMode !== entry.expect.paletteMode
    ) {
      failures.push(
        `${entry.id}: expected paletteMode=${entry.expect.paletteMode}, got ${recipe.bodyCustomization.paletteMode}`,
      );
    }

    if (
      entry.expect.bodyColor &&
      recipe.colorOverrides.bodyColor?.label !== entry.expect.bodyColor
    ) {
      failures.push(
        `${entry.id}: expected bodyColor=${entry.expect.bodyColor}, got ${recipe.colorOverrides.bodyColor?.label ?? "undefined"}`,
      );
    }

    if (
      entry.expect.secondaryColor &&
      recipe.colorOverrides.detailColor?.label !== entry.expect.secondaryColor
    ) {
      failures.push(
        `${entry.id}: expected secondaryColor=${entry.expect.secondaryColor}, got ${recipe.colorOverrides.detailColor?.label ?? "undefined"}`,
      );
    }

    if (
      entry.expect.accessoryColor &&
      recipe.colorOverrides.accessoryColor?.label !== entry.expect.accessoryColor
    ) {
      failures.push(
        `${entry.id}: expected accessoryColor=${entry.expect.accessoryColor}, got ${recipe.colorOverrides.accessoryColor?.label ?? "undefined"}`,
      );
    }

    if (
      entry.expect.accessoryColorAbsent === true &&
      recipe.colorOverrides.accessoryColor
    ) {
      failures.push(
        `${entry.id}: expected accessoryColor to be omitted, got ${recipe.colorOverrides.accessoryColor.label}`,
      );
    }

    if (
      entry.expect.glowColor &&
      recipe.colorOverrides.glowColor?.label !== entry.expect.glowColor
    ) {
      failures.push(
        `${entry.id}: expected glowColor=${entry.expect.glowColor}, got ${recipe.colorOverrides.glowColor?.label ?? "undefined"}`,
      );
    }

    if (
      typeof entry.expect.requestedAccessoryCount === "number" &&
      scorecard.requestedAccessoryCount !== entry.expect.requestedAccessoryCount
    ) {
      failures.push(
        `${entry.id}: expected requestedAccessoryCount=${entry.expect.requestedAccessoryCount}, got ${scorecard.requestedAccessoryCount}`,
      );
    }

    if (
      typeof entry.expect.executedAccessoryCount === "number" &&
      scorecard.executedAccessoryCount !== entry.expect.executedAccessoryCount
    ) {
      failures.push(
        `${entry.id}: expected executedAccessoryCount=${entry.expect.executedAccessoryCount}, got ${scorecard.executedAccessoryCount}`,
      );
    }

    if (
      entry.expect.removedDefaultAccessoriesIncludes &&
      !includesAll(
        scorecard.removedDefaultAccessories,
        entry.expect.removedDefaultAccessoriesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: removedDefaultAccessories missing ${entry.expect.removedDefaultAccessoriesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.keptThemeDefaultsIncludes &&
      !includesAll(
        scorecard.keptThemeDefaults,
        entry.expect.keptThemeDefaultsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: keptThemeDefaults missing ${entry.expect.keptThemeDefaultsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.approximatedAccessoryFamiliesIncludes &&
      !includesAll(
        scorecard.approximatedAccessoryFamilies,
        entry.expect.approximatedAccessoryFamiliesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: approximatedAccessoryFamilies missing ${entry.expect.approximatedAccessoryFamiliesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.accessoryRequestLabelsIncludes &&
      !includesAll(accessoryRequestLabels, entry.expect.accessoryRequestLabelsIncludes)
    ) {
      failures.push(
        `${entry.id}: accessoryRequestLabels missing ${entry.expect.accessoryRequestLabelsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.accessoryRequestNounsIncludes &&
      !includesAll(accessoryRequestNouns, entry.expect.accessoryRequestNounsIncludes)
    ) {
      failures.push(
        `${entry.id}: accessoryRequestNouns missing ${entry.expect.accessoryRequestNounsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.accessoryRequestColorsIncludes &&
      !includesAll(accessoryRequestColors, entry.expect.accessoryRequestColorsIncludes)
    ) {
      failures.push(
        `${entry.id}: accessoryRequestColors missing ${entry.expect.accessoryRequestColorsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.accessoryFamiliesIncludes &&
      !includesAll(accessoryFamilies, entry.expect.accessoryFamiliesIncludes)
    ) {
      failures.push(
        `${entry.id}: accessoryFamilies missing ${entry.expect.accessoryFamiliesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.accessoryFamiliesExcludes &&
      entry.expect.accessoryFamiliesExcludes.some((family) =>
        (accessoryFamilies as string[]).includes(family),
      )
    ) {
      failures.push(
        `${entry.id}: accessoryFamilies unexpectedly contained ${entry.expect.accessoryFamiliesExcludes.join(", ")}`,
      );
    }

    if (
      entry.expect.runtimeDesignRequestedNounsIncludes &&
      !includesAll(
        runtimeDesignRequestedNouns,
        entry.expect.runtimeDesignRequestedNounsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: runtimeDesignRequestedNouns missing ${entry.expect.runtimeDesignRequestedNounsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.runtimeDesignArchetypesIncludes &&
      !includesAll(
        runtimeDesignArchetypes,
        entry.expect.runtimeDesignArchetypesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: runtimeDesignArchetypes missing ${entry.expect.runtimeDesignArchetypesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.runtimeShapeClassesIncludes &&
      !includesAll(runtimeShapeClasses, entry.expect.runtimeShapeClassesIncludes)
    ) {
      failures.push(
        `${entry.id}: expected runtimeShapeClasses to include ${entry.expect.runtimeShapeClassesIncludes.join(", ")}, got ${runtimeShapeClasses.join(", ")}`,
      );
    }
    if (
      entry.expect.runtimeDesignSourceModesIncludes &&
      !includesAll(
        runtimeDesignSourceModes,
        entry.expect.runtimeDesignSourceModesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: expected runtimeDesignSourceModes to include ${entry.expect.runtimeDesignSourceModesIncludes.join(", ")}, got ${runtimeDesignSourceModes.join(", ") || "none"}`,
      );
    }
    if (
      entry.expect.referenceIdsIncludes &&
      !includesAll(referenceIds, entry.expect.referenceIdsIncludes)
    ) {
      failures.push(
        `[${entry.id}] expected reference IDs ${entry.expect.referenceIdsIncludes.join(", ")} but got ${referenceIds.join(", ") || "none"}`,
      );
    }
    if (
      entry.expect.blueprintFamiliesIncludes &&
      !includesAll(blueprintFamilies, entry.expect.blueprintFamiliesIncludes)
    ) {
      failures.push(
        `[${entry.id}] expected blueprint families ${entry.expect.blueprintFamiliesIncludes.join(", ")} but got ${blueprintFamilies.join(", ") || "none"}`,
      );
    }
    if (
      entry.expect.geometryVariantIdsIncludes &&
      !includesAll(geometryVariantIds, entry.expect.geometryVariantIdsIncludes)
    ) {
      failures.push(
        `[${entry.id}] expected geometry variants ${entry.expect.geometryVariantIdsIncludes.join(", ")} but got ${geometryVariantIds.join(", ") || "none"}`,
      );
    }
    if (
      entry.expect.geometrySourceModesIncludes &&
      !includesAll(geometrySourceModes, entry.expect.geometrySourceModesIncludes)
    ) {
      failures.push(
        `[${entry.id}] expected geometry source modes ${entry.expect.geometrySourceModesIncludes.join(", ")} but got ${geometrySourceModes.join(", ") || "none"}`,
      );
    }
    if (entry.expect.geometryPartScaleMaxByPart) {
      for (const [partId, maxScale] of Object.entries(
        entry.expect.geometryPartScaleMaxByPart,
      )) {
        const actualScale = geometryPartScaleMaxByPart.get(partId);

        if (!actualScale) {
          failures.push(`${entry.id}: missing geometry part scale for ${partId}`);
          continue;
        }

        const exceededAxis = actualScale.findIndex(
          (value, axis) => value > maxScale[axis] + 0.0001,
        );

        if (exceededAxis >= 0) {
          failures.push(
            `${entry.id}: geometry part ${partId} axis ${exceededAxis} exceeded max scale ${maxScale.join(", ")}, got ${actualScale.join(", ")}`,
          );
        }
      }
    }

    if (
      entry.expect.runtimeDesignCriticalPartsIncludes &&
      !includesAll(
        runtimeDesignCriticalParts,
        entry.expect.runtimeDesignCriticalPartsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: runtimeDesignCriticalParts missing ${entry.expect.runtimeDesignCriticalPartsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.partGraphRootIdsIncludes &&
      !includesAll(partGraphRootIds, entry.expect.partGraphRootIdsIncludes)
    ) {
      failures.push(
        `${entry.id}: expected partGraphRootIds to include ${entry.expect.partGraphRootIdsIncludes.join(", ")}, got ${partGraphRootIds.join(", ")}`,
      );
    }

    if (
      entry.expect.partGraphAttachmentIdsIncludes &&
      !includesAll(partGraphAttachmentIds, entry.expect.partGraphAttachmentIdsIncludes)
    ) {
      failures.push(
        `${entry.id}: expected partGraphAttachmentIds to include ${entry.expect.partGraphAttachmentIdsIncludes.join(", ")}, got ${partGraphAttachmentIds.join(", ")}`,
      );
    }

    if (
      entry.expect.runtimeDesignNegativeLookalikesIncludes &&
      !includesAll(
        runtimeDesignNegativeLookalikes,
        entry.expect.runtimeDesignNegativeLookalikesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: runtimeDesignNegativeLookalikes missing ${entry.expect.runtimeDesignNegativeLookalikesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.geometryPrimarySilhouettesIncludes &&
      !includesAll(
        geometryPrimarySilhouettes,
        entry.expect.geometryPrimarySilhouettesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: geometryPrimarySilhouettes missing ${entry.expect.geometryPrimarySilhouettesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintSilhouetteTemplatesIncludes &&
      !includesAll(
        structuralBlueprintSilhouetteTemplates,
        entry.expect.structuralBlueprintSilhouetteTemplatesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintSilhouetteTemplates missing ${entry.expect.structuralBlueprintSilhouetteTemplatesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintSilhouetteBlockRolesIncludes &&
      !includesAll(
        structuralBlueprintSilhouetteBlockRoles,
        entry.expect.structuralBlueprintSilhouetteBlockRolesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: expected silhouette block roles to include ${entry.expect.structuralBlueprintSilhouetteBlockRolesIncludes.join(", ")}, got ${structuralBlueprintSilhouetteBlockRoles.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintAssemblyRelationsIncludes &&
      !includesAll(
        structuralBlueprintAssemblyRelations,
        entry.expect.structuralBlueprintAssemblyRelationsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: expected assembly relations to include ${entry.expect.structuralBlueprintAssemblyRelationsIncludes.join(", ")}, got ${structuralBlueprintAssemblyRelations.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintReadOrderTargetsIncludes &&
      !includesAll(
        structuralBlueprintReadOrderTargets,
        entry.expect.structuralBlueprintReadOrderTargetsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: expected readOrderTargets to include ${entry.expect.structuralBlueprintReadOrderTargetsIncludes.join(", ")}, got ${structuralBlueprintReadOrderTargets.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintCriticalViewGoalsIncludes &&
      !includesAll(
        structuralBlueprintCriticalViewGoals,
        entry.expect.structuralBlueprintCriticalViewGoalsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: expected criticalViewGoals to include ${entry.expect.structuralBlueprintCriticalViewGoalsIncludes.join(", ")}, got ${structuralBlueprintCriticalViewGoals.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintSpanTargetPartIdsIncludes &&
      !includesAll(
        structuralBlueprintSpanTargetPartIds,
        entry.expect.structuralBlueprintSpanTargetPartIdsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintSpanTargetPartIds missing ${entry.expect.structuralBlueprintSpanTargetPartIdsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintDepthTargetPartIdsIncludes &&
      !includesAll(
        structuralBlueprintDepthTargetPartIds,
        entry.expect.structuralBlueprintDepthTargetPartIdsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintDepthTargetPartIds missing ${entry.expect.structuralBlueprintDepthTargetPartIdsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintAttachmentAnchorPartIdsIncludes &&
      !includesAll(
        structuralBlueprintAttachmentAnchorPartIds,
        entry.expect.structuralBlueprintAttachmentAnchorPartIdsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintAttachmentAnchorPartIds missing ${entry.expect.structuralBlueprintAttachmentAnchorPartIdsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintKeepoutPartIdsIncludes &&
      !includesAll(
        structuralBlueprintKeepoutPartIds,
        entry.expect.structuralBlueprintKeepoutPartIdsIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintKeepoutPartIds missing ${entry.expect.structuralBlueprintKeepoutPartIdsIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintDominantContoursIncludes &&
      !includesAll(
        structuralBlueprintDominantContours,
        entry.expect.structuralBlueprintDominantContoursIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintDominantContours missing ${entry.expect.structuralBlueprintDominantContoursIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintSideDepthProfilesIncludes &&
      !includesAll(
        structuralBlueprintSideDepthProfiles,
        entry.expect.structuralBlueprintSideDepthProfilesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintSideDepthProfiles missing ${entry.expect.structuralBlueprintSideDepthProfilesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.structuralBlueprintDominantSpanOwnersIncludes &&
      !includesAll(
        structuralBlueprintDominantSpanOwners,
        entry.expect.structuralBlueprintDominantSpanOwnersIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: structuralBlueprintDominantSpanOwners missing ${entry.expect.structuralBlueprintDominantSpanOwnersIncludes.join(", ")}`,
      );
    }

    if (entry.expect.partGraphEdgesIncludes) {
      for (const expectedEdge of entry.expect.partGraphEdgesIncludes) {
        const matched = partGraphEdges.some((edge) => {
          return (
            edge.parentPartId === expectedEdge.parentPartId &&
            edge.childPartId === expectedEdge.childPartId &&
            (!expectedEdge.mountFace || edge.mountFace === expectedEdge.mountFace) &&
            (!expectedEdge.edgeConstraint ||
              edge.edgeConstraint === expectedEdge.edgeConstraint)
          );
        });

        if (!matched) {
          failures.push(
            `${entry.id}: missing partGraph edge ${expectedEdge.parentPartId} -> ${expectedEdge.childPartId}${
              expectedEdge.mountFace ? ` @ ${expectedEdge.mountFace}` : ""
            }${expectedEdge.edgeConstraint ? ` / ${expectedEdge.edgeConstraint}` : ""}`,
          );
        }
      }
    }

    if (
      typeof entry.expect.nounDesignBriefCountAtLeast === "number" &&
      recipe.nounDesignBriefs.length < entry.expect.nounDesignBriefCountAtLeast
    ) {
      failures.push(
        `${entry.id}: expected nounDesignBriefCountAtLeast=${entry.expect.nounDesignBriefCountAtLeast}, got ${recipe.nounDesignBriefs.length}`,
      );
    }

    if (
      typeof entry.expect.partGraphCountAtLeast === "number" &&
      recipe.partGraphs.length < entry.expect.partGraphCountAtLeast
    ) {
      failures.push(
        `${entry.id}: expected partGraphCountAtLeast=${entry.expect.partGraphCountAtLeast}, got ${recipe.partGraphs.length}`,
      );
    }

    if (
      entry.expect.requestedAccessoriesIncludes &&
      !includesAll(
        scorecard.requestedAccessories,
        entry.expect.requestedAccessoriesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: requestedAccessories missing ${entry.expect.requestedAccessoriesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.executedAccessoriesIncludes &&
      !includesAll(
        scorecard.executedAccessories,
        entry.expect.executedAccessoriesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: executedAccessories missing ${entry.expect.executedAccessoriesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.runtimeGeneratedAccessoriesIncludes &&
      !includesAll(
        runtimeGeneratedAccessories,
        entry.expect.runtimeGeneratedAccessoriesIncludes,
      )
    ) {
      failures.push(
        `${entry.id}: runtimeGeneratedAccessories missing ${entry.expect.runtimeGeneratedAccessoriesIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.executedIncludes &&
      !includesAll(executed, entry.expect.executedIncludes)
    ) {
      failures.push(
        `${entry.id}: executedCustomizations missing ${entry.expect.executedIncludes.join(", ")}`,
      );
    }

    if (
      entry.expect.approximatedIncludes &&
      !includesAll(approximated, entry.expect.approximatedIncludes)
    ) {
      failures.push(
        `${entry.id}: approximated scorecard missing ${entry.expect.approximatedIncludes.join(", ")}`,
      );
    }

      if (
        entry.expect.unsupportedIncludes &&
        !includesAll(unsupported, entry.expect.unsupportedIncludes)
      ) {
        failures.push(
          `${entry.id}: unsupported scorecard missing ${entry.expect.unsupportedIncludes.join(", ")}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${entry.id}: unexpected error ${message}`);
      const durationMs = Date.now() - caseStartMs;
      caseReports.push({
        id: entry.id,
        prompt: entry.prompt,
        status: "error",
        durationMs,
        failureCount: 1,
        failureMessages: failures.slice(failureStartIndex),
        unexpectedError: error instanceof Error ? (error.stack ?? error.message) : String(error),
      });
      console.error(
        `${casePrefix} ERROR ${entry.id} ${formatDuration(durationMs)}`,
      );
      continue;
    }

    const durationMs = Date.now() - caseStartMs;
    const caseFailures = failures.slice(failureStartIndex);
    const status: RegressionCaseStatus = caseFailures.length > 0 ? "failed" : "passed";

    caseReports.push({
      id: entry.id,
      prompt: entry.prompt,
      status,
      durationMs,
      failureCount: caseFailures.length,
      failureMessages: caseFailures,
    });

    if (progressEnabled) {
      console.log(
        `${casePrefix} ${status === "passed" ? "PASS" : "FAIL"} ${entry.id} ${formatDuration(durationMs)}${
          caseFailures.length > 0 ? ` (${caseFailures.length} issues)` : ""
        }`,
      );
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - suiteStartMs;
  const passedCaseCount = caseReports.filter((entry) => entry.status === "passed").length;
  const failedCaseCount = caseReports.filter((entry) => entry.status === "failed").length;
  const errorCaseCount = caseReports.filter((entry) => entry.status === "error").length;
  const slowestCases = [...caseReports]
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 5)
    .map((entry) => `${entry.id}:${formatDuration(entry.durationMs)}`);
  const report: RegressionRunReport = {
    startedAt,
    finishedAt,
    durationMs,
    totalCorpusCases: cases.length,
    selectedCaseCount: selectedCases.length,
    selectedCaseIds: selectedCases.map((entry) => entry.id),
    caseFilterIds: [...caseFilter],
    progressEnabled,
    passedCaseCount,
    failedCaseCount,
    errorCaseCount,
    failures,
    cases: caseReports,
  };

  writeRegressionReport(reportPath, report);

  console.log(
    `[dynamic-custom-regression] summary: ${passedCaseCount}/${selectedCases.length} passed, ${failedCaseCount} failed, ${errorCaseCount} errored in ${formatDuration(durationMs)}`,
  );
  if (slowestCases.length > 0) {
    console.log(
      `[dynamic-custom-regression] slowest: ${slowestCases.join(", ")}`,
    );
  }
  if (reportPath) {
    console.log(`[dynamic-custom-regression] report written to ${reportPath}`);
  }

  if (failures.length > 0) {
    console.error(`dynamic-custom regression failed (${failures.length} issues)`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `dynamic-custom regression passed (${selectedCases.length}/${cases.length} selected cases; ${corpus.goldenPrompts.length} golden + ${corpus.conflictPrompts.length} conflict prompts in corpus)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
