#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  allowsViewportCritiqueAcceptance as allowsViewportCritiqueAcceptanceFromLib,
  attachVisionCritiqueTransport as attachVisionCritiqueTransportFromLib,
  buildCompactRenderCritiqueInput as buildCompactRenderCritiqueInputFromLib,
  buildVisionCritiquePayloadContract as buildVisionCritiquePayloadContractFromLib,
  buildVisionCritiqueTransport as buildVisionCritiqueTransportFromLib,
  buildRepresentationDrivenRepairActions as buildRepresentationDrivenRepairActionsFromLib,
  buildFallbackReadOrderTargets as buildFallbackReadOrderTargetsFromLib,
  canonicalizeVisualCritiqueReport as canonicalizeVisualCritiqueReportFromLib,
  getRenderCritiqueTransportTimeoutMs as getRenderCritiqueTransportTimeoutMsFromLib,
  inferDominantFailureLayerFromReport as inferDominantFailureLayerFromReportFromLib,
  inferNextPassPriorityFromFailureLayer as inferNextPassPriorityFromFailureLayerFromLib,
  inferRebuildDirectiveFromFailureLayer as inferRebuildDirectiveFromFailureLayerFromLib,
  inferTargetDepthProfile as inferTargetDepthProfileFromLib,
  mergeRenderRepairActions as mergeRenderRepairActionsFromLib,
  selectRenderCritiqueViewsForTransport as selectRenderCritiqueViewsForTransportFromLib,
  shouldPreferChatCompletionsForRenderCritique as shouldPreferChatCompletionsForRenderCritiqueFromLib,
} from "./lib/runtime-visual-critique.mjs";
import {
  applyLlmRequestConfigToEnv,
  getAiProviderLabel,
  resolveLlmProviderConfig,
} from "./lib/llm-provider-routing.mjs";
import {
  applyChestWrapCompactEnvelopeClamp as applyChestWrapCompactEnvelopeClampFromLib,
  buildCapabilityEscalationBootstrapRepairActions as buildCapabilityEscalationBootstrapRepairActionsFromLib,
  applyHardSurfaceOutlineCompiler as applyHardSurfaceOutlineCompilerFromLib,
  applyHardSurfaceVariantRepresentationOverrides as applyHardSurfaceVariantRepresentationOverridesFromLib,
  applyHardSurfacePrecisionShapeToScale as applyHardSurfacePrecisionShapeToScaleFromLib,
  buildRuntimeRepairActions as buildRuntimeRepairActionsFromLib,
  getCapabilityPlacementRecoveryOffset as getCapabilityPlacementRecoveryOffsetFromLib,
  getCapabilityRootEmbedStrength as getCapabilityRootEmbedStrengthFromLib,
  getCoarseAccessoryScaleMultiplier as getCoarseAccessoryScaleMultiplierFromLib,
  getHardSurfaceAssemblyOutwardShift as getHardSurfaceAssemblyOutwardShiftFromLib,
  getHardSurfaceCritiqueLightingProfile as getHardSurfaceCritiqueLightingProfileFromLib,
  getHardSurfaceEarAxisScaleClamp as getHardSurfaceEarAxisScaleClampFromLib,
  getHardSurfaceHostFitOffset as getHardSurfaceHostFitOffsetFromLib,
  getHardSurfaceHostFitScaleClamp as getHardSurfaceHostFitScaleClampFromLib,
  getHardSurfaceProgressivePartIds as getHardSurfaceProgressivePartIdsFromLib,
  getHardSurfaceReadabilityMaterialPolicy as getHardSurfaceReadabilityMaterialPolicyFromLib,
  getIdealAccessoryScaleMultiplier as getIdealAccessoryScaleMultiplierFromLib,
  getPartSpanMeasure as getPartSpanMeasureFromLib,
  getPreferredPrecisionOffset as getPreferredPrecisionOffsetFromLib,
  getPreferredRecoveryVariantId as getPreferredRecoveryVariantIdFromLib,
  getRoleEmphasisMultiplier as getRoleEmphasisMultiplierFromLib,
  hasPlannerBackedRuntimeContract as hasPlannerBackedRuntimeContractFromLib,
  isDeviceFamilyRuntimeAccessory as isDeviceFamilyRuntimeAccessoryFromLib,
  isHardSurfaceOpenNounExecution as isHardSurfaceOpenNounExecutionFromLib,
  projectHardSurfaceEarSideAnchorPose as projectHardSurfaceEarSideAnchorPoseFromLib,
  rebalanceRuntimePartBlueprintBasesBySpanTargets as rebalanceRuntimePartBlueprintBasesBySpanTargetsFromLib,
  syncPartGraphLocalOffsetsWithGeometryRecipe as syncPartGraphLocalOffsetsWithGeometryRecipeFromLib,
  shouldSwitchBlueprintVariant as shouldSwitchBlueprintVariantFromLib,
  usesProjectedEarSideAnchorPose as usesProjectedEarSideAnchorPoseFromLib,
} from "./lib/hard-surface-runtime-policy.mjs";
import {
  buildRuntimeFailureLayerController,
  buildRuntimeStopDiagnosticNotes,
  buildRuntimeStopDiagnostics,
  countConsecutiveExecutionFailureLayerSnapshots,
  detectExecutionSnapshotPlateau,
  normalizeRuntimeStopDiagnostics,
  selectDominantRuntimeController,
} from "./lib/runtime-stop-diagnostics.mjs";
import {
  selectPreferredExecutionSnapshots,
} from "./lib/runtime-best-attempt.mjs";
import {
  synchronizeRuntimeTruthSources,
} from "./lib/runtime-truth-source-sync.mjs";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "output", "mock-generations");
const foxBaseContractFile = path.join(
  projectRoot,
  ...(process.env.FOX_BASE_CONTRACT_FILE
    ? process.env.FOX_BASE_CONTRACT_FILE.split("/")
    : ["assets", "fox-base", "fox-base-v10.contract.json"]),
);
const foxBaseContract = JSON.parse(
  await readFile(foxBaseContractFile, "utf8"),
);
const currentTemplateVersion = foxBaseContract.templateVersion;
const foxBaseTemplateSource = path.join(
  projectRoot,
  foxBaseContract.exportFiles.runtimeTemplateFile ??
    foxBaseContract.exportFiles.modelFile,
);
const foxBasePosterStageSource = path.join(
  projectRoot,
  foxBaseContract.exportFiles.stageFile,
);
const execFileAsync = promisify(execFile);
const renderingRecoveryWindowMs = Number(
  process.env.BLENDER_MCP_RENDERING_RECOVERY_MS ?? "300000",
);
const workerLockStaleMs = Number(
  process.env.BLENDER_MCP_WORKER_LOCK_STALE_MS ?? "1800000",
);
const workerLeaseId = `${process.pid}:${Date.now()}:${Math.random()
  .toString(36)
  .slice(2, 10)}`;
const debugWorkerCoordination = process.env.PROMPTPET_DEBUG_WORKER_COORDINATION === "1";

function getParserSourceLabel(source = "rule-fallback") {
  if (source === "deepseek") {
    return "DeepSeek 结构化解析";
  }

  if (source === "openai") {
    return "OpenAI 结构化解析";
  }

  return "规则回退解析";
}

function supportsRemoteRenderCritique(config) {
  return config?.provider === "openai";
}

function getOpenAiRenderCritiqueTimeoutMs() {
  const value = Number(
    process.env.VISION_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.LLM_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.DEEPSEEK_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.OPENAI_RENDER_CRITIQUE_TIMEOUT_MS ??
      "20000",
  );
  return Number.isFinite(value) && value >= 5000 ? value : 20000;
}

function getRenderCritiqueTransportTimeoutMs(config, critiqueViews = []) {
  return getRenderCritiqueTransportTimeoutMsFromLib(config, critiqueViews);
}

function shouldPreferChatCompletionsForRenderCritique(config) {
  return shouldPreferChatCompletionsForRenderCritiqueFromLib(config);
}

function selectRenderCritiqueViewsForTransport(config, critiqueViews) {
  return selectRenderCritiqueViewsForTransportFromLib(config, critiqueViews);
}

function buildCompactRenderCritiqueInput(critiqueInput) {
  return buildCompactRenderCritiqueInputFromLib(critiqueInput);
}

function buildVisionCritiquePayloadContract(critiqueInput, critiqueViews) {
  return buildVisionCritiquePayloadContractFromLib(critiqueInput, critiqueViews);
}

function buildVisionCritiqueTransport(options) {
  return buildVisionCritiqueTransportFromLib(options);
}

function attachVisionCritiqueTransport(report, transport) {
  return attachVisionCritiqueTransportFromLib(report, transport);
}

function buildRepresentationDrivenRepairActions(report) {
  return buildRepresentationDrivenRepairActionsFromLib(report);
}

function logOpenAiCritiqueDebug(message) {
  if (process.env.PROMPTPET_DEBUG_OPENAI_CRITIQUE !== "1") {
    return;
  }

  console.log(`[blender-mcp-worker] openai-critique ${message}`);
}

function shouldAttemptRenderCritiqueChatFallback(failureNote) {
  if (typeof failureNote !== "string" || !failureNote.trim()) {
    return true;
  }

  return !/HTTP 401|HTTP 403|HTTP 429|未授权|权限|invalid api key|额度限制|速率|请求超时|chat\/completions 请求超时/i.test(
    failureNote,
  );
}

function isRenderCritiqueTimeoutFailure(failureNote) {
  return (
    typeof failureNote === "string" &&
    /deadline-exceeded|timeout|请求超时|超时/i.test(failureNote)
  );
}

async function fetchWithDeadline(url, options = {}, timeoutMs = getOpenAiRenderCritiqueTimeoutMs()) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort(new Error(`deadline-exceeded:${timeoutMs}`));
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`deadline-exceeded:${timeoutMs}`)), timeoutMs),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractOpenAiText(payload) {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  const parts = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const part of item.content) {
      if (isRecord(part) && typeof part.text === "string" && part.text.trim()) {
        parts.push(part.text.trim());
      }
    }
  }

  return parts.length > 0 ? parts.join("\n").trim() : null;
}

function extractChatCompletionText(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const choice = payload.choices[0];

  if (!isRecord(choice) || !isRecord(choice.message)) {
    return null;
  }

  const content = choice.message.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content
    .map((entry) =>
      isRecord(entry) && typeof entry.text === "string" ? entry.text.trim() : null,
    )
    .filter((value) => typeof value === "string" && value.length > 0);

  return parts.length > 0 ? parts.join("\n").trim() : null;
}

function getOpenAiFailureNote(status, rawText, provider = "openai") {
  const providerLabel = getAiProviderLabel(provider);
  const compact = typeof rawText === "string" ? rawText.replace(/\s+/g, " ").trim() : "";

  if (status === 401) {
    return `${providerLabel} API key 无效、已过期，或当前 keychain 条目不可用。`;
  }

  if (status === 429) {
    return `${providerLabel} render critique 触发了速率或额度限制。`;
  }

  if (status >= 500) {
    return `${providerLabel} render critique 服务暂时不可用。`;
  }

  return compact
    ? `${providerLabel} render critique 当前不可用（HTTP ${status}: ${compact.slice(0, 160)}）。`
    : `${providerLabel} render critique 当前不可用（HTTP ${status}）。`;
}

const openAiRenderCritiqueSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "requestedNoun",
    "renderNounFidelity",
    "criticalPartsVisible",
    "silhouetteReadability",
    "lookalikeRisk",
    "cohesionScore",
    "cohesionIssues",
    "dominantFailureMode",
    "oversizeParts",
    "hiddenCriticalParts",
    "flattenedStructureParts",
    "flattenedPartIds",
    "detachedPartIds",
    "hostInterferenceZones",
    "hostIntrusionZones",
    "silhouetteBreakpoints",
    "dominantSpanOwner",
    "faceIntrusionSeverity",
    "partAttachmentCredibility",
    "nounReadOrder",
    "finalReadOrder",
    "firstReadPart",
    "dominantFailureLayer",
    "rootSilhouetteFailure",
    "assemblyFailure",
    "hostFitFailure",
    "readOrderFailure",
    "rebuildDirective",
    "targetRootSpan",
    "targetDepthProfile",
    "targetAttachmentPose",
    "nextPassPriority",
    "firstReadResult",
    "visualVeto",
    "visualVetoReason",
    "variantSwitchRecommended",
    "repairIntensityHints",
    "repairActions",
    "actualApproximationLabel",
    "summary",
  ],
  properties: {
    requestedNoun: { type: "string" },
    renderNounFidelity: { type: "number", minimum: 0, maximum: 1 },
    criticalPartsVisible: { type: "number", minimum: 0, maximum: 1 },
    silhouetteReadability: { type: "number", minimum: 0, maximum: 1 },
    lookalikeRisk: { type: "number", minimum: 0, maximum: 1 },
    cohesionScore: { type: "number", minimum: 0, maximum: 1 },
    cohesionIssues: {
      type: "array",
      items: { type: "string" },
    },
    dominantFailureMode: { type: "string" },
    oversizeParts: {
      type: "array",
      items: { type: "string" },
    },
    hiddenCriticalParts: {
      type: "array",
      items: { type: "string" },
    },
    flattenedStructureParts: {
      type: "array",
      items: { type: "string" },
    },
    flattenedPartIds: {
      type: "array",
      items: { type: "string" },
    },
    detachedPartIds: {
      type: "array",
      items: { type: "string" },
    },
    hostInterferenceZones: {
      type: "array",
      items: { type: "string" },
    },
    hostIntrusionZones: {
      type: "array",
      items: { type: "string" },
    },
    silhouetteBreakpoints: {
      type: "array",
      items: { type: "string" },
    },
    dominantSpanOwner: { type: "string" },
    faceIntrusionSeverity: { type: "number", minimum: 0, maximum: 1 },
    partAttachmentCredibility: { type: "number", minimum: 0, maximum: 1 },
    nounReadOrder: {
      type: "array",
      items: { type: "string" },
    },
    finalReadOrder: {
      type: "array",
      items: { type: "string" },
    },
    firstReadPart: { type: "string" },
    dominantFailureLayer: {
      type: "string",
      enum: [
        "silhouette",
        "assembly",
        "host-fit",
        "render-readability",
        "anchor-projection",
        "outline-compiler",
        "attachment-cohesion",
        "critique-timeout",
      ],
    },
    rootSilhouetteFailure: { type: "string" },
    assemblyFailure: { type: "string" },
    hostFitFailure: { type: "string" },
    readOrderFailure: { type: "string" },
    rebuildDirective: {
      type: "string",
      enum: [
        "blocking",
        "silhouette-forming",
        "assembly-rooting",
        "host-fit",
        "render-driven-rebuild",
        "final-review",
      ],
    },
    targetRootSpan: {
      type: "array",
      items: { type: "number" },
      minItems: 3,
      maxItems: 3,
    },
    targetDepthProfile: {
      type: "string",
      enum: ["balanced", "front-loaded", "rear-loaded", "thin-slab", "deep-body"],
    },
    targetAttachmentPose: { type: "string" },
    projectedAnchorPose: {
      type: "array",
      items: { type: "number" },
      minItems: 3,
      maxItems: 3,
    },
    anchorPlaneOffset: {
      type: "array",
      items: { type: "number" },
      minItems: 3,
      maxItems: 3,
    },
    earSideTangentOffset: {
      type: "array",
      items: { type: "number" },
      minItems: 3,
      maxItems: 3,
    },
    anchorProjectionFailureKind: {
      type: "string",
      enum: ["face-intrusion", "floating-off-ear", "readability-on-plane"],
    },
    outlineCompilerMode: {
      type: "string",
      enum: ["device-front-facing", "vehicle-upright-outline", "generic-profile-relief"],
    },
    outlineProjectionVariantId: { type: "string" },
    nextPassPriority: {
      type: "string",
      enum: [
        "blocking",
        "silhouette-forming",
        "assembly-rooting",
        "host-fit",
        "render-driven-rebuild",
        "final-review",
      ],
    },
    firstReadResult: { type: "string" },
    visualVeto: { type: "boolean" },
    visualVetoReason: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    variantSwitchRecommended: { type: "boolean" },
    repairIntensityHints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actionType", "intensity"],
        properties: {
          actionType: {
            type: "string",
            enum: [
              "insert-missing-part",
              "split-merged-part",
              "reshape-silhouette",
              "rebalance-part-ratio",
              "re-anchor",
              "re-orient",
              "re-materialize-color-zone",
              "tighten-cohesion",
              "re-parent-part",
              "rebuild-from-root",
              "promote-critical-part",
            ],
          },
          intensity: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    repairActions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actionType", "reason", "source", "intensity"],
        properties: {
          actionType: {
            type: "string",
            enum: [
              "insert-missing-part",
              "split-merged-part",
              "reshape-silhouette",
              "rebalance-part-ratio",
              "re-anchor",
              "re-orient",
              "re-materialize-color-zone",
              "tighten-cohesion",
              "re-parent-part",
              "rebuild-from-root",
              "promote-critical-part",
            ],
          },
          reason: { type: "string" },
          source: {
            type: "string",
            enum: ["structural", "visual", "hybrid"],
          },
          targetPartIds: {
            type: "array",
            items: { type: "string" },
          },
          targetRoles: {
            type: "array",
            items: { type: "string" },
          },
          intensity: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    actualApproximationLabel: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    summary: { type: "string" },
  },
};

function srgbChannelToLinear(value) {
  const normalized = value / 255;

  if (normalized <= 0.04045) {
    return Number((normalized / 12.92).toFixed(6));
  }

  return Number((((normalized + 0.055) / 1.055) ** 2.4).toFixed(6));
}

function hexToLinearRgba(hex, alpha = 1) {
  const sanitized = hex.replace("#", "");
  const value = sanitized.length === 3
    ? sanitized
        .split("")
        .map((segment) => segment + segment)
        .join("")
    : sanitized;

  return [
    srgbChannelToLinear(Number.parseInt(value.slice(0, 2), 16)),
    srgbChannelToLinear(Number.parseInt(value.slice(2, 4), 16)),
    srgbChannelToLinear(Number.parseInt(value.slice(4, 6), 16)),
    alpha,
  ];
}

function mixLinearRgba(left, right, ratio) {
  const blend = Math.max(0, Math.min(1, ratio));
  const safeLeft = Array.isArray(left) ? left : [0, 0, 0, 1];
  const safeRight = Array.isArray(right) ? right : [0, 0, 0, 1];

  return [0, 1, 2, 3].map((index) =>
    Number(
      (
        (safeLeft[index] ?? (index === 3 ? 1 : 0)) * (1 - blend) +
        (safeRight[index] ?? (index === 3 ? 1 : 0)) * blend
      ).toFixed(4),
    ),
  );
}

const styleProfiles = {
  "cream-toy": {
    label: "奶油玩具感",
    palette: {
      bodyColor: hexToLinearRgba("#D1956F"),
      detailColor: hexToLinearRgba("#F6E6D9"),
      accentColor: hexToLinearRgba("#6A3C33"),
      eyeColor: hexToLinearRgba("#1F1412"),
      glowColor: hexToLinearRgba("#FFC6A8"),
      accessoryColor: hexToLinearRgba("#D7A954"),
    },
    materials: {
      bodyRoughness: 0.46,
      bodyMetallic: 0.02,
      detailRoughness: 0.58,
      accentRoughness: 0.38,
      eyeRoughness: 0.12,
      glowRoughness: 0.24,
      accessoryRoughness: 0.28,
      bodyEmissionStrength: 0.06,
      accentEmissionStrength: 0.04,
      eyeEmissionStrength: 0.12,
      glowEmissionStrength: 0.48,
      accessoryEmissionStrength: 0.04,
    },
    variant: {
      bodyScale: [1.04, 1.03, 1.08],
      headScale: [1.0, 1.0, 1.0],
      tailScale: [1.03, 1.03, 1.05],
      tailTipScale: [1.0, 1.0, 1.0],
      eyeScale: [1.06, 1.06, 1.06],
    },
  },
  "low-poly": {
    label: "低模卡通感",
    palette: {
      bodyColor: hexToLinearRgba("#A86846"),
      detailColor: hexToLinearRgba("#F1E5D8"),
      accentColor: hexToLinearRgba("#513D35"),
      eyeColor: hexToLinearRgba("#171515"),
      glowColor: hexToLinearRgba("#E6D6CA"),
      accessoryColor: hexToLinearRgba("#687A63"),
    },
    materials: {
      bodyRoughness: 0.74,
      bodyMetallic: 0.0,
      detailRoughness: 0.78,
      accentRoughness: 0.7,
      eyeRoughness: 0.24,
      glowRoughness: 0.5,
      accessoryRoughness: 0.68,
      bodyEmissionStrength: 0.0,
      accentEmissionStrength: 0.0,
      eyeEmissionStrength: 0.02,
      glowEmissionStrength: 0.0,
      accessoryEmissionStrength: 0.0,
    },
    variant: {
      bodyScale: [1.02, 1.02, 1.05],
      headScale: [0.99, 0.99, 0.99],
      tailScale: [0.99, 0.99, 1.02],
      tailTipScale: [0.98, 0.98, 0.98],
      eyeScale: [0.97, 0.97, 0.97],
    },
  },
  "dream-glow": {
    label: "梦幻发光感",
    palette: {
      bodyColor: hexToLinearRgba("#B487B5"),
      detailColor: hexToLinearRgba("#FAEEF7"),
      accentColor: hexToLinearRgba("#7C5EC0"),
      eyeColor: hexToLinearRgba("#241523"),
      glowColor: hexToLinearRgba("#FFB8D5"),
      accessoryColor: hexToLinearRgba("#F5D8FF"),
    },
    materials: {
      bodyRoughness: 0.36,
      bodyMetallic: 0.02,
      detailRoughness: 0.4,
      accentRoughness: 0.24,
      eyeRoughness: 0.1,
      glowRoughness: 0.16,
      accessoryRoughness: 0.22,
      bodyEmissionStrength: 0.14,
      accentEmissionStrength: 0.92,
      eyeEmissionStrength: 0.54,
      glowEmissionStrength: 2.1,
      accessoryEmissionStrength: 0.72,
    },
    variant: {
      bodyScale: [1.03, 1.02, 1.06],
      headScale: [1.01, 1.01, 1.01],
      tailScale: [1.05, 1.05, 1.08],
      tailTipScale: [1.03, 1.03, 1.03],
      eyeScale: [1.05, 1.05, 1.05],
    },
  },
};

const promptColorPalettes = [
  {
    keywords: ["荧光橙", "亮橘", "亮橙色", "neon orange"],
    palette: {
      bodyColor: hexToLinearRgba("#FF8F1F"),
      detailColor: hexToLinearRgba("#FFF4E5"),
      accentColor: hexToLinearRgba("#C85B0B"),
      glowColor: hexToLinearRgba("#FFD089"),
      accessoryColor: hexToLinearRgba("#E06E18"),
    },
  },
  {
    keywords: ["橙色", "橘色", "orange"],
    palette: {
      bodyColor: hexToLinearRgba("#F28A2E"),
      detailColor: hexToLinearRgba("#FFF3E7"),
      accentColor: hexToLinearRgba("#B85A1E"),
      glowColor: hexToLinearRgba("#FFB46D"),
      accessoryColor: hexToLinearRgba("#D46C24"),
    },
  },
  {
    keywords: ["橘红色", "橘红", "橙红色", "橙红", "orange-red", "coral"],
    palette: {
      bodyColor: hexToLinearRgba("#F06A2A"),
      detailColor: hexToLinearRgba("#FFF2E8"),
      accentColor: hexToLinearRgba("#B5331F"),
      glowColor: hexToLinearRgba("#FF9A5C"),
      accessoryColor: hexToLinearRgba("#C53B21"),
    },
  },
  {
    keywords: ["紫红色", "紫红", "洋红", "玫红", "magenta", "fuchsia"],
    palette: {
      bodyColor: hexToLinearRgba("#C04578"),
      detailColor: hexToLinearRgba("#FFF1F6"),
      accentColor: hexToLinearRgba("#6D1B41"),
      glowColor: hexToLinearRgba("#FF9DCA"),
      accessoryColor: hexToLinearRgba("#9C2A60"),
    },
  },
  {
    keywords: ["大红色", "正红色", "正红", "深红", "红色", "red", "crimson"],
    palette: {
      bodyColor: hexToLinearRgba("#E14836"),
      detailColor: hexToLinearRgba("#FFF1EE"),
      accentColor: hexToLinearRgba("#99131D"),
      glowColor: hexToLinearRgba("#FF7A74"),
      accessoryColor: hexToLinearRgba("#B31E2A"),
    },
  },
  {
    keywords: ["蓝白", "蓝白色", "蓝色", "blue", "azure"],
    palette: {
      bodyColor: hexToLinearRgba("#8FBFE6"),
      detailColor: hexToLinearRgba("#FAFCFF"),
      accentColor: hexToLinearRgba("#587BAC"),
      glowColor: hexToLinearRgba("#A9E7FF"),
      accessoryColor: hexToLinearRgba("#5B84BD"),
    },
  },
  {
    keywords: ["银灰", "银灰色", "银色", "silver", "gray", "grey"],
    palette: {
      bodyColor: hexToLinearRgba("#B8BEC6"),
      detailColor: hexToLinearRgba("#F2F3F5"),
      accentColor: hexToLinearRgba("#6F7885"),
      glowColor: hexToLinearRgba("#D6DEFF"),
      accessoryColor: hexToLinearRgba("#7E8695"),
    },
  },
  {
    keywords: ["玫瑰粉", "粉色", "rose", "pink"],
    palette: {
      bodyColor: hexToLinearRgba("#DB9DA4"),
      detailColor: hexToLinearRgba("#F8E4E2"),
      accentColor: hexToLinearRgba("#8D4E5E"),
      glowColor: hexToLinearRgba("#FFB0C8"),
      accessoryColor: hexToLinearRgba("#B76173"),
    },
  },
  {
    keywords: ["紫色", "薰衣草紫", "lavender", "violet"],
    palette: {
      bodyColor: hexToLinearRgba("#B59DDC"),
      detailColor: hexToLinearRgba("#F5ECFB"),
      accentColor: hexToLinearRgba("#7658B8"),
      glowColor: hexToLinearRgba("#D7B8FF"),
      accessoryColor: hexToLinearRgba("#8B6DCE"),
    },
  },
  {
    keywords: ["绿色", "翠绿", "green"],
    palette: {
      bodyColor: hexToLinearRgba("#55B36F"),
      detailColor: hexToLinearRgba("#F2FBF4"),
      accentColor: hexToLinearRgba("#2C7042"),
      glowColor: hexToLinearRgba("#A8F3B8"),
      accessoryColor: hexToLinearRgba("#37A15A"),
    },
  },
  {
    keywords: ["褐色", "棕色", "咖啡色", "brown"],
    palette: {
      bodyColor: hexToLinearRgba("#7A543A"),
      detailColor: hexToLinearRgba("#F6EFE8"),
      accentColor: hexToLinearRgba("#4B2F1E"),
      glowColor: hexToLinearRgba("#C18A60"),
      accessoryColor: hexToLinearRgba("#5F402E"),
    },
  },
  {
    keywords: ["薄荷绿", "mint", "sage"],
    palette: {
      bodyColor: hexToLinearRgba("#9AB89A"),
      detailColor: hexToLinearRgba("#F1F5EE"),
      accentColor: hexToLinearRgba("#5A7A63"),
      glowColor: hexToLinearRgba("#B9F0CF"),
      accessoryColor: hexToLinearRgba("#557458"),
    },
  },
  {
    keywords: ["黑色", "纯黑", "乌黑", "black"],
    palette: {
      bodyColor: hexToLinearRgba("#2B242A"),
      detailColor: hexToLinearRgba("#F5EDF2"),
      accentColor: hexToLinearRgba("#120E13"),
      glowColor: hexToLinearRgba("#7E6C78"),
      accessoryColor: hexToLinearRgba("#1B1519"),
    },
  },
];

const hiddenAccessoryScale = [0.001, 0.001, 0.001];
const visibleAccessoryScales = {
  accessoryBell: [1.08, 1.08, 1.16],
  accessoryScarf: [1, 1, 1],
  accessoryFlower: [1, 1, 1],
  accessoryCrown: [1, 1, 1],
  accessoryTag: [1, 1, 1],
  accessoryTie: [1, 1, 1],
  accessoryBadge: [1, 1, 1],
  accessoryBow: [1, 1, 1],
  accessoryPendant: [1, 1, 1],
};

const accessoryLabels = {
  accessoryBell: "小铃铛",
  accessoryScarf: "小围巾",
  accessoryFlower: "耳边小花",
  accessoryCrown: "星冠",
  accessoryTag: "吊牌",
  accessoryTie: "小领带",
  accessoryBadge: "小徽章",
  accessoryBow: "蝴蝶结",
  accessoryPendant: "小吊坠",
  accessoryNone: "无配饰",
};

const supportedAccessoryDirectives = [
  {
    objectKey: "accessoryTie",
    label: "小领带",
    presentation: "default",
    keywords: ["领带", "necktie", "tie"],
  },
  {
    objectKey: "accessoryBadge",
    label: "小徽章",
    presentation: "default",
    keywords: ["徽章", "badge", "勋章", "胸针"],
  },
  {
    objectKey: "accessoryBow",
    label: "蝴蝶结",
    presentation: "default",
    keywords: ["蝴蝶结", "bow"],
  },
  {
    objectKey: "accessoryPendant",
    label: "小吊坠",
    presentation: "default",
    keywords: ["吊坠", "挂坠", "pendant"],
  },
  {
    objectKey: "accessoryBell",
    label: "小铃铛",
    presentation: "default",
    keywords: ["铃铛", "bell", "开运", "护符"],
  },
  {
    objectKey: "accessoryScarf",
    label: "小围巾",
    presentation: "default",
    keywords: ["围巾", "scarf", "披肩"],
  },
  {
    objectKey: "accessoryFlower",
    label: "耳边小花",
    presentation: "default",
    keywords: ["小花", "花", "flower", "雏菊"],
  },
  {
    objectKey: "accessoryCrown",
    label: "星冠",
    presentation: "default",
    keywords: ["皇冠", "星冠", "crown", "tiara"],
  },
  {
    objectKey: "accessoryTag",
    label: "吊牌",
    presentation: "default",
    keywords: ["吊牌", "tag"],
  },
];

const customizationProfileLabels = {
  "safe-overlay": "稳定定制",
  "experimental-addon": "实验定制",
};

const neutralFoxVariant = {
  bodyScale: [1, 1, 1],
  headScale: [1, 1, 1],
  tailScale: [1, 1, 1],
  tailTipScale: [1, 1, 1],
  eyeScale: [1, 1, 1],
};

function buildThemeDemoFiles(themeSlot) {
  return {
    model: path.join(
      projectRoot,
      "public",
      "demo",
      `${currentTemplateVersion}-${themeSlot}.glb`,
    ),
    poster: path.join(
      projectRoot,
      "public",
      "demo",
      `${currentTemplateVersion}-${themeSlot}-poster.png`,
    ),
    usdz: path.join(
      projectRoot,
      "public",
      "demo",
      `${currentTemplateVersion}-${themeSlot}.usdz`,
    ),
  };
}

const themeSlots = {
  "night-glow": {
    label: "夜灯精灵",
    keywords: ["夜", "月光", "星光", "发光", "霓虹", "glow", "aurora", "梦幻"],
    palette: {
      bodyColor: hexToLinearRgba("#B89CD8"),
      detailColor: hexToLinearRgba("#FCF2FA"),
      accentColor: hexToLinearRgba("#735AC4"),
      glowColor: hexToLinearRgba("#FFC2DB"),
      accessoryColor: hexToLinearRgba("#F6DEFF"),
    },
    accessory: "accessoryCrown",
    demoFiles: buildThemeDemoFiles("night-glow"),
    variant: {
      bodyScaleFactor: 1.02,
      headScaleFactor: 1.02,
      tailScaleFactor: 1.08,
      tailTipScaleFactor: 1.18,
      eyeScaleFactor: 1.08,
      glowFactor: 1.62,
    },
  },
  "cream-toy": {
    label: "奶油玩具",
    keywords: ["奶油", "玩具", "盲盒", "树脂", "cream", "toy"],
    palette: {
      bodyColor: hexToLinearRgba("#D8B18B"),
      detailColor: hexToLinearRgba("#FFF3E8"),
      accentColor: hexToLinearRgba("#81513F"),
      glowColor: hexToLinearRgba("#FFD0AD"),
      accessoryColor: hexToLinearRgba("#D5A85D"),
    },
    accessory: "accessoryTag",
    demoFiles: buildThemeDemoFiles("cream-toy"),
    variant: {
      bodyScaleFactor: 1.03,
      headScaleFactor: 1.02,
      tailScaleFactor: 1.04,
      tailTipScaleFactor: 1.01,
      eyeScaleFactor: 1.03,
      glowFactor: 1.04,
    },
  },
  "forest-scout": {
    label: "森林巡游",
    keywords: ["森林", "巡游", "探险", "冒险", "forest", "scout", "moss"],
    palette: {
      bodyColor: hexToLinearRgba("#B88F61"),
      detailColor: hexToLinearRgba("#F4EEE3"),
      accentColor: hexToLinearRgba("#5E7B56"),
      glowColor: hexToLinearRgba("#CDE1B7"),
      accessoryColor: hexToLinearRgba("#6E8758"),
    },
    accessory: "accessoryScarf",
    demoFiles: buildThemeDemoFiles("forest-scout"),
    variant: {
      bodyScaleFactor: 1.05,
      headScaleFactor: 0.99,
      tailScaleFactor: 1.06,
      tailTipScaleFactor: 1.04,
      eyeScaleFactor: 0.98,
      glowFactor: 0.96,
    },
  },
  "lucky-charm": {
    label: "幸运守护",
    keywords: ["幸运", "守护", "开运", "护符", "lucky", "charm"],
    palette: {
      bodyColor: hexToLinearRgba("#D49F73"),
      detailColor: hexToLinearRgba("#FFF0E5"),
      accentColor: hexToLinearRgba("#8F5843"),
      glowColor: hexToLinearRgba("#FFD89B"),
      accessoryColor: hexToLinearRgba("#E0B44F"),
    },
    accessory: "accessoryBell",
    demoFiles: {
      model: path.join(projectRoot, foxBaseContract.demoFiles.modelPath),
      poster: path.join(projectRoot, foxBaseContract.demoFiles.posterPath),
      usdz: path.join(projectRoot, foxBaseContract.demoFiles.usdzPath),
    },
    variant: {
      bodyScaleFactor: 1.04,
      headScaleFactor: 1.01,
      tailScaleFactor: 1.05,
      tailTipScaleFactor: 1.06,
      eyeScaleFactor: 1.03,
      glowFactor: 1.08,
    },
  },
  "strawberry-sweet": {
    label: "草莓甜点",
    keywords: ["草莓", "甜点", "莓果", "甜", "strawberry", "berry"],
    palette: {
      bodyColor: hexToLinearRgba("#DEA1AC"),
      detailColor: hexToLinearRgba("#FFF2F5"),
      accentColor: hexToLinearRgba("#B45E72"),
      glowColor: hexToLinearRgba("#FFC0D7"),
      accessoryColor: hexToLinearRgba("#ED819D"),
    },
    accessory: "accessoryFlower",
    demoFiles: buildThemeDemoFiles("strawberry-sweet"),
    variant: {
      bodyScaleFactor: 1.02,
      headScaleFactor: 1.01,
      tailScaleFactor: 1.04,
      tailTipScaleFactor: 1.08,
      eyeScaleFactor: 1.07,
      glowFactor: 1.12,
    },
  },
};

function detectThemeSlot(normalizedPrompt, styleKey) {
  const priorityOrder = [
    "night-glow",
    "forest-scout",
    "lucky-charm",
    "strawberry-sweet",
    "cream-toy",
  ];

  for (const themeSlot of priorityOrder) {
    const config = themeSlots[themeSlot];

    if (config.keywords.some((keyword) => normalizedPrompt.includes(keyword))) {
      return themeSlot;
    }
  }

  if (styleKey === "dream-glow") {
    return "night-glow";
  }

  if (styleKey === "low-poly") {
    return "forest-scout";
  }

  return "cream-toy";
}

const negationPrefixes = [
  "不要",
  "不要带",
  "别带",
  "不带",
  "不要挂",
  "别挂",
  "去掉",
  "拿掉",
  "取消",
  "没有",
  "无",
];

const noAccessoryPhrases = [
  "不要配饰",
  "不要任何配饰",
  "不要挂件",
  "不要饰品",
  "无配饰",
  "没有配饰",
  "不带配饰",
  "不要任何挂饰",
];

function hasNegatedKeyword(normalizedPrompt, keywords) {
  return keywords.some((keyword) =>
    negationPrefixes.some((prefix) =>
      [
        `${prefix}${keyword}`,
        `${prefix}小${keyword}`,
        `${prefix}一个${keyword}`,
        `${prefix}任何${keyword}`,
      ].some((phrase) => normalizedPrompt.includes(phrase)),
    ),
  );
}

function wantsNoAccessory(normalizedPrompt) {
  return noAccessoryPhrases.some((phrase) => normalizedPrompt.includes(phrase));
}

function detectAccessoryDirective(normalizedPrompt, themeSlot) {
  if (wantsNoAccessory(normalizedPrompt)) {
    return {
      objectKey: "accessoryNone",
      label: "无配饰",
      presentation: "none",
    };
  }

  const override = supportedAccessoryDirectives.find(({ keywords }) =>
    !hasNegatedKeyword(normalizedPrompt, keywords) &&
    keywords.some((keyword) => normalizedPrompt.includes(keyword)),
  );

  if (override) {
    return override;
  }

  const defaultAccessory = themeSlots[themeSlot].accessory;
  const defaultKeywords = supportedAccessoryDirectives
    .filter(({ objectKey }) => objectKey === defaultAccessory)
    .flatMap(({ keywords }) => keywords);

  if (defaultKeywords.length > 0 && hasNegatedKeyword(normalizedPrompt, defaultKeywords)) {
    return {
      objectKey: "accessoryNone",
      label: "无配饰",
      presentation: "none",
    };
  }

  return {
    objectKey: defaultAccessory,
    label: accessoryLabels[defaultAccessory],
    presentation: "default",
  };
}

function buildAccessoryScales(primaryAccessoryKey) {
  return {
    accessoryBell:
      primaryAccessoryKey === "accessoryBell"
        ? visibleAccessoryScales.accessoryBell
        : hiddenAccessoryScale,
    accessoryScarf:
      primaryAccessoryKey === "accessoryScarf"
        ? visibleAccessoryScales.accessoryScarf
        : hiddenAccessoryScale,
    accessoryFlower:
      primaryAccessoryKey === "accessoryFlower"
        ? visibleAccessoryScales.accessoryFlower
        : hiddenAccessoryScale,
    accessoryCrown:
      primaryAccessoryKey === "accessoryCrown"
        ? visibleAccessoryScales.accessoryCrown
        : hiddenAccessoryScale,
    accessoryTag:
      primaryAccessoryKey === "accessoryTag"
        ? visibleAccessoryScales.accessoryTag
        : hiddenAccessoryScale,
    accessoryTie:
      primaryAccessoryKey === "accessoryTie"
        ? visibleAccessoryScales.accessoryTie
        : hiddenAccessoryScale,
    accessoryBadge:
      primaryAccessoryKey === "accessoryBadge"
        ? visibleAccessoryScales.accessoryBadge
        : hiddenAccessoryScale,
    accessoryBow:
      primaryAccessoryKey === "accessoryBow"
        ? visibleAccessoryScales.accessoryBow
        : hiddenAccessoryScale,
    accessoryPendant:
      primaryAccessoryKey === "accessoryPendant"
        ? visibleAccessoryScales.accessoryPendant
        : hiddenAccessoryScale,
  };
}

function isThemeSlot(value) {
  return typeof value === "string" && value in themeSlots;
}

function isAccessoryKey(value) {
  return typeof value === "string" && value in accessoryLabels;
}

function getFoxThemeDefaultAccessory(themeSlot) {
  return isThemeSlot(themeSlot) ? themeSlots[themeSlot].accessory : "accessoryBell";
}

function isEyeMood(value) {
  return value === "neutral" || value === "gentle" || value === "alert";
}

function isGenerationMode(value) {
  return value === "fast-stable" || value === "dynamic-custom";
}

function isCustomizationProfile(value) {
  return value === "safe-overlay" || value === "experimental-addon";
}

function isCustomizationRecipe(value) {
  return isRecord(value) && typeof value.themeSlot === "string";
}

const accessoryFamilyToObjectKey = {
  bell: "accessoryBell",
  scarf: "accessoryScarf",
  flower: "accessoryFlower",
  crown: "accessoryCrown",
  tag: "accessoryTag",
  tie: "accessoryTie",
  badge: "accessoryBadge",
  bow: "accessoryBow",
  pendant: "accessoryPendant",
};

const supportedRuntimeAccessoryAnchors = new Set([
  "left-ear",
  "right-ear",
  "forehead",
  "head-top",
  "back-head",
  "chest",
  "chest-center",
  "chest-left",
  "chest-right",
  "tail-top",
  "tail-left",
  "tail-right",
  "tail-base",
]);

function normalizeRuntimeAccessoryAnchor(anchor, fallback = "chest-center") {
  if (anchor === "head") {
    return "forehead";
  }

  if (anchor === "chest") {
    return "chest-center";
  }

  return typeof anchor === "string" && supportedRuntimeAccessoryAnchors.has(anchor)
    ? anchor
    : fallback;
}

function isHeadRuntimeAnchor(anchor) {
  return (
    anchor === "left-ear" ||
    anchor === "right-ear" ||
    anchor === "forehead" ||
    anchor === "head-top" ||
    anchor === "back-head"
  );
}

function isChestRuntimeAnchor(anchor) {
  return (
    anchor === "chest" ||
    anchor === "chest-center" ||
    anchor === "chest-left" ||
    anchor === "chest-right"
  );
}

function isTailRuntimeAnchor(anchor) {
  return (
    anchor === "tail-top" ||
    anchor === "tail-left" ||
    anchor === "tail-right" ||
    anchor === "tail-base"
  );
}

function isExtendedCurveAnchor(anchor) {
  return (
    anchor === "head-top" ||
    anchor === "back-head" ||
    anchor === "chest-left" ||
    anchor === "chest-right" ||
    anchor === "tail-top" ||
    anchor === "tail-left" ||
    anchor === "tail-right" ||
    anchor === "tail-base"
  );
}

function getAccessoryObjectKeyFromFamily(family) {
  return typeof family === "string" ? accessoryFamilyToObjectKey[family] ?? null : null;
}

function getResolvedExecutionPlanFromCustomizations(customizations) {
  if (!isCustomizationRecipe(customizations) || !isRecord(customizations.resolvedExecutionPlan)) {
    return null;
  }

  const plan = customizations.resolvedExecutionPlan;
  const addAccessories = Array.isArray(plan.addAccessories)
    ? plan.addAccessories
        .filter((value) => isRecord(value) && typeof value.executionId === "string")
        .map((value) => ({
          executionId: value.executionId,
          requestId: typeof value.requestId === "string" ? value.requestId : "unknown-request",
          instanceId: typeof value.instanceId === "string" ? value.instanceId : value.executionId,
          nounDesignBriefId:
            typeof value.nounDesignBriefId === "string"
              ? value.nounDesignBriefId
              : undefined,
          partGraphId:
            typeof value.partGraphId === "string" ? value.partGraphId : undefined,
          family: typeof value.family === "string" ? value.family : "charm-token",
          requestedSemanticClass:
            typeof value.requestedSemanticClass === "string"
              ? value.requestedSemanticClass
              : undefined,
          requestedNoun:
            typeof value.requestedNoun === "string" ? value.requestedNoun : undefined,
          sourceMode:
            typeof value.sourceMode === "string" ? value.sourceMode : undefined,
          referenceConfidence:
            typeof value.referenceConfidence === "number"
              ? value.referenceConfidence
              : undefined,
          referenceId:
            typeof value.referenceId === "string" ? value.referenceId : undefined,
          referenceSourceKind:
            typeof value.referenceSourceKind === "string"
              ? value.referenceSourceKind
              : undefined,
          designArchetype:
            typeof value.designArchetype === "string"
              ? value.designArchetype
              : undefined,
          runtimeShapeClass:
            typeof value.runtimeShapeClass === "string"
              ? value.runtimeShapeClass
              : undefined,
          blueprintFamily:
            typeof value.blueprintFamily === "string" ? value.blueprintFamily : undefined,
          runtimeDesignContract: getRuntimeDesignContractFromValue(
            value.runtimeDesignContract,
          ),
          variantId:
            typeof value.variantId === "string" ? value.variantId : undefined,
          assemblyRootPartId:
            typeof value.assemblyRootPartId === "string"
              ? value.assemblyRootPartId
              : undefined,
          attachmentPartId:
            typeof value.attachmentPartId === "string"
              ? value.attachmentPartId
              : undefined,
          primarySilhouette:
            typeof value.primarySilhouette === "string"
              ? value.primarySilhouette
              : undefined,
          criticalParts: Array.isArray(value.criticalParts)
            ? value.criticalParts.filter((entry) => typeof entry === "string")
            : [],
          negativeLookalikes: Array.isArray(value.negativeLookalikes)
            ? value.negativeLookalikes.filter((entry) => typeof entry === "string")
            : [],
          readOrderTargets: Array.isArray(value.readOrderTargets)
            ? value.readOrderTargets.filter((entry) => typeof entry === "string")
            : [],
          criticalViewGoals: Array.isArray(value.criticalViewGoals)
            ? value.criticalViewGoals.filter((entry) => typeof entry === "string")
            : [],
          compilerIntent: isRecord(value.compilerIntent)
            ? {
                mountStrategy:
                  typeof value.compilerIntent.mountStrategy === "string"
                    ? value.compilerIntent.mountStrategy
                    : undefined,
                readOrderTargets: Array.isArray(value.compilerIntent.readOrderTargets)
                  ? value.compilerIntent.readOrderTargets.filter(
                      (entry) => typeof entry === "string",
                    )
                  : [],
                criticalViewGoals: Array.isArray(value.compilerIntent.criticalViewGoals)
                  ? value.compilerIntent.criticalViewGoals.filter(
                      (entry) => typeof entry === "string",
                    )
                  : [],
                deformationPolicy: Array.isArray(value.compilerIntent.deformationPolicy)
                  ? value.compilerIntent.deformationPolicy.filter(
                      (entry) => typeof entry === "string",
                    )
                  : [],
              }
            : undefined,
          shapeLabel:
            typeof value.shapeLabel === "string" && value.shapeLabel.trim()
              ? value.shapeLabel.trim()
              : "未命名配件",
          anchor: normalizeRuntimeAccessoryAnchor(value.anchor),
          requestedLabel:
            typeof value.requestedLabel === "string" ? value.requestedLabel : undefined,
          requestedAnchorPhrase:
            typeof value.requestedAnchorPhrase === "string"
              ? value.requestedAnchorPhrase
              : undefined,
          anchorResolutionSource:
            typeof value.anchorResolutionSource === "string"
              ? value.anchorResolutionSource
              : undefined,
          colorIntent:
            isRecord(value.colorIntent) &&
            typeof value.colorIntent.label === "string" &&
            typeof value.colorIntent.hex === "string"
              ? value.colorIntent
              : undefined,
          requestedColorText:
            typeof value.requestedColorText === "string"
              ? value.requestedColorText
              : undefined,
          executionMode:
            typeof value.executionMode === "string"
              ? value.executionMode
              : "approximate-fallback",
          fallbackFamily:
            typeof value.fallbackFamily === "string" ? value.fallbackFamily : undefined,
          fallbackLabel:
            typeof value.fallbackLabel === "string" ? value.fallbackLabel : undefined,
          resolvedLabel:
            typeof value.resolvedLabel === "string" ? value.resolvedLabel : undefined,
          actualGeneratedLabel:
            typeof value.actualGeneratedLabel === "string"
              ? value.actualGeneratedLabel
              : undefined,
          runtimeDesignTaskId:
            typeof value.runtimeDesignTaskId === "string"
              ? value.runtimeDesignTaskId
              : undefined,
          runtimeDesignSource:
            typeof value.runtimeDesignSource === "string"
              ? value.runtimeDesignSource
              : undefined,
          geometryRecipeId:
            typeof value.geometryRecipeId === "string"
              ? value.geometryRecipeId
              : undefined,
          fromThemeDefault: value.fromThemeDefault === true,
          notes: Array.isArray(value.notes)
            ? value.notes.filter((entry) => typeof entry === "string")
            : [],
          creationSource:
            typeof value.creationSource === "string"
              ? value.creationSource
              : "unfulfilled",
          executionStatus:
            typeof value.executionStatus === "string"
              ? value.executionStatus
              : "unfulfilled",
          approximationReason:
            typeof value.approximationReason === "string"
              ? value.approximationReason
              : undefined,
          failureReason:
            typeof value.failureReason === "string" ? value.failureReason : undefined,
          dominantFailureLayer:
            typeof value.dominantFailureLayer === "string"
              ? value.dominantFailureLayer
              : undefined,
          anchorProjectionFailureKind:
            typeof value.anchorProjectionFailureKind === "string"
              ? value.anchorProjectionFailureKind
              : undefined,
          projectedAnchorPose:
            Array.isArray(value.projectedAnchorPose) && value.projectedAnchorPose.length === 3
              ? value.projectedAnchorPose
              : undefined,
          anchorPlaneOffset:
            Array.isArray(value.anchorPlaneOffset) && value.anchorPlaneOffset.length === 3
              ? value.anchorPlaneOffset
              : undefined,
          earSideTangentOffset:
            Array.isArray(value.earSideTangentOffset) &&
            value.earSideTangentOffset.length === 3
              ? value.earSideTangentOffset
              : undefined,
          targetAnchorPosition:
            Array.isArray(value.targetAnchorPosition) &&
            value.targetAnchorPosition.length === 3
              ? value.targetAnchorPosition.map((entry) => Number(entry))
              : undefined,
          legacyAnchorPosition:
            Array.isArray(value.legacyAnchorPosition) &&
            value.legacyAnchorPosition.length === 3
              ? value.legacyAnchorPosition.map((entry) => Number(entry))
              : undefined,
          fittedAnchorPosition:
            Array.isArray(value.fittedAnchorPosition) &&
            value.fittedAnchorPosition.length === 3
              ? value.fittedAnchorPosition.map((entry) => Number(entry))
              : undefined,
          rawAnchorFitDelta:
            Array.isArray(value.rawAnchorFitDelta) &&
            value.rawAnchorFitDelta.length === 3
              ? value.rawAnchorFitDelta.map((entry) => Number(entry))
              : undefined,
          placementOffset:
            Array.isArray(value.placementOffset) && value.placementOffset.length === 3
              ? value.placementOffset.map((entry) => Number(entry))
              : undefined,
          desiredPlacementOffset:
            Array.isArray(value.desiredPlacementOffset) &&
            value.desiredPlacementOffset.length === 3
              ? value.desiredPlacementOffset.map((entry) => Number(entry))
              : undefined,
          overallScaleMultiplier:
            typeof value.overallScaleMultiplier === "number"
              ? Number(value.overallScaleMultiplier)
              : undefined,
          effectiveReferenceObject:
            typeof value.effectiveReferenceObject === "string"
              ? value.effectiveReferenceObject
              : undefined,
          referenceFallbackUsed: value.referenceFallbackUsed === true,
          referenceFallbackReason:
            typeof value.referenceFallbackReason === "string"
              ? value.referenceFallbackReason
              : undefined,
          finalReadOrder: Array.isArray(value.finalReadOrder)
            ? value.finalReadOrder.filter((entry) => typeof entry === "string")
            : [],
          rawFirstReadResult:
            typeof value.rawFirstReadResult === "string"
              ? value.rawFirstReadResult
              : undefined,
          firstReadResult:
            typeof value.firstReadResult === "string"
              ? value.firstReadResult
              : undefined,
          canonicalFirstRead:
            typeof value.canonicalFirstRead === "string"
              ? value.canonicalFirstRead
              : undefined,
          rawDominantSpanOwnerText:
            typeof value.rawDominantSpanOwnerText === "string"
              ? value.rawDominantSpanOwnerText
              : undefined,
          canonicalDominantSpanOwner:
            typeof value.canonicalDominantSpanOwner === "string"
              ? value.canonicalDominantSpanOwner
              : undefined,
          canonicalDetachedPartIds: Array.isArray(value.canonicalDetachedPartIds)
            ? value.canonicalDetachedPartIds.filter((entry) => typeof entry === "string")
            : [],
          canonicalFlattenedPartIds: Array.isArray(value.canonicalFlattenedPartIds)
            ? value.canonicalFlattenedPartIds.filter((entry) => typeof entry === "string")
            : [],
          visualVetoReason:
            typeof value.visualVetoReason === "string"
              ? value.visualVetoReason
              : undefined,
          visualAcceptanceGatePassed:
            typeof value.visualAcceptanceGatePassed === "boolean"
              ? value.visualAcceptanceGatePassed
              : undefined,
          visualFailureReasons: Array.isArray(value.visualFailureReasons)
            ? value.visualFailureReasons.filter((entry) => typeof entry === "string")
            : [],
          runtimeNodePrefix:
            typeof value.runtimeNodePrefix === "string"
              ? value.runtimeNodePrefix
              : undefined,
          exportedNodeNames: Array.isArray(value.exportedNodeNames)
            ? value.exportedNodeNames.filter((entry) => typeof entry === "string")
            : [],
          exportedPartIds: Array.isArray(value.exportedPartIds)
            ? value.exportedPartIds.filter((entry) => typeof entry === "string")
            : [],
        }))
    : [];

  return {
    removeDefaultAccessories: Array.isArray(plan.removeDefaultAccessories)
      ? plan.removeDefaultAccessories.filter((value) => typeof value === "string")
      : [],
    keepThemeDefaults: Array.isArray(plan.keepThemeDefaults)
      ? plan.keepThemeDefaults.filter((value) => typeof value === "string")
      : [],
    addAccessories,
    repairPassAllowed: plan.repairPassAllowed !== false,
    repairPassTriggered: plan.repairPassTriggered === true,
  };
}

function getPartProfilesFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      profile: typeof entry.profile === "string" ? entry.profile : "generic",
      silhouetteRole:
        typeof entry.silhouetteRole === "string" ? entry.silhouetteRole : "support",
      spanBias:
        typeof entry.spanBias === "number" ? Number(entry.spanBias.toFixed(4)) : undefined,
      depthBias:
        typeof entry.depthBias === "number" ? Number(entry.depthBias.toFixed(4)) : undefined,
      hostFitWeight:
        typeof entry.hostFitWeight === "number"
          ? Number(entry.hostFitWeight.toFixed(4))
          : undefined,
    }));
}

function getAttachmentRulesFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      parentPartId:
        typeof entry.parentPartId === "string" ? entry.parentPartId : undefined,
      mountFace: typeof entry.mountFace === "string" ? entry.mountFace : "center",
      edgeConstraint:
        typeof entry.edgeConstraint === "string" ? entry.edgeConstraint : "supported-branch",
      orientationConstraint:
        typeof entry.orientationConstraint === "string"
          ? entry.orientationConstraint
          : "follow-parent",
      allowedDrift:
        typeof entry.allowedDrift === "number"
          ? Number(entry.allowedDrift.toFixed(4))
          : 0.008,
      flushMount: entry.flushMount === true,
      embedDepth:
        typeof entry.embedDepth === "number"
          ? Number(entry.embedDepth.toFixed(4))
          : undefined,
      spanOwnership:
        typeof entry.spanOwnership === "string" ? entry.spanOwnership : "support",
      supportDependency:
        typeof entry.supportDependency === "string"
          ? entry.supportDependency
          : undefined,
    }));
}

function getPartImportanceWeightsFromValue(value) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, entry]) =>
          typeof key === "string" &&
          typeof entry === "number" &&
          Number.isFinite(entry),
      )
      .map(([key, entry]) => [key, Number(entry.toFixed(4))]),
  );
}

function getSilhouetteBlocksFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.blockId === "string")
    .map((entry) => ({
      blockId: entry.blockId,
      ownerPartId:
        typeof entry.ownerPartId === "string" ? entry.ownerPartId : undefined,
      semanticRole:
        typeof entry.semanticRole === "string" ? entry.semanticRole : "generic",
      profile: typeof entry.profile === "string" ? entry.profile : "generic",
      stage: typeof entry.stage === "string" ? entry.stage : "blocking",
      spanPriority:
        typeof entry.spanPriority === "number"
          ? Number(entry.spanPriority.toFixed(4))
          : 0.5,
      depthPriority:
        typeof entry.depthPriority === "number"
          ? Number(entry.depthPriority.toFixed(4))
          : 0.5,
    }));
}

function getAssemblySegmentsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.segmentId === "string")
    .map((entry) => ({
      segmentId: entry.segmentId,
      ownerPartId:
        typeof entry.ownerPartId === "string" ? entry.ownerPartId : undefined,
      parentSegmentId:
        typeof entry.parentSegmentId === "string"
          ? entry.parentSegmentId
          : undefined,
      relation:
        typeof entry.relation === "string" ? entry.relation : "rooted-mass",
      stage: typeof entry.stage === "string" ? entry.stage : "blocking",
      continuityWeight:
        typeof entry.continuityWeight === "number"
          ? Number(entry.continuityWeight.toFixed(4))
          : 0.5,
    }));
}

function getPartSpanTargetsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      minShare:
        typeof entry.minShare === "number"
          ? Number(entry.minShare.toFixed(4))
          : 0,
      maxShare:
        typeof entry.maxShare === "number"
          ? Number(entry.maxShare.toFixed(4))
          : 1,
    }));
}

function getPartDepthTargetsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      minDepth:
        typeof entry.minDepth === "number"
          ? Number(entry.minDepth.toFixed(4))
          : 0,
      maxDepth:
        typeof entry.maxDepth === "number"
          ? Number(entry.maxDepth.toFixed(4))
          : 1,
    }));
}

function getAttachmentAnchorsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        isRecord(entry) &&
        typeof entry.anchorId === "string" &&
        typeof entry.partId === "string",
    )
    .map((entry) => ({
      anchorId: entry.anchorId,
      partId: entry.partId,
      parentPartId:
        typeof entry.parentPartId === "string" ? entry.parentPartId : undefined,
      mountFace: typeof entry.mountFace === "string" ? entry.mountFace : "center",
      preferredOffset:
        Array.isArray(entry.preferredOffset) && entry.preferredOffset.length === 3
          ? entry.preferredOffset.map((value) => Number((value ?? 0).toFixed(4)))
          : undefined,
      flushMount: entry.flushMount === true,
      embedDepth:
        typeof entry.embedDepth === "number"
          ? Number(entry.embedDepth.toFixed(4))
          : undefined,
    }));
}

function getSilhouetteKeepoutsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.keepoutId === "string")
    .map((entry) => ({
      keepoutId: entry.keepoutId,
      partId: typeof entry.partId === "string" ? entry.partId : undefined,
      behavior:
        entry.behavior === "subordinate" ||
        entry.behavior === "keep-within-root" ||
        entry.behavior === "avoid-face-outline" ||
        entry.behavior === "rooted-only"
          ? entry.behavior
          : "subordinate",
      severity: entry.severity === "hard" ? "hard" : "soft",
    }));
}

function getNumberTupleFromValue(value) {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }

  const numbers = value.map((entry) =>
    typeof entry === "number" && Number.isFinite(entry)
      ? Number(entry.toFixed(4))
      : NaN,
  );

  return numbers.every((entry) => Number.isFinite(entry)) ? numbers : undefined;
}

function getRuntimeDesignContractFromValue(value) {
  if (!isRecord(value) || typeof value.contractId !== "string") {
    return undefined;
  }

  return {
    contractId: value.contractId,
    capabilityClass:
      typeof value.capabilityClass === "string"
        ? value.capabilityClass
        : "runtime-contract",
    requiredCapabilities: Array.isArray(value.requiredCapabilities)
      ? value.requiredCapabilities.filter((entry) => typeof entry === "string")
      : [],
    primaryReadTarget:
      typeof value.primaryReadTarget === "string"
        ? value.primaryReadTarget
        : undefined,
    requiredVisibleParts: Array.isArray(value.requiredVisibleParts)
      ? value.requiredVisibleParts.filter((entry) => typeof entry === "string")
      : [],
    hostNoGoZones: Array.isArray(value.hostNoGoZones)
      ? value.hostNoGoZones.filter((entry) => typeof entry === "string")
      : [],
    compositionEnvelope:
      typeof value.compositionEnvelope === "string"
        ? value.compositionEnvelope
        : undefined,
    targetAttachmentPose:
      typeof value.targetAttachmentPose === "string"
        ? value.targetAttachmentPose
        : undefined,
    anchorReferenceOffset: getNumberTupleFromValue(value.anchorReferenceOffset),
    desiredPlacementOffset: getNumberTupleFromValue(value.desiredPlacementOffset),
    anchorFitPolicy: isRecord(value.anchorFitPolicy)
      ? {
          blendWeights:
            getNumberTupleFromValue(value.anchorFitPolicy.blendWeights) ?? [0.2, 0.2, 0.2],
          maxDeltas:
            getNumberTupleFromValue(value.anchorFitPolicy.maxDeltas) ?? [0.018, 0.012, 0.018],
        }
      : undefined,
    hostFitEnvelope: isRecord(value.hostFitEnvelope)
      ? {
          anchorEnvelope:
            getNumberTupleFromValue(value.hostFitEnvelope.anchorEnvelope) ?? [0.032, 0.024, 0.034],
          maxSpan:
            getNumberTupleFromValue(value.hostFitEnvelope.maxSpan) ?? [0.036, 0.026, 0.038],
          preferredYaw:
            typeof value.hostFitEnvelope.preferredYaw === "number"
              ? Number(value.hostFitEnvelope.preferredYaw.toFixed(4))
              : undefined,
          screenFacingBias:
            typeof value.hostFitEnvelope.screenFacingBias === "number"
              ? Number(value.hostFitEnvelope.screenFacingBias.toFixed(4))
              : undefined,
          faceIntrusionBudget:
            typeof value.hostFitEnvelope.faceIntrusionBudget === "number"
              ? Number(value.hostFitEnvelope.faceIntrusionBudget.toFixed(4))
              : undefined,
          eyeKeepout: value.hostFitEnvelope.eyeKeepout === true,
          earClearance:
            typeof value.hostFitEnvelope.earClearance === "number"
              ? Number(value.hostFitEnvelope.earClearance.toFixed(4))
              : undefined,
        }
      : undefined,
    faceKeepoutZones: Array.isArray(value.faceKeepoutZones)
      ? value.faceKeepoutZones
          .filter((entry) => isRecord(entry) && typeof entry.zoneId === "string")
          .map((entry) => ({
            zoneId: entry.zoneId,
            label:
              typeof entry.label === "string" ? entry.label : entry.zoneId,
            severity: entry.severity === "hard" ? "hard" : "soft",
          }))
      : [],
    partRootingRules: Array.isArray(value.partRootingRules)
      ? value.partRootingRules
          .filter(
            (entry) =>
              isRecord(entry) &&
              typeof entry.partId === "string" &&
              typeof entry.parentPartId === "string",
          )
          .map((entry) => ({
            partId: entry.partId,
            parentPartId: entry.parentPartId,
            rule:
              entry.rule === "rooted-to-parent" || entry.rule === "emerge-from-parent"
                ? entry.rule
                : "rooted-to-parent",
          }))
      : [],
    criticalViewGoals: Array.isArray(value.criticalViewGoals)
      ? value.criticalViewGoals.filter((entry) => typeof entry === "string")
      : [],
    notes: Array.isArray(value.notes)
      ? value.notes.filter((entry) => typeof entry === "string")
      : [],
  };
}

function getStructuralBlueprintFromValue(value) {
  if (!isRecord(value) || typeof value.blueprintId !== "string") {
    return undefined;
  }

  return {
    blueprintId: value.blueprintId,
    requestedNoun:
      typeof value.requestedNoun === "string" ? value.requestedNoun : undefined,
    runtimeShapeClass:
      typeof value.runtimeShapeClass === "string"
        ? value.runtimeShapeClass
        : undefined,
    sourceMode:
      typeof value.sourceMode === "string" ? value.sourceMode : undefined,
    referenceConfidence:
      typeof value.referenceConfidence === "number"
        ? value.referenceConfidence
        : undefined,
    referenceId:
      typeof value.referenceId === "string" ? value.referenceId : undefined,
    referenceSourceKind:
      typeof value.referenceSourceKind === "string"
        ? value.referenceSourceKind
        : undefined,
    blueprintFamily:
      typeof value.blueprintFamily === "string" ? value.blueprintFamily : undefined,
    runtimeDesignContract: getRuntimeDesignContractFromValue(
      value.runtimeDesignContract,
    ),
    variantCandidates: getBlueprintVariantsFromValue(value.variantCandidates),
    primarySilhouette:
      typeof value.primarySilhouette === "string"
        ? value.primarySilhouette
        : "generic-ornament",
    silhouetteTemplate:
      typeof value.silhouetteTemplate === "string"
        ? value.silhouetteTemplate
        : undefined,
    silhouetteBlocks: getSilhouetteBlocksFromValue(value.silhouetteBlocks),
    assemblySegments: getAssemblySegmentsFromValue(value.assemblySegments),
    mountStrategy:
      typeof value.mountStrategy === "string" ? value.mountStrategy : undefined,
    readOrderTargets: Array.isArray(value.readOrderTargets)
      ? value.readOrderTargets.filter((entry) => typeof entry === "string")
      : [],
    criticalViewGoals: Array.isArray(value.criticalViewGoals)
      ? value.criticalViewGoals.filter((entry) => typeof entry === "string")
      : [],
    hostFitEnvelope: isRecord(value.hostFitEnvelope)
      ? {
          anchorEnvelope: Array.isArray(value.hostFitEnvelope.anchorEnvelope)
            ? value.hostFitEnvelope.anchorEnvelope.map((entry) => Number(entry))
            : [0.032, 0.024, 0.034],
          maxSpan: Array.isArray(value.hostFitEnvelope.maxSpan)
            ? value.hostFitEnvelope.maxSpan.map((entry) => Number(entry))
            : [0.036, 0.026, 0.038],
          preferredYaw:
            typeof value.hostFitEnvelope.preferredYaw === "number"
              ? Number(value.hostFitEnvelope.preferredYaw.toFixed(4))
              : undefined,
          screenFacingBias:
            typeof value.hostFitEnvelope.screenFacingBias === "number"
              ? Number(value.hostFitEnvelope.screenFacingBias.toFixed(4))
              : undefined,
          faceIntrusionBudget:
            typeof value.hostFitEnvelope.faceIntrusionBudget === "number"
              ? Number(value.hostFitEnvelope.faceIntrusionBudget.toFixed(4))
              : undefined,
          eyeKeepout: value.hostFitEnvelope.eyeKeepout === true,
          earClearance:
            typeof value.hostFitEnvelope.earClearance === "number"
              ? Number(value.hostFitEnvelope.earClearance.toFixed(4))
              : undefined,
        }
      : undefined,
    partSpanTargets: Array.isArray(value.partSpanTargets)
      ? getPartSpanTargetsFromValue(value.partSpanTargets)
      : [],
    partDepthTargets: Array.isArray(value.partDepthTargets)
      ? getPartDepthTargetsFromValue(value.partDepthTargets)
      : [],
    attachmentAnchors: Array.isArray(value.attachmentAnchors)
      ? getAttachmentAnchorsFromValue(value.attachmentAnchors)
      : [],
    faceKeepoutZones: Array.isArray(value.faceKeepoutZones)
      ? value.faceKeepoutZones
          .filter((entry) => isRecord(entry) && typeof entry.zoneId === "string")
          .map((entry) => ({
            zoneId: entry.zoneId,
            label:
              typeof entry.label === "string" ? entry.label : entry.zoneId,
            severity: entry.severity === "hard" ? "hard" : "soft",
          }))
      : [],
    silhouetteKeepouts: Array.isArray(value.silhouetteKeepouts)
      ? getSilhouetteKeepoutsFromValue(value.silhouetteKeepouts)
      : [],
    assemblyTensionProfile: isRecord(value.assemblyTensionProfile)
      ? {
          cohesionBias:
            typeof value.assemblyTensionProfile.cohesionBias === "number"
              ? Number(value.assemblyTensionProfile.cohesionBias.toFixed(4))
              : 0.8,
          attachmentCredibilityBias:
            typeof value.assemblyTensionProfile.attachmentCredibilityBias === "number"
              ? Number(value.assemblyTensionProfile.attachmentCredibilityBias.toFixed(4))
              : 0.8,
          rebuildPriority:
            typeof value.assemblyTensionProfile.rebuildPriority === "number"
              ? Number(value.assemblyTensionProfile.rebuildPriority.toFixed(4))
              : 0.7,
        }
      : undefined,
    dominantContour:
      typeof value.dominantContour === "string" ? value.dominantContour : undefined,
    sideDepthProfile:
      typeof value.sideDepthProfile === "string" ? value.sideDepthProfile : undefined,
    dominantSpanOwner:
      typeof value.dominantSpanOwner === "string" ? value.dominantSpanOwner : undefined,
    outlineProfile:
      typeof value.outlineProfile === "string" ? value.outlineProfile : undefined,
    reliefFeatureLayout: Array.isArray(value.reliefFeatureLayout)
      ? value.reliefFeatureLayout.filter((entry) => typeof entry === "string")
      : [],
    attachmentMask:
      typeof value.attachmentMask === "string" ? value.attachmentMask : undefined,
    profileVariantId:
      typeof value.profileVariantId === "string" ? value.profileVariantId : undefined,
    partProfiles: getPartProfilesFromValue(value.partProfiles),
    attachmentRules: getAttachmentRulesFromValue(value.attachmentRules),
    partImportanceWeights: getPartImportanceWeightsFromValue(
      value.partImportanceWeights,
    ),
    symmetryPolicy:
      typeof value.symmetryPolicy === "string"
        ? value.symmetryPolicy
        : "inherit-recipe",
    deformationPolicy: Array.isArray(value.deformationPolicy)
      ? value.deformationPolicy.filter((entry) => typeof entry === "string")
      : [],
  };
}

function getGeometryRecipesFromCustomizations(customizations) {
  if (!isCustomizationRecipe(customizations) || !Array.isArray(customizations.geometryRecipes)) {
    return [];
  }

  return customizations.geometryRecipes
    .filter((recipe) => isRecord(recipe) && typeof recipe.recipeId === "string")
    .map((recipe) => ({
      recipeId: recipe.recipeId,
      taskId: typeof recipe.taskId === "string" ? recipe.taskId : recipe.recipeId,
      requestId: typeof recipe.requestId === "string" ? recipe.requestId : "unknown-request",
      nounDesignBriefId:
        typeof recipe.nounDesignBriefId === "string"
          ? recipe.nounDesignBriefId
          : undefined,
      partGraphId:
        typeof recipe.partGraphId === "string" ? recipe.partGraphId : undefined,
      displayLabel:
        typeof recipe.displayLabel === "string" ? recipe.displayLabel : "未命名配件",
      requestedNoun:
        typeof recipe.requestedNoun === "string" ? recipe.requestedNoun : undefined,
      designArchetype:
        typeof recipe.designArchetype === "string"
          ? recipe.designArchetype
          : "known-family",
      runtimeShapeClass:
        typeof recipe.runtimeShapeClass === "string"
          ? recipe.runtimeShapeClass
          : undefined,
      sourceMode:
        typeof recipe.sourceMode === "string" ? recipe.sourceMode : undefined,
      referenceConfidence:
        typeof recipe.referenceConfidence === "number"
          ? recipe.referenceConfidence
          : undefined,
      referenceId:
        typeof recipe.referenceId === "string" ? recipe.referenceId : undefined,
      referenceSourceKind:
        typeof recipe.referenceSourceKind === "string"
          ? recipe.referenceSourceKind
          : undefined,
      blueprintFamily:
        typeof recipe.blueprintFamily === "string" ? recipe.blueprintFamily : undefined,
      runtimeDesignContract: getRuntimeDesignContractFromValue(
        recipe.runtimeDesignContract,
      ),
      variantCandidates: getBlueprintVariantsFromValue(recipe.variantCandidates),
      variantId:
        typeof recipe.variantId === "string" ? recipe.variantId : undefined,
      referenceDerivedBlueprint:
        isRecord(recipe.referenceDerivedBlueprint) &&
        typeof recipe.referenceDerivedBlueprint.referenceId === "string"
          ? {
              referenceId: recipe.referenceDerivedBlueprint.referenceId,
              requestedNoun:
                typeof recipe.referenceDerivedBlueprint.requestedNoun === "string"
                  ? recipe.referenceDerivedBlueprint.requestedNoun
                  : undefined,
              blueprintFamily:
                typeof recipe.referenceDerivedBlueprint.blueprintFamily === "string"
                  ? recipe.referenceDerivedBlueprint.blueprintFamily
                  : undefined,
              dominantSilhouette:
                typeof recipe.referenceDerivedBlueprint.dominantSilhouette === "string"
                  ? recipe.referenceDerivedBlueprint.dominantSilhouette
                  : undefined,
              criticalParts: Array.isArray(recipe.referenceDerivedBlueprint.criticalParts)
                ? recipe.referenceDerivedBlueprint.criticalParts.filter(
                    (value) => typeof value === "string",
                  )
                : [],
              readOrderTargets: Array.isArray(recipe.referenceDerivedBlueprint.readOrderTargets)
                ? recipe.referenceDerivedBlueprint.readOrderTargets.filter(
                    (value) => typeof value === "string",
                  )
                : [],
              depthProfile:
                typeof recipe.referenceDerivedBlueprint.depthProfile === "string"
                  ? recipe.referenceDerivedBlueprint.depthProfile
                  : undefined,
              attachmentPose:
                typeof recipe.referenceDerivedBlueprint.attachmentPose === "string"
                  ? recipe.referenceDerivedBlueprint.attachmentPose
                  : undefined,
              negativeLookalikes: Array.isArray(
                recipe.referenceDerivedBlueprint.negativeLookalikes,
              )
                ? recipe.referenceDerivedBlueprint.negativeLookalikes.filter(
                    (value) => typeof value === "string",
                  )
                : [],
              variantCandidates: getBlueprintVariantsFromValue(
                recipe.referenceDerivedBlueprint.variantCandidates,
              ),
              sourceKind:
                typeof recipe.referenceDerivedBlueprint.sourceKind === "string"
                  ? recipe.referenceDerivedBlueprint.sourceKind
                  : undefined,
              dominantContour:
                typeof recipe.referenceDerivedBlueprint.dominantContour === "string"
                  ? recipe.referenceDerivedBlueprint.dominantContour
                  : undefined,
              sideDepthProfile:
                typeof recipe.referenceDerivedBlueprint.sideDepthProfile === "string"
                  ? recipe.referenceDerivedBlueprint.sideDepthProfile
                  : undefined,
              partSpanTargets: getPartSpanTargetsFromValue(
                recipe.referenceDerivedBlueprint.partSpanTargets,
              ),
              partDepthTargets: getPartDepthTargetsFromValue(
                recipe.referenceDerivedBlueprint.partDepthTargets,
              ),
              attachmentAnchors: getAttachmentAnchorsFromValue(
                recipe.referenceDerivedBlueprint.attachmentAnchors,
              ),
              silhouetteKeepouts: getSilhouetteKeepoutsFromValue(
                recipe.referenceDerivedBlueprint.silhouetteKeepouts,
              ),
              dominantSpanOwner:
                typeof recipe.referenceDerivedBlueprint.dominantSpanOwner === "string"
                  ? recipe.referenceDerivedBlueprint.dominantSpanOwner
                  : undefined,
              outlineProfile:
                typeof recipe.referenceDerivedBlueprint.outlineProfile === "string"
                  ? recipe.referenceDerivedBlueprint.outlineProfile
                  : undefined,
              reliefFeatureLayout: Array.isArray(
                recipe.referenceDerivedBlueprint.reliefFeatureLayout,
              )
                ? recipe.referenceDerivedBlueprint.reliefFeatureLayout.filter(
                    (value) => typeof value === "string",
                  )
                : [],
              attachmentMask:
                typeof recipe.referenceDerivedBlueprint.attachmentMask === "string"
                  ? recipe.referenceDerivedBlueprint.attachmentMask
                  : undefined,
              profileVariantId:
                typeof recipe.referenceDerivedBlueprint.profileVariantId === "string"
                  ? recipe.referenceDerivedBlueprint.profileVariantId
                  : undefined,
            }
          : undefined,
      criticalParts: Array.isArray(recipe.criticalParts)
        ? recipe.criticalParts.filter((value) => typeof value === "string")
        : [],
      optionalParts: Array.isArray(recipe.optionalParts)
        ? recipe.optionalParts.filter((value) => typeof value === "string")
        : [],
      silhouetteBlocks: getSilhouetteBlocksFromValue(recipe.silhouetteBlocks),
      assemblySegments: getAssemblySegmentsFromValue(recipe.assemblySegments),
      mountStrategy:
        typeof recipe.mountStrategy === "string" ? recipe.mountStrategy : undefined,
      readOrderTargets: Array.isArray(recipe.readOrderTargets)
        ? recipe.readOrderTargets.filter((value) => typeof value === "string")
        : [],
      criticalViewGoals: Array.isArray(recipe.criticalViewGoals)
        ? recipe.criticalViewGoals.filter((value) => typeof value === "string")
        : [],
      structuralBlueprint: getStructuralBlueprintFromValue(recipe.structuralBlueprint),
      primarySilhouette:
        typeof recipe.primarySilhouette === "string"
          ? recipe.primarySilhouette
          : undefined,
      outlineProfile:
        typeof recipe.outlineProfile === "string" ? recipe.outlineProfile : undefined,
      reliefFeatureLayout: Array.isArray(recipe.reliefFeatureLayout)
        ? recipe.reliefFeatureLayout.filter((value) => typeof value === "string")
        : [],
      attachmentMask:
        typeof recipe.attachmentMask === "string" ? recipe.attachmentMask : undefined,
      profileVariantId:
        typeof recipe.profileVariantId === "string" ? recipe.profileVariantId : undefined,
      partProfiles: getPartProfilesFromValue(recipe.partProfiles),
      attachmentRules: getAttachmentRulesFromValue(recipe.attachmentRules),
      partImportanceWeights: getPartImportanceWeightsFromValue(
        recipe.partImportanceWeights,
      ),
      symmetryPolicy:
        typeof recipe.symmetryPolicy === "string"
          ? recipe.symmetryPolicy
          : undefined,
      deformationPolicy: Array.isArray(recipe.deformationPolicy)
        ? recipe.deformationPolicy.filter((value) => typeof value === "string")
        : [],
      negativeLookalikes: Array.isArray(recipe.negativeLookalikes)
        ? recipe.negativeLookalikes.filter((value) => typeof value === "string")
        : [],
      hangingStrategy:
        typeof recipe.hangingStrategy === "string"
          ? recipe.hangingStrategy
          : undefined,
      assemblyRootPartId:
        typeof recipe.assemblyRootPartId === "string"
          ? recipe.assemblyRootPartId
          : undefined,
      attachmentPartId:
        typeof recipe.attachmentPartId === "string"
          ? recipe.attachmentPartId
          : undefined,
      family: typeof recipe.family === "string" ? recipe.family : "charm-token",
      semanticClass:
        typeof recipe.semanticClass === "string" ? recipe.semanticClass : undefined,
      runtimeDesignSource:
        typeof recipe.runtimeDesignSource === "string"
          ? recipe.runtimeDesignSource
          : "rule-compiler",
      anchorOffsets: Array.isArray(recipe.anchorOffsets)
        ? recipe.anchorOffsets.map((value) => Number(value))
        : [0, 0, 0],
      orientationRules: Array.isArray(recipe.orientationRules)
        ? recipe.orientationRules.filter((value) => typeof value === "string")
        : [],
      materialZones: Array.isArray(recipe.materialZones)
        ? recipe.materialZones.filter((value) => typeof value === "string")
        : ["accessory"],
      parts: Array.isArray(recipe.parts)
        ? recipe.parts
            .filter((part) => isRecord(part) && typeof part.partId === "string")
            .map((part) => ({
              partId: part.partId,
              primitive: normalizeRuntimePrimitiveType(part.primitive),
              role: typeof part.role === "string" ? part.role : "part",
              size:
                typeof part.size === "number" && Number.isFinite(part.size)
                  ? Number(part.size.toFixed(4))
                  : 0.02,
              offset: Array.isArray(part.offset) ? part.offset.map((value) => Number(value)) : [0, 0, 0],
              scale: Array.isArray(part.scale) ? part.scale.map((value) => Number(value)) : [1, 1, 1],
              rotation: Array.isArray(part.rotation)
                ? part.rotation.map((value) => Number(value))
                : undefined,
              materialZone:
                typeof part.materialZone === "string" ? part.materialZone : "accessory",
            }))
        : [],
      partHierarchy: Array.isArray(recipe.partHierarchy)
        ? recipe.partHierarchy
            .filter(
              (entry) =>
                isRecord(entry) &&
                typeof entry.parentId === "string" &&
                typeof entry.childId === "string",
            )
            .map((entry) => ({
              parentId: entry.parentId,
              childId: entry.childId,
            }))
        : [],
      sizeBounds: isRecord(recipe.sizeBounds)
        ? {
            overallScale:
              typeof recipe.sizeBounds.overallScale === "number"
                ? recipe.sizeBounds.overallScale
                : 1,
            maxPartScale:
              typeof recipe.sizeBounds.maxPartScale === "number"
                ? recipe.sizeBounds.maxPartScale
                : 1.2,
            minPartCount:
              typeof recipe.sizeBounds.minPartCount === "number"
                ? recipe.sizeBounds.minPartCount
                : 1,
          }
        : {
            overallScale: 1,
            maxPartScale: 1.2,
            minPartCount: 1,
          },
      silhouetteChecks: Array.isArray(recipe.silhouetteChecks)
        ? recipe.silhouetteChecks.filter((value) => typeof value === "string")
        : [],
    }));
}

function getNounDesignBriefsFromCustomizations(customizations) {
  if (!isCustomizationRecipe(customizations) || !Array.isArray(customizations.nounDesignBriefs)) {
    return [];
  }

  return customizations.nounDesignBriefs
    .filter((brief) => isRecord(brief) && typeof brief.briefId === "string")
    .map((brief) => ({
      briefId: brief.briefId,
      taskId: typeof brief.taskId === "string" ? brief.taskId : brief.briefId,
      requestId: typeof brief.requestId === "string" ? brief.requestId : "unknown-request",
      requestedNoun:
        typeof brief.requestedNoun === "string" ? brief.requestedNoun : "未命名 noun",
      nounSpan: typeof brief.nounSpan === "string" ? brief.nounSpan : undefined,
      nounGloss: typeof brief.nounGloss === "string" ? brief.nounGloss : undefined,
      objectCategory:
        typeof brief.objectCategory === "string" ? brief.objectCategory : undefined,
      designArchetype:
        typeof brief.designArchetype === "string"
          ? brief.designArchetype
          : "generic-ornament",
      runtimeShapeClass:
        typeof brief.runtimeShapeClass === "string"
          ? brief.runtimeShapeClass
          : undefined,
      designConfidence:
        typeof brief.designConfidence === "number" ? brief.designConfidence : undefined,
      mustDistinctFromFallback: brief.mustDistinctFromFallback === true,
      sourceMode:
        typeof brief.sourceMode === "string" ? brief.sourceMode : undefined,
      referenceConfidence:
        typeof brief.referenceConfidence === "number"
          ? brief.referenceConfidence
          : undefined,
      referenceId:
        typeof brief.referenceId === "string" ? brief.referenceId : undefined,
      referenceSourceKind:
        typeof brief.referenceSourceKind === "string"
          ? brief.referenceSourceKind
          : undefined,
      blueprintFamily:
        typeof brief.blueprintFamily === "string" ? brief.blueprintFamily : undefined,
      runtimeDesignContract: getRuntimeDesignContractFromValue(
        brief.runtimeDesignContract,
      ),
      variantCandidates: getBlueprintVariantsFromValue(brief.variantCandidates),
      variantId:
        typeof brief.variantId === "string" ? brief.variantId : undefined,
      criticalParts: Array.isArray(brief.criticalParts)
        ? brief.criticalParts.filter((value) => typeof value === "string")
        : [],
      optionalParts: Array.isArray(brief.optionalParts)
        ? brief.optionalParts.filter((value) => typeof value === "string")
        : [],
      partGraphIntent:
        typeof brief.partGraphIntent === "string"
          ? brief.partGraphIntent
          : undefined,
      silhouetteGoals: Array.isArray(brief.silhouetteGoals)
        ? brief.silhouetteGoals.filter((value) => typeof value === "string")
        : [],
      negativeLookalikes: Array.isArray(brief.negativeLookalikes)
        ? brief.negativeLookalikes.filter((value) => typeof value === "string")
        : [],
      repairPriorities: Array.isArray(brief.repairPriorities)
        ? brief.repairPriorities.filter((value) => typeof value === "string")
        : [],
      hangingStrategy:
        typeof brief.hangingStrategy === "string"
          ? brief.hangingStrategy
          : undefined,
      assemblyRootPartId:
        typeof brief.assemblyRootPartId === "string"
          ? brief.assemblyRootPartId
          : undefined,
      attachmentPartId:
        typeof brief.attachmentPartId === "string"
          ? brief.attachmentPartId
          : undefined,
      silhouetteBlocks: getSilhouetteBlocksFromValue(brief.silhouetteBlocks),
      assemblySegments: getAssemblySegmentsFromValue(brief.assemblySegments),
      mountStrategy:
        typeof brief.mountStrategy === "string" ? brief.mountStrategy : undefined,
      readOrderTargets: Array.isArray(brief.readOrderTargets)
        ? brief.readOrderTargets.filter((value) => typeof value === "string")
        : [],
      criticalViewGoals: Array.isArray(brief.criticalViewGoals)
        ? brief.criticalViewGoals.filter((value) => typeof value === "string")
        : [],
      structuralBlueprint: getStructuralBlueprintFromValue(brief.structuralBlueprint),
      primarySilhouette:
        typeof brief.primarySilhouette === "string"
          ? brief.primarySilhouette
          : undefined,
      partProfiles: getPartProfilesFromValue(brief.partProfiles),
      attachmentRules: getAttachmentRulesFromValue(brief.attachmentRules),
      partImportanceWeights: getPartImportanceWeightsFromValue(
        brief.partImportanceWeights,
      ),
      symmetryPolicy:
        typeof brief.symmetryPolicy === "string"
          ? brief.symmetryPolicy
          : undefined,
      deformationPolicy: Array.isArray(brief.deformationPolicy)
        ? brief.deformationPolicy.filter((value) => typeof value === "string")
        : [],
      runtimeDesignSource:
        typeof brief.runtimeDesignSource === "string"
          ? brief.runtimeDesignSource
          : "rule-compiler",
    }));
}

function getAccessoryPartGraphsFromCustomizations(customizations) {
  if (!isCustomizationRecipe(customizations) || !Array.isArray(customizations.partGraphs)) {
    return [];
  }

  return customizations.partGraphs
    .filter((graph) => isRecord(graph) && typeof graph.graphId === "string")
    .map((graph) => ({
      graphId: graph.graphId,
      briefId: typeof graph.briefId === "string" ? graph.briefId : graph.graphId,
      taskId: typeof graph.taskId === "string" ? graph.taskId : graph.graphId,
      requestId: typeof graph.requestId === "string" ? graph.requestId : "unknown-request",
      requestedNoun:
        typeof graph.requestedNoun === "string" ? graph.requestedNoun : undefined,
      designArchetype:
        typeof graph.designArchetype === "string"
          ? graph.designArchetype
          : "generic-ornament",
      runtimeShapeClass:
        typeof graph.runtimeShapeClass === "string"
          ? graph.runtimeShapeClass
          : undefined,
      rootPartId:
        typeof graph.rootPartId === "string" ? graph.rootPartId : undefined,
      attachmentPartId:
        typeof graph.attachmentPartId === "string"
          ? graph.attachmentPartId
          : undefined,
      nodes: Array.isArray(graph.nodes)
        ? graph.nodes
            .filter((node) => isRecord(node) && typeof node.nodeId === "string")
            .map((node) => ({
              nodeId: node.nodeId,
              partId: typeof node.partId === "string" ? node.partId : node.nodeId,
              semanticLabel:
                typeof node.semanticLabel === "string"
                  ? node.semanticLabel
                  : typeof node.partId === "string"
                    ? node.partId
                    : node.nodeId,
              role: typeof node.role === "string" ? node.role : "part",
              required: node.required === true,
              stageIndex:
                typeof node.stageIndex === "number" ? node.stageIndex : 1,
              importance:
                typeof node.importance === "number" ? node.importance : 0.5,
            }))
        : [],
      edges: Array.isArray(graph.edges)
        ? graph.edges
            .filter((edge) => isRecord(edge) && typeof edge.fromNodeId === "string")
            .map((edge) => ({
              fromNodeId: edge.fromNodeId,
              toNodeId: typeof edge.toNodeId === "string" ? edge.toNodeId : edge.fromNodeId,
              parentPartId:
                typeof edge.parentPartId === "string" ? edge.parentPartId : undefined,
              childPartId:
                typeof edge.childPartId === "string" ? edge.childPartId : undefined,
              relation:
                typeof edge.relation === "string" ? edge.relation : "attached-to",
              required: edge.required === true,
              mountFace:
                typeof edge.mountFace === "string" ? edge.mountFace : undefined,
              localOffset:
                Array.isArray(edge.localOffset)
                  ? edge.localOffset.map((value) => Number(value))
                  : undefined,
              rotationMode:
                typeof edge.rotationMode === "string"
                  ? edge.rotationMode
                  : undefined,
              maxDrift:
                typeof edge.maxDrift === "number" ? edge.maxDrift : undefined,
              allowedDrift:
                typeof edge.allowedDrift === "number"
                  ? edge.allowedDrift
                  : undefined,
              cohesionWeight:
                typeof edge.cohesionWeight === "number"
                  ? edge.cohesionWeight
                  : undefined,
              edgeConstraint:
                typeof edge.edgeConstraint === "string"
                  ? edge.edgeConstraint
                  : undefined,
              orientationConstraint:
                typeof edge.orientationConstraint === "string"
                  ? edge.orientationConstraint
                  : undefined,
              flushMount: edge.flushMount === true,
              embedDepth:
                typeof edge.embedDepth === "number" ? edge.embedDepth : undefined,
              spanOwnership:
                typeof edge.spanOwnership === "string"
                  ? edge.spanOwnership
                  : undefined,
              supportDependency:
                typeof edge.supportDependency === "string"
                  ? edge.supportDependency
                  : undefined,
            }))
        : [],
      stages: Array.isArray(graph.stages)
        ? graph.stages.filter((value) => typeof value === "string")
        : [],
    }));
}

function getVisualCritiqueReportsFromCustomizations(customizations) {
  if (
    !isCustomizationRecipe(customizations) ||
    !Array.isArray(customizations.visualCritiqueReports)
  ) {
    return [];
  }

  return customizations.visualCritiqueReports
    .filter((report) => isRecord(report) && typeof report.reportId === "string")
    .map((report) => ({
      reportId: report.reportId,
      executionId:
        typeof report.executionId === "string" ? report.executionId : "unknown-execution",
      requestId: typeof report.requestId === "string" ? report.requestId : "unknown-request",
      requestedNoun:
        typeof report.requestedNoun === "string" ? report.requestedNoun : undefined,
      designArchetype:
        typeof report.designArchetype === "string"
          ? report.designArchetype
          : undefined,
      runtimeShapeClass:
        typeof report.runtimeShapeClass === "string"
          ? report.runtimeShapeClass
          : undefined,
      source:
        report.source === "viewport-capture"
          ? "viewport-capture"
          : report.source === "render-hybrid"
            ? "render-hybrid"
            : "blueprint-projection",
      viewScores: Array.isArray(report.viewScores)
        ? report.viewScores
            .filter((entry) => isRecord(entry) && typeof entry.view === "string")
            .map((entry) => ({
              view:
                entry.view === "front" || entry.view === "side"
                  ? entry.view
                  : "three-quarter",
              readability:
                typeof entry.readability === "number" ? entry.readability : 0,
              silhouette:
                typeof entry.silhouette === "number" ? entry.silhouette : 0,
              anchorFit:
                typeof entry.anchorFit === "number" ? entry.anchorFit : 0,
            }))
        : [],
      lookalikeRisk:
        typeof report.lookalikeRisk === "number" ? report.lookalikeRisk : 0,
      criticalPartsPresent:
        typeof report.criticalPartsPresent === "number"
          ? report.criticalPartsPresent
          : 0,
      nounFidelity:
        typeof report.nounFidelity === "number" ? report.nounFidelity : 0,
      renderNounFidelity:
        typeof report.renderNounFidelity === "number"
          ? report.renderNounFidelity
          : undefined,
      criticalPartsVisible:
        typeof report.criticalPartsVisible === "number"
          ? report.criticalPartsVisible
          : undefined,
      silhouetteReadability:
        typeof report.silhouetteReadability === "number"
          ? report.silhouetteReadability
          : undefined,
      cohesionScore:
        typeof report.cohesionScore === "number"
          ? report.cohesionScore
          : undefined,
      cohesionIssues: Array.isArray(report.cohesionIssues)
        ? report.cohesionIssues.filter((value) => typeof value === "string")
        : [],
      dominantFailureMode:
        typeof report.dominantFailureMode === "string"
          ? report.dominantFailureMode
          : undefined,
      oversizeParts: Array.isArray(report.oversizeParts)
        ? report.oversizeParts.filter((value) => typeof value === "string")
        : [],
      hiddenCriticalParts: Array.isArray(report.hiddenCriticalParts)
        ? report.hiddenCriticalParts.filter((value) => typeof value === "string")
        : [],
      flattenedStructureParts: Array.isArray(report.flattenedStructureParts)
        ? report.flattenedStructureParts.filter((value) => typeof value === "string")
        : [],
      flattenedPartIds: Array.isArray(report.flattenedPartIds)
        ? report.flattenedPartIds.filter((value) => typeof value === "string")
        : [],
      detachedPartIds: Array.isArray(report.detachedPartIds)
        ? report.detachedPartIds.filter((value) => typeof value === "string")
        : [],
      hostInterferenceZones: Array.isArray(report.hostInterferenceZones)
        ? report.hostInterferenceZones.filter((value) => typeof value === "string")
        : [],
      hostIntrusionZones: Array.isArray(report.hostIntrusionZones)
        ? report.hostIntrusionZones.filter((value) => typeof value === "string")
        : [],
      silhouetteBreakpoints: Array.isArray(report.silhouetteBreakpoints)
        ? report.silhouetteBreakpoints.filter((value) => typeof value === "string")
        : [],
      dominantSpanOwner:
        typeof report.dominantSpanOwner === "string"
          ? report.dominantSpanOwner
          : undefined,
      faceIntrusionSeverity:
        typeof report.faceIntrusionSeverity === "number"
          ? report.faceIntrusionSeverity
          : undefined,
      partAttachmentCredibility:
        typeof report.partAttachmentCredibility === "number"
          ? report.partAttachmentCredibility
          : undefined,
      nounReadOrder: Array.isArray(report.nounReadOrder)
        ? report.nounReadOrder.filter((value) => typeof value === "string")
        : [],
      finalReadOrder: Array.isArray(report.finalReadOrder)
        ? report.finalReadOrder.filter((value) => typeof value === "string")
        : [],
      firstReadPart:
        typeof report.firstReadPart === "string" ? report.firstReadPart : undefined,
      dominantFailureLayer:
        typeof report.dominantFailureLayer === "string"
          ? report.dominantFailureLayer
          : undefined,
      rootSilhouetteFailure:
        typeof report.rootSilhouetteFailure === "string"
          ? report.rootSilhouetteFailure
          : undefined,
      assemblyFailure:
        typeof report.assemblyFailure === "string"
          ? report.assemblyFailure
          : undefined,
      hostFitFailure:
        typeof report.hostFitFailure === "string"
          ? report.hostFitFailure
          : undefined,
      readOrderFailure:
        typeof report.readOrderFailure === "string"
          ? report.readOrderFailure
          : undefined,
      rebuildDirective:
        typeof report.rebuildDirective === "string"
          ? report.rebuildDirective
          : undefined,
      targetRootSpan:
        Array.isArray(report.targetRootSpan) && report.targetRootSpan.length === 3
          ? report.targetRootSpan.map((value) => Number(value))
          : undefined,
      targetDepthProfile:
        typeof report.targetDepthProfile === "string"
          ? report.targetDepthProfile
          : undefined,
      targetAttachmentPose:
        typeof report.targetAttachmentPose === "string"
          ? report.targetAttachmentPose
          : undefined,
      nextPassPriority:
        typeof report.nextPassPriority === "string"
          ? report.nextPassPriority
          : undefined,
      rawFirstReadResult:
        typeof report.rawFirstReadResult === "string"
          ? report.rawFirstReadResult
          : undefined,
      firstReadResult:
        typeof report.firstReadResult === "string"
          ? report.firstReadResult
          : undefined,
      canonicalFirstRead:
        typeof report.canonicalFirstRead === "string"
          ? report.canonicalFirstRead
          : undefined,
      rawDominantSpanOwnerText:
        typeof report.rawDominantSpanOwnerText === "string"
          ? report.rawDominantSpanOwnerText
          : undefined,
      canonicalDominantSpanOwner:
        typeof report.canonicalDominantSpanOwner === "string"
          ? report.canonicalDominantSpanOwner
          : undefined,
      canonicalDetachedPartIds: Array.isArray(report.canonicalDetachedPartIds)
        ? report.canonicalDetachedPartIds.filter((value) => typeof value === "string")
        : [],
      canonicalFlattenedPartIds: Array.isArray(report.canonicalFlattenedPartIds)
        ? report.canonicalFlattenedPartIds.filter((value) => typeof value === "string")
        : [],
      readabilityFailureKind:
        typeof report.readabilityFailureKind === "string"
          ? report.readabilityFailureKind
          : undefined,
      attachmentFailureKind:
        typeof report.attachmentFailureKind === "string"
          ? report.attachmentFailureKind
          : undefined,
      anchorProjectionFailureKind:
        typeof report.anchorProjectionFailureKind === "string"
          ? report.anchorProjectionFailureKind
          : undefined,
      projectedAnchorPose:
        Array.isArray(report.projectedAnchorPose) && report.projectedAnchorPose.length === 3
          ? report.projectedAnchorPose
          : undefined,
      anchorPlaneOffset:
        Array.isArray(report.anchorPlaneOffset) && report.anchorPlaneOffset.length === 3
          ? report.anchorPlaneOffset
          : undefined,
      earSideTangentOffset:
        Array.isArray(report.earSideTangentOffset) &&
        report.earSideTangentOffset.length === 3
          ? report.earSideTangentOffset
          : undefined,
      outlineCompilerMode:
        typeof report.outlineCompilerMode === "string"
          ? report.outlineCompilerMode
          : undefined,
      outlineProjectionVariantId:
        typeof report.outlineProjectionVariantId === "string"
          ? report.outlineProjectionVariantId
          : undefined,
      visualVeto:
        typeof report.visualVeto === "boolean" ? report.visualVeto : undefined,
      visualVetoReason:
        typeof report.visualVetoReason === "string"
          ? report.visualVetoReason
          : undefined,
      visualAcceptanceGatePassed:
        typeof report.visualAcceptanceGatePassed === "boolean"
          ? report.visualAcceptanceGatePassed
          : undefined,
      visualFailureReasons: Array.isArray(report.visualFailureReasons)
        ? report.visualFailureReasons.filter((value) => typeof value === "string")
        : [],
      variantSwitchRecommended:
        typeof report.variantSwitchRecommended === "boolean"
          ? report.variantSwitchRecommended
          : undefined,
      repairIntensityHints: Array.isArray(report.repairIntensityHints)
        ? report.repairIntensityHints
            .filter(
              (entry) =>
                isRecord(entry) &&
                typeof entry.actionType === "string" &&
                typeof entry.intensity === "number",
            )
            .map((entry) => ({
              actionType: entry.actionType,
              intensity: Number(entry.intensity.toFixed(4)),
            }))
        : [],
      actualApproximationLabel:
        typeof report.actualApproximationLabel === "string"
          ? report.actualApproximationLabel
          : undefined,
      repairActions: Array.isArray(report.repairActions)
        ? report.repairActions
            .filter((action) => isRecord(action) && typeof action.actionType === "string")
            .map((action) => ({
              actionType: action.actionType,
              reason: typeof action.reason === "string" ? action.reason : "未记录",
              source:
                action.source === "structural" || action.source === "visual"
                  ? action.source
                  : "hybrid",
              targetPartIds: Array.isArray(action.targetPartIds)
                ? action.targetPartIds.filter((value) => typeof value === "string")
                : [],
              targetRoles: Array.isArray(action.targetRoles)
                ? action.targetRoles.filter((value) => typeof value === "string")
                : [],
              intensity:
                typeof action.intensity === "number" ? action.intensity : undefined,
            }))
        : [],
      summary: typeof report.summary === "string" ? report.summary : "",
    }));
}

function getGeometryRecipeForExecution(customizations, execution) {
  if (!execution) {
    return null;
  }

  const recipes = getGeometryRecipesFromCustomizations(customizations);

  return (
    recipes.find((recipe) => recipe.recipeId === execution.geometryRecipeId) ??
    recipes.find((recipe) => recipe.requestId === execution.requestId) ??
    null
  );
}

function getAccessoryPartGraphForExecution(customizations, execution) {
  if (!execution) {
    return null;
  }

  const graphs = getAccessoryPartGraphsFromCustomizations(customizations);

  return (
    graphs.find((graph) => graph.graphId === execution.partGraphId) ??
    graphs.find((graph) => graph.requestId === execution.requestId) ??
    null
  );
}

function getAccessoryAnchorLabel(anchor) {
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

function getExecutionResolvedLabel(execution) {
  return execution.resolvedLabel ?? execution.fallbackLabel ?? execution.shapeLabel;
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ];
}

function getColorLabel(value) {
  return isRecord(value) && typeof value.label === "string" ? value.label : undefined;
}

function parseExecutionOrdinal(instanceId) {
  if (typeof instanceId !== "string") {
    return 1;
  }

  const match = instanceId.match(/(?:-|:)(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function buildRuntimeNodePrefix(generationId, runtimeShapeClass, anchor, ordinal) {
  const generationToken =
    typeof generationId === "string" && generationId.length > 0
      ? generationId.slice(0, 8)
      : "unknown";
  const shapeClass =
    typeof runtimeShapeClass === "string" && runtimeShapeClass.length > 0
      ? runtimeShapeClass
      : "generic-ornament";
  const resolvedAnchor =
    typeof anchor === "string" && anchor.length > 0 ? anchor : "chest";
  const resolvedOrdinal =
    typeof ordinal === "number" && Number.isFinite(ordinal) && ordinal > 0
      ? Math.floor(ordinal)
      : 1;

  return `DynamicAcc_${generationToken}_${shapeClass}_${resolvedAnchor}_${resolvedOrdinal}`;
}

function getAccessoryInstanceOffset(anchor, ordinal = 1) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);

  if (ordinal <= 1) {
    return [0, 0, 0];
  }

  const step = ordinal - 1;

  if (normalizedAnchor === "chest" || normalizedAnchor === "chest-center") {
    return [step * 0.016, 0, -step * 0.018];
  }

  if (normalizedAnchor === "chest-left") {
    return [0.012 + step * 0.012, 0, -step * 0.016];
  }

  if (normalizedAnchor === "chest-right") {
    return [-0.012 - step * 0.012, 0, -step * 0.016];
  }

  if (normalizedAnchor === "forehead" || normalizedAnchor === "head-top") {
    return [step * 0.012, 0, step * 0.01];
  }

  if (normalizedAnchor === "back-head") {
    return [step * 0.01, 0, -step * 0.008];
  }

  if (normalizedAnchor === "tail-top" || normalizedAnchor === "tail-base") {
    return [step * 0.01, 0.002 * step, -step * 0.012];
  }

  if (normalizedAnchor === "tail-left") {
    return [0.01 + step * 0.01, 0.002 * step, -step * 0.01];
  }

  if (normalizedAnchor === "tail-right") {
    return [-0.01 - step * 0.01, 0.002 * step, -step * 0.01];
  }

  const direction = normalizedAnchor === "left-ear" ? 1 : -1;
  return [direction * step * 0.012, 0, step * 0.008];
}

function parseArgs(argv) {
  const options = {
    watch: false,
    once: false,
    id: null,
    intervalMs: 1500,
    backend: process.env.BLENDER_MCP_BACKEND ?? "mock-assets",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--watch") {
      options.watch = true;
      continue;
    }

    if (value === "--once") {
      options.once = true;
      continue;
    }

    if (value === "--id" && argv[index + 1]) {
      options.id = argv[index + 1];
      index += 1;
      continue;
    }

    if (value.startsWith("--id=")) {
      options.id = value.slice("--id=".length);
      continue;
    }

    if (value === "--interval" && argv[index + 1]) {
      options.intervalMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (value.startsWith("--interval=")) {
      options.intervalMs = Number.parseInt(
        value.slice("--interval=".length),
        10,
      );
      continue;
    }

    if (value === "--backend" && argv[index + 1]) {
      options.backend = argv[index + 1];
      index += 1;
      continue;
    }

    if (value.startsWith("--backend=")) {
      options.backend = value.slice("--backend=".length);
      continue;
    }

    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.watch && !options.once) {
    options.once = true;
  }

  if (!Number.isFinite(options.intervalMs) || options.intervalMs < 200) {
    options.intervalMs = 1500;
  }

  return options;
}

function printHelp() {
  console.log(`PromptPet-AR Blender MCP worker

Usage:
  node scripts/blender-mcp-worker.mjs --once
  node scripts/blender-mcp-worker.mjs --watch
  node scripts/blender-mcp-worker.mjs --once --id <generation-id>
  node scripts/blender-mcp-worker.mjs --watch --backend poly-http-plan

Backends:
  mock-assets
  poly-http-plan

Environment:
  BLENDER_MCP_BACKEND=poly-http-plan
  BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010
  BLENDER_MCP_PLAN_FILE=scripts/blender-mcp-plan.fox-base.json
`);
}

function log(message) {
  console.log(`[blender-mcp-worker] ${message}`);
}

function logWorkerCoordination(message) {
  if (debugWorkerCoordination) {
    log(`coordination ${message}`);
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveFromProject(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(projectRoot, relativeOrAbsolutePath);
}

async function readJsonFile(filePath) {
  const file = await readFile(filePath, "utf8");

  return JSON.parse(file);
}

async function writeJsonFile(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function buildOutputFiles({ includeUsdz = false } = {}) {
  return [
    "model.glb",
    ...(includeUsdz ? ["model.usdz"] : []),
    "thumbnail.png",
    "metadata.json",
    "adapter-status.json",
  ];
}

function multiplyVector(vector, factor) {
  return vector.map((value) => Number((value * factor).toFixed(4)));
}

function getRecipeCustomizations(recipeHints = {}) {
  return isCustomizationRecipe(recipeHints.customizations)
    ? recipeHints.customizations
    : null;
}

function hasDefaultAccessoryRemovalNegation(customizations, themeSlot) {
  if (!isCustomizationRecipe(customizations) || !Array.isArray(customizations.negations)) {
    return false;
  }

  const defaultAccessoryKey = getFoxThemeDefaultAccessory(themeSlot);
  const defaultDirective = supportedAccessoryDirectives.find(
    ({ objectKey }) => objectKey === defaultAccessoryKey,
  );
  const negations = customizations.negations.filter(
    (value) => typeof value === "string",
  );

  if (
    negations.some(
      (entry) =>
        noAccessoryPhrases.some((phrase) => entry.includes(phrase)) ||
        entry.includes("无配饰"),
    )
  ) {
    return true;
  }

  if (!defaultDirective) {
    return false;
  }

  return negations.some((entry) =>
    defaultDirective.keywords.some((keyword) => entry.includes(keyword)),
  );
}

function buildAccessoryDirectiveFromCustomizations(customizations, themeSlot) {
  if (!isCustomizationRecipe(customizations)) {
    return null;
  }

  const resolvedExecutionPlan = getResolvedExecutionPlanFromCustomizations(customizations);

  if (resolvedExecutionPlan) {
    return {
      objectKey: "accessoryNone",
      label:
        resolvedExecutionPlan.addAccessories.length > 0
          ? "动态配件执行计划"
          : resolvedExecutionPlan.removeDefaultAccessories.length > 0
            ? "无配饰"
            : "动态配件执行计划",
      presentation:
        resolvedExecutionPlan.addAccessories.length > 0 ? "dynamic-plan" : "none",
    };
  }

  if (!isRecord(customizations.accessoryOperation)) {
    return null;
  }

  const operation = customizations.accessoryOperation;

  if (operation.type === "remove-default") {
    return {
      objectKey: "accessoryNone",
      label: "无配饰",
      presentation: "none",
    };
  }

  if (operation.type === "replace-with-supported") {
    return {
      objectKey: isAccessoryKey(operation.accessoryKey)
        ? operation.accessoryKey
        : themeSlots[themeSlot].accessory,
      label:
        typeof operation.label === "string" && operation.label.trim()
          ? operation.label.trim()
          : accessoryLabels[operation.accessoryKey] ?? "小配饰",
      presentation: "default",
    };
  }

  if (operation.type === "generate-simple-accessory") {
    const customizationProfile = isCustomizationProfile(
      customizations.customizationProfile,
    )
      ? customizations.customizationProfile
      : "safe-overlay";
    const fallbackAccessoryKey = isAccessoryKey(operation.accessoryKey)
      ? operation.accessoryKey
      : themeSlots[themeSlot].accessory;

    if (customizationProfile === "experimental-addon") {
      return {
        objectKey: "accessoryNone",
        label:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : "动态小件",
        presentation: "generated",
      };
    }

    if (hasDefaultAccessoryRemovalNegation(customizations, themeSlot)) {
      return {
        objectKey: "accessoryNone",
        label: "无配饰",
        presentation: "none",
      };
    }

    return {
      objectKey: fallbackAccessoryKey,
      label: accessoryLabels[fallbackAccessoryKey] ?? "近似配饰",
      presentation: "approximate",
    };
  }

  if (operation.type === "keep-default") {
    if (isAccessoryKey(operation.accessoryKey)) {
      return {
        objectKey: operation.accessoryKey,
        label:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : accessoryLabels[operation.accessoryKey],
        presentation: "default",
      };
    }
  }

  return null;
}

function deriveFoxPromptModifiers(prompt, styleKey, recipeHints = {}) {
  const normalized = prompt.toLowerCase();
  const customizations = getRecipeCustomizations(recipeHints);
  const generationMode = isGenerationMode(recipeHints.generationMode)
    ? recipeHints.generationMode
    : "fast-stable";
  const themeSlot = isThemeSlot(recipeHints.themeSlot)
    ? recipeHints.themeSlot
    : detectThemeSlot(normalized, styleKey);
  const themeConfig = themeSlots[themeSlot];
  const accessoryDirective =
    buildAccessoryDirectiveFromCustomizations(customizations, themeSlot) ??
    (isAccessoryKey(recipeHints.accessory)
      ? {
          objectKey: recipeHints.accessory,
          label:
            typeof recipeHints.accessoryLabel === "string"
              ? recipeHints.accessoryLabel
              : accessoryLabels[recipeHints.accessory],
          presentation:
            recipeHints.accessory === "accessoryNone" ? "none" : "default",
        }
      : detectAccessoryDirective(normalized, themeSlot));
  const allowRuntimeGeometryTweaks = generationMode !== "dynamic-custom";
  let bodyScaleFactor = allowRuntimeGeometryTweaks
    ? themeConfig.variant.bodyScaleFactor
    : 1;
  let headScaleFactor = allowRuntimeGeometryTweaks
    ? themeConfig.variant.headScaleFactor
    : 1;
  let tailScaleFactor = allowRuntimeGeometryTweaks
    ? themeConfig.variant.tailScaleFactor
    : 1;
  let tailTipScaleFactor = allowRuntimeGeometryTweaks
    ? themeConfig.variant.tailTipScaleFactor
    : 1;
  let eyeScaleFactor = allowRuntimeGeometryTweaks
    ? themeConfig.variant.eyeScaleFactor
    : 1;
  let glowFactor =
    styleKey === "dream-glow"
      ? themeConfig.variant.glowFactor * 1.04
      : themeConfig.variant.glowFactor;
  let eyeMood = isEyeMood(recipeHints.eyeMood) ? recipeHints.eyeMood : "neutral";

  if (
    allowRuntimeGeometryTweaks &&
    normalized.includes("圆润") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("软萌") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("盲盒") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("toy") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("奶油")
  ) {
    eyeScaleFactor *= 1.03;
    headScaleFactor *= 1.01;
  }

  if (
    allowRuntimeGeometryTweaks &&
    normalized.includes("尾巴大") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("大尾巴") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("蓬") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("fluff") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("fluffy")
  ) {
    tailScaleFactor *= 1.07;
    tailTipScaleFactor *= 1.05;
  }

  if (
    normalized.includes("大眼") ||
    normalized.includes("眼睛大") ||
    normalized.includes("无辜") ||
    normalized.includes("温柔")
  ) {
    if (allowRuntimeGeometryTweaks) {
      eyeScaleFactor *= 1.06;
    }
    eyeMood = "gentle";
  }

  if (
    normalized.includes("警觉") ||
    normalized.includes("机灵") ||
    normalized.includes("酷") ||
    normalized.includes("sharp")
  ) {
    if (allowRuntimeGeometryTweaks) {
      eyeScaleFactor *= 0.96;
      tailScaleFactor *= 1.01;
    }
    eyeMood = "alert";
  }

  if (
    normalized.includes("发光") ||
    normalized.includes("glow") ||
    normalized.includes("夜灯") ||
    normalized.includes("霓虹")
  ) {
    glowFactor *= 1.24;
    if (allowRuntimeGeometryTweaks) {
      eyeScaleFactor *= 1.02;
      tailTipScaleFactor *= 1.07;
    }
  }

  if (
    allowRuntimeGeometryTweaks &&
    normalized.includes("书桌") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("桌宠") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("mini") ||
    allowRuntimeGeometryTweaks &&
    normalized.includes("小摆件")
  ) {
    bodyScaleFactor *= 0.99;
    headScaleFactor *= 1.01;
  }

  if (isCustomizationRecipe(customizations) && isRecord(customizations.localTweaks)) {
    if (
      allowRuntimeGeometryTweaks &&
      isRecord(customizations.localTweaks.tailFluff) &&
      customizations.localTweaks.tailFluff.supported === true &&
      typeof customizations.localTweaks.tailFluff.factor === "number"
    ) {
      tailScaleFactor *= customizations.localTweaks.tailFluff.factor;
      tailTipScaleFactor *= Math.max(1, customizations.localTweaks.tailFluff.factor);
    }

    if (
      allowRuntimeGeometryTweaks &&
      isRecord(customizations.localTweaks.eyeSize) &&
      customizations.localTweaks.eyeSize.supported === true &&
      typeof customizations.localTweaks.eyeSize.factor === "number"
    ) {
      eyeScaleFactor *= customizations.localTweaks.eyeSize.factor;
      eyeMood =
        customizations.localTweaks.eyeSize.factor >= 1 ? "gentle" : "alert";
    }

    if (
      isRecord(customizations.localTweaks.glowIntensity) &&
      customizations.localTweaks.glowIntensity.supported === true &&
      typeof customizations.localTweaks.glowIntensity.factor === "number"
    ) {
      glowFactor *= customizations.localTweaks.glowIntensity.factor;
    }
  }

  return {
    themeSlot,
    themeLabel:
      typeof recipeHints.themeLabel === "string"
        ? recipeHints.themeLabel
        : themeConfig.label,
    accessoryKey: accessoryDirective.objectKey,
    accessoryLabel:
      typeof recipeHints.accessoryLabel === "string"
        ? recipeHints.accessoryLabel
        : accessoryDirective.label,
    accessoryScales: buildAccessoryScales(accessoryDirective.objectKey),
    eyeMood,
    bodyScaleFactor,
    headScaleFactor,
    tailScaleFactor,
    tailTipScaleFactor,
    eyeScaleFactor,
    glowFactor,
  };
}

function deriveFoxPalette(
  prompt,
  styleProfile,
  themeSlot,
  accessoryKey,
  accessoryLabel,
  recipeHints = {},
) {
  const normalized = prompt.toLowerCase();
  const customizations = getRecipeCustomizations(recipeHints);
  const themePalette = themeSlots[themeSlot].palette;
  const hasExplicitColorOverrides =
    isCustomizationRecipe(customizations) &&
    isRecord(customizations.colorOverrides) &&
    Object.keys(customizations.colorOverrides).length > 0;
  const matched = promptColorPalettes.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  let resolvedPalette = {
    ...styleProfile.palette,
    ...themePalette,
    ...(hasExplicitColorOverrides ? {} : (matched?.palette ?? {})),
  };

  if (isCustomizationRecipe(customizations) && isRecord(customizations.colorOverrides)) {
    for (const [slot, value] of Object.entries(customizations.colorOverrides)) {
      if (!isRecord(value) || typeof value.hex !== "string") {
        continue;
      }

      if (slot === "bodyColor") {
        resolvedPalette.bodyColor = hexToLinearRgba(value.hex);
      }

      if (slot === "detailColor") {
        resolvedPalette.detailColor = hexToLinearRgba(value.hex);
      }

      if (slot === "accentColor") {
        resolvedPalette.accentColor = hexToLinearRgba(value.hex);
      }

      if (slot === "glowColor") {
        resolvedPalette.glowColor = hexToLinearRgba(value.hex);
      }

      if (slot === "accessoryColor") {
        resolvedPalette.accessoryColor = hexToLinearRgba(value.hex);
      }
    }
  }

  if (
    accessoryKey === "accessoryTag" &&
    typeof accessoryLabel === "string" &&
    accessoryLabel.includes("领带")
  ) {
    return {
      ...resolvedPalette,
      accessoryColor: resolvedPalette.accentColor,
    };
  }

  return resolvedPalette;
}

function buildFoxRecipe(styleProfile, prompt, styleKey, recipeHints = {}) {
  const promptModifiers = deriveFoxPromptModifiers(prompt, styleKey, recipeHints);
  const generationMode = isGenerationMode(recipeHints.generationMode)
    ? recipeHints.generationMode
    : "fast-stable";
  const variant =
    generationMode === "dynamic-custom" ? neutralFoxVariant : styleProfile.variant;

  return {
    archetype: foxBaseContract.recipeDefaults.archetype,
    templateVersion: foxBaseContract.templateVersion,
    generatorMode: foxBaseContract.generatorMode,
    generationMode,
    cameraPreset: foxBaseContract.recipeDefaults.cameraPreset,
    posePreset: foxBaseContract.recipeDefaults.posePreset,
    arPlacementPreset: foxBaseContract.recipeDefaults.arPlacementPreset,
    themeSlot: promptModifiers.themeSlot,
    themeLabel: promptModifiers.themeLabel,
    accessory: promptModifiers.accessoryKey,
    assetContractFile: foxBaseContract.assetContractFile,
    templateAssetFile: foxBaseTemplateSource,
    stageAssetFile: foxBasePosterStageSource,
    bodyScale: multiplyVector(variant.bodyScale, promptModifiers.bodyScaleFactor),
    headScale: multiplyVector(variant.headScale, promptModifiers.headScaleFactor),
    tailScale: multiplyVector(variant.tailScale, promptModifiers.tailScaleFactor),
    tailTipScale: multiplyVector(
      variant.tailTipScale,
      promptModifiers.tailTipScaleFactor,
    ),
    eyeScale: multiplyVector(variant.eyeScale, promptModifiers.eyeScaleFactor),
    accessoryScales: promptModifiers.accessoryScales,
    accessoryLabel: promptModifiers.accessoryLabel,
    eyeMood: promptModifiers.eyeMood,
    glowFactor: Number(promptModifiers.glowFactor.toFixed(4)),
    exportScaleFactor: foxBaseContract.recipeDefaults.exportScaleFactor,
    exportScale: [
      foxBaseContract.recipeDefaults.exportScaleFactor,
      foxBaseContract.recipeDefaults.exportScaleFactor,
      foxBaseContract.recipeDefaults.exportScaleFactor,
    ],
    exportFacingRotation: foxBaseContract.recipeDefaults.exportFacingRotation,
    stageCameraLocation: transformStageCameraLocation(
      foxBaseContract.recipeDefaults.stageCameraLocation,
    ),
    stageCameraRotation: transformStageCameraRotation(
      foxBaseContract.recipeDefaults.stageCameraRotation,
    ),
    stageCameraFocalLength: foxBaseContract.recipeDefaults.stageCameraFocalLength,
    renderExposure: foxBaseContract.recipeDefaults.renderExposure,
    renderGamma: foxBaseContract.recipeDefaults.renderGamma,
    customizations: getRecipeCustomizations(recipeHints),
  };
}

function getThemeDemoFiles(themeSlot) {
  return themeSlots[themeSlot]?.demoFiles ?? {
    model: path.join(projectRoot, foxBaseContract.demoFiles.modelPath),
    poster: path.join(projectRoot, foxBaseContract.demoFiles.posterPath),
    usdz: path.join(projectRoot, foxBaseContract.demoFiles.usdzPath),
  };
}

function normalizeTaskManifest(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== 1 ||
    value.adapterKey !== "blender-mcp" ||
    typeof value.generationId !== "string" ||
    !isRecord(value.input) ||
    typeof value.input.prompt !== "string" ||
    typeof value.input.style !== "string" ||
    !isRecord(value.delivery) ||
    typeof value.delivery.name !== "string" ||
    !isRecord(value.artifacts)
  ) {
    return null;
  }

  const requiredArtifactKeys = [
    "metadataFile",
    "promptFile",
    "taskFile",
    "statusFile",
    "modelFile",
    "posterFile",
  ];

  for (const key of requiredArtifactKeys) {
    if (typeof value.artifacts[key] !== "string") {
      return null;
    }
  }

  const normalizeTaskLlmConfig = (candidate) => {
    if (!isRecord(candidate)) {
      return undefined;
    }

    const provider =
      candidate.provider === "openai" || candidate.provider === "deepseek"
        ? candidate.provider
        : undefined;
    const baseUrl =
      typeof candidate.baseUrl === "string" && candidate.baseUrl.trim()
        ? candidate.baseUrl.trim()
        : undefined;
    const model =
      typeof candidate.model === "string" && candidate.model.trim()
        ? candidate.model.trim()
        : undefined;

    const normalized = {
      ...(provider ? { provider } : {}),
      ...(baseUrl ? { baseUrl } : {}),
      ...(model ? { model } : {}),
    };

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  };

  return {
    generationId: value.generationId,
    input: {
      prompt: value.input.prompt,
      style: value.input.style,
      generationMode: isGenerationMode(value.input.generationMode)
        ? value.input.generationMode
        : "fast-stable",
      customizationProfile: isCustomizationProfile(value.input.customizationProfile)
        ? value.input.customizationProfile
        : undefined,
      llmConfig: normalizeTaskLlmConfig(value.input.llmConfig),
    },
    delivery: {
      name: value.delivery.name,
    },
    artifacts: {
      metadataFile: resolveFromProject(value.artifacts.metadataFile),
      promptFile: resolveFromProject(value.artifacts.promptFile),
      taskFile: resolveFromProject(value.artifacts.taskFile),
      statusFile: resolveFromProject(value.artifacts.statusFile),
      modelFile: resolveFromProject(value.artifacts.modelFile),
      usdFile:
        typeof value.artifacts.usdFile === "string"
          ? resolveFromProject(value.artifacts.usdFile)
          : path.join(
              path.dirname(resolveFromProject(value.artifacts.modelFile)),
              "model.usd",
            ),
      posterFile: resolveFromProject(value.artifacts.posterFile),
      usdzFile:
        typeof value.artifacts.usdzFile === "string"
          ? resolveFromProject(value.artifacts.usdzFile)
          : path.join(
              path.dirname(resolveFromProject(value.artifacts.modelFile)),
              "model.usdz",
            ),
    },
    handoffRecipe:
      isRecord(value.handoff) && isRecord(value.handoff.recipe)
        ? {
            ...value.handoff.recipe,
            generationMode: isGenerationMode(value.handoff.recipe.generationMode)
              ? value.handoff.recipe.generationMode
              : isGenerationMode(value.input.generationMode)
                ? value.input.generationMode
                : "fast-stable",
            customizationProfile: isCustomizationProfile(
              value.handoff.recipe.customizationProfile,
            )
              ? value.handoff.recipe.customizationProfile
              : isCustomizationProfile(value.input.customizationProfile)
                ? value.input.customizationProfile
                : undefined,
            llmConfig:
              normalizeTaskLlmConfig(value.handoff.recipe.llmConfig) ??
              normalizeTaskLlmConfig(value.input.llmConfig),
            customizations: isCustomizationRecipe(
              value.handoff.recipe.customizations,
            )
              ? value.handoff.recipe.customizations
              : null,
          }
        : {},
  };
}

async function readTaskManifestForId(id) {
  const taskPath = path.join(outputRoot, id, "task.json");

  try {
    const payload = await readJsonFile(taskPath);

    return normalizeTaskManifest(payload);
  } catch {
    return null;
  }
}

async function readStatusFile(filePath) {
  try {
    const payload = await readJsonFile(filePath);

    if (!isRecord(payload) || typeof payload.status !== "string") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function parseIsoTimestampMs(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function getStatusAgeMs(status) {
  const updatedAtMs = parseIsoTimestampMs(status?.updatedAt);
  return updatedAtMs === null ? null : Date.now() - updatedAtMs;
}

function shouldRecoverRenderingStatus(status) {
  if (!isRecord(status) || status.status !== "rendering") {
    return false;
  }

  const ageMs = getStatusAgeMs(status);
  return ageMs !== null && ageMs >= renderingRecoveryWindowMs;
}

async function writeStatus(task, status, message, extra = {}) {
  await writeJsonFile(task.artifacts.statusFile, {
    version: 1,
    adapterKey: "blender-mcp",
    status,
    updatedAt: new Date().toISOString(),
    message,
    name: task.delivery.name,
    ar: {
      androidUrl: "",
      iosUrl: "",
    },
    ...extra,
  });
}

function getWorkerLeasePath(backendConfig) {
  const backendToken =
    typeof backendConfig?.backend === "string" && backendConfig.backend.length > 0
      ? backendConfig.backend.replace(/[^a-zA-Z0-9_-]+/g, "-")
      : "worker";
  const serverToken =
    typeof backendConfig?.serverUrl === "string" && backendConfig.serverUrl.length > 0
      ? backendConfig.serverUrl.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(-64)
      : "local";

  return path.join(outputRoot, `.worker-lock-${backendToken}-${serverToken}.json`);
}

async function readWorkerLease(lockPath) {
  try {
    const raw = await readFile(lockPath, "utf8");
    const payload = JSON.parse(raw);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isRecord(error) && error.code === "EPERM";
  }
}

async function clearStaleWorkerLease(lockPath, leasePayload = null) {
  const ageMs = getStatusAgeMs(
    isRecord(leasePayload) ? { updatedAt: leasePayload.acquiredAt } : null,
  );
  const leasePid =
    isRecord(leasePayload) && Number.isInteger(leasePayload.pid)
      ? leasePayload.pid
      : null;
  const lockSeemsActive =
    leasePid !== null && isPidAlive(leasePid) && ageMs !== null && ageMs < workerLockStaleMs;

  if (lockSeemsActive) {
    logWorkerCoordination(
      `lease busy path=${path.basename(lockPath)} pid=${leasePid} ageMs=${ageMs}`,
    );
    return false;
  }

  try {
    await unlink(lockPath);
    logWorkerCoordination(`lease cleared path=${path.basename(lockPath)}`);
    return true;
  } catch (error) {
    logWorkerCoordination(
      `lease clear skipped path=${path.basename(lockPath)} code=${
        isRecord(error) && typeof error.code === "string" ? error.code : "unknown"
      }`,
    );
    return isRecord(error) && error.code === "ENOENT";
  }
}

async function acquireWorkerLease(backendConfig) {
  const lockPath = getWorkerLeasePath(backendConfig);
  const leasePayload = {
    leaseId: workerLeaseId,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
    backend: backendConfig.backend,
    serverUrl: backendConfig.serverUrl,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await writeFile(lockPath, `${JSON.stringify(leasePayload, null, 2)}\n`, {
        flag: "wx",
      });
      logWorkerCoordination(
        `lease acquired path=${path.basename(lockPath)} leaseId=${leasePayload.leaseId}`,
      );
      return {
        lockPath,
        leaseId: leasePayload.leaseId,
      };
    } catch (error) {
      if (!isRecord(error) || error.code !== "EEXIST") {
        throw error;
      }

      const existingLease = await readWorkerLease(lockPath);
      const cleared = await clearStaleWorkerLease(lockPath, existingLease);

      if (!cleared) {
        logWorkerCoordination(
          `lease acquire deferred path=${path.basename(lockPath)}`,
        );
        return null;
      }
    }
  }

  return null;
}

async function releaseWorkerLease(lease) {
  if (!isRecord(lease) || typeof lease.lockPath !== "string") {
    return;
  }

  const existingLease = await readWorkerLease(lease.lockPath);

  if (
    isRecord(existingLease) &&
    existingLease.leaseId !== lease.leaseId &&
    Number.isInteger(existingLease.pid) &&
    existingLease.pid !== process.pid
  ) {
    logWorkerCoordination(
      `lease release skipped path=${path.basename(lease.lockPath)} owner=${existingLease.pid}`,
    );
    return;
  }

  try {
    await unlink(lease.lockPath);
    logWorkerCoordination(
      `lease released path=${path.basename(lease.lockPath)} leaseId=${lease.leaseId}`,
    );
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") {
      throw error;
    }
    logWorkerCoordination(
      `lease release saw missing file path=${path.basename(lease.lockPath)}`,
    );
  }
}

async function readExistingMetadata(filePath) {
  try {
    const payload = await readJsonFile(filePath);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function buildExecutionContext(task, backendConfig) {
  const styleProfile =
    styleProfiles[task.input.style] ?? styleProfiles["cream-toy"];
  const foxRecipe = buildFoxRecipe(
    styleProfile,
    task.input.prompt,
    task.input.style,
    task.handoffRecipe,
  );
  const foxPalette = deriveFoxPalette(
    task.input.prompt,
    styleProfile,
    foxRecipe.themeSlot,
    foxRecipe.accessory,
    foxRecipe.accessoryLabel,
    task.handoffRecipe,
  );
  const customizationProfile =
    task.input.generationMode === "dynamic-custom" &&
    isCustomizationRecipe(foxRecipe.customizations) &&
    isCustomizationProfile(foxRecipe.customizations.customizationProfile)
      ? foxRecipe.customizations.customizationProfile
      : task.input.generationMode === "dynamic-custom" &&
          isCustomizationProfile(task.input.customizationProfile)
        ? task.input.customizationProfile
        : "safe-overlay";
  const deliveryBaseName = task.delivery.name.replace(/\s+/g, "");
  const hasDynamicColorOverrides =
    task.input.generationMode === "dynamic-custom" &&
    isCustomizationRecipe(foxRecipe.customizations) &&
    isRecord(foxRecipe.customizations.colorOverrides) &&
    Object.keys(foxRecipe.customizations.colorOverrides).length > 0;
  const resolvedExecutionPlan = getResolvedExecutionPlanFromCustomizations(
    foxRecipe.customizations,
  );
  const hasGeneratedAccessory =
    task.input.generationMode === "dynamic-custom" &&
    customizationProfile === "experimental-addon" &&
    resolvedExecutionPlan?.addAccessories?.some(
      (execution) => execution.executionMode === "runtime-generated",
    );

  return {
    generationId: task.generationId,
    prompt: task.input.prompt,
    style: task.input.style,
    generationMode: task.input.generationMode,
    styleLabel: styleProfile.label,
    themeSlot: foxRecipe.themeSlot,
    themeLabel: foxRecipe.themeLabel,
    accessoryLabel: foxRecipe.accessoryLabel,
    deliveryName: task.delivery.name,
    objects: foxBaseContract.objects,
    stage: foxBaseContract.stageObjects,
    materials: {
      body: `${deliveryBaseName}_FoxBody_Mat`,
      detail: `${deliveryBaseName}_FoxDetail_Mat`,
      accent: `${deliveryBaseName}_FoxAccent_Mat`,
      eye: `${deliveryBaseName}_FoxEye_Mat`,
      glow: `${deliveryBaseName}_FoxGlow_Mat`,
      accessory: `${deliveryBaseName}_FoxAccessory_Mat`,
      stage: `${deliveryBaseName}_FoxStage_Mat`,
    },
    palette: {
      bodyColor: foxPalette.bodyColor,
      detailColor: foxPalette.detailColor,
      accentColor: foxPalette.accentColor,
      eyeColor: foxPalette.eyeColor,
      glowColor: foxPalette.glowColor,
      accessoryColor: foxPalette.accessoryColor,
      stageColor: hexToLinearRgba("#F0E7DF"),
    },
    recipe: {
      ...foxRecipe,
      bodyMaterialRoughness: hasDynamicColorOverrides
        ? Number(Math.max(0.18, styleProfile.materials.bodyRoughness * 0.82).toFixed(4))
        : styleProfile.materials.bodyRoughness,
      bodyMaterialMetallic: styleProfile.materials.bodyMetallic,
      detailMaterialRoughness: styleProfile.materials.detailRoughness,
      accentMaterialRoughness: hasDynamicColorOverrides
        ? Number(Math.max(0.12, styleProfile.materials.accentRoughness * 0.84).toFixed(4))
        : styleProfile.materials.accentRoughness,
      eyeMaterialRoughness: styleProfile.materials.eyeRoughness,
      glowMaterialRoughness: styleProfile.materials.glowRoughness,
      accessoryMaterialRoughness: hasGeneratedAccessory
        ? Number(Math.max(0.16, styleProfile.materials.accessoryRoughness * 0.74).toFixed(4))
        : styleProfile.materials.accessoryRoughness,
      bodyEmissionStrength: hasDynamicColorOverrides
        ? Number((styleProfile.materials.bodyEmissionStrength + 0.04).toFixed(4))
        : styleProfile.materials.bodyEmissionStrength,
      accentEmissionStrength: hasDynamicColorOverrides
        ? Number((styleProfile.materials.accentEmissionStrength * 1.28 + 0.03).toFixed(4))
        : styleProfile.materials.accentEmissionStrength,
      eyeEmissionStrength: styleProfile.materials.eyeEmissionStrength,
      glowEmissionStrength: Number(
        (
          styleProfile.materials.glowEmissionStrength *
          foxRecipe.glowFactor *
          (hasDynamicColorOverrides ? 1.08 : 1)
        ).toFixed(4),
      ),
      accessoryEmissionStrength: Number(
        (
          styleProfile.materials.accessoryEmissionStrength *
          Math.max(1, foxRecipe.glowFactor * (hasGeneratedAccessory ? 0.94 : 0.72)) +
          (hasGeneratedAccessory ? 0.08 : 0)
        ).toFixed(4),
      ),
    },
    customizations: foxRecipe.customizations,
    serverUrl: backendConfig.serverUrl,
    artifacts: {
      metadataFile: task.artifacts.metadataFile,
      promptFile: task.artifacts.promptFile,
      taskFile: task.artifacts.taskFile,
      statusFile: task.artifacts.statusFile,
      modelFile: task.artifacts.modelFile,
      usdFile: task.artifacts.usdFile,
      posterFile: task.artifacts.posterFile,
      usdzFile: task.artifacts.usdzFile,
    },
  };
}

function resolveTemplateValue(context, templatePath) {
  return templatePath.split(".").reduce((current, segment) => {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    return current[segment];
  }, context);
}

function renderTemplate(value, context) {
  if (typeof value === "string") {
    const fullMatch = value.match(/^{{\s*([^}]+)\s*}}$/);

    if (fullMatch) {
      const resolved = resolveTemplateValue(context, fullMatch[1].trim());

      return resolved ?? value;
    }

    return value.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
      const resolved = resolveTemplateValue(context, key.trim());

      return resolved == null ? "" : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderTemplate(item, context));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        renderTemplate(entryValue, context),
      ]),
    );
  }

  return value;
}

function buildMetadata(task, existingMetadata, modelBytes, metadataPatch = {}) {
  const styleProfile =
    styleProfiles[task.input.style] ?? styleProfiles["cream-toy"];
  const customizationsSummary = buildMetadataCustomizationSummary(task);
  const fallbackRecipe = {
    themeSlot: isThemeSlot(task.handoffRecipe.themeSlot)
      ? task.handoffRecipe.themeSlot
      : "cream-toy",
    themeLabel:
      typeof task.handoffRecipe.themeLabel === "string"
        ? task.handoffRecipe.themeLabel
        : "奶油玩具",
    cameraPreset:
      typeof task.handoffRecipe.cameraPreset === "string"
        ? task.handoffRecipe.cameraPreset
        : foxBaseContract.recipeDefaults.cameraPreset,
    posePreset:
      typeof task.handoffRecipe.posePreset === "string"
        ? task.handoffRecipe.posePreset
        : foxBaseContract.recipeDefaults.posePreset,
    arPlacementPreset:
      typeof task.handoffRecipe.arPlacementPreset === "string"
        ? task.handoffRecipe.arPlacementPreset
        : foxBaseContract.recipeDefaults.arPlacementPreset,
  };

  const notes =
    Array.isArray(metadataPatch.notes) &&
    metadataPatch.notes.every((value) => typeof value === "string")
      ? metadataPatch.notes
      : [
          "当前结果由本地 Blender MCP worker 写出。",
          "后续接入真实 Blender 执行器时，可继续沿用同一套 task/status/output 文件协议，并保持同一只 fox 母体的主题变体逻辑。",
        ];

  const outputFiles =
    Array.isArray(metadataPatch.outputFiles) &&
    metadataPatch.outputFiles.every((value) => typeof value === "string")
      ? metadataPatch.outputFiles
      : [
          "model.glb",
          "thumbnail.png",
          "metadata.json",
          "adapter-status.json",
        ];

  return {
    originalPrompt: task.input.prompt,
    structuredPrompt:
      typeof metadataPatch.structuredPrompt === "string"
        ? metadataPatch.structuredPrompt
        : typeof existingMetadata?.structuredPrompt === "string"
          ? existingMetadata.structuredPrompt
          : buildStructuredPromptFromTask(task, styleProfile.label, fallbackRecipe),
    styleLabel:
      typeof metadataPatch.styleLabel === "string"
        ? metadataPatch.styleLabel
        : typeof existingMetadata?.styleLabel === "string"
          ? existingMetadata.styleLabel
          : styleProfile.label,
    exportedAt: new Date().toISOString(),
    modelSize: formatBytes(modelBytes),
    thumbnailPath: `/api/generations/${task.generationId}/poster`,
    outputFiles,
    notes,
    generationMode: customizationsSummary.mode,
    customizationProfile:
      customizationsSummary.mode === "dynamic-custom"
        ? customizationsSummary.customizationProfile
        : undefined,
    customizationSummary: customizationsSummary,
  };
}

function getBackendConfig(options) {
  return {
    backend: options.backend,
    serverUrl: (process.env.BLENDER_MCP_SERVER_URL ?? "http://127.0.0.1:8010").replace(
      /\/$/,
      "",
    ),
    planFile: resolveFromProject(
      process.env.BLENDER_MCP_PLAN_FILE ??
        "scripts/blender-mcp-plan.fox-base.json",
    ),
    usdzipBin:
      process.env.BLENDER_MCP_USDZIP_BIN ??
      (process.platform === "darwin" ? "/usr/bin/usdzip" : "usdzip"),
  };
}

async function executeMockAssets(task) {
  const styleProfile =
    styleProfiles[task.input.style] ?? styleProfiles["cream-toy"];
  const foxRecipe = buildFoxRecipe(
    styleProfile,
    task.input.prompt,
    task.input.style,
    task.handoffRecipe,
  );
  const demoFiles = getThemeDemoFiles(foxRecipe.themeSlot);

  await writeStatus(
    task,
    "rendering",
    `本地 mock worker 正在复制 ${foxRecipe.themeLabel} 主题 fox-base 演示资产。`,
  );
  await sleep(180);

  await mkdir(path.dirname(task.artifacts.modelFile), { recursive: true });
  await copyFile(demoFiles.model, task.artifacts.modelFile);

  await writeStatus(
    task,
    "exporting",
    `fox-base ${foxRecipe.themeLabel} 演示模型已复制，正在写出封面和 metadata。`,
  );
  await sleep(180);
  await copyFile(demoFiles.poster, task.artifacts.posterFile);

  let hasUsdz = false;

  if (await fileExists(demoFiles.usdz)) {
    await copyFile(demoFiles.usdz, task.artifacts.usdzFile);
    hasUsdz = true;
  }

  return {
    metadataPatch: {
      structuredPrompt: buildStructuredPromptFromTask(
        task,
        styleProfile.label,
        foxRecipe,
      ),
      styleLabel: styleProfile.label,
      outputFiles: buildOutputFiles({ includeUsdz: hasUsdz }),
      notes: [
        `${getModeLabel(task.input.generationMode)} 当前由本地 Blender MCP mock worker 写出。`,
        `当前结果由本地 Blender MCP mock worker 写出，演示资产来自仓库内 ${foxBaseContract.templateVersion} 的 ${foxRecipe.themeLabel} 主题样本。`,
        `这一轮 prompt 已被归到 ${foxRecipe.themeLabel} 主题，并按 customizations 应用 ${foxRecipe.accessoryLabel}。`,
        hasUsdz
          ? "当前 mock 结果也写入了 model.usdz；Android 演示优先，iPhone 继续保留 Quick Look 兼容位。"
          : "当前 mock 结果还没有写出 model.usdz，所以 iPhone Quick Look 会先回退到说明页。",
        "后续接入真实 Blender 执行器时，可继续沿用同一套 task/status/output 文件协议和母体资产合同。",
      ],
    },
  };
}

async function listPolyMcpTools(serverUrl) {
  const response = await fetch(`${serverUrl}/mcp/list_tools`, {
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`list_tools failed: ${response.status} ${text.slice(0, 240)}`);
  }

  let payload = text;

  try {
    payload = JSON.parse(text);
  } catch {}

  const tools = isRecord(payload) && Array.isArray(payload.tools)
    ? payload.tools
    : Array.isArray(payload)
      ? payload
      : [];
  const toolNames = tools
    .map((tool) => {
      if (typeof tool === "string") {
        return tool;
      }

      if (isRecord(tool) && typeof tool.name === "string") {
        return tool.name;
      }

      return null;
    })
    .filter((toolName) => typeof toolName === "string");

  return {
    rawText: text,
    toolNames: new Set(toolNames),
  };
}

async function invokePolyMcpTool(serverUrl, toolName, args = [], kwargs = {}) {
  const candidates =
    args.length === 0
      ? [
          {
            label: "direct-kwargs",
            body: kwargs,
          },
          {
            label: "legacy-args-kwargs",
            body: {
              args,
              kwargs,
            },
          },
        ]
      : [
          {
            label: "legacy-args-kwargs",
            body: {
              args,
              kwargs,
            },
          },
        ];

  const errors = [];

  for (const candidate of candidates) {
    const response = await fetch(
      `${serverUrl}/mcp/invoke/${encodeURIComponent(toolName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        },
        body: JSON.stringify(candidate.body),
      },
    );
    const text = await response.text();
    let payload = text;

    try {
      payload = JSON.parse(text);
    } catch {}

    if (response.ok) {
      if (
        isRecord(payload) &&
        typeof payload.status === "string" &&
        payload.status.toLowerCase() !== "success"
      ) {
        errors.push(`${candidate.label}: tool returned status=${payload.status}`);
        continue;
      }

      return payload;
    }

    errors.push(`${candidate.label}: ${response.status} ${text.slice(0, 240)}`);
  }

  throw new Error(
    `invoke ${toolName} failed: ${errors.join(" | ") || "unknown invoke failure"}`,
  );
}

async function loadPolyPlan(task, backendConfig) {
  const rawPlan = await readJsonFile(backendConfig.planFile);
  const context = buildExecutionContext(task, backendConfig);
  const renderedPlan = renderTemplate(rawPlan, context);

  if (!isRecord(renderedPlan) || !Array.isArray(renderedPlan.steps)) {
    throw new Error("BLENDER_MCP_PLAN_FILE 不是有效的执行计划。");
  }

  return {
    plan: renderedPlan,
    context,
  };
}

function extractInvokeResult(payload) {
  if (isRecord(payload) && isRecord(payload.result)) {
    return payload.result;
  }

  return payload;
}

function canonicalObjectName(value) {
  return value.replace(/\.\d{3}$/, "");
}

function registerImportedObjectAliases(aliasMap, importedObjects) {
  for (const importedObject of importedObjects) {
    if (typeof importedObject !== "string" || importedObject.length === 0) {
      continue;
    }

    const canonical = canonicalObjectName(importedObject);
    const existing = aliasMap.get(canonical);

    if (!existing || importedObject === canonical) {
      aliasMap.set(canonical, importedObject);
    }
  }
}

function resolveObjectAliases(value, aliasMap) {
  if (typeof value === "string") {
    return aliasMap.get(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveObjectAliases(entry, aliasMap));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        resolveObjectAliases(entryValue, aliasMap),
      ]),
    );
  }

  return value;
}

function getModeLabel(mode) {
  return mode === "dynamic-custom" ? "动态定制模式" : "快速稳定模式";
}

function getCustomizationProfileLabel(profile) {
  return customizationProfileLabels[profile] ?? "稳定定制";
}

function getTaskCustomizations(task) {
  return isCustomizationRecipe(task.handoffRecipe?.customizations)
    ? task.handoffRecipe.customizations
    : null;
}

function buildAccessoryFulfillmentRowsFromCustomizations(customizations) {
  if (!isCustomizationRecipe(customizations) || !Array.isArray(customizations.accessoryRequests)) {
    return [];
  }

  const resolvedExecutionPlan = getResolvedExecutionPlanFromCustomizations(customizations);

  return customizations.accessoryRequests.flatMap((request) => {
    if (!isRecord(request) || !Array.isArray(request.instances)) {
      return [];
    }

    const requestId =
      typeof request.requestId === "string" ? request.requestId : "unknown-request";
    const shapeLabel =
      typeof request.shapeLabel === "string" && request.shapeLabel.trim()
        ? request.shapeLabel.trim()
        : typeof request.label === "string" && request.label.trim()
          ? request.label.trim()
          : "未命名配件";
    const requestColor =
      isRecord(request.colorIntent) && typeof request.colorIntent.label === "string"
        ? request.colorIntent.label
        : undefined;
    const requestNotes = Array.isArray(request.notes)
      ? request.notes.filter((value) => typeof value === "string")
      : [];

    return request.instances
      .filter((instance) => isRecord(instance) && typeof instance.instanceId === "string")
      .map((instance) => {
        const anchor = normalizeRuntimeAccessoryAnchor(instance.anchor);
        const anchorLabel = getAccessoryAnchorLabel(anchor);
        const instanceId = instance.instanceId;
        const instanceColor =
          isRecord(instance.colorIntent) && typeof instance.colorIntent.label === "string"
            ? instance.colorIntent.label
            : requestColor;
        const requestedColorText =
          isRecord(instance.colorIntent) &&
          typeof instance.colorIntent.requestedText === "string"
            ? instance.colorIntent.requestedText
            : isRecord(request.requestedColor) &&
                typeof request.requestedColor.requestedText === "string"
              ? request.requestedColor.requestedText
              : isRecord(request.colorIntent) &&
                  typeof request.colorIntent.requestedText === "string"
                ? request.colorIntent.requestedText
                : undefined;
        const execution = resolvedExecutionPlan?.addAccessories.find(
          (entry) =>
            entry.requestId === requestId &&
            entry.instanceId === instanceId,
        );
        const actualAnchor = execution
          ? getAccessoryAnchorLabel(execution.anchor)
          : anchorLabel;
        const actualShape = execution ? getExecutionResolvedLabel(execution) : "未实现";
        const actualColor =
          execution && isRecord(execution.colorIntent) && typeof execution.colorIntent.label === "string"
            ? execution.colorIntent.label
            : undefined;
        const ordinalMatch = instanceId.match(/(?:-|:)(\d+)$/);
        const instanceOrdinal = ordinalMatch ? Number(ordinalMatch[1]) : 1;
        const status =
          !execution || execution.executionStatus === "unfulfilled"
            ? "unsupported"
            : execution.executionStatus === "approximated"
              ? "approximated"
              : "implemented";
        const executionNotes = Array.isArray(execution?.notes)
          ? execution.notes.filter((value) => typeof value === "string")
          : [];

        return {
          requestId,
          instanceId,
          source: "prompt",
          status,
          executionStatus: execution?.executionStatus ?? "unfulfilled",
          creationSource: execution?.creationSource ?? "unfulfilled",
          requestedLabel: `${anchorLabel} · ${shapeLabel}`,
          normalizedRequestedLabel: shapeLabel,
          requestedNoun:
            typeof request.requestedNoun === "string"
              ? request.requestedNoun
              : typeof execution?.requestedNoun === "string"
                ? execution.requestedNoun
                : undefined,
          nounGloss:
            typeof request.nounGloss === "string" ? request.nounGloss : undefined,
          objectCategory:
            typeof request.objectCategory === "string"
              ? request.objectCategory
              : undefined,
          designConfidence:
            typeof request.designConfidence === "number"
              ? request.designConfidence
              : undefined,
          sourceMode:
            typeof execution?.sourceMode === "string"
              ? execution.sourceMode
              : undefined,
          referenceConfidence:
            typeof execution?.referenceConfidence === "number"
              ? execution.referenceConfidence
              : undefined,
          designArchetype:
            typeof execution?.designArchetype === "string"
              ? execution.designArchetype
              : undefined,
          runtimeShapeClass:
            typeof execution?.runtimeShapeClass === "string"
              ? execution.runtimeShapeClass
              : undefined,
          primarySilhouette:
            typeof execution?.primarySilhouette === "string"
              ? execution.primarySilhouette
              : undefined,
          criticalParts: Array.isArray(execution?.criticalParts)
            ? execution.criticalParts.filter((value) => typeof value === "string")
            : undefined,
          negativeLookalikes: Array.isArray(execution?.negativeLookalikes)
            ? execution.negativeLookalikes.filter((value) => typeof value === "string")
            : undefined,
          readOrderTargets: Array.isArray(execution?.readOrderTargets)
            ? execution.readOrderTargets.filter((value) => typeof value === "string")
            : undefined,
          criticalViewGoals: Array.isArray(execution?.criticalViewGoals)
            ? execution.criticalViewGoals.filter((value) => typeof value === "string")
            : undefined,
          referenceId:
            typeof execution?.referenceId === "string"
              ? execution.referenceId
              : undefined,
          referenceSourceKind:
            typeof execution?.referenceSourceKind === "string"
              ? execution.referenceSourceKind
              : undefined,
          blueprintFamily:
            typeof execution?.blueprintFamily === "string"
              ? execution.blueprintFamily
              : undefined,
          variantId:
            typeof execution?.variantId === "string"
              ? execution.variantId
              : undefined,
          familyGuess:
            typeof request.familyGuess === "string"
              ? request.familyGuess
              : typeof execution?.familyGuess === "string"
                ? execution.familyGuess
                : undefined,
          familyResolutionSource:
            typeof request.familyResolutionSource === "string"
              ? request.familyResolutionSource
              : typeof execution?.familyResolutionSource === "string"
                ? execution.familyResolutionSource
                : undefined,
          nounFidelityStatus:
            typeof execution?.nounFidelityStatus === "string"
              ? execution.nounFidelityStatus
              : undefined,
          requestedAnchor: anchorLabel,
          requestedAnchorPhrase:
            typeof request.requestedAnchorPhrase === "string"
              ? request.requestedAnchorPhrase
              : undefined,
          resolvedAnchor: actualAnchor,
          resolvedAnchorKey:
            typeof execution?.anchor === "string" ? execution.anchor : anchor,
          instanceOrdinal,
          requestedShape: shapeLabel,
          requestedSemanticClass:
            typeof request.semanticClass === "string"
              ? request.semanticClass
              : undefined,
          ...(instanceColor ? { requestedColor: instanceColor } : {}),
          ...(requestedColorText ? { requestedColorText } : {}),
          actualLabel: `${actualAnchor} · ${actualShape}`,
          actualGeneratedLabel:
            typeof execution?.actualGeneratedLabel === "string"
              ? execution.actualGeneratedLabel
              : undefined,
          actualAnchor,
          actualShape,
          runtimeDesignSource:
            typeof execution?.runtimeDesignSource === "string"
              ? execution.runtimeDesignSource
              : undefined,
          geometryRecipeId:
            typeof execution?.geometryRecipeId === "string"
              ? execution.geometryRecipeId
              : undefined,
          ...(actualColor ? { actualColor } : {}),
          approximationReason: execution?.approximationReason,
          failureReason: execution?.failureReason,
          dominantFailureLayer:
            typeof execution?.dominantFailureLayer === "string"
              ? execution.dominantFailureLayer
              : undefined,
          anchorProjectionFailureKind:
            typeof execution?.anchorProjectionFailureKind === "string"
              ? execution.anchorProjectionFailureKind
              : undefined,
          projectedAnchorPose:
            Array.isArray(execution?.projectedAnchorPose) &&
            execution.projectedAnchorPose.length === 3
              ? execution.projectedAnchorPose
              : undefined,
          anchorPlaneOffset:
            Array.isArray(execution?.anchorPlaneOffset) &&
            execution.anchorPlaneOffset.length === 3
              ? execution.anchorPlaneOffset
              : undefined,
          earSideTangentOffset:
            Array.isArray(execution?.earSideTangentOffset) &&
            execution.earSideTangentOffset.length === 3
              ? execution.earSideTangentOffset
              : undefined,
          targetAnchorPosition:
            Array.isArray(execution?.targetAnchorPosition) &&
            execution.targetAnchorPosition.length === 3
              ? execution.targetAnchorPosition.map((value) => Number(value))
              : undefined,
          legacyAnchorPosition:
            Array.isArray(execution?.legacyAnchorPosition) &&
            execution.legacyAnchorPosition.length === 3
              ? execution.legacyAnchorPosition.map((value) => Number(value))
              : undefined,
          fittedAnchorPosition:
            Array.isArray(execution?.fittedAnchorPosition) &&
            execution.fittedAnchorPosition.length === 3
              ? execution.fittedAnchorPosition.map((value) => Number(value))
              : undefined,
          rawAnchorFitDelta:
            Array.isArray(execution?.rawAnchorFitDelta) &&
            execution.rawAnchorFitDelta.length === 3
              ? execution.rawAnchorFitDelta.map((value) => Number(value))
              : undefined,
          placementOffset:
            Array.isArray(execution?.placementOffset) &&
            execution.placementOffset.length === 3
              ? execution.placementOffset.map((value) => Number(value))
              : undefined,
          desiredPlacementOffset:
            Array.isArray(execution?.desiredPlacementOffset) &&
            execution.desiredPlacementOffset.length === 3
              ? execution.desiredPlacementOffset.map((value) => Number(value))
              : undefined,
          overallScaleMultiplier:
            typeof execution?.overallScaleMultiplier === "number"
              ? Number(execution.overallScaleMultiplier)
              : undefined,
          effectiveReferenceObject:
            typeof execution?.effectiveReferenceObject === "string"
              ? execution.effectiveReferenceObject
              : undefined,
          referenceFallbackUsed: execution?.referenceFallbackUsed === true,
          referenceFallbackReason:
            typeof execution?.referenceFallbackReason === "string"
              ? execution.referenceFallbackReason
              : undefined,
          finalReadOrder: Array.isArray(execution?.finalReadOrder)
            ? execution.finalReadOrder.filter((value) => typeof value === "string")
            : undefined,
          rawFirstReadResult:
            typeof execution?.rawFirstReadResult === "string"
              ? execution.rawFirstReadResult
              : undefined,
          firstReadResult:
            typeof execution?.firstReadResult === "string"
              ? execution.firstReadResult
              : undefined,
          canonicalFirstRead:
            typeof execution?.canonicalFirstRead === "string"
              ? execution.canonicalFirstRead
              : undefined,
          rawDominantSpanOwnerText:
            typeof execution?.rawDominantSpanOwnerText === "string"
              ? execution.rawDominantSpanOwnerText
              : undefined,
          canonicalDominantSpanOwner:
            typeof execution?.canonicalDominantSpanOwner === "string"
              ? execution.canonicalDominantSpanOwner
              : undefined,
          canonicalDetachedPartIds: Array.isArray(execution?.canonicalDetachedPartIds)
            ? execution.canonicalDetachedPartIds.filter((value) => typeof value === "string")
            : undefined,
          canonicalFlattenedPartIds: Array.isArray(execution?.canonicalFlattenedPartIds)
            ? execution.canonicalFlattenedPartIds.filter((value) => typeof value === "string")
            : undefined,
          visualVetoReason:
            typeof execution?.visualVetoReason === "string"
              ? execution.visualVetoReason
              : undefined,
          visualAcceptanceGatePassed:
            typeof execution?.visualAcceptanceGatePassed === "boolean"
              ? execution.visualAcceptanceGatePassed
              : undefined,
          visualFailureReasons: Array.isArray(execution?.visualFailureReasons)
            ? execution.visualFailureReasons.filter((value) => typeof value === "string")
            : undefined,
          runtimeNodePrefix:
            typeof execution?.runtimeNodePrefix === "string"
              ? execution.runtimeNodePrefix
              : undefined,
          exportedNodeNames: Array.isArray(execution?.exportedNodeNames)
            ? execution.exportedNodeNames.filter((value) => typeof value === "string")
            : undefined,
          exportedPartIds: Array.isArray(execution?.exportedPartIds)
            ? execution.exportedPartIds.filter((value) => typeof value === "string")
            : undefined,
          notes: [
            ...new Set([
              ...requestNotes,
              ...executionNotes,
              execution?.approximationReason,
              execution?.failureReason,
            ].filter((value) => typeof value === "string")),
          ],
        };
      });
  });
}

function buildWorkerExecutionScorecard(customizations, resolvedExecutionPlan) {
  const requestedAccessories = Array.isArray(customizations.accessoryRequests)
    ? customizations.accessoryRequests.flatMap((request) => {
        if (!isRecord(request) || !Array.isArray(request.instances)) {
          return [];
        }

        const shapeLabel =
          typeof request.shapeLabel === "string" && request.shapeLabel.trim()
            ? request.shapeLabel.trim()
            : typeof request.label === "string" && request.label.trim()
              ? request.label.trim()
              : "未命名配件";
        const requestColor = getColorLabel(request.colorIntent);

        return request.instances
          .filter((instance) => isRecord(instance))
          .map((instance) => {
            const anchorLabel = getAccessoryAnchorLabel(
              normalizeRuntimeAccessoryAnchor(instance.anchor),
            );
            const instanceColor = getColorLabel(instance.colorIntent) ?? requestColor;
            return `${anchorLabel} · ${shapeLabel}${instanceColor ? ` · ${instanceColor}` : ""}`;
          });
      })
    : [];
  const executedAccessories = [];
  const approximatedAccessories = [];
  const unsupportedAccessories = [];
  const runtimeDesignedAccessories = [];
  const runtimeGeneratedAccessories = [];
  const approximatedAccessoryFamilies = new Set();
  const implemented = [
    `主题：${
      typeof customizations.themeLabel === "string" && customizations.themeLabel
        ? customizations.themeLabel
        : "未显式记录"
    }`,
    getColorLabel(customizations.colorOverrides?.bodyColor)
      ? `主体颜色：${getColorLabel(customizations.colorOverrides.bodyColor)}`
      : `主体颜色：沿用 ${
          typeof customizations.themeLabel === "string" && customizations.themeLabel
            ? customizations.themeLabel
            : "主题"
        } 默认配色`,
  ];
  const approximated = [];
  const unsupported = [];

  if (getColorLabel(customizations.colorOverrides?.accessoryColor)) {
    implemented.push(`配件颜色：${getColorLabel(customizations.colorOverrides.accessoryColor)}`);
  }

  if (getColorLabel(customizations.colorOverrides?.glowColor)) {
    implemented.push(`发光颜色：${getColorLabel(customizations.colorOverrides.glowColor)}`);
  }

  if (resolvedExecutionPlan.removeDefaultAccessories.length > 0) {
    implemented.push(
      `移除默认配饰：${resolvedExecutionPlan.removeDefaultAccessories
        .map((key) => accessoryLabels[key] ?? key)
        .join(" / ")}`,
    );
  }

  if (resolvedExecutionPlan.keepThemeDefaults.length > 0) {
    implemented.push(
      `保留主题默认件：${resolvedExecutionPlan.keepThemeDefaults
        .map((key) => accessoryLabels[key] ?? key)
        .join(" / ")}`,
    );
  }

  for (const execution of resolvedExecutionPlan.addAccessories) {
    const anchorLabel = getAccessoryAnchorLabel(execution.anchor);
    const resolvedLabel = getExecutionResolvedLabel(execution);
    const executionColorLabel = getColorLabel(execution.colorIntent);

    if (execution.executionStatus === "implemented") {
      executedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      if (
        execution.creationSource === "runtime-designed" ||
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-repaired" ||
        execution.creationSource === "runtime-composed"
      ) {
        runtimeDesignedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      }
      if (
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-repaired" ||
        execution.creationSource === "runtime-composed"
      ) {
        runtimeGeneratedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      }
      implemented.push(`配件位置：${anchorLabel}`);
      implemented.push(`配件形状：${resolvedLabel}`);
      implemented.push(`创建来源：${execution.creationSource}`);
      if (executionColorLabel) {
        implemented.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (execution.executionStatus === "approximated") {
      approximatedAccessoryFamilies.add(execution.family);
      approximatedAccessories.push(
        `${anchorLabel} · ${execution.shapeLabel} -> ${resolvedLabel}`,
      );
      implemented.push(`配件位置：${anchorLabel}`);
      if (executionColorLabel) {
        implemented.push(`配件颜色：${executionColorLabel}`);
      }
      approximated.push(`配件形状：${execution.shapeLabel} -> ${resolvedLabel}`);
      if (typeof execution.approximationReason === "string") {
        approximated.push(execution.approximationReason);
      }
      continue;
    }

    unsupportedAccessories.push(`${anchorLabel} · ${execution.shapeLabel}`);
    unsupported.push(
      typeof execution.failureReason === "string"
        ? execution.failureReason
        : `配件形状：${execution.shapeLabel}`,
    );
  }

  if (Array.isArray(customizations.unsupportedRequests)) {
    unsupported.push(
      ...customizations.unsupportedRequests
        .filter((value) => typeof value === "string")
        .map((value) => `超范围：${value}`),
    );
  }

  return {
    requestedTheme:
      typeof customizations.requestedTheme === "string" &&
      customizations.requestedTheme
        ? customizations.requestedTheme
        : "未显式指定主题",
    resolvedTheme:
      typeof customizations.resolvedTheme === "string" && customizations.resolvedTheme
        ? customizations.resolvedTheme
        : typeof customizations.themeLabel === "string"
          ? customizations.themeLabel
          : "未显式记录",
    bodyPaletteIntent: Array.isArray(customizations.bodyPaletteIntent)
      ? customizations.bodyPaletteIntent.filter((value) => typeof value === "string")
      : [],
    detailPaletteIntent: Array.isArray(customizations.detailPaletteIntent)
      ? customizations.detailPaletteIntent.filter((value) => typeof value === "string")
      : [],
    requestedAccessoryCount: requestedAccessories.length,
    executedAccessoryCount: resolvedExecutionPlan.addAccessories.filter(
      (execution) => execution.executionStatus !== "unfulfilled",
    ).length,
    removedDefaultAccessories: resolvedExecutionPlan.removeDefaultAccessories.map(
      (key) => accessoryLabels[key] ?? key,
    ),
    keptThemeDefaults: resolvedExecutionPlan.keepThemeDefaults.map(
      (key) => accessoryLabels[key] ?? key,
    ),
    approximatedAccessoryFamilies: [...approximatedAccessoryFamilies],
    requestedAccessories: uniqueStrings(requestedAccessories),
    executedAccessories: uniqueStrings(executedAccessories),
    approximatedAccessories: uniqueStrings(approximatedAccessories),
    unsupportedAccessories: uniqueStrings(unsupportedAccessories),
    runtimeDesignedAccessories: uniqueStrings(runtimeDesignedAccessories),
    runtimeGeneratedAccessories: uniqueStrings(runtimeGeneratedAccessories),
    implemented: uniqueStrings(implemented),
    approximated: uniqueStrings(approximated),
    unsupported: uniqueStrings(unsupported),
  };
}

function buildWorkerExecutionBreakdown(customizations, resolvedExecutionPlan) {
  const executedCustomizations = [];
  const deferredCustomizations = [];
  const experimentalWarnings = [];
  const bodyColorLabel = getColorLabel(customizations.colorOverrides?.bodyColor);
  const accessoryColorLabel = getColorLabel(customizations.colorOverrides?.accessoryColor);
  const glowColorLabel = getColorLabel(customizations.colorOverrides?.glowColor);

  if (bodyColorLabel) {
    executedCustomizations.push(`主体颜色：${bodyColorLabel}`);
  }

  if (accessoryColorLabel && accessoryColorLabel !== bodyColorLabel) {
    executedCustomizations.push(`配饰颜色：${accessoryColorLabel}`);
  }

  if (
    glowColorLabel &&
    glowColorLabel !== bodyColorLabel &&
    glowColorLabel !== accessoryColorLabel
  ) {
    executedCustomizations.push(`发光点颜色：${glowColorLabel}`);
  }

  if (resolvedExecutionPlan.removeDefaultAccessories.length > 0) {
    executedCustomizations.push(
      `移除默认配饰：${resolvedExecutionPlan.removeDefaultAccessories
        .map((key) => accessoryLabels[key] ?? key)
        .join(" / ")}`,
    );
  }

  if (resolvedExecutionPlan.keepThemeDefaults.length > 0) {
    executedCustomizations.push(
      `保留主题默认件：${resolvedExecutionPlan.keepThemeDefaults
        .map((key) => accessoryLabels[key] ?? key)
        .join(" / ")}`,
    );
  }

  for (const execution of resolvedExecutionPlan.addAccessories) {
    const anchorLabel = getAccessoryAnchorLabel(execution.anchor);
    const resolvedLabel = getExecutionResolvedLabel(execution);
    const executionColorLabel = getColorLabel(execution.colorIntent);

    if (execution.executionStatus === "approximated") {
      executedCustomizations.push(
        `近似配件：${anchorLabel} · ${execution.shapeLabel} -> ${resolvedLabel}`,
      );
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (
      execution.executionStatus === "implemented" &&
      (execution.creationSource === "runtime-designed" ||
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-repaired" ||
        execution.creationSource === "runtime-composed")
    ) {
      executedCustomizations.push(`实验附加小件：${anchorLabel} · ${execution.shapeLabel}`);
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (
      execution.executionStatus === "implemented" &&
      execution.executionMode === "theme-default" &&
      execution.fromThemeDefault
    ) {
      executedCustomizations.push(`主题默认件：${anchorLabel} · ${resolvedLabel}`);
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (execution.executionStatus === "implemented") {
      executedCustomizations.push(`替换为支持配饰：${resolvedLabel}`);
      executedCustomizations.push(`稳定配件：${anchorLabel} · ${resolvedLabel}`);
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    deferredCustomizations.push(
      typeof execution.failureReason === "string"
        ? execution.failureReason
        : `${anchorLabel} · ${execution.shapeLabel} 已被理解，但当前暂未执行。`,
    );
  }

  if (
    isRecord(customizations.localTweaks) &&
    isRecord(customizations.localTweaks.glowIntensity) &&
    typeof customizations.localTweaks.glowIntensity.label === "string"
  ) {
    executedCustomizations.push(
      `材质发光：${customizations.localTweaks.glowIntensity.label}`,
    );
  }

  for (const tweakKey of ["earSize", "tailFluff", "eyeSize"]) {
    const tweak = isRecord(customizations.localTweaks)
      ? customizations.localTweaks[tweakKey]
      : null;
    if (isRecord(tweak) && typeof tweak.label === "string") {
      deferredCustomizations.push(
        `${tweak.label} 已被理解，但当前先不改变 fox-base-v10 母体结构。`,
      );
    }
  }

  if (
    customizations.customizationProfile === "experimental-addon" &&
    resolvedExecutionPlan.addAccessories.some(
      (execution) =>
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-composed",
    )
  ) {
    experimentalWarnings.push(
      "当前结果启用了实验定制，会新增附加小件，但不会改变 fox-base-v10 主体结构。",
    );
    experimentalWarnings.push(
      "实验定制优先验证 prompt 定制感，不保证当前结果达到作品集级成品度。",
    );
  }

  if (
    typeof customizations.refinementPassCount === "number" &&
    customizations.refinementPassCount > 0
  ) {
    experimentalWarnings.push(
      `本次 runtime 精修共执行 ${customizations.refinementPassCount} 轮，预算使用 ${typeof customizations.budgetUsedMs === "number" ? `${customizations.budgetUsedMs}ms` : "未记录"}。`,
    );
  }

  const stopDiagnosticNotes = buildRuntimeStopDiagnosticNotes(
    customizations.stopDiagnostics,
  );

  if (stopDiagnosticNotes.length > 0) {
    experimentalWarnings.push(...stopDiagnosticNotes);
  } else {
    if (typeof customizations.qualityScore === "number") {
      experimentalWarnings.push(
        `当前质量分 ${Math.round(customizations.qualityScore * 100)}% / 质量闸门${customizations.qualityGatePassed ? "已通过" : "未通过"}。`,
      );
    }

    if (typeof customizations.stopReason === "string") {
      experimentalWarnings.push(
        `停止原因：${customizations.stopReason}。`,
      );
    }
  }

  if (resolvedExecutionPlan.repairPassTriggered) {
    experimentalWarnings.push(
      "这次导出前触发了一次自动修复，以补齐缺失的配件实例或默认件移除。",
    );
  }

  return {
    executedCustomizations: uniqueStrings(executedCustomizations),
    deferredCustomizations: uniqueStrings(deferredCustomizations),
    experimentalWarnings: uniqueStrings(experimentalWarnings),
  };
}

function synchronizeCustomizationExecutionFacts(
  customizations,
  resolvedExecutionPlan,
  executionReports = [],
) {
  if (!isCustomizationRecipe(customizations) || !isRecord(customizations)) {
    return;
  }

  synchronizeRuntimeTruthSources(customizations, executionReports);
  customizations.resolvedExecutionPlan = resolvedExecutionPlan;
  customizations.executionScorecard = buildWorkerExecutionScorecard(
    customizations,
    resolvedExecutionPlan,
  );
  const breakdown = buildWorkerExecutionBreakdown(
    customizations,
    resolvedExecutionPlan,
  );
  customizations.executedCustomizations = breakdown.executedCustomizations;
  customizations.deferredCustomizations = breakdown.deferredCustomizations;
  customizations.experimentalWarnings = breakdown.experimentalWarnings;
}

function classifyRepairActionFailureLayer(action) {
  if (!isRecord(action)) {
    return "render-readability";
  }

  if (action.actionType === "re-anchor" || action.actionType === "re-orient") {
    return "anchor-projection";
  }

  if (
    action.actionType === "tighten-cohesion" ||
    action.actionType === "re-parent-part"
  ) {
    return "attachment-cohesion";
  }

  if (
    action.actionType === "reshape-silhouette" ||
    action.actionType === "rebalance-part-ratio" ||
    action.actionType === "promote-critical-part"
  ) {
    return "silhouette";
  }

  if (action.actionType === "rebuild-from-root") {
    if (action.source === "visual") {
      return "render-readability";
    }

    return Array.isArray(action.targetPartIds) && action.targetPartIds.length > 0
      ? "attachment-cohesion"
      : "silhouette";
  }

  return action.source === "visual" ? "render-readability" : "silhouette";
}

function getAppliedRepairStatsRepeatedFailureCount(appliedRepairStats, failureLayer) {
  const counts = isRecord(appliedRepairStats?.rebuildCountByLayer)
    ? appliedRepairStats.rebuildCountByLayer
    : {};

  if (failureLayer === "host-fit") {
    return (
      (typeof counts["host-fit"] === "number" ? counts["host-fit"] : 0) +
      (typeof counts["anchor-projection"] === "number" ? counts["anchor-projection"] : 0)
    );
  }

  if (failureLayer === "assembly") {
    return (
      (typeof counts.assembly === "number" ? counts.assembly : 0) +
      (typeof counts["attachment-cohesion"] === "number"
        ? counts["attachment-cohesion"]
        : 0)
    );
  }

  if (failureLayer === "composition") {
    return (
      (typeof counts["render-readability"] === "number"
        ? counts["render-readability"]
        : 0) +
      (typeof counts["critique-timeout"] === "number" ? counts["critique-timeout"] : 0)
    );
  }

  if (failureLayer === "silhouette") {
    return (
      (typeof counts.silhouette === "number" ? counts.silhouette : 0) +
      (typeof counts["outline-compiler"] === "number" ? counts["outline-compiler"] : 0)
    );
  }

  if (failureLayer === "topology") {
    return Math.max(
      typeof counts.silhouette === "number" ? counts.silhouette : 0,
      typeof counts.assembly === "number" ? counts.assembly : 0,
    );
  }

  return Math.max(
    ...(Object.values(counts).map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0,
    ) || [0]),
  );
}

function getControllerRepeatedFailureCount({
  appliedRepairStats,
  failureLayer,
  executionId,
  executionReportSnapshots,
  currentVariantId,
  currentSnapshot,
  plateauStableSnapshotCount,
}) {
  const repairStatCount = getAppliedRepairStatsRepeatedFailureCount(
    appliedRepairStats,
    failureLayer,
  );
  const consecutiveHistoryCount = countConsecutiveExecutionFailureLayerSnapshots({
    snapshots: executionReportSnapshots,
    currentSnapshot,
    executionId,
    failureLayer,
    currentVariantId,
  });

  const stableSnapshotCount =
    typeof plateauStableSnapshotCount === "number" && Number.isFinite(plateauStableSnapshotCount)
      ? Math.max(0, Math.round(plateauStableSnapshotCount))
      : 0;

  return Math.max(repairStatCount, consecutiveHistoryCount, stableSnapshotCount);
}

function applyFailureLayerControllerEscalation(report, repairActions, controller) {
  const nextActions = [...(Array.isArray(repairActions) ? repairActions : [])];
  const addOrBoostAction = (action) => {
    if (!isRecord(action) || typeof action.actionType !== "string") {
      return;
    }

    const existing = nextActions.find(
      (entry) =>
        isRecord(entry) &&
        entry.actionType === action.actionType &&
        JSON.stringify(
          Array.isArray(entry.targetPartIds) ? [...entry.targetPartIds].sort() : [],
        ) ===
          JSON.stringify(
            Array.isArray(action.targetPartIds) ? [...action.targetPartIds].sort() : [],
          ),
    );

    if (existing) {
      existing.intensity = Math.max(existing.intensity ?? 0.5, action.intensity ?? 0.5);
      existing.reason = existing.reason ?? action.reason;
      existing.source = existing.source ?? action.source;
      return;
    }

    nextActions.push(action);
  };
  const targetPartIds = uniqueStrings([
    ...(Array.isArray(report?.hiddenCriticalParts) ? report.hiddenCriticalParts : []),
    ...(Array.isArray(report?.flattenedPartIds) ? report.flattenedPartIds : []),
    ...(Array.isArray(report?.detachedPartIds) ? report.detachedPartIds : []),
  ]);

  if (controller.rebuildDirective === "re-run-host-fit") {
    addOrBoostAction({
      actionType: "re-anchor",
      source: "visual",
      reason: "failure-layer controller 要求重新跑 host-fit。",
      intensity: controller.repeatedFailureCount >= 2 ? 0.86 : 0.78,
    });
    addOrBoostAction({
      actionType: "re-orient",
      source: "visual",
      reason: "failure-layer controller 要求重新评估宿主朝向。",
      intensity: 0.7,
    });
    if (controller.repeatedFailureCount >= 2) {
      addOrBoostAction({
        actionType: "rebuild-from-root",
        source: "hybrid",
        reason: "host-fit 连续失败，不能只继续局部 nudges，需要回到 root 重新贴合。",
        intensity: 0.78,
      });
    }
  } else if (controller.rebuildDirective === "rebuild-assembly") {
    addOrBoostAction({
      actionType: "re-parent-part",
      source: "structural",
      reason: "failure-layer controller 要求重建装配关系。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: 0.84,
    });
    addOrBoostAction({
      actionType: "tighten-cohesion",
      source: "hybrid",
      reason: "装配层失败需要收紧 attachment cohesion。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: 0.8,
    });
    addOrBoostAction({
      actionType: "rebuild-from-root",
      source: "structural",
      reason: "assembly failure 不再继续局部微调，直接回到 root 重挂。",
      intensity: 0.82,
    });
  } else if (controller.rebuildDirective === "rebuild-geometry-contract") {
    addOrBoostAction({
      actionType: "reshape-silhouette",
      source: "hybrid",
      reason: "failure-layer controller 要求重建几何合同与主轮廓。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: 0.84,
    });
    addOrBoostAction({
      actionType: "rebuild-from-root",
      source: "structural",
      reason: "当前失败已经超出微调范围，需要回到 geometry contract 级别重建。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: controller.failureLayer === "topology" ? 0.9 : 0.82,
    });
  } else if (controller.rebuildDirective === "escalate-capability") {
    addOrBoostAction({
      actionType: "rebuild-from-root",
      source: "hybrid",
      reason: "同层失败已进入 stagnation，需要 capability 级别升级前的强制重建。",
      intensity: 0.9,
    });
    addOrBoostAction({
      actionType: "re-parent-part",
      source: "structural",
      reason: "stagnation 且关键件持续 detached/flattened，需要 capability 级别的定向 re-parent。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: 0.86,
    });
    addOrBoostAction({
      actionType: "tighten-cohesion",
      source: "hybrid",
      reason: "stagnation 先把关键 detached/flattened parts 收回合同允许的根部关系。",
      targetPartIds: targetPartIds.length > 0 ? targetPartIds : undefined,
      intensity: 0.82,
    });
    addOrBoostAction({
      actionType: "rebalance-part-ratio",
      source: "hybrid",
      reason: "stagnation 说明当前合同已不够，需要先强制重平衡主次轮廓。",
      targetPartIds:
        typeof report?.dominantSpanOwner === "string"
          ? [report.dominantSpanOwner]
          : undefined,
      intensity: 0.82,
    });
  }

  return mergeRenderRepairActions([], nextActions);
}

async function persistResolvedCustomizationsToTask(task, customizations) {
  if (!isCustomizationRecipe(customizations)) {
    return;
  }

  try {
    const manifest = await readJsonFile(task.artifacts.taskFile);

    if (!isRecord(manifest) || !isRecord(manifest.handoff) || !isRecord(manifest.handoff.recipe)) {
      return;
    }

    manifest.handoff.recipe.customizations = customizations;
    await writeJsonFile(task.artifacts.taskFile, manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown task.json sync error";
    log(`unable to persist updated customizations into task.json: ${message}`);
  }
}

async function persistCustomizationSummaryFactsToTask(task, customizationSummary) {
  if (!isRecord(customizationSummary)) {
    return;
  }

  try {
    const manifest = await readJsonFile(task.artifacts.taskFile);

    if (!isRecord(manifest) || !isRecord(manifest.handoff) || !isRecord(manifest.handoff.recipe)) {
      return;
    }

    const existingCustomizations = isRecord(manifest.handoff.recipe.customizations)
      ? manifest.handoff.recipe.customizations
      : {};
    const stopDiagnostics = normalizeRuntimeStopDiagnostics(
      customizationSummary.stopDiagnostics,
    );

    manifest.handoff.recipe.customizations = {
      ...existingCustomizations,
      budgetUsedMs:
        typeof customizationSummary.budgetUsedMs === "number"
          ? customizationSummary.budgetUsedMs
          : existingCustomizations.budgetUsedMs,
      refinementPassCount:
        typeof customizationSummary.refinementPassCount === "number"
          ? customizationSummary.refinementPassCount
          : existingCustomizations.refinementPassCount,
      qualityScore:
        typeof customizationSummary.qualityScore === "number"
          ? customizationSummary.qualityScore
          : existingCustomizations.qualityScore,
      qualityGatePassed:
        typeof customizationSummary.qualityGatePassed === "boolean"
          ? customizationSummary.qualityGatePassed
          : existingCustomizations.qualityGatePassed,
      precisionGatePassed:
        typeof customizationSummary.precisionGatePassed === "boolean"
          ? customizationSummary.precisionGatePassed
          : existingCustomizations.precisionGatePassed,
      precisionReady:
        typeof customizationSummary.precisionReady === "boolean"
          ? customizationSummary.precisionReady
          : existingCustomizations.precisionReady,
      visualAcceptanceGatePassed:
        typeof customizationSummary.visualAcceptanceGatePassed === "boolean"
          ? customizationSummary.visualAcceptanceGatePassed
          : existingCustomizations.visualAcceptanceGatePassed,
      stopReason:
        typeof customizationSummary.stopReason === "string"
          ? customizationSummary.stopReason
          : existingCustomizations.stopReason,
      stopDiagnostics:
        stopDiagnostics ?? existingCustomizations.stopDiagnostics,
      dominantFailureModes: Array.isArray(customizationSummary.dominantFailureModes)
        ? customizationSummary.dominantFailureModes
        : existingCustomizations.dominantFailureModes,
      faceIntrusionSeverity:
        typeof customizationSummary.faceIntrusionSeverity === "number"
          ? customizationSummary.faceIntrusionSeverity
          : existingCustomizations.faceIntrusionSeverity,
      dominantSpanOwner:
        typeof customizationSummary.dominantSpanOwner === "string"
          ? customizationSummary.dominantSpanOwner
          : existingCustomizations.dominantSpanOwner,
      canonicalDominantSpanOwner:
        typeof customizationSummary.canonicalDominantSpanOwner === "string"
          ? customizationSummary.canonicalDominantSpanOwner
          : existingCustomizations.canonicalDominantSpanOwner,
      dominantFailureLayer:
        typeof customizationSummary.dominantFailureLayer === "string"
          ? customizationSummary.dominantFailureLayer
          : existingCustomizations.dominantFailureLayer,
      rebuildCountByLayer: isRecord(customizationSummary.rebuildCountByLayer)
        ? customizationSummary.rebuildCountByLayer
        : existingCustomizations.rebuildCountByLayer,
      finalReadOrder: Array.isArray(customizationSummary.finalReadOrder)
        ? customizationSummary.finalReadOrder
        : existingCustomizations.finalReadOrder,
      precisionFailureSummary:
        typeof customizationSummary.precisionFailureSummary === "string"
          ? customizationSummary.precisionFailureSummary
          : existingCustomizations.precisionFailureSummary,
      rawFirstReadResults: Array.isArray(customizationSummary.rawFirstReadResults)
        ? customizationSummary.rawFirstReadResults
        : existingCustomizations.rawFirstReadResults,
      canonicalFirstReads: Array.isArray(customizationSummary.canonicalFirstReads)
        ? customizationSummary.canonicalFirstReads
        : existingCustomizations.canonicalFirstReads,
      rawDominantSpanOwnerTexts: Array.isArray(customizationSummary.rawDominantSpanOwnerTexts)
        ? customizationSummary.rawDominantSpanOwnerTexts
        : existingCustomizations.rawDominantSpanOwnerTexts,
      visualFailureReasons: Array.isArray(customizationSummary.visualFailureReasons)
        ? customizationSummary.visualFailureReasons
        : existingCustomizations.visualFailureReasons,
      plateauReason:
        typeof customizationSummary.plateauReason === "string"
          ? customizationSummary.plateauReason
          : existingCustomizations.plateauReason,
      qualityMetrics: isRecord(customizationSummary.qualityMetrics)
        ? customizationSummary.qualityMetrics
        : existingCustomizations.qualityMetrics,
    };

    await writeJsonFile(task.artifacts.taskFile, manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown task summary sync error";
    log(`unable to persist customization summary facts into task.json: ${message}`);
  }
}

function buildMetadataCustomizationSummary(task) {
  const customizations = getTaskCustomizations(task);
  const mode = isGenerationMode(task.input.generationMode)
    ? task.input.generationMode
    : "fast-stable";
  const customizationProfile =
    mode === "dynamic-custom" &&
    isCustomizationRecipe(customizations) &&
    isCustomizationProfile(customizations.customizationProfile)
      ? customizations.customizationProfile
      : mode === "dynamic-custom" && isCustomizationProfile(task.input.customizationProfile)
        ? task.input.customizationProfile
        : "safe-overlay";

  if (!customizations) {
    return {
      mode,
      modeLabel: getModeLabel(mode),
      customizationProfile,
      customizationProfileLabel: getCustomizationProfileLabel(customizationProfile),
      parserSource: "rule-fallback",
      parserLabel: "规则回退解析",
      requestedTheme: "未显式指定主题",
      resolvedTheme: "未显式记录",
      themeLabel: "未显式记录",
      themeReason: "当前没有显式主题理解说明。",
      bodyPaletteIntent: [],
      detailPaletteIntent: [],
      fromThemeDefaults: [],
      fromPromptOverrides: [],
      colorOverrides: [],
      accessorySummary: "当前没有额外配饰处理。",
      requestedAccessoryCount: 0,
      executedAccessoryCount: 0,
      runtimeDesignTaskCount: 0,
      nounDesignBriefCount: 0,
      partGraphCount: 0,
      geometryRecipeCount: 0,
      visualCritiqueCount: 0,
      runtimeAttemptBudgetMs: mode === "dynamic-custom" ? 300000 : undefined,
      budgetUsedMs: undefined,
      refinementPassCount: undefined,
      qualityScore: undefined,
      qualityGatePassed: undefined,
      precisionGatePassed: undefined,
      precisionReady: undefined,
      stopReason: undefined,
      stopDiagnostics: undefined,
      qualityMetrics: undefined,
      dominantFailureModes: [],
      removedDefaultAccessories: [],
      keptThemeDefaults: [],
      approximatedAccessoryFamilies: [],
      repairPassTriggered: false,
      requestedAccessories: [],
      executedAccessories: [],
      approximatedAccessories: [],
      unsupportedAccessories: [],
      localTweaks: [],
      negations: [],
      unsupportedRequests: [],
      unsupportedNotes: [],
      executedCustomizations: [],
      deferredCustomizations: [],
      experimentalWarnings: [],
      confidence: 0.72,
      accessoryFulfillmentRows: [],
      executionScorecard: {
        requestedTheme: "未显式指定主题",
        resolvedTheme: "未显式记录",
        bodyPaletteIntent: [],
        detailPaletteIntent: [],
        requestedAccessoryCount: 0,
        executedAccessoryCount: 0,
        removedDefaultAccessories: [],
        keptThemeDefaults: [],
        approximatedAccessoryFamilies: [],
        requestedAccessories: [],
        executedAccessories: [],
        approximatedAccessories: [],
        unsupportedAccessories: [],
        runtimeDesignedAccessories: [],
        runtimeGeneratedAccessories: [],
        implemented: [],
        approximated: [],
        unsupported: [],
      },
    };
  }

  const colorOverrides = isRecord(customizations.colorOverrides)
    ? [
        ...new Set(
          Object.values(customizations.colorOverrides)
            .filter((value) => isRecord(value) && typeof value.label === "string")
            .map((value) => value.label),
        ),
      ]
    : [];
  const localTweaks = isRecord(customizations.localTweaks)
    ? Object.values(customizations.localTweaks)
        .filter((value) => isRecord(value) && typeof value.label === "string")
        .map((value) => value.label)
    : [];
  const resolvedExecutionPlan = getResolvedExecutionPlanFromCustomizations(customizations);
  const hasRuntimeGeneratedAccessories =
    resolvedExecutionPlan?.addAccessories?.some(
      (execution) => execution.executionMode === "runtime-generated",
    ) ?? false;
  const hasApproximateAccessories =
    resolvedExecutionPlan?.addAccessories?.some(
      (execution) => execution.executionMode === "approximate-fallback",
    ) ?? false;
  const accessorySummary =
    hasRuntimeGeneratedAccessories
      ? "实验附加小件：按实例执行"
      : hasApproximateAccessories
        ? "近似配件：按实例回退"
        : isRecord(customizations.accessoryOperation) &&
            customizations.accessoryOperation.type === "remove-default"
      ? `移除默认配饰${
          typeof customizations.accessoryOperation.targetLabel === "string" &&
          customizations.accessoryOperation.targetLabel
            ? `：${customizations.accessoryOperation.targetLabel}`
            : ""
        }`
      : isRecord(customizations.accessoryOperation) &&
          customizations.accessoryOperation.type === "replace-with-supported"
        ? `替换为支持配饰：${customizations.accessoryOperation.label ?? "未命名配饰"}`
        : isRecord(customizations.accessoryOperation) &&
            customizations.accessoryOperation.type === "generate-simple-accessory"
          ? customizationProfile === "experimental-addon"
            ? `实验附加小件：${customizations.accessoryOperation.label ?? "未命名小件"}`
            : typeof customizations.accessoryOperation.accessoryKey === "string" &&
                accessoryLabels[customizations.accessoryOperation.accessoryKey]
              ? `近似配件：${customizations.accessoryOperation.label ?? "未命名小件"} -> ${accessoryLabels[customizations.accessoryOperation.accessoryKey]}`
              : `已理解小件需求：${customizations.accessoryOperation.label ?? "未命名小件"}（稳定定制暂未执行）`
          : `沿用主题默认配饰：${
              isRecord(customizations.accessoryOperation) &&
              typeof customizations.accessoryOperation.label === "string"
                ? customizations.accessoryOperation.label
                : "默认配饰"
            }`;
  const accessoryFulfillmentRows =
    buildAccessoryFulfillmentRowsFromCustomizations(customizations);
  const runtimeDesignTaskCount = Array.isArray(customizations.runtimeDesignTasks)
    ? customizations.runtimeDesignTasks.filter((value) => isRecord(value)).length
    : 0;
  const nounDesignBriefCount = getNounDesignBriefsFromCustomizations(customizations).length;
  const partGraphCount = getAccessoryPartGraphsFromCustomizations(customizations).length;
  const geometryRecipeCount = Array.isArray(customizations.geometryRecipes)
    ? customizations.geometryRecipes.filter((value) => isRecord(value)).length
    : 0;
  const visualCritiqueCount =
    getVisualCritiqueReportsFromCustomizations(customizations).length;
  const stopDiagnostics = normalizeRuntimeStopDiagnostics(
    customizations.stopDiagnostics,
  );

  return {
    mode,
    modeLabel: getModeLabel(mode),
    customizationProfile,
    customizationProfileLabel: getCustomizationProfileLabel(customizationProfile),
    parserSource:
      customizations.parserSource === "openai" ||
      customizations.parserSource === "deepseek"
        ? customizations.parserSource
        : "rule-fallback",
    parserLabel: getParserSourceLabel(customizations.parserSource),
    requestedTheme:
      typeof customizations.requestedTheme === "string" &&
      customizations.requestedTheme
        ? customizations.requestedTheme
        : "未显式指定主题",
    resolvedTheme:
      typeof customizations.resolvedTheme === "string" && customizations.resolvedTheme
        ? customizations.resolvedTheme
        : typeof customizations.themeLabel === "string"
          ? customizations.themeLabel
          : "未显式记录",
    themeLabel:
      typeof customizations.themeLabel === "string"
        ? customizations.themeLabel
        : "未显式记录",
    themeReason:
      typeof customizations.themeReason === "string" && customizations.themeReason
        ? customizations.themeReason
        : "当前没有显式主题理解说明。",
    bodyPaletteIntent: Array.isArray(customizations.bodyPaletteIntent)
      ? customizations.bodyPaletteIntent.filter((value) => typeof value === "string")
      : [],
    detailPaletteIntent: Array.isArray(customizations.detailPaletteIntent)
      ? customizations.detailPaletteIntent.filter((value) => typeof value === "string")
      : [],
    fromThemeDefaults: Array.isArray(customizations.fromThemeDefaults)
      ? customizations.fromThemeDefaults.filter((value) => typeof value === "string")
      : [],
    fromPromptOverrides: Array.isArray(customizations.fromPromptOverrides)
      ? customizations.fromPromptOverrides.filter((value) => typeof value === "string")
      : [],
    colorOverrides,
    accessorySummary,
    requestedAccessoryCount:
      isRecord(customizations.executionScorecard) &&
      typeof customizations.executionScorecard.requestedAccessoryCount === "number"
        ? customizations.executionScorecard.requestedAccessoryCount
        : 0,
    executedAccessoryCount:
      isRecord(customizations.executionScorecard) &&
      typeof customizations.executionScorecard.executedAccessoryCount === "number"
        ? customizations.executionScorecard.executedAccessoryCount
        : 0,
    runtimeDesignTaskCount,
    nounDesignBriefCount,
    partGraphCount,
    geometryRecipeCount,
    visualCritiqueCount,
    runtimeAttemptBudgetMs:
      typeof customizations.runtimeAttemptBudgetMs === "number"
        ? customizations.runtimeAttemptBudgetMs
        : mode === "dynamic-custom" && customizationProfile === "experimental-addon"
          ? 300000
          : undefined,
    budgetUsedMs:
      typeof customizations.budgetUsedMs === "number"
        ? Math.max(0, Math.round(customizations.budgetUsedMs))
        : undefined,
    refinementPassCount:
      typeof customizations.refinementPassCount === "number"
        ? Math.max(0, Math.round(customizations.refinementPassCount))
        : undefined,
    qualityScore:
      typeof customizations.qualityScore === "number"
        ? Number(customizations.qualityScore.toFixed(2))
        : undefined,
    qualityGatePassed:
      typeof customizations.qualityGatePassed === "boolean"
        ? customizations.qualityGatePassed
        : undefined,
    precisionGatePassed:
      typeof customizations.precisionGatePassed === "boolean"
        ? customizations.precisionGatePassed
        : undefined,
    precisionReady:
      typeof customizations.precisionReady === "boolean"
        ? customizations.precisionReady
        : undefined,
    visualAcceptanceGatePassed:
      typeof customizations.visualAcceptanceGatePassed === "boolean"
        ? customizations.visualAcceptanceGatePassed
        : undefined,
    stopReason:
      typeof customizations.stopReason === "string"
        ? customizations.stopReason
        : undefined,
    stopDiagnostics,
    qualityMetrics:
      isRecord(customizations.qualityMetrics)
        ? {
            shapeReadability:
              typeof customizations.qualityMetrics.shapeReadability === "number"
                ? Number(customizations.qualityMetrics.shapeReadability.toFixed(2))
                : 0,
            visualReadability:
              typeof customizations.qualityMetrics.visualReadability === "number"
                ? Number(customizations.qualityMetrics.visualReadability.toFixed(2))
                : 0,
            anchorAccuracy:
              typeof customizations.qualityMetrics.anchorAccuracy === "number"
                ? Number(customizations.qualityMetrics.anchorAccuracy.toFixed(2))
                : 0,
            colorIsolation:
              typeof customizations.qualityMetrics.colorIsolation === "number"
                ? Number(customizations.qualityMetrics.colorIsolation.toFixed(2))
                : 0,
            occlusionRisk:
              typeof customizations.qualityMetrics.occlusionRisk === "number"
                ? Number(customizations.qualityMetrics.occlusionRisk.toFixed(2))
                : 0,
            scaleFit:
              typeof customizations.qualityMetrics.scaleFit === "number"
                ? Number(customizations.qualityMetrics.scaleFit.toFixed(2))
                : 0,
            hostComposition:
              typeof customizations.qualityMetrics.hostComposition === "number"
                ? Number(customizations.qualityMetrics.hostComposition.toFixed(2))
                : 0,
            silhouetteStrength:
              typeof customizations.qualityMetrics.silhouetteStrength === "number"
                ? Number(customizations.qualityMetrics.silhouetteStrength.toFixed(2))
                : 0,
            lookalikeRisk:
              typeof customizations.qualityMetrics.lookalikeRisk === "number"
                ? Number(customizations.qualityMetrics.lookalikeRisk.toFixed(2))
                : 0,
            nounFidelity:
              typeof customizations.qualityMetrics.nounFidelity === "number"
                ? Number(customizations.qualityMetrics.nounFidelity.toFixed(2))
                : 0,
            criticalPartsPresent:
              typeof customizations.qualityMetrics.criticalPartsPresent === "number"
                ? Number(customizations.qualityMetrics.criticalPartsPresent.toFixed(2))
                : 0,
            archetypeMatch:
              typeof customizations.qualityMetrics.archetypeMatch === "number"
                ? Number(customizations.qualityMetrics.archetypeMatch.toFixed(2))
                : 0,
            cohesionScore:
              typeof customizations.qualityMetrics.cohesionScore === "number"
                ? Number(customizations.qualityMetrics.cohesionScore.toFixed(2))
                : 0,
          }
        : undefined,
    critiqueSource:
      typeof customizations.critiqueSource === "string"
        ? customizations.critiqueSource
        : undefined,
    structureRepairCount:
      typeof customizations.structureRepairCount === "number"
        ? Math.max(0, Math.round(customizations.structureRepairCount))
        : undefined,
    renderCritiqueAvailable:
      typeof customizations.renderCritiqueAvailable === "boolean"
        ? customizations.renderCritiqueAvailable
        : undefined,
    sourceModes: Array.isArray(customizations.sourceModes)
      ? uniqueStrings(customizations.sourceModes.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.sourceMode)
            .filter((value) => typeof value === "string"),
        ),
    referenceUsed:
      typeof customizations.referenceUsed === "boolean"
        ? customizations.referenceUsed
        : accessoryFulfillmentRows.some(
            (row) => typeof row?.referenceId === "string" && row.referenceId,
          ),
    blueprintFamilies: Array.isArray(customizations.blueprintFamilies)
      ? uniqueStrings(customizations.blueprintFamilies.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.blueprintFamily)
            .filter((value) => typeof value === "string"),
        ),
    variantIds: Array.isArray(customizations.variantIds)
      ? uniqueStrings(customizations.variantIds.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.variantId)
            .filter((value) => typeof value === "string"),
        ),
    rawFirstReadResults: Array.isArray(customizations.rawFirstReadResults)
      ? uniqueStrings(customizations.rawFirstReadResults.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.rawFirstReadResult)
            .filter((value) => typeof value === "string"),
        ),
    firstReadResults: Array.isArray(customizations.firstReadResults)
      ? uniqueStrings(customizations.firstReadResults.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.firstReadResult)
            .filter((value) => typeof value === "string"),
        ),
    canonicalFirstReads: Array.isArray(customizations.canonicalFirstReads)
      ? uniqueStrings(customizations.canonicalFirstReads.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.canonicalFirstRead)
            .filter((value) => typeof value === "string"),
        ),
    rawDominantSpanOwnerTexts: Array.isArray(customizations.rawDominantSpanOwnerTexts)
      ? uniqueStrings(
          customizations.rawDominantSpanOwnerTexts.filter((value) => typeof value === "string"),
        )
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.rawDominantSpanOwnerText)
            .filter((value) => typeof value === "string"),
        ),
    visualVetoReasons: Array.isArray(customizations.visualVetoReasons)
      ? uniqueStrings(customizations.visualVetoReasons.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .map((row) => row?.visualVetoReason)
            .filter((value) => typeof value === "string"),
        ),
    visualFailureReasons: Array.isArray(customizations.visualFailureReasons)
      ? uniqueStrings(customizations.visualFailureReasons.filter((value) => typeof value === "string"))
      : uniqueStrings(
          accessoryFulfillmentRows
            .flatMap((row) => row?.visualFailureReasons ?? [])
            .filter((value) => typeof value === "string"),
        ),
    faceIntrusionSeverity:
      typeof customizations.faceIntrusionSeverity === "number"
        ? Number(customizations.faceIntrusionSeverity.toFixed(2))
        : undefined,
    dominantSpanOwner:
      typeof customizations.dominantSpanOwner === "string"
        ? customizations.dominantSpanOwner
        : undefined,
    canonicalDominantSpanOwner:
      typeof customizations.canonicalDominantSpanOwner === "string"
        ? customizations.canonicalDominantSpanOwner
        : undefined,
    plateauReason:
      typeof customizations.plateauReason === "string"
        ? customizations.plateauReason
        : undefined,
    dominantFailureModes: Array.isArray(customizations.dominantFailureModes)
      ? customizations.dominantFailureModes.filter((value) => typeof value === "string")
      : [],
    removedDefaultAccessories:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.removedDefaultAccessories)
        ? customizations.executionScorecard.removedDefaultAccessories.filter(
            (value) => typeof value === "string",
          )
        : [],
    keptThemeDefaults:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.keptThemeDefaults)
        ? customizations.executionScorecard.keptThemeDefaults.filter(
            (value) => typeof value === "string",
          )
        : [],
    approximatedAccessoryFamilies:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.approximatedAccessoryFamilies)
        ? customizations.executionScorecard.approximatedAccessoryFamilies.filter(
            (value) => typeof value === "string",
          )
        : [],
    repairPassTriggered:
      isRecord(customizations.resolvedExecutionPlan) &&
      customizations.resolvedExecutionPlan.repairPassTriggered === true,
    requestedAccessories:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.requestedAccessories)
        ? customizations.executionScorecard.requestedAccessories.filter(
            (value) => typeof value === "string",
          )
        : [],
    executedAccessories:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.executedAccessories)
        ? customizations.executionScorecard.executedAccessories.filter(
            (value) => typeof value === "string",
          )
        : [],
    approximatedAccessories:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.approximatedAccessories)
        ? customizations.executionScorecard.approximatedAccessories.filter(
            (value) => typeof value === "string",
          )
        : [],
    unsupportedAccessories:
      isRecord(customizations.executionScorecard) &&
      Array.isArray(customizations.executionScorecard.unsupportedAccessories)
        ? customizations.executionScorecard.unsupportedAccessories.filter(
            (value) => typeof value === "string",
          )
        : [],
    localTweaks,
    negations: Array.isArray(customizations.negations)
      ? customizations.negations.filter((value) => typeof value === "string")
      : [],
    unsupportedRequests: Array.isArray(customizations.unsupportedRequests)
      ? customizations.unsupportedRequests.filter((value) => typeof value === "string")
      : [],
    unsupportedNotes: Array.isArray(customizations.unsupportedNotes)
      ? customizations.unsupportedNotes.filter((value) => typeof value === "string")
      : [],
    executedCustomizations: Array.isArray(customizations.executedCustomizations)
      ? customizations.executedCustomizations.filter(
          (value) => typeof value === "string",
        )
      : [],
    deferredCustomizations: Array.isArray(customizations.deferredCustomizations)
      ? customizations.deferredCustomizations.filter(
          (value) => typeof value === "string",
        )
      : [],
    experimentalWarnings: Array.isArray(customizations.experimentalWarnings)
      ? customizations.experimentalWarnings.filter(
          (value) => typeof value === "string",
        )
      : [],
    confidence:
      typeof customizations.confidence === "number"
        ? Number(customizations.confidence.toFixed(2))
        : 0.72,
    accessoryFulfillmentRows,
    executionScorecard:
      isRecord(customizations.executionScorecard)
        ? {
            requestedTheme:
              typeof customizations.executionScorecard.requestedTheme === "string"
                ? customizations.executionScorecard.requestedTheme
                : "未显式指定主题",
            resolvedTheme:
              typeof customizations.executionScorecard.resolvedTheme === "string"
                ? customizations.executionScorecard.resolvedTheme
                : typeof customizations.themeLabel === "string"
                  ? customizations.themeLabel
                  : "未显式记录",
            bodyPaletteIntent: Array.isArray(
              customizations.executionScorecard.bodyPaletteIntent,
            )
              ? customizations.executionScorecard.bodyPaletteIntent.filter(
                  (value) => typeof value === "string",
                )
              : [],
            detailPaletteIntent: Array.isArray(
              customizations.executionScorecard.detailPaletteIntent,
            )
              ? customizations.executionScorecard.detailPaletteIntent.filter(
                  (value) => typeof value === "string",
                )
              : [],
            requestedAccessoryCount:
              typeof customizations.executionScorecard.requestedAccessoryCount === "number"
                ? customizations.executionScorecard.requestedAccessoryCount
                : 0,
            executedAccessoryCount:
              typeof customizations.executionScorecard.executedAccessoryCount === "number"
                ? customizations.executionScorecard.executedAccessoryCount
                : 0,
            removedDefaultAccessories: Array.isArray(
              customizations.executionScorecard.removedDefaultAccessories,
            )
              ? customizations.executionScorecard.removedDefaultAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            keptThemeDefaults: Array.isArray(
              customizations.executionScorecard.keptThemeDefaults,
            )
              ? customizations.executionScorecard.keptThemeDefaults.filter(
                  (value) => typeof value === "string",
                )
              : [],
            approximatedAccessoryFamilies: Array.isArray(
              customizations.executionScorecard.approximatedAccessoryFamilies,
            )
              ? customizations.executionScorecard.approximatedAccessoryFamilies.filter(
                  (value) => typeof value === "string",
                )
              : [],
            requestedAccessories: Array.isArray(
              customizations.executionScorecard.requestedAccessories,
            )
              ? customizations.executionScorecard.requestedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            executedAccessories: Array.isArray(
              customizations.executionScorecard.executedAccessories,
            )
              ? customizations.executionScorecard.executedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            approximatedAccessories: Array.isArray(
              customizations.executionScorecard.approximatedAccessories,
            )
              ? customizations.executionScorecard.approximatedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            unsupportedAccessories: Array.isArray(
              customizations.executionScorecard.unsupportedAccessories,
            )
              ? customizations.executionScorecard.unsupportedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            runtimeDesignedAccessories: Array.isArray(
              customizations.executionScorecard.runtimeDesignedAccessories,
            )
              ? customizations.executionScorecard.runtimeDesignedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            runtimeGeneratedAccessories: Array.isArray(
              customizations.executionScorecard.runtimeGeneratedAccessories,
            )
              ? customizations.executionScorecard.runtimeGeneratedAccessories.filter(
                  (value) => typeof value === "string",
                )
              : [],
            implemented: Array.isArray(customizations.executionScorecard.implemented)
              ? customizations.executionScorecard.implemented.filter(
                  (value) => typeof value === "string",
                )
              : [],
            approximated: Array.isArray(customizations.executionScorecard.approximated)
              ? customizations.executionScorecard.approximated.filter(
                  (value) => typeof value === "string",
                )
              : [],
            unsupported: Array.isArray(customizations.executionScorecard.unsupported)
              ? customizations.executionScorecard.unsupported.filter(
                  (value) => typeof value === "string",
                )
              : [],
          }
        : {
            requestedTheme: "未显式指定主题",
            resolvedTheme:
              typeof customizations.themeLabel === "string"
                ? customizations.themeLabel
                : "未显式记录",
            bodyPaletteIntent: [],
            detailPaletteIntent: [],
            requestedAccessoryCount: 0,
            executedAccessoryCount: 0,
            removedDefaultAccessories: [],
            keptThemeDefaults: [],
            approximatedAccessoryFamilies: [],
            requestedAccessories: [],
            executedAccessories: [],
            approximatedAccessories: [],
            unsupportedAccessories: [],
            runtimeDesignedAccessories: [],
            runtimeGeneratedAccessories: [],
            implemented: [],
            approximated: [],
            unsupported: [],
          },
  };
}

function buildStructuredPromptFromTask(task, styleLabel, recipe) {
  const customizations = getTaskCustomizations(task);
  const customizationProfile =
    task.input.generationMode === "dynamic-custom" &&
    isCustomizationRecipe(customizations) &&
    isCustomizationProfile(customizations.customizationProfile)
      ? customizations.customizationProfile
      : task.input.generationMode === "dynamic-custom" &&
          isCustomizationProfile(task.input.customizationProfile)
        ? task.input.customizationProfile
        : "safe-overlay";
  const themeDefaults = customizations?.fromThemeDefaults?.length
    ? customizations.fromThemeDefaults.join(" + ")
    : "无";
  const overrides = customizations?.fromPromptOverrides?.length
    ? customizations.fromPromptOverrides.join(" + ")
    : "无";
  const negations = customizations?.negations?.length
    ? customizations.negations.join(" + ")
    : "无";
  const unsupported = customizations?.unsupportedRequests?.length
    ? customizations.unsupportedRequests.join(" + ")
    : "无";

  return `对象: 已支持物种模板变体生成; 当前物种: ${foxBaseContract.speciesKey}; 模板: ${foxBaseContract.templateVersion}; 生成链路: ${foxBaseContract.generatorMode}; 请求模式: ${getModeLabel(task.input.generationMode)}; 定制档位: ${getCustomizationProfileLabel(customizationProfile)}; 风格: ${styleLabel}; 主题槽位: ${recipe.themeSlot}; 主题标签: ${recipe.themeLabel}; 解析来源: ${getParserSourceLabel(customizations?.parserSource)}; 主题继承: ${themeDefaults}; Prompt 覆盖: ${overrides}; 否定词: ${negations}; 超范围要求: ${unsupported}; 文本归一化: ${task.input.prompt}; 相机预设: ${recipe.cameraPreset}; 姿态预设: ${recipe.posePreset}; Android 摆放预设: ${recipe.arPlacementPreset}; 输出: model.glb + model.usdz + thumbnail.png + metadata.json;`;
}

function addVector(base, offset = [0, 0, 0]) {
  return [
    Number((base[0] + (offset[0] ?? 0)).toFixed(4)),
    Number((base[1] + (offset[1] ?? 0)).toFixed(4)),
    Number((base[2] + (offset[2] ?? 0)).toFixed(4)),
  ];
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function normalizeDegrees(value) {
  const normalized = value % 360;
  return Number((normalized < 0 ? normalized + 360 : normalized).toFixed(4));
}

function rotateVectorByEulerDegrees(vector, rotation = [0, 0, 0]) {
  let [x, y, z] = vector;
  const [rx, ry, rz] = rotation.map((value) => degreesToRadians(value ?? 0));

  if (rx !== 0) {
    const cos = Math.cos(rx);
    const sin = Math.sin(rx);
    const nextY = y * cos - z * sin;
    const nextZ = y * sin + z * cos;
    y = nextY;
    z = nextZ;
  }

  if (ry !== 0) {
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);
    const nextX = x * cos + z * sin;
    const nextZ = -x * sin + z * cos;
    x = nextX;
    z = nextZ;
  }

  if (rz !== 0) {
    const cos = Math.cos(rz);
    const sin = Math.sin(rz);
    const nextX = x * cos - y * sin;
    const nextY = x * sin + y * cos;
    x = nextX;
    y = nextY;
  }

  return [Number(x.toFixed(4)), Number(y.toFixed(4)), Number(z.toFixed(4))];
}

function transformStageCameraLocation(location) {
  const exportRotation = Array.isArray(foxBaseContract.assetExportFacingRotation)
    ? foxBaseContract.assetExportFacingRotation
    : [0, 0, 0];
  const exportScale =
    typeof foxBaseContract.assetExportScaleFactor === "number" &&
    Number.isFinite(foxBaseContract.assetExportScaleFactor) &&
    foxBaseContract.assetExportScaleFactor > 0
      ? foxBaseContract.assetExportScaleFactor
      : 1;

  const rotated = rotateVectorByEulerDegrees(location, exportRotation);

  return rotated.map((value) => Number((value * exportScale).toFixed(4)));
}

function transformStageCameraRotation(rotation) {
  const exportRotation = Array.isArray(foxBaseContract.assetExportFacingRotation)
    ? foxBaseContract.assetExportFacingRotation
    : [0, 0, 0];

  return rotation.map((value, index) =>
    normalizeDegrees((value ?? 0) + (exportRotation[index] ?? 0)),
  );
}

function buildGeneratedAccessoryOperations(kind, anchor, anchorPosition, baseName) {
  if (kind === "necklace-chain") {
    return [
      ...[
        [-0.042, 0.001, 0.014],
        [-0.022, 0.001, 0.006],
        [0, 0.001, 0.002],
        [0.022, 0.001, 0.006],
        [0.042, 0.001, 0.014],
      ].map((offset, index) => ({
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_chain_${index}`,
          size: 0.012,
          location: addVector(anchorPosition, offset),
          scale: [0.44, 0.44, 0.44],
        },
      })),
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_drop`,
          size: 0.012,
          location: addVector(anchorPosition, [0, 0.002, -0.016]),
          scale: [0.12, 0.54, 0.12],
          vertices: 12,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_charm`,
          size: 0.022,
          location: addVector(anchorPosition, [0, 0.002, -0.032]),
          scale: [0.72, 0.72, 0.72],
        },
      },
    ];
  }

  if (kind === "earring-hoop") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_hoop`,
          size: 0.026,
          location: anchorPosition,
          rotation: [90, 0, 0],
          scale: [0.52, 0.52, 0.16],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_bead`,
          size: 0.01,
          location: addVector(anchorPosition, [0, 0.001, -0.018]),
          scale: [0.52, 0.52, 0.52],
        },
      },
    ];
  }

  if (kind === "pendant-charm") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_ring`,
          size: 0.014,
          location: addVector(anchorPosition, [0, 0.001, 0.014]),
          rotation: [90, 0, 0],
          scale: [0.34, 0.34, 0.14],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_link`,
          size: 0.01,
          location: addVector(anchorPosition, [0, 0.001, 0.002]),
          scale: [0.1, 0.52, 0.1],
          vertices: 12,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_token`,
          size: 0.026,
          location: addVector(anchorPosition, [0, 0.001, -0.018]),
          scale: [0.68, 0.68, 0.78],
        },
      },
    ];
  }

  if (kind === "tie") {
    const isEarAnchor = anchor === "left-ear" || anchor === "right-ear";
    const sideTilt = anchor === "left-ear" ? 18 : anchor === "right-ear" ? -18 : 0;

    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_knot`,
          size: isEarAnchor ? 0.032 : 0.046,
          location: addVector(anchorPosition, [0, 0.002, isEarAnchor ? 0.012 : 0.014]),
          rotation: [0, 0, sideTilt],
          scale: isEarAnchor ? [0.54, 0.3, 0.3] : [0.72, 0.34, 0.34],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_collar_left`,
          size: isEarAnchor ? 0.022 : 0.024,
          location: addVector(
            anchorPosition,
            [isEarAnchor ? -0.008 : -0.012, 0.001, isEarAnchor ? 0.008 : 0.01],
          ),
          rotation: [0, 0, 28 + sideTilt],
          scale: isEarAnchor ? [0.24, 0.48, 0.12] : [0.28, 0.56, 0.14],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_collar_right`,
          size: isEarAnchor ? 0.022 : 0.024,
          location: addVector(
            anchorPosition,
            [isEarAnchor ? 0.008 : 0.012, 0.001, isEarAnchor ? 0.008 : 0.01],
          ),
          rotation: [0, 0, -28 + sideTilt],
          scale: isEarAnchor ? [0.24, 0.48, 0.12] : [0.28, 0.56, 0.14],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_blade_main`,
          size: isEarAnchor ? 0.072 : 0.108,
          location: addVector(anchorPosition, [0, 0.003, isEarAnchor ? -0.004 : -0.014]),
          rotation: [180, 0, sideTilt],
          scale: isEarAnchor ? [0.18, 0.14, 0.58] : [0.22, 0.18, 0.76],
          vertices: 4,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_blade_back`,
          size: isEarAnchor ? 0.046 : 0.068,
          location: addVector(
            anchorPosition,
            [isEarAnchor ? 0.004 : 0.006, 0.002, isEarAnchor ? 0.001 : -0.004],
          ),
          rotation: [180, 0, sideTilt + 8],
          scale: isEarAnchor ? [0.14, 0.1, 0.34] : [0.18, 0.14, 0.44],
          vertices: 4,
        },
      },
    ];
  }

  if (kind === "badge") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_badge`,
          size: 0.074,
          location: addVector(anchorPosition, [0, 0.006, 0.004]),
          rotation: [90, 0, 0],
          scale: [0.58, 0.16, 0.58],
          vertices: 24,
        },
      },
    ];
  }

  if (kind === "bow") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_left_wing`,
          size: 0.032,
          location: addVector(anchorPosition, [-0.013, 0, 0.003]),
          scale: [0.92, 0.28, 0.54],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_right_wing`,
          size: 0.032,
          location: addVector(anchorPosition, [0.013, 0, 0.003]),
          scale: [0.92, 0.28, 0.54],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_knot`,
          size: 0.02,
          location: addVector(anchorPosition, [0, 0, 0.002]),
          scale: [0.52, 0.34, 0.36],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_left_tail`,
          size: 0.022,
          location: addVector(anchorPosition, [-0.006, 0, -0.008]),
          rotation: [0, 0, 18],
          scale: [0.2, 0.44, 0.56],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cube",
          name: `${baseName}_right_tail`,
          size: 0.022,
          location: addVector(anchorPosition, [0.006, 0, -0.008]),
          rotation: [0, 0, -18],
          scale: [0.2, 0.44, 0.56],
        },
      },
    ];
  }

  if (kind === "bell") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_ring`,
          size: 0.012,
          location: addVector(anchorPosition, [0, 0, 0.0085]),
          rotation: [90, 0, 0],
          scale: [0.34, 0.34, 0.12],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_cap`,
          size: 0.014,
          location: addVector(anchorPosition, [0, 0, 0.0045]),
          scale: [0.22, 0.22, 0.14],
          vertices: 16,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_body`,
          size: 0.028,
          location: addVector(anchorPosition, [0, 0, -0.005]),
          scale: [0.62, 0.62, 0.8],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_clapper`,
          size: 0.008,
          location: addVector(anchorPosition, [0, 0, -0.011]),
          scale: [0.5, 0.5, 0.5],
        },
      },
    ];
  }

  if (kind === "flower") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_core`,
          size: 0.028,
          location: anchorPosition,
          scale: [0.72, 0.72, 0.52],
        },
      },
      ...[
        [-0.026, 0, 0.004],
        [0.026, 0, 0.004],
        [0, 0, 0.028],
        [0, 0, -0.024],
        [-0.018, 0, 0.02],
        [0.018, 0, 0.02],
      ].map((offset, index) => ({
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_petal_${index}`,
          size: 0.03,
          location: addVector(anchorPosition, offset),
          scale: [0.6, 0.24, 0.42],
        },
      })),
    ];
  }

  if (kind === "star") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_core`,
          size: 0.022,
          location: anchorPosition,
          scale: [0.45, 0.45, 0.45],
        },
      },
      ...[
        [0, 0, 0.038],
        [0.036, 0, 0.012],
        [0.022, 0, -0.028],
        [-0.022, 0, -0.028],
        [-0.036, 0, 0.012],
      ].map((offset, index) => ({
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_ray_${index}`,
          size: 0.034,
          location: addVector(anchorPosition, offset),
          rotation: [90, 0, index * 72],
          scale: [0.18, 0.18, 0.42],
          vertices: 4,
        },
      })),
    ];
  }

  if (kind === "cloud") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_ring`,
          size: 0.016,
          location: addVector(anchorPosition, [0, 0.002, 0.022]),
          rotation: [90, 0, 0],
          scale: [0.28, 0.28, 0.12],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_left_puff`,
          size: 0.026,
          location: addVector(anchorPosition, [-0.02, 0, -0.002]),
          scale: [0.78, 0.52, 0.58],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_center_puff`,
          size: 0.034,
          location: addVector(anchorPosition, [0, 0, 0.004]),
          scale: [0.9, 0.58, 0.68],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_right_puff`,
          size: 0.026,
          location: addVector(anchorPosition, [0.02, 0, -0.002]),
          scale: [0.78, 0.52, 0.58],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_base_puff`,
          size: 0.03,
          location: addVector(anchorPosition, [0, 0, -0.014]),
          scale: [1.18, 0.34, 0.42],
        },
      },
    ];
  }

  if (kind === "leaf") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_leaf_main`,
          size: 0.046,
          location: anchorPosition,
          rotation: [20, 0, 24],
          scale: [0.66, 0.18, 0.98],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_leaf_stem`,
          size: 0.03,
          location: addVector(anchorPosition, [-0.01, 0.001, -0.014]),
          rotation: [0, 12, 62],
          scale: [0.08, 0.46, 0.08],
          vertices: 12,
        },
      },
    ];
  }

  if (kind === "forest") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_pine_main`,
          size: 0.068,
          location: addVector(anchorPosition, [0, 0.001, 0.01]),
          rotation: [180, 0, 0],
          scale: [0.52, 0.52, 0.88],
          vertices: 3,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_pine_small`,
          size: 0.048,
          location: addVector(anchorPosition, [0.03, 0.001, -0.008]),
          rotation: [180, 0, -10],
          scale: [0.42, 0.42, 0.66],
          vertices: 3,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_berry`,
          size: 0.018,
          location: addVector(anchorPosition, [-0.026, 0.004, -0.018]),
          scale: [0.92, 0.92, 0.92],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_leaf`,
          size: 0.024,
          location: addVector(anchorPosition, [-0.008, 0.001, -0.004]),
          rotation: [16, 0, 38],
          scale: [0.64, 0.16, 0.92],
        },
      },
    ];
  }

  if (kind === "mushroom") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_stem`,
          size: 0.022,
          location: addVector(anchorPosition, [0, 0, -0.022]),
          scale: [0.32, 0.72, 0.32],
          vertices: 16,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_cap`,
          size: 0.048,
          location: addVector(anchorPosition, [0, 0, 0.008]),
          scale: [0.82, 0.82, 0.5],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_spot_left`,
          size: 0.012,
          location: addVector(anchorPosition, [-0.016, 0.002, 0.018]),
          scale: [0.8, 0.8, 0.8],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_spot_right`,
          size: 0.012,
          location: addVector(anchorPosition, [0.016, 0.002, 0.014]),
          scale: [0.8, 0.8, 0.8],
        },
      },
    ];
  }

  if (kind === "dessert") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_berry_main`,
          size: 0.03,
          location: addVector(anchorPosition, [0, 0, 0.004]),
          scale: [0.84, 0.84, 0.84],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_berry_side`,
          size: 0.022,
          location: addVector(anchorPosition, [0.026, 0.002, -0.012]),
          scale: [0.9, 0.9, 0.9],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_cream`,
          size: 0.034,
          location: addVector(anchorPosition, [-0.004, 0.001, 0.03]),
          rotation: [0, 0, 180],
          scale: [0.42, 0.42, 0.52],
          vertices: 5,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_candy_star`,
          size: 0.014,
          location: addVector(anchorPosition, [-0.03, 0.002, -0.012]),
          scale: [0.78, 0.24, 0.78],
        },
      },
    ];
  }

  if (kind === "candy") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_core`,
          size: 0.034,
          location: anchorPosition,
          scale: [0.86, 0.62, 0.62],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_left_wrap`,
          size: 0.024,
          location: addVector(anchorPosition, [-0.034, 0, 0]),
          rotation: [0, 90, 0],
          scale: [0.22, 0.22, 0.36],
          vertices: 4,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_right_wrap`,
          size: 0.024,
          location: addVector(anchorPosition, [0.034, 0, 0]),
          rotation: [0, -90, 0],
          scale: [0.22, 0.22, 0.36],
          vertices: 4,
        },
      },
    ];
  }

  if (kind === "dessert-hang") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_ring`,
          size: 0.028,
          location: addVector(anchorPosition, [0, 0.004, 0.02]),
          rotation: [90, 0, 0],
          scale: [0.3, 0.3, 0.12],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cylinder",
          name: `${baseName}_string`,
          size: 0.014,
          location: addVector(anchorPosition, [0, 0.003, 0.002]),
          scale: [0.12, 0.62, 0.12],
          vertices: 12,
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_berry`,
          size: 0.03,
          location: addVector(anchorPosition, [0, 0, -0.022]),
          scale: [0.82, 0.82, 0.82],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "cone",
          name: `${baseName}_cream`,
          size: 0.026,
          location: addVector(anchorPosition, [0, 0.002, -0.002]),
          rotation: [0, 0, 180],
          scale: [0.3, 0.3, 0.42],
          vertices: 5,
        },
      },
    ];
  }

  if (kind === "charm-token") {
    return [
      {
        type: "mesh",
        parameters: {
          primitive_type: "torus",
          name: `${baseName}_ring`,
          size: 0.056,
          location: addVector(anchorPosition, [0, 0.005, 0.004]),
          rotation: [90, 0, 0],
          scale: [0.44, 0.44, 0.22],
        },
      },
      {
        type: "mesh",
        parameters: {
          primitive_type: "sphere",
          name: `${baseName}_gem`,
          size: 0.034,
          location: addVector(anchorPosition, [0, 0.005, -0.02]),
          scale: [0.68, 0.68, 0.68],
        },
      },
    ];
  }

  return [
    {
      type: "mesh",
      parameters: {
        primitive_type: "torus",
        name: `${baseName}_ring`,
        size: 0.056,
        location: addVector(anchorPosition, [0, 0.005, 0.004]),
        rotation: [90, 0, 0],
        scale: [0.44, 0.44, 0.22],
      },
    },
    {
      type: "mesh",
      parameters: {
        primitive_type: "sphere",
        name: `${baseName}_gem`,
        size: 0.034,
        location: addVector(anchorPosition, [0, 0.005, -0.02]),
        scale: [0.68, 0.68, 0.68],
      },
    },
  ];
}

function buildGeneratedAccessoryOperationsFromGeometryRecipe(
  geometryRecipe,
  anchorPosition,
  baseName,
) {
  if (!isRecord(geometryRecipe) || !Array.isArray(geometryRecipe.parts)) {
    return buildGeneratedAccessoryOperations("charm-token", "chest", anchorPosition, baseName);
  }

  return geometryRecipe.parts
    .filter((part) => isRecord(part) && typeof part.partId === "string")
    .map((part) => ({
      type: "mesh",
      parameters: {
        primitive_type:
          normalizeRuntimePrimitiveType(part.primitive),
        name: `${baseName}_${part.partId}`,
        size:
          typeof part.size === "number" && Number.isFinite(part.size)
            ? part.size
            : 0.02,
        location: addVector(
          anchorPosition,
          Array.isArray(part.offset) ? part.offset.map((value) => Number(value)) : [0, 0, 0],
        ),
        scale: Array.isArray(part.scale)
          ? part.scale.map((value) => Number(value))
          : [1, 1, 1],
        ...(Array.isArray(part.rotation)
          ? { rotation: part.rotation.map((value) => Number(value)) }
          : {}),
      },
    }));
}

function shouldDebugRuntimeBlueprint(shapeClass) {
  const flag = process.env.PROMPTPET_DEBUG_RUNTIME_BLUEPRINT;

  if (!flag) {
    return false;
  }

  if (flag === "1") {
    return shapeClass === "camera-charm" || shapeClass === "device-generic-charm";
  }

  return flag
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(shapeClass);
}

function summarizeRuntimeBlueprintParts(partBlueprints) {
  if (!Array.isArray(partBlueprints)) {
    return [];
  }

  return partBlueprints.map((part) => ({
    partId: part.partId,
    role: part.role,
    size: part.size,
    scale: Array.isArray(part.scale) ? part.scale : undefined,
    localOffset: Array.isArray(part.localOffset) ? part.localOffset : undefined,
    location: Array.isArray(part.location) ? part.location : undefined,
    parentPartId: typeof part.parentPartId === "string" ? part.parentPartId : undefined,
  }));
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function normalizeRuntimePrimitiveType(value) {
  if (typeof value !== "string") {
    return "sphere";
  }

  switch (value) {
    case "icosphere":
      return "ico_sphere";
    case "uv-sphere":
      return "sphere";
    case "box":
      return "cube";
    default:
      return value;
  }
}

function roundMetric(value) {
  return Number(clamp01(value).toFixed(2));
}

function lerpNumber(start, end, progress) {
  return Number((start + (end - start) * progress).toFixed(4));
}

function lerpVector(start, end, progress) {
  return [
    lerpNumber(start[0] ?? 0, end[0] ?? 0, progress),
    lerpNumber(start[1] ?? 0, end[1] ?? 0, progress),
    lerpNumber(start[2] ?? 0, end[2] ?? 0, progress),
  ];
}

function subtractVector(left, right = [0, 0, 0]) {
  return [
    Number(((left[0] ?? 0) - (right[0] ?? 0)).toFixed(4)),
    Number(((left[1] ?? 0) - (right[1] ?? 0)).toFixed(4)),
    Number(((left[2] ?? 0) - (right[2] ?? 0)).toFixed(4)),
  ];
}

function getVectorMagnitude(vector = [0, 0, 0]) {
  return Math.sqrt(
    (vector[0] ?? 0) ** 2 +
      (vector[1] ?? 0) ** 2 +
      (vector[2] ?? 0) ** 2,
  );
}

function getExecutionRuntimeShapeClass(execution, geometryRecipe = null) {
  if (
    typeof execution?.runtimeShapeClass === "string" &&
    execution.runtimeShapeClass.trim()
  ) {
    return execution.runtimeShapeClass.trim();
  }

  if (
    isRecord(geometryRecipe) &&
    typeof geometryRecipe.runtimeShapeClass === "string" &&
    geometryRecipe.runtimeShapeClass.trim()
  ) {
    return geometryRecipe.runtimeShapeClass.trim();
  }

  return typeof execution?.family === "string" ? execution.family : "generic-ornament";
}

function getExecutionHardMinimumPartCount(execution, geometryRecipe) {
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const familyMinimums = {
    scarf: 4,
    "fish-charm": 3,
    "berry-charm": 4,
    "cloud-charm": 3,
    cloud: 3,
    flower: 5,
    "clover-charm": 5,
    "open-botanical-ornament": 4,
    "open-symbol-ornament": 4,
    tie: 4,
    bow: 3,
    bell: 3,
    "camera-charm": 5,
    "boat-charm": 4,
    "rocket-charm": 5,
    "device-generic-charm": 4,
    "vehicle-generic-charm": 4,
    "generic-ornament": 4,
  };

  const configuredMinimum =
    isRecord(geometryRecipe?.sizeBounds) &&
    typeof geometryRecipe.sizeBounds.minPartCount === "number"
      ? geometryRecipe.sizeBounds.minPartCount
      : getGeneratedAccessoryMinimumPartCount(shapeClass);
  const criticalPartCount = getExecutionCriticalParts(geometryRecipe).length;

  if (isHardSurfaceOpenNounExecution(execution, geometryRecipe) && criticalPartCount > 0) {
    return Math.max(3, Math.min(configuredMinimum, criticalPartCount));
  }

  return Math.max(
    1,
    Math.min(
      configuredMinimum,
      familyMinimums[shapeClass] ?? Math.max(2, Math.ceil(configuredMinimum * 0.66)),
      ),
  );
}

function getBlueprintVariantsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.variantId === "string")
    .map((entry) => ({
      variantId: entry.variantId,
      label:
        typeof entry.label === "string" ? entry.label : entry.variantId,
      silhouetteIntent:
        typeof entry.silhouetteIntent === "string"
          ? entry.silhouetteIntent
          : entry.variantId,
      readOrderHints: Array.isArray(entry.readOrderHints)
        ? entry.readOrderHints.filter((item) => typeof item === "string")
        : [],
      negativeLookalikes: Array.isArray(entry.negativeLookalikes)
        ? entry.negativeLookalikes.filter((item) => typeof item === "string")
        : [],
      preferredForRuntimeShapeClass:
        typeof entry.preferredForRuntimeShapeClass === "string"
          ? entry.preferredForRuntimeShapeClass
          : undefined,
      dominantContour:
        typeof entry.dominantContour === "string" ? entry.dominantContour : undefined,
      sideDepthProfile:
        typeof entry.sideDepthProfile === "string" ? entry.sideDepthProfile : undefined,
      partSpanTargets: getPartSpanTargetsFromValue(entry.partSpanTargets),
      partDepthTargets: getPartDepthTargetsFromValue(entry.partDepthTargets),
      attachmentAnchors: getAttachmentAnchorsFromValue(entry.attachmentAnchors),
      silhouetteKeepouts: getSilhouetteKeepoutsFromValue(entry.silhouetteKeepouts),
      dominantSpanOwner:
        typeof entry.dominantSpanOwner === "string" ? entry.dominantSpanOwner : undefined,
      outlineProfile:
        typeof entry.outlineProfile === "string" ? entry.outlineProfile : undefined,
      reliefFeatureLayout: Array.isArray(entry.reliefFeatureLayout)
        ? entry.reliefFeatureLayout.filter((item) => typeof item === "string")
        : [],
      attachmentMask:
        typeof entry.attachmentMask === "string" ? entry.attachmentMask : undefined,
      profileVariantId:
        typeof entry.profileVariantId === "string" ? entry.profileVariantId : undefined,
    }));
}

function isStrictBotanicalRuntimeFamily(shapeClass) {
  return (
    shapeClass === "flower" ||
    shapeClass === "clover-charm" ||
    shapeClass === "open-botanical-ornament"
  );
}

function isStrictOpenRuntimeFamily(shapeClass) {
  return (
    shapeClass === "open-symbol-ornament" ||
    shapeClass === "generic-ornament" ||
    shapeClass === "generic-animal-charm" ||
    shapeClass === "generic-food-charm" ||
    shapeClass === "camera-charm" ||
    shapeClass === "boat-charm" ||
    shapeClass === "rocket-charm" ||
    shapeClass === "device-generic-charm" ||
    shapeClass === "vehicle-generic-charm"
  );
}

function isOpenNounExecution(execution) {
  return (
    typeof execution?.requestedNoun === "string" &&
    execution.requestedNoun.trim().length > 0 &&
    (execution.familyResolutionSource === "open-noun" ||
      (typeof execution.designArchetype === "string" &&
        execution.designArchetype !== "known-family"))
  );
}

function getExecutionTargetPassCount(customizationProfile, execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  if (
    customizationProfile !== "experimental-addon" ||
    execution.executionMode !== "runtime-generated"
  ) {
    return 1;
  }

  if (isOpenNounExecution(execution)) {
    return 5;
  }

  if (
    isStrictBotanicalRuntimeFamily(shapeClass) ||
    isStrictOpenRuntimeFamily(shapeClass)
  ) {
    return 4;
  }

  return 3;
}

function getExecutionQualityThreshold(execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  if (isOpenNounExecution(execution)) {
    return 0.85;
  }

  if (isStrictBotanicalRuntimeFamily(shapeClass)) {
    return 0.84;
  }

  if (isStrictOpenRuntimeFamily(shapeClass)) {
    return 0.82;
  }

  if (
    shapeClass === "fish-charm" ||
    shapeClass === "berry-charm" ||
    shapeClass === "cloud-charm" ||
    shapeClass === "cloud"
  ) {
    return 0.8;
  }

  return 0.79;
}

function getExecutionMetricThresholds(execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  if (isOpenNounExecution(execution)) {
    return {
      placementAnchorAccuracy: 0.76,
      colorIsolation: 0.85,
      shapeReadability: 0.84,
      visualReadability: 0.8,
      scaleFit: 0.78,
      silhouetteStrength: 0.82,
      occlusionRisk: 0.82,
      hostComposition: 0.8,
      cohesionScore: 0.82,
      renderNounFidelity: 0.78,
      maxLookalikeRisk: 0.32,
    };
  }

  if (isStrictBotanicalRuntimeFamily(shapeClass)) {
    return {
      placementAnchorAccuracy: 0.74,
      colorIsolation: 0.85,
      shapeReadability: 0.82,
      visualReadability: 0.8,
      scaleFit: 0.74,
      silhouetteStrength: 0.8,
      occlusionRisk: 0.78,
      hostComposition: 0.76,
      cohesionScore: 0.78,
      renderNounFidelity: 0.74,
      maxLookalikeRisk: 0.38,
    };
  }

  if (isStrictOpenRuntimeFamily(shapeClass)) {
    return {
      placementAnchorAccuracy: 0.74,
      colorIsolation: 0.85,
      shapeReadability: 0.8,
      visualReadability: 0.78,
      scaleFit: 0.72,
      silhouetteStrength: 0.76,
      occlusionRisk: 0.76,
      hostComposition: 0.74,
      cohesionScore: 0.76,
      renderNounFidelity: 0.72,
      maxLookalikeRisk: 0.42,
    };
  }

  return {
    placementAnchorAccuracy: 0.72,
    colorIsolation: 0.85,
    shapeReadability: 0.72,
    visualReadability: 0.7,
    scaleFit: 0.68,
    silhouetteStrength: 0.68,
    occlusionRisk: 0.72,
    hostComposition: 0.7,
    cohesionScore: 0.72,
    renderNounFidelity: 0.68,
    maxLookalikeRisk: 0.48,
  };
}

function getExecutionPrecisionThresholds(execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);

  if (isOpenNounExecution(execution)) {
    return {
      criticalPartsPresent: 0.85,
      renderNounFidelity: 0.82,
      silhouetteReadability: 0.8,
      cohesionScore: 0.84,
      scaleFit: 0.8,
      hostComposition: 0.82,
      maxLookalikeRisk: 0.28,
    };
  }

  if (
    shapeClass === "camera-charm" ||
    shapeClass === "boat-charm" ||
    shapeClass === "fish-charm" ||
    shapeClass === "rocket-charm" ||
    shapeClass === "device-generic-charm" ||
    shapeClass === "vehicle-generic-charm"
  ) {
    return {
      criticalPartsPresent: 0.82,
      renderNounFidelity: 0.78,
      silhouetteReadability: 0.76,
      cohesionScore: 0.8,
      scaleFit: 0.76,
      hostComposition: 0.78,
      maxLookalikeRisk: 0.34,
    };
  }

  return {
    criticalPartsPresent: 0.78,
    renderNounFidelity: 0.74,
    silhouetteReadability: 0.72,
    cohesionScore: 0.76,
    scaleFit: 0.72,
    hostComposition: 0.74,
    maxLookalikeRisk: 0.38,
  };
}

function hasSpecificRequestedShapeLabel(execution) {
  const label = (execution.requestedLabel ?? execution.shapeLabel ?? "").trim();

  return Boolean(
    label &&
      ![
        "装饰挂件",
        "图形挂件",
        "植物系挂件",
        "挂件",
        "装饰",
      ].includes(label),
  );
}

function requiresExplicitShapeGate(execution) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  return (
    hasSpecificRequestedShapeLabel(execution) &&
    (isStrictBotanicalRuntimeFamily(shapeClass) ||
      isStrictOpenRuntimeFamily(shapeClass))
  );
}

function getAccessoryRefinementPassPartIds(runtimeShapeClass, passIndex) {
  if (runtimeShapeClass === "scarf") {
    return passIndex <= 1
      ? ["wrap-band", "knot", "tail-left", "tail-right"]
      : ["wrap-band", "knot", "tail-left", "tail-right", "tail-fold-left", "tail-fold-right"];
  }

  if (runtimeShapeClass === "flower") {
    return passIndex <= 1
      ? ["core", "petal-left", "petal-right", "petal-top", "petal-bottom"]
      : ["core", "petal-left", "petal-right", "petal-top", "petal-bottom", "petal-top-left", "petal-top-right"];
  }

  if (runtimeShapeClass === "clover-charm") {
    return passIndex <= 1
      ? ["core", "leaf-left", "leaf-right"]
      : passIndex === 2
        ? ["core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom"]
        : ["ring", "core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom", "stem"];
  }

  if (runtimeShapeClass === "open-botanical-ornament") {
    return passIndex <= 1
      ? ["core", "leaf-left", "leaf-right"]
      : passIndex === 2
        ? ["core", "leaf-left", "leaf-right", "petal-top"]
        : ["ring", "core", "leaf-left", "leaf-right", "petal-top", "stem"];
  }

  if (runtimeShapeClass === "open-symbol-ornament") {
    return passIndex <= 1
      ? ["core", "arm-top", "arm-left", "arm-right"]
      : ["ring", "core", "arm-top", "arm-left", "arm-right", "arm-bottom"];
  }

  if (runtimeShapeClass === "star") {
    return passIndex <= 1
      ? ["core", "ray-1", "ray-2", "ray-5"]
      : ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"];
  }

  if (runtimeShapeClass === "fish-charm") {
    return passIndex <= 1
      ? ["ring", "body", "tail"]
      : passIndex === 2
        ? ["ring", "body", "tail", "fin-top", "fin-bottom"]
        : ["ring", "body", "tail", "fin-top", "fin-bottom", "nose"];
  }

  if (runtimeShapeClass === "berry-charm") {
    return passIndex <= 1
      ? ["berry-main", "berry-side-left", "berry-side-right", "ring"]
      : passIndex === 2
        ? ["berry-main", "berry-side-left", "berry-side-right", "ring", "leaf-crown"]
        : [
            "berry-main",
            "berry-side-left",
            "berry-side-right",
            "ring",
            "leaf-crown",
            "leaf-side",
          ];
  }

  if (runtimeShapeClass === "cloud-charm" || runtimeShapeClass === "cloud") {
    return passIndex <= 1
      ? ["left-puff", "center-puff", "right-puff"]
      : passIndex === 2
        ? ["left-puff", "center-puff", "right-puff", "base-puff"]
        : ["ring", "left-puff", "center-puff", "right-puff", "base-puff"];
  }

  if (runtimeShapeClass === "tie") {
    return passIndex <= 1
      ? ["knot", "collar-left", "collar-right", "blade-main"]
      : ["knot", "collar-left", "collar-right", "blade-main", "blade-back"];
  }

  if (runtimeShapeClass === "bow") {
    return passIndex <= 1
      ? ["left-wing", "right-wing", "knot"]
      : ["left-wing", "right-wing", "knot", "left-tail", "right-tail"];
  }

  if (runtimeShapeClass === "bell") {
    return passIndex <= 1
      ? ["ring", "cap", "body"]
      : ["ring", "cap", "body", "clapper"];
  }

  if (runtimeShapeClass === "candle-charm") {
    return passIndex <= 1
      ? ["wax-body", "flame"]
      : passIndex === 2
        ? ["ring", "wax-body", "wax-top", "flame"]
        : ["ring", "wax-body", "wax-top", "wick", "flame"];
  }

  return null;
}

function getDesiredPlacementOffset(anchor, family) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);

  if (normalizedAnchor === "left-ear") {
    if (
      family === "flower" ||
      family === "clover-charm" ||
      family === "open-botanical-ornament"
    ) {
      return [0.0086, 0.0002, 0.0048];
    }

    if (isDeviceFamilyRuntimeAccessory(family)) {
      return [0.0066, -0.0018, 0.0016];
    }

    if (isVehicleFamilyRuntimeAccessory(family)) {
      return [0.0076, 0.0002, 0.0042];
    }

    if (family === "fish-charm") {
      return [0.0112, -0.0002, 0.0072];
    }

    if (family === "tie") {
      return [0.005, -0.0015, 0.0015];
    }

    if (family === "bell") {
      return [0.0045, -0.001, 0.001];
    }

    return [0.004, -0.001, 0.0015];
  }

  if (normalizedAnchor === "right-ear") {
    if (
      family === "flower" ||
      family === "clover-charm" ||
      family === "open-botanical-ornament"
    ) {
      return [-0.0086, 0.0002, 0.0048];
    }

    if (isDeviceFamilyRuntimeAccessory(family)) {
      return [-0.0066, -0.0018, 0.0016];
    }

    if (isVehicleFamilyRuntimeAccessory(family)) {
      return [-0.0076, 0.0002, 0.0042];
    }

    if (family === "fish-charm") {
      return [-0.0112, -0.0002, 0.0072];
    }

    if (family === "tie") {
      return [-0.005, -0.0015, 0.0015];
    }

    if (family === "bell") {
      return [-0.0045, -0.001, 0.001];
    }

    return [-0.004, -0.001, 0.0015];
  }

  if (normalizedAnchor === "forehead") {
    return [0, -0.0015, 0.002];
  }

  if (normalizedAnchor === "head-top") {
    return [0, -0.002, 0.004];
  }

  if (normalizedAnchor === "back-head") {
    return [0, 0.002, 0.002];
  }

  if (normalizedAnchor === "chest-left") {
    return [0.002, 0.003, -0.002];
  }

  if (normalizedAnchor === "chest-right") {
    return [-0.002, 0.003, -0.002];
  }

  if (normalizedAnchor === "tail-top") {
    return [0, 0.004, 0.004];
  }

  if (normalizedAnchor === "tail-left") {
    return [0.003, 0.003, 0.004];
  }

  if (normalizedAnchor === "tail-right") {
    return [-0.003, 0.003, 0.004];
  }

  if (normalizedAnchor === "tail-base") {
    return [0, 0.003, -0.002];
  }

  if (family === "necklace-chain") {
    return [0, 0.0045, -0.004];
  }

  if (family === "cloud" || family === "cloud-charm") {
    return [0, 0.0035, -0.0025];
  }

  return [0, 0.003, -0.003];
}

function getDesiredPlacementOffsetForExecution(execution, geometryRecipe = null) {
  const contractOffset = getExecutionDesiredPlacementOffset(execution, geometryRecipe);

  if (Array.isArray(contractOffset) && contractOffset.length === 3) {
    return contractOffset;
  }

  return getDesiredPlacementOffset(
    execution.anchor,
    getExecutionRuntimeShapeClass(execution, geometryRecipe),
  );
}

function getCoarsePlacementOffset(anchor, family, desiredOverride = null) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);
  const desired =
    Array.isArray(desiredOverride) && desiredOverride.length === 3
      ? desiredOverride
      : getDesiredPlacementOffset(normalizedAnchor, family);
  const side = normalizedAnchor === "left-ear" ? 1 : normalizedAnchor === "right-ear" ? -1 : 0;

  if (normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear") {
    return addVector(desired, [0.006 * side, 0.0055, -0.001]);
  }

  if (normalizedAnchor === "forehead" || normalizedAnchor === "head-top") {
    return addVector(desired, [0, 0.004, -0.002]);
  }

  if (normalizedAnchor === "back-head") {
    return addVector(desired, [0, 0.005, -0.002]);
  }

  if (isTailRuntimeAnchor(normalizedAnchor)) {
    return addVector(desired, [0, 0.006, 0.004]);
  }

  return addVector(desired, [0, 0.005, 0.003]);
}

function adjustPlacementOffsetForStructuralIntent(
  baseOffset,
  execution,
  geometryRecipe = null,
) {
  if (!Array.isArray(baseOffset) || baseOffset.length !== 3) {
    return baseOffset;
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);

  if (normalizedAnchor !== "left-ear" && normalizedAnchor !== "right-ear") {
    return baseOffset;
  }

  const mountStrategy = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "mountStrategy",
  );
  const primarySilhouette = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "primarySilhouette",
  );

  if (
    mountStrategy !== "ear-side-front-facing" ||
    primarySilhouette !== "symbol-badge"
  ) {
    return baseOffset;
  }

  const hostFitEnvelope = getExecutionHostFitEnvelope(
    execution,
    geometryRecipe,
  );
  const side = normalizedAnchor === "left-ear" ? 1 : -1;
  const screenFacingBias =
    typeof hostFitEnvelope?.screenFacingBias === "number"
      ? clamp01(hostFitEnvelope.screenFacingBias)
      : 0.84;
  const outwardX = Math.max(
    Math.abs(baseOffset[0] ?? 0),
    0.0092 + screenFacingBias * 0.0012 + (hostFitEnvelope?.eyeKeepout === true ? 0.0004 : 0),
  );
  const forwardLift = Math.max(
    baseOffset[2] ?? 0,
    0.0058 +
      Math.min(
        0.0012,
        typeof hostFitEnvelope?.earClearance === "number"
          ? hostFitEnvelope.earClearance * 0.08
          : 0.0008,
      ),
  );
  const faceReliefY = Math.max(baseOffset[1] ?? 0, -0.0004);

  return [
    Number((side * outwardX).toFixed(4)),
    Number(faceReliefY.toFixed(4)),
    Number(forwardLift.toFixed(4)),
  ];
}

function getHostClearanceOffset(anchor, intensity, family = null) {
  if (!(intensity > 0)) {
    return [0, 0, 0];
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);
  const side = normalizedAnchor === "left-ear" ? 1 : normalizedAnchor === "right-ear" ? -1 : 0;
  const isBotanicalEarSide =
    (normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear") &&
    isBotanicalBloomRuntimeShapeClass(family);

  if (normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear") {
    return [
      Number(((isBotanicalEarSide ? 0.0104 : 0.0064) * side * intensity).toFixed(4)),
      Number(((isBotanicalEarSide ? 0.0048 : 0.0034) * intensity).toFixed(4)),
      Number(((isBotanicalEarSide ? 0.0068 : 0.0044) * intensity).toFixed(4)),
    ];
  }

  if (normalizedAnchor === "forehead" || normalizedAnchor === "head-top") {
    return [0, Number((0.0022 * intensity).toFixed(4)), Number((0.0046 * intensity).toFixed(4))];
  }

  if (normalizedAnchor === "back-head") {
    return [0, Number((0.0026 * intensity).toFixed(4)), Number((-0.0028 * intensity).toFixed(4))];
  }

  if (isChestRuntimeAnchor(normalizedAnchor)) {
    return [
      Number((0.0012 * side * intensity).toFixed(4)),
      Number((0.0018 * intensity).toFixed(4)),
      Number((-0.0016 * intensity).toFixed(4)),
    ];
  }

  if (isTailRuntimeAnchor(normalizedAnchor)) {
    return [
      Number((0.0016 * side * intensity).toFixed(4)),
      Number((0.0018 * intensity).toFixed(4)),
      Number((0.0028 * intensity).toFixed(4)),
    ];
  }

  return [0, 0, 0];
}

function getHostAnchorScaleClamp(anchor, intensity, isOpenNoun = false, family = null) {
  if (!(intensity > 0)) {
    return 1;
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);
  let maxReduction = 0.16;

  if (
    normalizedAnchor === "left-ear" ||
    normalizedAnchor === "right-ear" ||
    normalizedAnchor === "forehead" ||
    normalizedAnchor === "head-top"
  ) {
    maxReduction =
      isBotanicalBloomRuntimeShapeClass(family) && isOpenNoun
        ? 0.42
        : isOpenNoun
          ? 0.3
          : 0.22;
  } else if (normalizedAnchor === "back-head") {
    maxReduction = isOpenNoun ? 0.24 : 0.18;
  } else if (isChestRuntimeAnchor(normalizedAnchor)) {
    maxReduction = isOpenNoun ? 0.18 : 0.14;
  } else if (isTailRuntimeAnchor(normalizedAnchor)) {
    maxReduction = isOpenNoun ? 0.16 : 0.12;
  }

  return Number((1 - intensity * maxReduction).toFixed(4));
}

function getHardSurfaceHostFitScaleClamp(
  execution,
  geometryRecipe,
  refinementStage,
  progress,
  repairActions = [],
) {
  return getHardSurfaceHostFitScaleClampFromLib(
    execution,
    geometryRecipe,
    refinementStage,
    progress,
    repairActions,
  );
}

function getHardSurfaceHostFitOffset(execution, geometryRecipe, refinementStage) {
  return getHardSurfaceHostFitOffsetFromLib(
    execution,
    geometryRecipe,
    refinementStage,
  );
}

function getHardSurfaceEarAxisScaleClamp(
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
  partProfile = null,
) {
  return getHardSurfaceEarAxisScaleClampFromLib(
    execution,
    geometryRecipe,
    refinementStage,
    repairActions,
    partProfile,
  );
}

function getApproxPartHalfExtents(part) {
  if (!isRecord(part)) {
    return [0.01, 0.01, 0.01];
  }

  const size =
    typeof part.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
  const scale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];

  return [0, 1, 2].map((axis) =>
    Number((Math.max(0.0005, Math.abs(scale[axis] ?? 1)) * size).toFixed(4)),
  );
}

function getHardSurfaceAssemblyOutwardShift(
  execution,
  geometryRecipe,
  refinementStage,
  partBlueprintBases = [],
  repairActions = [],
) {
  return getHardSurfaceAssemblyOutwardShiftFromLib(
    execution,
    geometryRecipe,
    refinementStage,
    partBlueprintBases,
    repairActions,
  );
}

function applyHardSurfaceOutlineCompiler(
  partBlueprintBases,
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
) {
  return applyHardSurfaceOutlineCompilerFromLib(
    partBlueprintBases,
    execution,
    geometryRecipe,
    refinementStage,
    repairActions,
  );
}

function applyChestWrapCompactEnvelopeClamp(
  partBlueprints,
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
  partGraph = null,
) {
  return applyChestWrapCompactEnvelopeClampFromLib(
    partBlueprints,
    execution,
    geometryRecipe,
    refinementStage,
    repairActions,
    partGraph,
  );
}

function projectHardSurfaceEarSideAnchorPose(options) {
  return projectHardSurfaceEarSideAnchorPoseFromLib(options);
}

function usesProjectedEarSideAnchorPose(execution, geometryRecipe = null) {
  return usesProjectedEarSideAnchorPoseFromLib(execution, geometryRecipe);
}

function getHardSurfaceReadabilityMaterialPolicy(execution, geometryRecipe = null) {
  return getHardSurfaceReadabilityMaterialPolicyFromLib(execution, geometryRecipe);
}

function getHardSurfaceCritiqueLightingProfile(execution, geometryRecipe = null) {
  return getHardSurfaceCritiqueLightingProfileFromLib(execution, geometryRecipe);
}

function getIdealAccessoryScaleMultiplier(family) {
  return getIdealAccessoryScaleMultiplierFromLib(family);
}

function getCoarseAccessoryScaleMultiplier(family) {
  return getCoarseAccessoryScaleMultiplierFromLib(family);
}

function getRoleEmphasisMultiplier(family, role, passIndex) {
  return getRoleEmphasisMultiplierFromLib(family, role, passIndex);
}

function getExecutionRefinementStage(passIndex, targetPassCount) {
  if (targetPassCount <= 1) {
    return "blocking";
  }

  const progress = clamp01((passIndex - 1) / Math.max(1, targetPassCount - 1));

  if (progress <= 0.08) {
    return "blocking";
  }

  if (progress <= 0.24) {
    return "silhouette-forming";
  }

  if (progress <= 0.44) {
    return "assembly-rooting";
  }

  if (progress <= 0.62) {
    return "host-fit";
  }

  if (progress <= 0.84) {
    return "render-driven-rebuild";
  }

  return "final-review";
}

function getGeometryPartProfileMap(geometryRecipe) {
  return new Map(
    Array.isArray(geometryRecipe?.partProfiles)
      ? geometryRecipe.partProfiles
          .filter((profile) => isRecord(profile) && typeof profile.partId === "string")
          .map((profile) => [profile.partId, profile])
      : [],
  );
}

function getGeometryPartImportanceWeight(geometryRecipe, partId) {
  if (
    isRecord(geometryRecipe?.partImportanceWeights) &&
    typeof geometryRecipe.partImportanceWeights[partId] === "number"
  ) {
    return geometryRecipe.partImportanceWeights[partId];
  }

  const profile = getGeometryPartProfileMap(geometryRecipe).get(partId);

  if (!isRecord(profile)) {
    return 0.6;
  }

  if (profile.silhouetteRole === "primary") {
    return 1;
  }

  if (profile.silhouetteRole === "secondary") {
    return 0.84;
  }

  if (profile.silhouetteRole === "support") {
    return 0.66;
  }

  return 0.44;
}

function getStagePartImportanceMultiplier(stage, importanceWeight, silhouetteRole) {
  const attachmentPenalty =
    silhouetteRole === "attachment"
      ? stage === "final-review"
        ? 0.58
        : stage === "host-fit"
          ? 0.54
          : 0.68
      : 1;
  const secondaryBoost =
    silhouetteRole === "secondary"
      ? stage === "silhouette-forming" ||
        stage === "assembly-rooting" ||
        stage === "render-driven-rebuild"
        ? 1.08
        : 1
      : 1;
  const primaryBoost =
    silhouetteRole === "primary"
      ? stage === "blocking"
        ? 1.08
        : stage === "host-fit"
          ? 0.98
          : stage === "final-review"
            ? 1.02
          : 1.04
      : 1;

  return Number(
    Math.max(
      0.48,
      Math.min(1.18, importanceWeight * attachmentPenalty * secondaryBoost * primaryBoost),
    ).toFixed(4),
  );
}

function getStageProfile(stage) {
  switch (stage) {
    case "blocking":
      return {
        scaleMultiplier: 1.02,
        spacingMultiplier: 0.82,
        silhouetteMultiplier: 0.92,
      };
    case "silhouette-forming":
      return {
        scaleMultiplier: 1,
        spacingMultiplier: 0.9,
        silhouetteMultiplier: 1.08,
      };
    case "assembly-rooting":
      return {
        scaleMultiplier: 0.98,
        spacingMultiplier: 0.86,
        silhouetteMultiplier: 1.04,
      };
    case "host-fit":
      return {
        scaleMultiplier: 0.94,
        spacingMultiplier: 0.82,
        silhouetteMultiplier: 1,
      };
    case "render-driven-rebuild":
      return {
        scaleMultiplier: 0.96,
        spacingMultiplier: 0.88,
        silhouetteMultiplier: 1.1,
      };
    default:
      return {
        scaleMultiplier: 0.94,
        spacingMultiplier: 0.84,
        silhouetteMultiplier: 1.04,
      };
  }
}

function getSpacingMultiplierForPass(passIndex, targetPassCount) {
  if (targetPassCount <= 1) {
    return 1;
  }

  const progress = clamp01((passIndex - 1) / (targetPassCount - 1));
  return lerpNumber(0.88, 1.04, progress);
}

function getSilhouetteMultiplierForPass(passIndex, targetPassCount) {
  if (targetPassCount <= 1) {
    return 1;
  }

  const progress = clamp01((passIndex - 1) / (targetPassCount - 1));
  return lerpNumber(0.92, 1.08, progress);
}

function getRepairActionIntensity(repairActions, actionType) {
  if (!Array.isArray(repairActions)) {
    return 0;
  }

  return repairActions.reduce((maxValue, action) => {
    if (!isRecord(action) || action.actionType !== actionType) {
      return maxValue;
    }

    return Math.max(
      maxValue,
      typeof action.intensity === "number" ? action.intensity : 0.5,
    );
  }, 0);
}

function getAccessoryRefinementPartIdsFromGraph(
  partGraph,
  passIndex,
  targetPassCount,
  repairActions = [],
) {
  if (!isRecord(partGraph) || !Array.isArray(partGraph.nodes) || partGraph.nodes.length === 0) {
    return null;
  }

  const maxStage = partGraph.nodes.reduce((maxValue, node) => {
    return Math.max(
      maxValue,
      isRecord(node) && typeof node.stageIndex === "number" ? node.stageIndex : 1,
    );
  }, 1);
  const progress =
    targetPassCount <= 1 ? 1 : clamp01((passIndex - 1) / Math.max(1, targetPassCount - 1));
  const unlockedStage = Math.max(1, Math.ceil(lerpNumber(1, maxStage, progress)));
  const forcedPartIds = Array.isArray(repairActions)
    ? repairActions.flatMap((action) =>
        isRecord(action) && Array.isArray(action.targetPartIds)
          ? action.targetPartIds.filter((value) => typeof value === "string")
          : [],
      )
    : [];

  return [
    ...new Set(
      partGraph.nodes
        .filter((node) => {
          if (!isRecord(node) || typeof node.partId !== "string") {
            return false;
          }

          return (
            node.required === true ||
            (typeof node.stageIndex === "number" ? node.stageIndex <= unlockedStage : true) ||
            forcedPartIds.includes(node.partId)
          );
        })
        .map((node) => node.partId),
    ),
  ];
}

function transformRuntimeLocalOffset(
  offset = [0, 0, 0],
  mirrorX,
  spacingMultiplier,
  silhouetteMultiplier,
  tightenCohesionIntensity = 0,
) {
  const cohesionMultiplier = Math.max(0.68, 1 - tightenCohesionIntensity * 0.28);

  return [
    Number(
      (
        (mirrorX ? -(offset[0] ?? 0) : offset[0] ?? 0) *
        spacingMultiplier *
        silhouetteMultiplier *
        cohesionMultiplier
      ).toFixed(4),
    ),
    Number(
      (
        (offset[1] ?? 0) *
        Math.max(0.92, spacingMultiplier - 0.04) *
        cohesionMultiplier
      ).toFixed(4),
    ),
    Number(
      (((offset[2] ?? 0) * spacingMultiplier * cohesionMultiplier)).toFixed(4),
    ),
  ];
}

function adjustOffsetForAttachmentRule(localOffset, edge, part, parentPart) {
  if (!Array.isArray(localOffset) || !isRecord(edge)) {
    return localOffset;
  }

  const adjusted = [...localOffset];
  const [partHalfX, partHalfY, partHalfZ] = getApproxPartHalfExtents(part);
  const [parentHalfX, parentHalfY, parentHalfZ] = getApproxPartHalfExtents(parentPart);
  const partSize =
    typeof part?.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
  const embedDepth =
    typeof edge.embedDepth === "number" && Number.isFinite(edge.embedDepth)
      ? edge.embedDepth
      : 0;
  const clampValue = (value, minValue, maxValue) =>
    Number(Math.max(minValue, Math.min(maxValue, value ?? 0)).toFixed(4));
  const blendToward = (currentValue, targetValue, weight) =>
    Number(lerpNumber(currentValue ?? 0, targetValue, weight).toFixed(4));

  if (edge.mountFace === "front") {
    // Blender local +Y exports toward negative GLTF Z, so a visually front-mounted relief
    // must bias toward local -Y to stay readable in the exported front view.
    const isEmbeddedFront = edge.edgeConstraint === "embedded-front";
    const frontDistance = Math.max(
      parentHalfY + partHalfY - embedDepth,
      isEmbeddedFront ? parentHalfY * 0.78 : parentHalfY * 0.6,
      isEmbeddedFront ? 0.0035 : 0.005,
    );
    if (isEmbeddedFront && edge.flushMount === true) {
      // Flush embedded-front parts should read as a tight front relief, not inherit
      // arbitrarily deep authored offsets that can detach them from the face layer.
      const embeddedFrontMin = Math.max(parentHalfY * 0.58, partHalfY * 0.62, 0.0038);
      const embeddedFrontTarget = Math.max(
        parentHalfY + partHalfY * 0.72 - embedDepth * 0.45,
        parentHalfY * 0.82,
        partHalfY * 0.92,
        0.0042,
      );
      const embeddedFrontMax = Math.max(
        embeddedFrontTarget + Math.max(partHalfY * 0.24, 0.0015),
        embeddedFrontMin + 0.0012,
      );
      const currentFrontDistance = Math.abs(adjusted[1] ?? 0);
      const blendedFrontDistance = blendToward(currentFrontDistance, embeddedFrontTarget, 0.78);
      adjusted[1] = -clampValue(
        blendedFrontDistance,
        embeddedFrontMin,
        embeddedFrontMax,
      );
    } else {
      adjusted[1] = isEmbeddedFront
        ? Math.min(adjusted[1] ?? 0, -frontDistance)
        : blendToward(adjusted[1] ?? 0, -frontDistance, edge.flushMount === true ? 0.92 : 0.78);
    }
    adjusted[0] = clampValue(
      adjusted[0],
      -Math.max(parentHalfX * 0.42, partHalfX * 0.8, 0.006),
      Math.max(parentHalfX * 0.42, partHalfX * 0.8, 0.006),
    );
    adjusted[2] = clampValue(
      adjusted[2],
      -Math.max(parentHalfZ * 0.46, partHalfZ * 0.9, 0.008),
      Math.max(parentHalfZ * 0.46, partHalfZ * 0.9, 0.008),
    );
  } else if (edge.mountFace === "rear") {
    const isEmbeddedRear = edge.edgeConstraint === "embedded-front";
    const rearDistance = Math.max(
      parentHalfY + partHalfY - embedDepth,
      isEmbeddedRear ? parentHalfY * 0.78 : parentHalfY * 0.68,
      0.006,
    );
    adjusted[1] = isEmbeddedRear
      ? Math.max(adjusted[1] ?? 0, rearDistance)
      : blendToward(adjusted[1] ?? 0, rearDistance, edge.flushMount === true ? 0.88 : 0.72);
  } else if (edge.mountFace === "top") {
    const topDistance = Math.max(parentHalfZ + partHalfZ - embedDepth, parentHalfZ * 0.72, 0.008);
    adjusted[2] = blendToward(adjusted[2] ?? 0, topDistance, edge.flushMount === true ? 0.9 : 0.78);
    adjusted[0] = clampValue(
      adjusted[0],
      -Math.max(parentHalfX * 0.36, partHalfX * 0.8, 0.006),
      Math.max(parentHalfX * 0.36, partHalfX * 0.8, 0.006),
    );
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.42, partHalfY * 0.9, 0.006),
      Math.max(parentHalfY * 0.42, partHalfY * 0.9, 0.006),
    );
  } else if (edge.mountFace === "bottom") {
    const bottomDistance = Math.max(parentHalfZ + partHalfZ - embedDepth, parentHalfZ * 0.64, 0.008);
    adjusted[2] = blendToward(adjusted[2] ?? 0, -bottomDistance, edge.flushMount === true ? 0.88 : 0.72);
  } else if (edge.mountFace === "centerline") {
    adjusted[0] = Number(((adjusted[0] ?? 0) * 0.24).toFixed(4));
  } else if (edge.mountFace === "side") {
    const sideDistance = Math.max(parentHalfX + partHalfX - embedDepth, parentHalfX * 0.58, 0.0045);
    adjusted[0] =
      adjusted[0] >= 0
        ? blendToward(adjusted[0] ?? 0, sideDistance, 0.74)
        : blendToward(adjusted[0] ?? 0, -sideDistance, 0.74);
    adjusted[2] = clampValue(
      adjusted[2],
      -Math.max(parentHalfZ * 0.32, 0.006),
      Math.max(parentHalfZ * 0.5, 0.01),
    );
  } else if (edge.mountFace === "top-right") {
    const shoulderMin = Math.max(parentHalfX * 0.16, partHalfX * 0.68, 0.006);
    const shoulderMax = Math.max(parentHalfX * 0.44, shoulderMin + 0.003);
    const topDistance = Math.max(parentHalfZ + partHalfZ - embedDepth, parentHalfZ * 0.62, 0.0045);
    adjusted[0] = clampValue(adjusted[0], shoulderMin, shoulderMax);
    adjusted[2] = blendToward(adjusted[2] ?? 0, topDistance, 0.9);
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.82, 0.01),
      Math.max(parentHalfY * 0.26, 0.004),
    );
  } else if (edge.mountFace === "top-left") {
    const shoulderMin = Math.max(parentHalfX * 0.16, partHalfX * 0.68, 0.006);
    const shoulderMax = Math.max(parentHalfX * 0.44, shoulderMin + 0.003);
    const topDistance = Math.max(parentHalfZ + partHalfZ - embedDepth, parentHalfZ * 0.62, 0.0045);
    adjusted[0] = clampValue(adjusted[0], -shoulderMax, -shoulderMin);
    adjusted[2] = blendToward(adjusted[2] ?? 0, topDistance, 0.9);
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.82, 0.01),
      Math.max(parentHalfY * 0.26, 0.004),
    );
  } else if (edge.mountFace === "bottom-right") {
    const shoulderMin = Math.max(parentHalfX * 0.16, partHalfX * 0.62, 0.0048);
    const shoulderMax = Math.max(parentHalfX * 0.46, shoulderMin + 0.0032);
    const bottomDistance = Math.max(
      parentHalfZ + partHalfZ - embedDepth,
      parentHalfZ * 0.72,
      partHalfZ * 0.42,
      0.0088,
    );
    adjusted[0] = clampValue(adjusted[0], shoulderMin, shoulderMax);
    adjusted[2] = blendToward(adjusted[2] ?? 0, -bottomDistance, 0.9);
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.56, partHalfY * 0.88, 0.004),
      Math.max(parentHalfY * 0.22, 0.0032),
    );
  } else if (edge.mountFace === "bottom-left") {
    const shoulderMin = Math.max(parentHalfX * 0.16, partHalfX * 0.62, 0.0048);
    const shoulderMax = Math.max(parentHalfX * 0.46, shoulderMin + 0.0032);
    const bottomDistance = Math.max(
      parentHalfZ + partHalfZ - embedDepth,
      parentHalfZ * 0.72,
      partHalfZ * 0.42,
      0.0088,
    );
    adjusted[0] = clampValue(adjusted[0], -shoulderMax, -shoulderMin);
    adjusted[2] = blendToward(adjusted[2] ?? 0, -bottomDistance, 0.9);
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.56, partHalfY * 0.88, 0.004),
      Math.max(parentHalfY * 0.22, 0.0032),
    );
  } else if (edge.mountFace === "lower-span") {
    const spanClamp = Math.max(parentHalfX * 0.36, partHalfX * 0.92, 0.006);
    const lowerDistance = Math.max(
      parentHalfZ * 0.62 + partHalfZ * 0.82 - embedDepth,
      partHalfZ * 0.92,
      0.0096,
    );
    adjusted[0] = clampValue(adjusted[0], -spanClamp, spanClamp);
    adjusted[2] = blendToward(adjusted[2] ?? 0, -lowerDistance, 0.86);
    adjusted[1] = clampValue(
      adjusted[1],
      -Math.max(parentHalfY * 0.48, partHalfY * 0.9, 0.004),
      Math.max(parentHalfY * 0.18, 0.003),
    );
  }

  if (edge.flushMount === true || edge.edgeConstraint === "flush-mount") {
    adjusted[0] = Number(((adjusted[0] ?? 0) * 0.82).toFixed(4));
  }

  if (edge.edgeConstraint === "embedded-front" && edge.flushMount !== true) {
    adjusted[1] = Number(((adjusted[1] ?? 0) * 0.72).toFixed(4));
  }

  if (edge.edgeConstraint === "supported-branch") {
    adjusted[0] = Number(((adjusted[0] ?? 0) * 0.72).toFixed(4));
    adjusted[2] = Number(((adjusted[2] ?? 0) * 0.96).toFixed(4));
  }

  if (edge.edgeConstraint === "free-hang") {
    adjusted[2] = Number(((adjusted[2] ?? 0) + partSize * 0.08).toFixed(4));
  }

  return adjusted.map((value) => Number((value ?? 0).toFixed(4)));
}

function getPartGraphRootPartId(partGraph, geometryRecipe, partBlueprintBases) {
  return (
    (typeof partGraph?.rootPartId === "string" && partGraph.rootPartId) ||
    (typeof geometryRecipe?.assemblyRootPartId === "string" &&
      geometryRecipe.assemblyRootPartId) ||
    (typeof partBlueprintBases[0]?.partId === "string" ? partBlueprintBases[0].partId : "token")
  );
}

function isBotanicalBloomRuntimeShapeClass(runtimeShapeClass) {
  return (
    runtimeShapeClass === "flower" ||
    runtimeShapeClass === "clover-charm" ||
    runtimeShapeClass === "open-botanical-ornament"
  );
}

function resolveRuntimePartBlueprintLocations(
  partBlueprintBases,
  partGraph,
  geometryRecipe,
  execution,
  runtimeShapeClass,
  resolvedAnchor,
  mirrorX,
  spacingMultiplier,
  silhouetteMultiplier,
  repairActions = [],
) {
  if (!Array.isArray(partBlueprintBases) || partBlueprintBases.length === 0) {
    return [];
  }

  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const rebuildFromRootIntensity = getRepairActionIntensity(
    repairActions,
    "rebuild-from-root",
  );
  const partMap = new Map(partBlueprintBases.map((part) => [part.partId, part]));
  const rootPartId = getPartGraphRootPartId(partGraph, geometryRecipe, partBlueprintBases);
  const edgeByChildId = new Map(
    Array.isArray(partGraph?.edges)
      ? partGraph.edges
          .filter(
            (edge) =>
              isRecord(edge) &&
              typeof edge.childPartId === "string" &&
              typeof edge.parentPartId === "string" &&
              partMap.has(edge.childPartId) &&
              partMap.has(edge.parentPartId),
          )
          .map((edge) => [edge.childPartId, edge])
      : [],
  );
  const promotedPartIds = new Set(
    Array.isArray(repairActions)
      ? repairActions.flatMap((action) =>
          isRecord(action) &&
          action.actionType === "promote-critical-part" &&
          Array.isArray(action.targetPartIds)
            ? action.targetPartIds.filter((value) => typeof value === "string")
            : [],
        )
      : [],
  );
  const cohesionTargetPartIds = new Set(
    Array.isArray(repairActions)
      ? repairActions.flatMap((action) =>
          isRecord(action) &&
          (
            action.actionType === "tighten-cohesion" ||
            action.actionType === "re-parent-part" ||
            action.actionType === "rebuild-from-root"
          ) &&
          Array.isArray(action.targetPartIds)
            ? action.targetPartIds.filter((value) => typeof value === "string")
            : [],
        )
      : [],
  );
  const botanicalCohesionIntensity = isBotanicalBloomRuntimeShapeClass(
    runtimeShapeClass,
  )
    ? Math.max(tightenCohesionIntensity, rebuildFromRootIntensity)
    : 0;
  const locationCache = new Map();
  const visited = new Set();
  const resolvedParentCache = new Map();
  const isBotanicalEarSide =
    isBotanicalBloomRuntimeShapeClass(runtimeShapeClass) &&
    (execution.anchor === "left-ear" || execution.anchor === "right-ear");

  const resolveParentPartId = (partId) => {
    if (resolvedParentCache.has(partId)) {
      return resolvedParentCache.get(partId);
    }

    const edge = edgeByChildId.get(partId);
    const shouldForceBotanicalRoot =
      botanicalCohesionIntensity >= 0.68 &&
      partId !== rootPartId &&
      (
        cohesionTargetPartIds.has(partId) ||
        (isBotanicalBloomRuntimeShapeClass(runtimeShapeClass) &&
          (partId.startsWith("petal-") || partId.startsWith("leaf-")))
      );
    const shouldForceRoot =
      rebuildFromRootIntensity >= 0.7 &&
      partId !== rootPartId &&
      (
        shouldForceBotanicalRoot ||
        !edge ||
        (typeof edge.maxDrift === "number" && edge.maxDrift > 0.008)
      );
    const parentId =
      partId === rootPartId
        ? null
        : shouldForceRoot
          ? rootPartId
          : typeof edge?.parentPartId === "string"
            ? edge.parentPartId
            : rootPartId;

    resolvedParentCache.set(partId, parentId);
    return parentId;
  };

  const placePart = (partId) => {
    if (locationCache.has(partId)) {
      return locationCache.get(partId);
    }

    const base = partMap.get(partId);

    if (!base) {
      return resolvedAnchor;
    }

    if (visited.has(partId)) {
      return addVector(resolvedAnchor, base.localOffset);
    }

    visited.add(partId);
    const edge = edgeByChildId.get(partId);
    const parentId = resolveParentPartId(partId);
    const parentLocation = parentId ? placePart(parentId) : resolvedAnchor;
    const parentBase = parentId ? partMap.get(parentId) : null;
    const localOffset =
      Array.isArray(edge?.localOffset) &&
      typeof edge?.parentPartId === "string" &&
      edge.parentPartId === parentId
        ? transformRuntimeLocalOffset(
            edge.localOffset,
            mirrorX,
            spacingMultiplier,
            silhouetteMultiplier,
            tightenCohesionIntensity,
          )
        : base.localOffset;
    const resolvedLocalOffset = edge
      ? adjustOffsetForAttachmentRule(localOffset, edge, base, parentBase)
      : localOffset;
    const chestWrapTailAttachment =
      isHostCoupledChestWrapExecution(execution, geometryRecipe) &&
      parentId === "knot" &&
      (partId === "tail-left" || partId === "tail-right");
    const capabilityAttachmentOffset = chestWrapTailAttachment
      ? [
          Number(
            (
              Math.sign(resolvedLocalOffset[0] ?? (partId === "tail-left" ? -1 : 1)) *
              Math.max(0.0092, Math.min(0.0128, Math.abs(resolvedLocalOffset[0] ?? 0)))
            ).toFixed(4),
          ),
          Number(
            lerpNumber(
              resolvedLocalOffset[1] ?? 0,
              Math.max(resolvedLocalOffset[1] ?? 0, 0.0008),
              0.72,
            ).toFixed(4),
          ),
          Number(
            lerpNumber(
              resolvedLocalOffset[2] ?? 0,
              -0.0148,
              0.78,
            ).toFixed(4),
          ),
        ]
      : resolvedLocalOffset;
    const cohesionOffset =
      botanicalCohesionIntensity > 0
        ? [
            Number(((capabilityAttachmentOffset[0] ?? 0) * (1 - botanicalCohesionIntensity * 0.36)).toFixed(4)),
            Number(((capabilityAttachmentOffset[1] ?? 0) * (1 - botanicalCohesionIntensity * 0.14)).toFixed(4)),
            Number(((capabilityAttachmentOffset[2] ?? 0) * (1 - botanicalCohesionIntensity * 0.28)).toFixed(4)),
          ]
        : capabilityAttachmentOffset;
    const shouldEmbedBotanicalLateralPart =
      isBotanicalEarSide &&
      parentId === rootPartId &&
      (
        partId === "petal-left" ||
        partId === "petal-right" ||
        partId === "leaf-left" ||
        partId === "leaf-right"
      );
    const botanicalRootEmbedStrength = shouldEmbedBotanicalLateralPart
      ? Math.min(
          0.42,
          0.18 +
            botanicalCohesionIntensity * 0.18 +
            (cohesionTargetPartIds.has(partId) ? 0.08 : 0),
        )
      : 0;
    const capabilityRootEmbedStrength = getCapabilityRootEmbedStrength(
      execution,
      geometryRecipe,
      partId,
      parentId,
      rootPartId,
      repairActions,
    );
    const chestWrapTailToKnot =
      isHostCoupledChestWrapExecution(execution, geometryRecipe) &&
      parentId === "knot" &&
      (partId === "tail-left" || partId === "tail-right");
    const chestWrapKnotToRoot =
      isHostCoupledChestWrapExecution(execution, geometryRecipe) &&
      partId === "knot" &&
      parentId === rootPartId;
    const capabilityAxisEmbedStrength =
      capabilityRootEmbedStrength > 0
        ? chestWrapTailToKnot
          ? {
              x: capabilityRootEmbedStrength * 0.14,
              y: capabilityRootEmbedStrength * 0.22,
              z: capabilityRootEmbedStrength * 0.54,
            }
          : chestWrapKnotToRoot
            ? {
                x: capabilityRootEmbedStrength * 0.26,
                y: capabilityRootEmbedStrength * 0.16,
                z: capabilityRootEmbedStrength * 0.4,
              }
            : {
                x: capabilityRootEmbedStrength,
                y: capabilityRootEmbedStrength * 0.18,
                z: capabilityRootEmbedStrength * 0.42,
              }
        : null;
    const rootedCohesionOffset =
      botanicalRootEmbedStrength > 0 || capabilityRootEmbedStrength > 0
        ? [
            Number(
              (
                (cohesionOffset[0] ?? 0) *
                (
                  1 -
                  Math.max(
                    botanicalRootEmbedStrength,
                    capabilityAxisEmbedStrength?.x ?? capabilityRootEmbedStrength,
                  )
                )
              ).toFixed(4),
            ),
            Number(
              (
                (cohesionOffset[1] ?? 0) *
                (
                  1 -
                  (
                    botanicalRootEmbedStrength > capabilityRootEmbedStrength
                      ? botanicalRootEmbedStrength * 0.22
                      : capabilityAxisEmbedStrength?.y ?? capabilityRootEmbedStrength * 0.18
                  )
                )
              ).toFixed(4),
            ),
            Number(
              (
                (cohesionOffset[2] ?? 0) *
                (
                  1 -
                  (
                    botanicalRootEmbedStrength > capabilityRootEmbedStrength
                      ? botanicalRootEmbedStrength * 0.16
                      : capabilityAxisEmbedStrength?.z ?? capabilityRootEmbedStrength * 0.42
                  )
                )
              ).toFixed(4),
            ),
          ]
        : cohesionOffset;
    const location = addVector(parentLocation, rootedCohesionOffset);
    locationCache.set(partId, location);
    visited.delete(partId);
    return location;
  };

  return partBlueprintBases.map((part) => {
    const parentPartId = resolveParentPartId(part.partId);
    const expectedParentOffset =
      parentPartId && locationCache.has(part.partId)
        ? subtractVector(locationCache.get(part.partId), placePart(parentPartId))
        : parentPartId
          ? subtractVector(placePart(part.partId), placePart(parentPartId))
          : part.localOffset;
    const scaleBoost =
      promotedPartIds.has(part.partId) ||
      (Array.isArray(execution?.criticalParts) &&
        execution.criticalParts.includes(part.partId))
        ? 1 +
          getRepairActionIntensity(repairActions, "promote-critical-part") *
            (isBotanicalBloomRuntimeShapeClass(runtimeShapeClass)
              ? part.partId === rootPartId
                ? 0.12
                : 0.06
              : 0.16)
        : 1;
    const scale = Array.isArray(part.scale)
      ? part.scale.map((value) => Number((value * scaleBoost).toFixed(4)))
      : part.scale;

    return {
      ...part,
      location: placePart(part.partId),
      scale,
      parentPartId,
      expectedParentOffset,
    };
  });
}

function getPreferredPrecisionOffset(
  baseOffset,
  execution,
  geometryRecipe,
  refinementStage,
  partId,
  repairActions = [],
) {
  return getPreferredPrecisionOffsetFromLib(
    baseOffset,
    execution,
    geometryRecipe,
    refinementStage,
    partId,
    repairActions,
  );
}

function applyHardSurfacePrecisionShapeToScale(
  scale,
  execution,
  geometryRecipe,
  refinementStage,
  partId,
  partProfile,
  repairActions = [],
) {
  return applyHardSurfacePrecisionShapeToScaleFromLib(
    scale,
    execution,
    geometryRecipe,
    refinementStage,
    partId,
    partProfile,
    repairActions,
  );
}

function rebalanceRuntimePartBlueprintBasesBySpanTargets(
  partBlueprintBases,
  execution,
  geometryRecipe,
  refinementStage,
) {
  return rebalanceRuntimePartBlueprintBasesBySpanTargetsFromLib(
    partBlueprintBases,
    execution,
    geometryRecipe,
    refinementStage,
    getGeometryPartProfileMap,
  );
}

function buildRuntimePartBlueprints(
  geometryRecipe,
  execution,
  targetAnchorPosition,
  passIndex,
  targetPassCount,
  baseName,
  partGraph = null,
  repairActions = [],
) {
  if (!isRecord(geometryRecipe) || !Array.isArray(geometryRecipe.parts)) {
    return {
      partBlueprints: [],
      placementOffset: [0, 0, 0],
      desiredPlacementOffset: [0, 0, 0],
      overallScaleMultiplier: 1,
    };
  }

  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const desiredPlacementOffset = addVector(
    adjustPlacementOffsetForStructuralIntent(
      getDesiredPlacementOffsetForExecution(execution, geometryRecipe),
      execution,
      geometryRecipe,
    ),
    getCapabilityPlacementRecoveryOffset(
      execution,
      geometryRecipe,
      repairActions,
    ),
  );
  const coarsePlacementOffset = getCoarsePlacementOffset(
    execution.anchor,
    shapeClass,
    desiredPlacementOffset,
  );
  const progress =
    targetPassCount <= 1 ? 1 : clamp01((passIndex - 1) / (targetPassCount - 1));
  const refinementStage = getExecutionRefinementStage(passIndex, targetPassCount);
  const stageProfile = getStageProfile(refinementStage);
  const isOpenNoun = isOpenNounExecution(execution);
  const placementOffsetBase = lerpVector(
    coarsePlacementOffset,
    desiredPlacementOffset,
    progress,
  );
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildFromRootIntensity = getRepairActionIntensity(
    repairActions,
    "rebuild-from-root",
  );
  const hostClearanceIntensity = Math.max(
    reAnchorIntensity,
    rebuildFromRootIntensity * 0.9,
  );
  const placementOffset = lerpVector(
    placementOffsetBase,
    desiredPlacementOffset,
    reAnchorIntensity > 0 ? Math.min(1, 0.35 + reAnchorIntensity * 0.45) : 0,
  );
  const isBotanicalBloom = isBotanicalBloomRuntimeShapeClass(shapeClass);
  const hostShrinkIntensity = Math.max(
    rebuildFromRootIntensity,
    getRepairActionIntensity(repairActions, "tighten-cohesion") * 0.6,
    getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.36,
  );
  const botanicalCohesionIntensity = isBotanicalBloom
    ? Math.max(
        hostShrinkIntensity,
        reAnchorIntensity,
        getRepairActionIntensity(repairActions, "tighten-cohesion"),
      )
    : 0;
  const overallScaleMultiplier =
    lerpNumber(
      getCoarseAccessoryScaleMultiplier(shapeClass),
      getIdealAccessoryScaleMultiplier(shapeClass),
      progress,
    ) *
    stageProfile.scaleMultiplier *
    (isOpenNoun ? 0.94 : 1) *
    getHostAnchorScaleClamp(
      execution.anchor,
      hostShrinkIntensity,
      isOpenNoun,
      shapeClass,
    ) *
    (isBotanicalBloom
      ? Number((1 - botanicalCohesionIntensity * 0.08).toFixed(4))
      : 1);
  const hostFitScaleClamp = getHardSurfaceHostFitScaleClamp(
    execution,
    geometryRecipe,
    refinementStage,
    progress,
    repairActions,
  );
  const effectiveOverallScaleMultiplier = Number(
    (overallScaleMultiplier * hostFitScaleClamp).toFixed(4),
  );
  const spacingMultiplierBase = isOpenNoun
    ? lerpNumber(0.74, 0.92, progress) * stageProfile.spacingMultiplier
    : getSpacingMultiplierForPass(passIndex, targetPassCount) *
      stageProfile.spacingMultiplier;
  const silhouetteMultiplierBase = isOpenNoun
    ? lerpNumber(0.88, 1.0, progress) * stageProfile.silhouetteMultiplier
    : getSilhouetteMultiplierForPass(
        passIndex,
        targetPassCount,
      ) * stageProfile.silhouetteMultiplier;
  const spacingMultiplier =
    isBotanicalBloom
      ? Math.max(
          0.56,
          spacingMultiplierBase +
            getRepairActionIntensity(repairActions, "split-merged-part") * 0.04 +
            getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.04 -
            hostShrinkIntensity * 0.24 -
            botanicalCohesionIntensity * 0.12,
        )
      : Math.max(
          0.68,
          spacingMultiplierBase +
            getRepairActionIntensity(repairActions, "split-merged-part") * 0.12 +
            getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.08 -
            hostShrinkIntensity * 0.12,
        );
  const silhouetteMultiplier =
    isBotanicalBloom
      ? Math.max(
          0.74,
          silhouetteMultiplierBase +
            getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.06 -
            hostShrinkIntensity * 0.18 -
            botanicalCohesionIntensity * 0.08,
        )
      : Math.max(
          0.82,
          silhouetteMultiplierBase +
            getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.14 -
            hostShrinkIntensity * 0.1,
        );
  const graphSelectedPartIds = getAccessoryRefinementPartIdsFromGraph(
    partGraph,
    passIndex,
    targetPassCount,
    repairActions,
  );
  const hardSurfaceSelectedPartIds = getHardSurfaceProgressivePartIds(
    execution,
    geometryRecipe,
    passIndex,
    targetPassCount,
    repairActions,
  );
  const familySelectedPartIds = getAccessoryRefinementPassPartIds(
    getExecutionRuntimeShapeClass(execution, geometryRecipe),
    passIndex,
  );
  const selectedPartIds = Array.isArray(hardSurfaceSelectedPartIds)
    ? hardSurfaceSelectedPartIds
    : Array.isArray(graphSelectedPartIds)
    ? graphSelectedPartIds
    : familySelectedPartIds;
  const selectedPartSource = Array.isArray(hardSurfaceSelectedPartIds)
    ? "hard-surface"
    : Array.isArray(graphSelectedPartIds)
      ? "graph"
      : Array.isArray(familySelectedPartIds)
        ? "family"
        : "all";
  const mirrorX = execution.anchor === "right-ear";
  const partProfileMap = getGeometryPartProfileMap(geometryRecipe);
  const rebalanceBoost = getRepairActionIntensity(
    repairActions,
    "rebalance-part-ratio",
  );
  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const partBlueprintBases = geometryRecipe.parts
    .filter((part) =>
      !Array.isArray(selectedPartIds) || selectedPartIds.includes(part.partId),
    )
    .map((part) => {
      const baseOffset = getPreferredPrecisionOffset(
        Array.isArray(part.offset) ? [...part.offset] : [0, 0, 0],
        execution,
        geometryRecipe,
        refinementStage,
        part.partId,
        repairActions,
      );
      const scaledOffset = transformRuntimeLocalOffset(
        baseOffset,
        mirrorX,
        spacingMultiplier,
        silhouetteMultiplier,
        tightenCohesionIntensity,
      );
      const roleEmphasis = getRoleEmphasisMultiplier(
        getExecutionRuntimeShapeClass(execution, geometryRecipe),
        part.role,
        passIndex,
      );
      const partProfile = partProfileMap.get(part.partId);
      const importanceWeight = getGeometryPartImportanceWeight(
        geometryRecipe,
        part.partId,
      );
      const stageImportanceMultiplier = getStagePartImportanceMultiplier(
        refinementStage,
        importanceWeight,
        partProfile?.silhouetteRole,
      );
      const spanBias =
        typeof partProfile?.spanBias === "number" ? partProfile.spanBias : 1;
      const depthBias =
        typeof partProfile?.depthBias === "number" ? partProfile.depthBias : 1;
      const roleBoost =
        rebalanceBoost > 0 &&
        Array.isArray(repairActions) &&
        repairActions.some(
          (action) =>
            isRecord(action) &&
            Array.isArray(action.targetRoles) &&
            action.targetRoles.includes(part.role),
        )
          ? 1 +
            rebalanceBoost *
              (isBotanicalBloom &&
              (part.partId.startsWith("petal-") || part.partId.startsWith("leaf-"))
                ? 0.08
                : 0.16)
          : 1;
      const baseScale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];
      const hardSurfaceAxisClamp = getHardSurfaceEarAxisScaleClamp(
        execution,
        geometryRecipe,
        refinementStage,
        repairActions,
        partProfile,
      );
      const scale = applyHardSurfacePrecisionShapeToScale(
        baseScale.map((value, axis) =>
          Number(
            (
              value *
              effectiveOverallScaleMultiplier *
              roleEmphasis *
              stageImportanceMultiplier *
              roleBoost *
              hardSurfaceAxisClamp[axis] *
              (axis === 0 ? silhouetteMultiplier * spanBias : axis === 1 ? depthBias : 1)
            ).toFixed(4),
          ),
        ),
        execution,
        geometryRecipe,
        refinementStage,
        part.partId,
        partProfile,
        repairActions,
      );
      const rotation = Array.isArray(part.rotation)
        ? [
            Number((part.rotation[0] ?? 0).toFixed(4)),
            Number(((mirrorX ? -(part.rotation[1] ?? 0) : part.rotation[1] ?? 0)).toFixed(4)),
            Number(
              (
                (mirrorX ? -(part.rotation[2] ?? 0) : part.rotation[2] ?? 0) +
                getRepairActionIntensity(repairActions, "re-orient") * (mirrorX ? -8 : 8)
              ).toFixed(4),
            ),
          ]
        : undefined;

      return {
        partId: part.partId,
        primitive: normalizeRuntimePrimitiveType(part.primitive),
        role: typeof part.role === "string" ? part.role : "part",
        materialZone:
          typeof part.materialZone === "string" ? part.materialZone : "accessory",
        size:
          typeof part.size === "number" && Number.isFinite(part.size)
            ? Number(part.size.toFixed(4))
            : 0.02,
        localOffset: scaledOffset,
        scale,
        rotation,
        name: `${baseName}_${part.partId}`,
      };
    });
  if (shouldDebugRuntimeBlueprint(shapeClass)) {
    log(
      `debug-runtime-blueprint ${baseName} stage=${refinementStage} checkpoint=base ${JSON.stringify(
        {
          passIndex,
          targetPassCount,
          overallScaleMultiplier: effectiveOverallScaleMultiplier,
          baseScaleMultiplier: overallScaleMultiplier,
          hostFitScaleClamp,
          stageScaleMultiplier: stageProfile.scaleMultiplier,
          placementOffset,
          desiredPlacementOffset,
          repairActions: Array.isArray(repairActions)
            ? repairActions.map((action) => ({
                actionType: action?.actionType,
                targetPartIds: action?.targetPartIds,
                intensity: action?.intensity,
              }))
            : [],
          parts: summarizeRuntimeBlueprintParts(partBlueprintBases),
        },
      )}`,
    );
  }
  const outlineCompilerResult = applyHardSurfaceOutlineCompiler(
    partBlueprintBases,
    execution,
    geometryRecipe,
    refinementStage,
    repairActions,
  );
  const outlineCompiledPartBlueprintBases = Array.isArray(
    outlineCompilerResult?.partBlueprintBases,
  )
    ? outlineCompilerResult.partBlueprintBases
    : partBlueprintBases;
  if (shouldDebugRuntimeBlueprint(shapeClass)) {
    log(
      `debug-runtime-blueprint ${baseName} stage=${refinementStage} checkpoint=outline ${JSON.stringify(
        summarizeRuntimeBlueprintParts(outlineCompiledPartBlueprintBases),
      )}`,
    );
  }
  const rebalancedPartBlueprintBases = rebalanceRuntimePartBlueprintBasesBySpanTargets(
    outlineCompiledPartBlueprintBases,
    execution,
    geometryRecipe,
    refinementStage,
  );
  if (shouldDebugRuntimeBlueprint(shapeClass)) {
    log(
      `debug-runtime-blueprint ${baseName} stage=${refinementStage} checkpoint=rebalance ${JSON.stringify(
        summarizeRuntimeBlueprintParts(rebalancedPartBlueprintBases),
      )}`,
    );
  }
  const hardSurfaceAssemblyOutwardShift = getHardSurfaceAssemblyOutwardShift(
    execution,
    geometryRecipe,
    refinementStage,
    rebalancedPartBlueprintBases,
    repairActions,
  );
  const hostClearanceOffset = getHostClearanceOffset(
    execution.anchor,
    hostClearanceIntensity,
    shapeClass,
  );
  const shouldUseEarSideProjectionSolver =
    usesProjectedEarSideAnchorPose(execution, geometryRecipe) &&
    (execution.anchor === "left-ear" || execution.anchor === "right-ear");
  const anchorProjection =
    shouldUseEarSideProjectionSolver
      ? projectHardSurfaceEarSideAnchorPose({
          execution,
          geometryRecipe,
          targetAnchorPosition,
          placementOffset,
          refinementStage,
          repairActions,
          assemblyOutwardShift: hardSurfaceAssemblyOutwardShift,
        })
      : null;
  const resolvedAnchor =
    anchorProjection?.projectedAnchorPose ??
    addVector(
      targetAnchorPosition,
      addVector(
        addVector(
          placementOffset,
          getHardSurfaceHostFitOffset(execution, geometryRecipe, refinementStage),
        ),
        addVector(hostClearanceOffset, hardSurfaceAssemblyOutwardShift),
      ),
    );
  const partBlueprints = resolveRuntimePartBlueprintLocations(
    rebalancedPartBlueprintBases,
    partGraph,
    geometryRecipe,
    execution,
    shapeClass,
    resolvedAnchor,
    mirrorX,
    spacingMultiplier,
    silhouetteMultiplier,
    repairActions,
  );
  const compactEnvelopeClampResult = applyChestWrapCompactEnvelopeClamp(
    partBlueprints,
    execution,
    geometryRecipe,
    refinementStage,
    repairActions,
    partGraph,
  );
  const finalPartBlueprints = Array.isArray(
    compactEnvelopeClampResult?.partBlueprints,
  )
    ? compactEnvelopeClampResult.partBlueprints
    : partBlueprints;
  if (shouldDebugRuntimeBlueprint(shapeClass)) {
    log(
      `debug-runtime-blueprint ${baseName} stage=${refinementStage} checkpoint=final ${JSON.stringify(
        {
          anchorProjection,
          resolvedAnchor,
          assemblyOutwardShift: hardSurfaceAssemblyOutwardShift,
          compactEnvelopeClamp: compactEnvelopeClampResult,
          parts: summarizeRuntimeBlueprintParts(finalPartBlueprints),
        },
      )}`,
    );
  }

  return {
    partBlueprints: finalPartBlueprints,
    placementOffset,
    desiredPlacementOffset,
    overallScaleMultiplier: effectiveOverallScaleMultiplier,
    baseScaleMultiplier: overallScaleMultiplier,
    hostFitScaleClamp,
    stageScaleMultiplier: stageProfile.scaleMultiplier,
    anchorProjection,
    outlineCompilerMode:
      typeof outlineCompilerResult?.outlineCompilerMode === "string"
        ? outlineCompilerResult.outlineCompilerMode
        : undefined,
    outlineProjectionVariantId:
      typeof outlineCompilerResult?.outlineProjectionVariantId === "string"
        ? outlineCompilerResult.outlineProjectionVariantId
        : undefined,
    compactEnvelopeClampDebug:
      compactEnvelopeClampResult?.clampApplied === true
        ? {
            clampStrength: compactEnvelopeClampResult.clampStrength,
            targetSpan: compactEnvelopeClampResult.targetSpan,
            spanBefore: compactEnvelopeClampResult.spanBefore,
            spanAfter: compactEnvelopeClampResult.spanAfter,
            overflowFactors: compactEnvelopeClampResult.overflowFactors,
          }
        : undefined,
    selectionDebug:
      process.env.PROMPTPET_DEBUG_PART_SELECTION === "1"
        ? {
            selectedPartSource,
            totalPartCount: Array.isArray(geometryRecipe.parts)
              ? geometryRecipe.parts.length
              : 0,
            selectedPartIds: Array.isArray(selectedPartIds)
              ? [...selectedPartIds]
              : Array.isArray(geometryRecipe.parts)
                ? geometryRecipe.parts.map((part) => part.partId)
                : [],
            graphSelectedPartIds: Array.isArray(graphSelectedPartIds)
              ? [...graphSelectedPartIds]
              : [],
            familySelectedPartIds: Array.isArray(familySelectedPartIds)
              ? [...familySelectedPartIds]
              : [],
            hardSurfaceSelectedPartIds: Array.isArray(hardSurfaceSelectedPartIds)
              ? [...hardSurfaceSelectedPartIds]
              : [],
          }
        : undefined,
  };
}

function cloneGeometryRecipeWithVariant(geometryRecipe, variantId, context = {}) {
  if (
    !isRecord(geometryRecipe) ||
    !Array.isArray(geometryRecipe.parts) ||
    typeof variantId !== "string" ||
    !variantId.trim()
  ) {
    return geometryRecipe;
  }

  const hardSurfaceOverride = applyHardSurfaceVariantRepresentationOverridesFromLib(
    geometryRecipe,
    variantId,
    context,
  );
  if (hardSurfaceOverride) {
    return hardSurfaceOverride;
  }

  const cloned = {
    ...geometryRecipe,
    variantId,
    profileVariantId:
      typeof geometryRecipe.profileVariantId === "string"
        ? geometryRecipe.profileVariantId
        : variantId,
    profileCurves: Array.isArray(geometryRecipe.profileCurves)
      ? [...geometryRecipe.profileCurves]
      : [],
    parts: geometryRecipe.parts.map((part) => ({
      ...part,
      offset: Array.isArray(part.offset) ? [...part.offset] : [0, 0, 0],
      scale: Array.isArray(part.scale) ? [...part.scale] : [1, 1, 1],
      rotation: Array.isArray(part.rotation) ? [...part.rotation] : undefined,
    })),
    silhouetteChecks: Array.isArray(geometryRecipe.silhouetteChecks)
      ? [...geometryRecipe.silhouetteChecks]
      : [],
    sizeBounds: isRecord(geometryRecipe.sizeBounds)
      ? { ...geometryRecipe.sizeBounds }
      : geometryRecipe.sizeBounds,
  };
  const setPart = (partId, nextValues) => {
    const target = cloned.parts.find((part) => part.partId === partId);
    if (!target) {
      return;
    }

    if (Array.isArray(nextValues.offset)) {
      target.offset = nextValues.offset;
    }
    if (Array.isArray(nextValues.scale)) {
      target.scale = nextValues.scale;
    }
    if (Array.isArray(nextValues.rotation)) {
      target.rotation = nextValues.rotation;
    }
    if (typeof nextValues.primitive === "string") {
      target.primitive = nextValues.primitive;
    }
  };

  switch (variantId) {
    case "camera-body-lens-forward":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-wide-body";
      cloned.reliefFeatureLayout = [
        "lens-forward-relief",
        "top-cluster-ridge",
        "viewfinder-corner",
      ];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.92, maxPartScale: 1.04 };
      setPart("device-body", { scale: [0.9, 0.14, 0.68] });
      setPart("camera-faceplate", { offset: [0.01, -0.012, 0.004], scale: [0.54, 0.07, 0.44] });
      setPart("camera-lens", { offset: [0.014, -0.03, 0.004], scale: [0.62, 0.32, 0.44] });
      setPart("camera-top", { offset: [0.01, 0.001, 0.021], scale: [0.2, 0.08, 0.12] });
      setPart("camera-viewfinder", { offset: [-0.012, 0.001, 0.021], scale: [0.13, 0.07, 0.1] });
      setPart("camera-button", { offset: [0.015, 0.002, 0.024], scale: [0.08, 0.06, 0.05] });
      setPart("hang-slot", { offset: [0.002, 0.001, 0.028], scale: [0.02, 0.02, 0.014] });
      break;
    case "camera-body-top-cluster":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-top-heavy-body";
      cloned.reliefFeatureLayout = [
        "lens-forward-relief",
        "top-cluster-ridge",
        "body-shoulder-step",
      ];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.9, maxPartScale: 1.02 };
      setPart("device-body", { scale: [0.86, 0.13, 0.64] });
      setPart("camera-faceplate", { offset: [0.012, -0.012, 0.004], scale: [0.52, 0.07, 0.42] });
      setPart("camera-lens", { offset: [0.014, -0.028, 0.004], scale: [0.54, 0.28, 0.4] });
      setPart("camera-top", { offset: [0.012, 0.001, 0.024], scale: [0.22, 0.08, 0.14] });
      setPart("camera-viewfinder", { offset: [-0.014, 0.001, 0.022], scale: [0.15, 0.06, 0.11] });
      setPart("camera-button", { offset: [0.017, 0.002, 0.026], scale: [0.08, 0.06, 0.05] });
      setPart("hang-slot", { offset: [0.002, 0.001, 0.03], scale: [0.02, 0.02, 0.014] });
      break;
    case "camera-compact-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-compact-body";
      cloned.reliefFeatureLayout = ["lens-forward-relief", "compact-top-ridge"];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.88, maxPartScale: 1.02 };
      setPart("device-body", { scale: [0.78, 0.12, 0.58] });
      setPart("camera-faceplate", { offset: [0.01, -0.012, 0.004], scale: [0.48, 0.06, 0.38] });
      setPart("camera-lens", { offset: [0.014, -0.028, 0.004], scale: [0.5, 0.26, 0.38] });
      setPart("camera-top", { offset: [0.01, 0.001, 0.021], scale: [0.18, 0.06, 0.1] });
      setPart("camera-viewfinder", { offset: [-0.012, 0.001, 0.021], scale: [0.12, 0.05, 0.08] });
      setPart("camera-button", { offset: [0.015, 0.002, 0.023], scale: [0.07, 0.05, 0.04] });
      setPart("hang-slot", { offset: [0.002, 0.001, 0.027], scale: [0.018, 0.018, 0.012] });
      break;
    case "boat-hull-sail-upright":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-upright-hull";
      cloned.reliefFeatureLayout = [
        "hull-pointed-ends",
        "mast-rooted-spine",
        "sail-tri-plane",
      ];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.8, maxPartScale: 1.04 };
      setPart("boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.62, 0.13, 0.22] });
      setPart("boat-bow", { primitive: "cone", offset: [0.033, 0.001, -0.004], scale: [0.42, 0.12, 0.22], rotation: [0, -90, 0] });
      setPart("boat-stern", { primitive: "cone", offset: [-0.03, 0.001, -0.005], scale: [0.3, 0.1, 0.16], rotation: [0, 90, 0] });
      setPart("boat-deck", { offset: [0, 0.001, 0.003], scale: [0.34, 0.03, 0.08] });
      setPart("boat-mast", { offset: [-0.002, 0.001, 0.012], scale: [0.052, 0.052, 0.54] });
      setPart("boat-sail", { primitive: "cone", offset: [0.004, 0.003, 0.012], scale: [0.24, 0.026, 0.48], rotation: [0, 90, -90] });
      setPart("hang-slot", { offset: [-0.002, 0.001, 0.032], scale: [0.032, 0.032, 0.02] });
      break;
    case "boat-hull-sail-compact":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-compact-hull";
      cloned.reliefFeatureLayout = [
        "compact-hull-profile",
        "mast-rooted-spine",
        "sail-tri-plane",
      ];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.84, maxPartScale: 1 };
      setPart("boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.72, 0.15, 0.22] });
      setPart("boat-bow", { primitive: "cone", offset: [0.034, 0.001, -0.004], scale: [0.46, 0.14, 0.2], rotation: [0, -90, 0] });
      setPart("boat-stern", { primitive: "cone", offset: [-0.031, 0.001, -0.005], scale: [0.32, 0.12, 0.16], rotation: [0, 90, 0] });
      setPart("boat-deck", { offset: [0, 0.001, 0.003], scale: [0.4, 0.04, 0.07] });
      setPart("boat-mast", { offset: [-0.002, 0.001, 0.009], scale: [0.05, 0.05, 0.42] });
      setPart("boat-sail", { primitive: "cone", offset: [0.006, 0.004, 0.01], scale: [0.32, 0.04, 0.48], rotation: [0, 0, -26] });
      setPart("hang-slot", { offset: [-0.002, 0.001, 0.031], scale: [0.03, 0.03, 0.018] });
      break;
    case "boat-hull-mast-minimal":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-rooted-hull";
      cloned.reliefFeatureLayout = ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.8, maxPartScale: 1 };
      setPart("boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.6, 0.12, 0.22] });
      setPart("boat-bow", { primitive: "cone", offset: [0.032, 0.001, -0.004], scale: [0.4, 0.11, 0.2], rotation: [0, -90, 0] });
      setPart("boat-stern", { primitive: "cone", offset: [-0.029, 0.001, -0.005], scale: [0.28, 0.09, 0.16], rotation: [0, 90, 0] });
      setPart("boat-deck", { offset: [0, 0.001, 0.003], scale: [0.34, 0.03, 0.07] });
      setPart("boat-mast", { offset: [-0.002, 0.001, 0.012], scale: [0.05, 0.05, 0.52] });
      setPart("boat-sail", { primitive: "cone", offset: [0.004, 0.003, 0.012], scale: [0.2, 0.024, 0.4], rotation: [0, 90, -90] });
      setPart("hang-slot", { offset: [-0.002, 0.001, 0.032], scale: [0.03, 0.03, 0.018] });
      break;
    case "device-tall-phone-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-tall-rect";
      cloned.reliefFeatureLayout = [
        "screen-face-inset",
        "camera-corner-dot",
        "top-edge-notch",
      ];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.88, maxPartScale: 1.04 };
      setPart("device-body", { scale: [0.62, 0.098, 1.24] });
      setPart("screen-face", { offset: [0, -0.013, 0.002], scale: [0.5, 0.014, 0.98] });
      setPart("camera-dot", { offset: [0.013, -0.013, 0.038], scale: [0.09, 0.04, 0.09] });
      setPart("hang-slot", { offset: [0, 0.0004, 0.032], scale: [0.008, 0.008, 0.005] });
      break;
    case "device-screen-forward":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-screen-rect";
      cloned.reliefFeatureLayout = ["screen-face-inset", "camera-corner-dot"];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.88, maxPartScale: 1.04 };
      setPart("device-body", { scale: [0.64, 0.098, 1.12] });
      setPart("screen-face", { offset: [0, -0.014, 0.002], scale: [0.52, 0.014, 0.9] });
      setPart("camera-dot", { offset: [0.014, -0.014, 0.034], scale: [0.09, 0.04, 0.09] });
      setPart("hang-slot", { offset: [0, 0.0004, 0.03], scale: [0.008, 0.008, 0.005] });
      break;
    case "device-compact-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-compact-rect";
      cloned.reliefFeatureLayout = ["screen-face-inset", "top-edge-notch"];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.84, maxPartScale: 1.02 };
      setPart("device-body", { scale: [0.62, 0.094, 0.98] });
      setPart("screen-face", { offset: [0, -0.014, 0.002], scale: [0.5, 0.014, 0.78] });
      setPart("camera-dot", { offset: [0.013, -0.014, 0.028], scale: [0.085, 0.04, 0.085] });
      setPart("hang-slot", { offset: [0, 0.0004, 0.028], scale: [0.008, 0.008, 0.005] });
      break;
    case "vehicle-forward-spine":
    case "vehicle-compact-upright":
      cloned.profileCurves = [
        cloned.blueprintFamily === "hard-surface-vehicle"
          ? "reference-vehicle"
          : "reference-device",
        variantId,
      ];
      break;
    case "fish-body-tail-forward":
      cloned.profileCurves = ["canonical-fish", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.72, maxPartScale: 0.92 };
      setPart("body", { scale: [0.84, 0.34, 0.44] });
      setPart("tail", { offset: [-0.018, 0, 0], scale: [0.16, 0.28, 0.22] });
      setPart("fin-top", { offset: [-0.002, 0, 0.01], scale: [0.08, 0.08, 0.14] });
      setPart("fin-bottom", { offset: [0.003, 0, -0.009], scale: [0.08, 0.08, 0.12] });
      setPart("nose", { offset: [0.018, 0, 0.001], scale: [0.16, 0.14, 0.14] });
      break;
    case "fish-compact-charm":
      cloned.profileCurves = ["canonical-fish", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.68, maxPartScale: 0.88 };
      setPart("body", { scale: [0.74, 0.3, 0.4] });
      setPart("tail", { offset: [-0.016, 0, 0], scale: [0.12, 0.24, 0.18] });
      setPart("fin-top", { offset: [-0.001, 0, 0.008], scale: [0.06, 0.06, 0.12] });
      setPart("fin-bottom", { offset: [0.002, 0, -0.007], scale: [0.06, 0.06, 0.1] });
      setPart("nose", { offset: [0.016, 0, 0.001], scale: [0.12, 0.12, 0.12] });
      break;
    case "flower-wide-petal":
      cloned.profileCurves = ["canonical-botanical", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.74, maxPartScale: 0.96 };
      setPart("core", { scale: [0.52, 0.42, 0.34] });
      setPart("petal-left", { offset: [-0.016, 0, 0.003], scale: [0.5, 0.18, 0.34] });
      setPart("petal-right", { offset: [0.016, 0, 0.003], scale: [0.5, 0.18, 0.34] });
      setPart("petal-top", { offset: [0, 0, 0.015], scale: [0.36, 0.18, 0.5] });
      setPart("petal-bottom", { offset: [0, 0, -0.012], scale: [0.34, 0.18, 0.42] });
      break;
    case "flower-layered-petal":
      cloned.profileCurves = ["canonical-botanical", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.72, maxPartScale: 0.94 };
      setPart("core", { scale: [0.5, 0.42, 0.34] });
      setPart("petal-left", { offset: [-0.014, 0, 0.003], scale: [0.44, 0.18, 0.32] });
      setPart("petal-right", { offset: [0.014, 0, 0.003], scale: [0.44, 0.18, 0.32] });
      setPart("petal-top", { offset: [0, 0, 0.013], scale: [0.32, 0.18, 0.44] });
      setPart("petal-bottom", { offset: [0, 0, -0.011], scale: [0.32, 0.18, 0.38] });
      setPart("petal-top-left", { offset: [-0.011, 0, 0.01], scale: [0.32, 0.16, 0.3] });
      setPart("petal-top-right", { offset: [0.011, 0, 0.01], scale: [0.32, 0.16, 0.3] });
      break;
    case "clover-wide-leaf":
      cloned.profileCurves = ["canonical-botanical", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.74, maxPartScale: 0.96 };
      setPart("core", { scale: [0.34, 0.3, 0.24] });
      setPart("leaf-left", { offset: [-0.014, 0, 0.002], scale: [0.52, 0.18, 0.38] });
      setPart("leaf-right", { offset: [0.014, 0, 0.002], scale: [0.52, 0.18, 0.38] });
      setPart("leaf-top", { offset: [0, 0, 0.014], scale: [0.42, 0.18, 0.48] });
      setPart("leaf-bottom", { offset: [0, 0, -0.011], scale: [0.4, 0.18, 0.4] });
      setPart("stem", { offset: [0.005, 0, -0.015], scale: [0.06, 0.24, 0.06] });
      break;
    case "clover-compact-charm":
      cloned.profileCurves = ["canonical-botanical", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.7, maxPartScale: 0.94 };
      setPart("core", { scale: [0.32, 0.28, 0.22] });
      setPart("leaf-left", { offset: [-0.012, 0, 0.008], scale: [0.46, 0.18, 0.34] });
      setPart("leaf-right", { offset: [0.012, 0, 0.008], scale: [0.46, 0.18, 0.34] });
      setPart("leaf-top", { offset: [0, 0, 0.012], scale: [0.38, 0.18, 0.42] });
      setPart("leaf-bottom", { offset: [0, 0, -0.009], scale: [0.34, 0.16, 0.34] });
      setPart("stem", { offset: [0.005, 0, -0.016], scale: [0.06, 0.24, 0.06] });
      setPart("ring", { offset: [0.002, 0, 0.016], scale: [0.04, 0.04, 0.04] });
      break;
    case "berry-crown-round":
      cloned.profileCurves = ["canonical-food", variantId];
      setPart("berry-main", { scale: [0.88, 0.88, 0.96] });
      setPart("leaf-crown", { offset: [0, 0.002, 0.032], scale: [0.28, 0.28, 0.32] });
      break;
    case "berry-drop-compact":
      cloned.profileCurves = ["canonical-food", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.9, maxPartScale: 1.02 };
      setPart("berry-main", { offset: [0, 0, 0.004], scale: [0.8, 0.78, 0.94] });
      setPart("berry-side-left", { offset: [-0.014, 0, -0.012], scale: [0.66, 0.66, 0.7] });
      setPart("berry-side-right", { offset: [0.014, 0, -0.012], scale: [0.66, 0.66, 0.7] });
      break;
    case "cloud-wide-puff":
      cloned.profileCurves = ["canonical-cloud", variantId];
      setPart("left-puff", { offset: [-0.022, 0, -0.002], scale: [0.82, 0.54, 0.6] });
      setPart("right-puff", { offset: [0.022, 0, -0.002], scale: [0.82, 0.54, 0.6] });
      setPart("base-puff", { scale: [1.2, 0.34, 0.42] });
      break;
    case "cloud-compact-puff":
      cloned.profileCurves = ["canonical-cloud", variantId];
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.9, maxPartScale: 1.02 };
      setPart("left-puff", { offset: [-0.018, 0, -0.001], scale: [0.74, 0.48, 0.54] });
      setPart("right-puff", { offset: [0.018, 0, -0.001], scale: [0.74, 0.48, 0.54] });
      setPart("base-puff", { offset: [0, 0, -0.012], scale: [1.04, 0.3, 0.36] });
      break;
    case "symbol-star-compact":
      cloned.profileCurves = ["canonical-charm", variantId];
      cloned.outlineProfile = "star-radial-spikes";
      cloned.attachmentMask = "top-ray-hidden-loop";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.62, maxPartScale: 0.86 };
      if (isRecord(cloned.partImportanceWeights)) {
        cloned.partImportanceWeights = {
          ...cloned.partImportanceWeights,
          core: 0.62,
          "ray-1": 0.94,
          "ray-2": 0.92,
          "ray-3": 0.86,
          "ray-4": 0.86,
          "ray-5": 0.92,
        };
      }
      setPart("core", { scale: [0.32, 0.11, 0.32] });
      setPart("ray-1", { offset: [0, 0, 0.027], scale: [0.34, 0.042, 0.44] });
      setPart("ray-2", { offset: [0.024, 0, 0.009], scale: [0.32, 0.042, 0.4] });
      setPart("ray-3", { offset: [0.014, 0, -0.02], scale: [0.28, 0.04, 0.34] });
      setPart("ray-4", { offset: [-0.014, 0, -0.02], scale: [0.28, 0.04, 0.34] });
      setPart("ray-5", { offset: [-0.024, 0, 0.009], scale: [0.32, 0.042, 0.4] });
      break;
    case "botanical-leaf-forward":
    case "botanical-compact-stem":
    case "symbol-cross-compact":
    case "food-drop-charm":
    case "food-layered-charm":
    case "ornament-drop-clean":
    case "ornament-compact-loop":
      cloned.profileCurves = ["canonical-charm", variantId];
      break;
    default:
      break;
  }

  return cloned;
}

function buildGeneratedAccessoryOperationsFromBlueprints(partBlueprints) {
  return partBlueprints.map((part) => ({
    type: "mesh",
    parameters: {
      primitive_type: normalizeRuntimePrimitiveType(part.primitive),
      name: part.name,
      size: part.size,
      location: part.location,
      scale: part.scale,
      ...(Array.isArray(part.rotation) ? { rotation: part.rotation } : {}),
    },
  }));
}

function sortRuntimePartBlueprintsForAssembly(partBlueprints, rootPartId = null) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return [];
  }

  const partMap = new Map(
    partBlueprints
      .filter((part) => typeof part.partId === "string")
      .map((part) => [part.partId, part]),
  );
  const depthCache = new Map();

  const getDepth = (part) => {
    if (!isRecord(part) || typeof part.partId !== "string") {
      return 0;
    }

    if (depthCache.has(part.partId)) {
      return depthCache.get(part.partId);
    }

    const parentPartId =
      typeof part.parentPartId === "string" && part.parentPartId !== part.partId
        ? part.parentPartId
        : null;
    const depth =
      !parentPartId || !partMap.has(parentPartId) || part.partId === rootPartId
        ? 0
        : getDepth(partMap.get(parentPartId)) + 1;

    depthCache.set(part.partId, depth);
    return depth;
  };

  return [...partBlueprints].sort((left, right) => {
    const leftDepth = getDepth(left);
    const rightDepth = getDepth(right);

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    if (left.partId === rootPartId) {
      return -1;
    }

    if (right.partId === rootPartId) {
      return 1;
    }

    return left.partId.localeCompare(right.partId);
  });
}

function getExecutionRoleWeights(execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);

  if (shapeClass === "camera-charm") {
    return {
      "device-body": 0.46,
      "camera-lens": 0.24,
      "camera-top": 0.12,
      "camera-button": 0.04,
      "camera-viewfinder": 0.08,
      "hang-slot": 0.06,
    };
  }

  if (shapeClass === "boat-charm") {
    return {
      "vehicle-body": 0.56,
      "vehicle-rear": 0.1,
      "boat-mast": 0.12,
      "boat-sail": 0.16,
      "hang-slot": 0.06,
    };
  }

  if (shapeClass === "rocket-charm") {
    return {
      "vehicle-body": 0.32,
      "vehicle-front": 0.18,
      "rocket-fin": 0.22,
      "rocket-nozzle": 0.14,
      "hang-slot": 0.14,
    };
  }

  if (shapeClass === "device-generic-charm") {
    return {
      "device-body": 0.48,
      "screen-face": 0.28,
      "device-feature": 0.12,
      "hang-slot": 0.12,
    };
  }

  if (shapeClass === "flower") {
    return {
      "flower-core": 0.18,
      petal: 0.72,
      stem: 0.1,
    };
  }

  if (shapeClass === "clover-charm") {
    return {
      "clover-core": 0.1,
      leaf: 0.62,
      stem: 0.12,
      "hang-ring": 0.16,
    };
  }

  if (shapeClass === "open-botanical-ornament") {
    return {
      "botanical-core": 0.12,
      leaf: 0.4,
      petal: 0.22,
      stem: 0.12,
      "hang-ring": 0.14,
    };
  }

  if (shapeClass === "open-symbol-ornament") {
    return {
      "symbol-core": 0.18,
      "symbol-arm": 0.66,
      "hang-ring": 0.16,
    };
  }

  if (shapeClass === "fish-charm") {
    return {
      "fish-body": 0.35,
      tail: 0.2,
      fin: 0.2,
      "hang-ring": 0.1,
      nose: 0.15,
    };
  }

  if (shapeClass === "berry-charm") {
    return {
      berry: 0.55,
      leaf: 0.25,
      "hang-ring": 0.1,
      dessert: 0.1,
    };
  }

  if (shapeClass === "cloud-charm" || shapeClass === "cloud") {
    return {
      cloud: 0.55,
      "cloud-base": 0.2,
      "hang-ring": 0.1,
      token: 0.15,
    };
  }

  if (shapeClass === "star") {
    return {
      core: 0.24,
      ray: 0.76,
    };
  }

  if (shapeClass === "scarf") {
    return {
      "scarf-wrap": 0.38,
      knot: 0.18,
      tail: 0.34,
      "tail-fold": 0.1,
    };
  }

  if (shapeClass === "tie") {
    return {
      knot: 0.25,
      wing: 0.2,
      blade: 0.55,
    };
  }

  if (shapeClass === "bow") {
    return {
      knot: 0.2,
      wing: 0.5,
      tail: 0.3,
    };
  }

  if (shapeClass === "bell") {
    return {
      "hang-ring": 0.2,
      cap: 0.15,
      "bell-body": 0.5,
      clapper: 0.15,
    };
  }

  return {
    token: 0.45,
    accent: 0.2,
    "hang-ring": 0.15,
    part: 0.2,
  };
}

function scoreRoleCoverage(partBlueprints, execution, geometryRecipe) {
  const weights = getExecutionRoleWeights(execution, geometryRecipe);
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const seenRoles = new Set(
    partBlueprints
      .map((part) => (typeof part.role === "string" ? part.role : "part"))
      .filter(Boolean),
  );
  const weightedCoverage = Object.entries(weights).reduce((sum, [role, weight]) => {
    return sum + (seenRoles.has(role) ? weight : 0);
  }, 0);
  const partCoverage =
    Array.isArray(geometryRecipe?.parts) && geometryRecipe.parts.length > 0
      ? partBlueprints.length / geometryRecipe.parts.length
      : 1;

  return roundMetric(
    weightedCoverage / Math.max(totalWeight, 1) * 0.82 + clamp01(partCoverage) * 0.18,
  );
}

function computePartBounds(partBlueprints) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return null;
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const part of partBlueprints) {
    const size =
      typeof part.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
    const location = Array.isArray(part.location) ? part.location : [0, 0, 0];
    const scale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];

    for (let axis = 0; axis < 3; axis += 1) {
      const radius = size * Math.abs(scale[axis] ?? 1);
      min[axis] = Math.min(min[axis], (location[axis] ?? 0) - radius);
      max[axis] = Math.max(max[axis], (location[axis] ?? 0) + radius);
    }
  }

  return {
    min,
    max,
    span: [
      Number((max[0] - min[0]).toFixed(4)),
      Number((max[1] - min[1]).toFixed(4)),
      Number((max[2] - min[2]).toFixed(4)),
    ],
  };
}

function computeBoundsCenter(bounds) {
  if (!bounds) {
    return null;
  }

  return [
    Number((((bounds.min[0] ?? 0) + (bounds.max[0] ?? 0)) / 2).toFixed(4)),
    Number((((bounds.min[1] ?? 0) + (bounds.max[1] ?? 0)) / 2).toFixed(4)),
    Number((((bounds.min[2] ?? 0) + (bounds.max[2] ?? 0)) / 2).toFixed(4)),
  ];
}

function estimatePartVisualVolume(part) {
  const size =
    typeof part?.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
  const scale = Array.isArray(part?.scale) ? part.scale : [1, 1, 1];

  return (
    Math.abs(size * (scale[0] ?? 1)) *
    Math.abs(size * (scale[1] ?? 1)) *
    Math.abs(size * (scale[2] ?? 1))
  );
}

function getSilhouetteRoleShares(partBlueprints, geometryRecipe) {
  const profileMap = getGeometryPartProfileMap(geometryRecipe);
  const volumes = {
    primary: 0,
    secondary: 0,
    support: 0,
    attachment: 0,
  };

  for (const part of Array.isArray(partBlueprints) ? partBlueprints : []) {
    const silhouetteRole =
      profileMap.get(part.partId)?.silhouetteRole ??
      (part.partId === geometryRecipe?.attachmentPartId ? "attachment" : "support");
    volumes[silhouetteRole] += estimatePartVisualVolume(part);
  }

  const total = Object.values(volumes).reduce((sum, value) => sum + value, 0);

  if (!(total > 0)) {
    return volumes;
  }

  return {
    primary: volumes.primary / total,
    secondary: volumes.secondary / total,
    support: volumes.support / total,
    attachment: volumes.attachment / total,
  };
}

function getStructuralBlueprintForExecution(execution, geometryRecipe = null) {
  if (isRecord(geometryRecipe?.structuralBlueprint)) {
    return geometryRecipe.structuralBlueprint;
  }

  if (isRecord(execution?.structuralBlueprint)) {
    return execution.structuralBlueprint;
  }

  return null;
}

function getExecutionRuntimeDesignContract(execution, geometryRecipe = null) {
  if (isRecord(geometryRecipe?.runtimeDesignContract)) {
    return geometryRecipe.runtimeDesignContract;
  }

  if (isRecord(execution?.runtimeDesignContract)) {
    return execution.runtimeDesignContract;
  }

  const structuralBlueprint = getStructuralBlueprintForExecution(execution, geometryRecipe);
  return isRecord(structuralBlueprint?.runtimeDesignContract)
    ? structuralBlueprint.runtimeDesignContract
    : null;
}

function getStructuralBlueprintHostFitEnvelope(execution, geometryRecipe = null) {
  const structuralBlueprint = getStructuralBlueprintForExecution(execution, geometryRecipe);
  return isRecord(structuralBlueprint?.hostFitEnvelope)
    ? structuralBlueprint.hostFitEnvelope
    : null;
}

function getExecutionHostFitEnvelope(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  if (isRecord(runtimeDesignContract?.hostFitEnvelope)) {
    return runtimeDesignContract.hostFitEnvelope;
  }

  return getStructuralBlueprintHostFitEnvelope(execution, geometryRecipe);
}

function getStructuralBlueprintFaceKeepoutZones(execution, geometryRecipe = null) {
  const structuralBlueprint = getStructuralBlueprintForExecution(execution, geometryRecipe);
  return Array.isArray(structuralBlueprint?.faceKeepoutZones)
    ? structuralBlueprint.faceKeepoutZones.filter(
        (entry) => isRecord(entry) && typeof entry.zoneId === "string",
      )
    : [];
}

function getExecutionFaceKeepoutZones(execution, geometryRecipe = null) {
  const structuralZones = getStructuralBlueprintFaceKeepoutZones(
    execution,
    geometryRecipe,
  );
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );
  const contractZones = Array.isArray(runtimeDesignContract?.faceKeepoutZones)
    ? runtimeDesignContract.faceKeepoutZones.filter(
        (entry) => isRecord(entry) && typeof entry.zoneId === "string",
      )
    : [];
  const seen = new Set();
  const merged = [];

  for (const zone of [...structuralZones, ...contractZones]) {
    if (seen.has(zone.zoneId)) {
      continue;
    }

    seen.add(zone.zoneId);
    merged.push(zone);
  }

  return merged;
}

function getExecutionDesiredPlacementOffset(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  return Array.isArray(runtimeDesignContract?.desiredPlacementOffset) &&
    runtimeDesignContract.desiredPlacementOffset.length === 3
    ? runtimeDesignContract.desiredPlacementOffset
    : null;
}

function getExecutionAnchorReferenceOffset(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  return Array.isArray(runtimeDesignContract?.anchorReferenceOffset) &&
    runtimeDesignContract.anchorReferenceOffset.length === 3
    ? runtimeDesignContract.anchorReferenceOffset
    : null;
}

function isHardSurfaceOpenNounExecution(execution, geometryRecipe = null) {
  return isHardSurfaceOpenNounExecutionFromLib(execution, geometryRecipe);
}

function getExecutionBlueprintVariants(execution, geometryRecipe = null) {
  const variants =
    Array.isArray(geometryRecipe?.variantCandidates) && geometryRecipe.variantCandidates.length > 0
      ? geometryRecipe.variantCandidates
      : Array.isArray(execution?.variantCandidates) && execution.variantCandidates.length > 0
        ? execution.variantCandidates
        : [];
  const runtimeShapeClass =
    typeof geometryRecipe?.runtimeShapeClass === "string"
      ? geometryRecipe.runtimeShapeClass
      : typeof execution?.runtimeShapeClass === "string"
        ? execution.runtimeShapeClass
        : "";

  if (
    variants.length === 0 ||
    !isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe) ||
    (
      runtimeShapeClass !== "camera-charm" &&
      runtimeShapeClass !== "device-generic-charm"
    )
  ) {
    return variants;
  }

  const filteredVariants = variants.filter((variant) => {
    if (!isRecord(variant) || typeof variant.variantId !== "string") {
      return true;
    }

    const variantText = [
      variant.variantId,
      typeof variant.label === "string" ? variant.label : "",
      typeof variant.silhouetteIntent === "string" ? variant.silhouetteIntent : "",
    ]
      .join(" ")
      .trim();

    return !(/compact/i.test(variantText) || /耳侧/.test(variantText));
  });

  const chestFrontDeviceVariants =
    filteredVariants.length > 0 ? filteredVariants : variants;
  const targetReadOrder = buildFallbackReadOrderTargets(execution, geometryRecipe)
    .filter((value) => typeof value === "string" && value.trim())
    .slice(0, 2);

  if (targetReadOrder.length < 2) {
    return chestFrontDeviceVariants;
  }

  const alignedVariants = chestFrontDeviceVariants.filter((variant) => {
    if (!isRecord(variant) || !Array.isArray(variant.readOrderHints)) {
      return true;
    }

    const hintPrefix = variant.readOrderHints
      .filter((value) => typeof value === "string" && value.trim())
      .slice(0, 2);

    if (hintPrefix.length < 2) {
      return true;
    }

    return (
      hintPrefix[0] === targetReadOrder[0] &&
      hintPrefix[1] === targetReadOrder[1]
    );
  });

  return alignedVariants.length > 0 ? alignedVariants : chestFrontDeviceVariants;
}

function getExecutionVariantId(execution, geometryRecipe = null) {
  if (typeof geometryRecipe?.variantId === "string" && geometryRecipe.variantId.trim()) {
    return geometryRecipe.variantId;
  }

  if (typeof execution?.variantId === "string" && execution.variantId.trim()) {
    return execution.variantId;
  }

  return null;
}

function getActiveBlueprintVariant(execution, geometryRecipe = null) {
  const variantId = getExecutionVariantId(execution, geometryRecipe);
  const variants = getExecutionBlueprintVariants(execution, geometryRecipe);

  if (!variantId || variants.length === 0) {
    return null;
  }

  return (
    variants.find(
      (variant) => isRecord(variant) && typeof variant.variantId === "string" && variant.variantId === variantId,
    ) ?? null
  );
}

function isCompactCameraCharmVariant(execution, geometryRecipe = null) {
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const variantId = getExecutionVariantId(execution, geometryRecipe);
  const outlineProfile = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "outlineProfile",
  );

  return (
    runtimeShapeClass === "camera-charm" &&
    /compact/i.test(`${variantId ?? ""} ${outlineProfile ?? ""}`)
  );
}

function getEffectiveStructuralBlueprintValue(execution, geometryRecipe, key) {
  const variant = getActiveBlueprintVariant(execution, geometryRecipe);

  if (isRecord(variant) && variant[key] !== undefined) {
    return variant[key];
  }

  const structuralBlueprint = getStructuralBlueprintForExecution(execution, geometryRecipe);
  if (isRecord(structuralBlueprint) && structuralBlueprint[key] !== undefined) {
    return structuralBlueprint[key];
  }

  return undefined;
}

function getStructuralBlueprintPartSpanTargets(execution, geometryRecipe = null) {
  return getPartSpanTargetsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "partSpanTargets"),
  );
}

function getStructuralBlueprintPartDepthTargets(execution, geometryRecipe = null) {
  return getPartDepthTargetsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "partDepthTargets"),
  );
}

function getStructuralBlueprintAttachmentAnchors(execution, geometryRecipe = null) {
  return getAttachmentAnchorsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "attachmentAnchors"),
  );
}

function getStructuralBlueprintSilhouetteKeepouts(execution, geometryRecipe = null) {
  return getSilhouetteKeepoutsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "silhouetteKeepouts"),
  );
}

function getStructuralBlueprintDominantSpanOwner(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "dominantSpanOwner");
  return typeof value === "string" ? value : undefined;
}

function getStructuralBlueprintDominantContour(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "dominantContour");
  return typeof value === "string" ? value : undefined;
}

function getTargetAttachmentPose(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  if (
    typeof runtimeDesignContract?.targetAttachmentPose === "string" &&
    runtimeDesignContract.targetAttachmentPose.trim()
  ) {
    return runtimeDesignContract.targetAttachmentPose.trim();
  }

  const attachmentPose = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "attachmentPose",
  );

  if (typeof attachmentPose === "string" && attachmentPose.trim()) {
    return attachmentPose.trim();
  }

  const mountStrategy = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "mountStrategy",
  );

  if (typeof mountStrategy === "string" && mountStrategy.trim()) {
    return mountStrategy.trim();
  }

  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  if (runtimeShapeClass === "camera-charm") {
    return "ear-side-front-facing";
  }
  if (runtimeShapeClass === "boat-charm") {
    return "ear-side-upright-hull";
  }

  return undefined;
}

function getStructuralBlueprintSideDepthProfile(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "sideDepthProfile");
  return typeof value === "string" ? value : undefined;
}

function shouldSwitchBlueprintVariant(execution, qualityReport, geometryRecipe, passIndex) {
  return shouldSwitchBlueprintVariantFromLib(
    execution,
    qualityReport,
    geometryRecipe,
    passIndex,
  );
}

function getHardSurfaceProgressivePartIds(
  execution,
  geometryRecipe,
  passIndex,
  targetPassCount,
  repairActions = [],
) {
  return getHardSurfaceProgressivePartIdsFromLib(
    execution,
    geometryRecipe,
    passIndex,
    targetPassCount,
    repairActions,
  );
}

function syncPartGraphLocalOffsetsWithGeometryRecipe(partGraph, geometryRecipe) {
  return syncPartGraphLocalOffsetsWithGeometryRecipeFromLib(
    partGraph,
    geometryRecipe,
  );
}

function getNextBlueprintVariantId(execution, geometryRecipe, currentVariantId) {
  const variants = getExecutionBlueprintVariants(execution, geometryRecipe);
  if (variants.length < 2) {
    return null;
  }

  const currentIndex = variants.findIndex((variant) => variant.variantId === currentVariantId);
  if (currentIndex < 0) {
    return variants[0]?.variantId ?? null;
  }

  return variants[(currentIndex + 1) % variants.length]?.variantId ?? null;
}

function getPreferredRecoveryVariantId(
  execution,
  geometryRecipe,
  currentVariantId,
  qualityReport,
) {
  const preferredVariantId = getPreferredRecoveryVariantIdFromLib(
    execution,
    geometryRecipe,
    currentVariantId,
    qualityReport,
  );

  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const critiqueReport = qualityReport?.visualCritiqueReport;
  const critiqueFailureActive =
    critiqueReport?.canonicalFirstRead === "generic-token" ||
    (
      typeof critiqueReport?.faceIntrusionSeverity === "number" &&
      critiqueReport.faceIntrusionSeverity > 0.28
    ) ||
    (
      Array.isArray(critiqueReport?.canonicalDetachedPartIds) &&
      critiqueReport.canonicalDetachedPartIds.length > 0
    );

  if (!critiqueFailureActive) {
    return preferredVariantId;
  }

  if (runtimeShapeClass === "flower") {
    return "flower-layered-petal";
  }

  if (runtimeShapeClass === "clover-charm") {
    return "clover-compact-charm";
  }

  return preferredVariantId;
}

function buildCapabilityEscalationBootstrapRepairActions(
  execution,
  geometryRecipe,
  qualityReport,
  currentVariantId,
) {
  return buildCapabilityEscalationBootstrapRepairActionsFromLib(
    execution,
    geometryRecipe,
    qualityReport,
    currentVariantId,
  );
}

function getPartSpanMeasure(part) {
  return getPartSpanMeasureFromLib(part);
}

function scoreAttachmentEdgeLayout(edge, parent, child) {
  if (!isRecord(edge) || !isRecord(parent) || !isRecord(child)) {
    return null;
  }

  const actual = subtractVector(child.location, parent.location);
  const [parentHalfX, parentHalfY, parentHalfZ] = getApproxPartHalfExtents(parent);
  const [childHalfX, childHalfY, childHalfZ] = getApproxPartHalfExtents(child);
  const embedDepth =
    typeof edge.embedDepth === "number" && Number.isFinite(edge.embedDepth)
      ? edge.embedDepth
      : 0;
  const allowed =
    typeof edge.allowedDrift === "number" && edge.allowedDrift > 0
      ? edge.allowedDrift
      : typeof edge.maxDrift === "number" && edge.maxDrift > 0
        ? edge.maxDrift
        : 0.01;
  const x = actual[0] ?? 0;
  const y = actual[1] ?? 0;
  const z = actual[2] ?? 0;
  let axialScore = 0.72;
  let lateralScore = 0.72;
  let handledMountFace = false;

  if (edge.mountFace === "front" || edge.mountFace === "rear") {
    handledMountFace = true;
    const expected = Math.max(parentHalfY + childHalfY - embedDepth, 0.006);
    const tolerance = Math.max(expected * 0.2, allowed * 6, 0.004);
    axialScore = clamp01(1 - Math.abs(Math.abs(y) - expected) / tolerance);
    const sign = edge.mountFace === "front" ? -1 : 1;
    if (Math.sign(y || sign) !== sign) {
      axialScore *= 0.4;
    }
    const xLimit = Math.max(parentHalfX * 0.46 + childHalfX * 0.82, 0.008);
    const zLimit = Math.max(parentHalfZ * 0.54 + childHalfZ * 0.84, 0.008);
    lateralScore =
      clamp01(1 - Math.max(0, Math.abs(x) - xLimit) / Math.max(xLimit * 0.42, 0.004)) * 0.56 +
      clamp01(1 - Math.max(0, Math.abs(z) - zLimit) / Math.max(zLimit * 0.42, 0.004)) * 0.44;
  } else if (
    edge.mountFace === "top" ||
    edge.mountFace === "bottom" ||
    edge.mountFace === "top-right" ||
    edge.mountFace === "top-left"
  ) {
    handledMountFace = true;
    const expected = Math.max(parentHalfZ + childHalfZ - embedDepth, 0.008);
    const tolerance = Math.max(expected * 0.2, allowed * 6, 0.004);
    axialScore = clamp01(1 - Math.abs(Math.abs(z) - expected) / tolerance);
    const sign = edge.mountFace === "bottom" ? -1 : 1;
    if (Math.sign(z || sign) !== sign) {
      axialScore *= 0.4;
    }
    const yLimit = Math.max(parentHalfY * 0.78 + childHalfY * 0.82, 0.008);
    if (edge.mountFace === "top-right" || edge.mountFace === "top-left") {
      const expectedSign = edge.mountFace === "top-right" ? 1 : -1;
      const shoulderMin = Math.max(parentHalfX * 0.12, childHalfX * 0.44, 0.004);
      const shoulderMax = Math.max(parentHalfX * 0.58 + childHalfX, shoulderMin + 0.004);
      const signedX = x * expectedSign;
      const shoulderScore =
        clamp01(1 - Math.max(0, shoulderMin - signedX) / Math.max(shoulderMin, 0.004)) *
          0.58 +
        clamp01(1 - Math.max(0, signedX - shoulderMax) / Math.max(shoulderMax * 0.38, 0.004)) *
          0.42;
      const depthScore = clamp01(
        1 - Math.max(0, Math.abs(y) - yLimit) / Math.max(yLimit * 0.36, 0.004),
      );
      lateralScore = shoulderScore * 0.68 + depthScore * 0.32;
    } else {
      const xLimit = Math.max(parentHalfX * 0.5 + childHalfX * 0.88, 0.008);
      lateralScore =
        clamp01(1 - Math.max(0, Math.abs(x) - xLimit) / Math.max(xLimit * 0.4, 0.004)) * 0.6 +
        clamp01(1 - Math.max(0, Math.abs(y) - yLimit) / Math.max(yLimit * 0.4, 0.004)) * 0.4;
    }
  } else if (edge.mountFace === "side") {
    handledMountFace = true;
    const expected = Math.max(parentHalfX + childHalfX - embedDepth, 0.008);
    const tolerance = Math.max(expected * 0.2, allowed * 6, 0.004);
    axialScore = clamp01(1 - Math.abs(Math.abs(x) - expected) / tolerance);
    const yLimit = Math.max(parentHalfY * 0.8 + childHalfY * 0.82, 0.008);
    const zLimit = Math.max(parentHalfZ * 0.54 + childHalfZ * 0.88, 0.008);
    lateralScore =
      clamp01(1 - Math.max(0, Math.abs(y) - yLimit) / Math.max(yLimit * 0.38, 0.004)) * 0.44 +
      clamp01(1 - Math.max(0, Math.abs(z) - zLimit) / Math.max(zLimit * 0.38, 0.004)) * 0.56;
  } else if (edge.mountFace === "centerline") {
    handledMountFace = true;
    const xLimit = Math.max(parentHalfX * 0.24 + childHalfX * 0.42, 0.004);
    const zFloor = Math.max(parentHalfZ * 0.32, childHalfZ * 0.72, 0.006);
    const yLimit = Math.max(parentHalfY * 0.48 + childHalfY * 0.64, 0.008);
    axialScore = clamp01(1 - Math.max(0, zFloor - z) / Math.max(zFloor * 0.32, 0.004));
    lateralScore =
      clamp01(1 - Math.max(0, Math.abs(x) - xLimit) / Math.max(xLimit * 0.4, 0.004)) * 0.64 +
      clamp01(1 - Math.max(0, Math.abs(y) - yLimit) / Math.max(yLimit * 0.42, 0.004)) * 0.36;
  }

  if (!handledMountFace && Array.isArray(edge.localOffset)) {
    // Some capability paths, including chest-wrap rooted assemblies, use mount faces that the
    // legacy scorer never learned. Fall back to authored edge drift instead of pinning them to
    // the default 0.72 credibility floor.
    const authoredOffset = edge.localOffset;
    const drift = getVectorMagnitude(subtractVector(actual, authoredOffset));
    const expectedMagnitude = getVectorMagnitude(authoredOffset);
    const tolerance = Math.max(expectedMagnitude * 0.34, allowed * 7.5, 0.008);
    const driftScore = clamp01(1 - drift / tolerance);
    axialScore = driftScore;
    lateralScore = driftScore;
  }

  const raw = roundMetric(axialScore * 0.68 + lateralScore * 0.32);
  const weight =
    edge.edgeConstraint === "free-hang" || edge.spanOwnership === "attachment"
      ? 0.32
      : edge.spanOwnership === "support"
        ? 0.72
        : 1;

  return {
    childPartId: edge.childPartId,
    raw,
    weight,
    weighted: raw * weight,
  };
}

function getAttachmentEdgeScores(partBlueprints, partGraph) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return [];
  }

  if (!isRecord(partGraph) || !Array.isArray(partGraph.edges) || partGraph.edges.length === 0) {
    return [];
  }

  const partMap = new Map(
    partBlueprints
      .filter((part) => typeof part?.partId === "string" && Array.isArray(part.location))
      .map((part) => [part.partId, part]),
  );

  return partGraph.edges
    .filter(
      (edge) =>
        isRecord(edge) &&
        typeof edge.parentPartId === "string" &&
        typeof edge.childPartId === "string" &&
        partMap.has(edge.parentPartId) &&
        partMap.has(edge.childPartId),
    )
    .map((edge) =>
      scoreAttachmentEdgeLayout(
        edge,
        partMap.get(edge.parentPartId),
        partMap.get(edge.childPartId),
      ),
    )
    .filter((value) => Boolean(value));
}

function getDetachedPartIdsFromAttachmentScores(partBlueprints, partGraph) {
  return getAttachmentEdgeScores(partBlueprints, partGraph)
    .filter((entry) => entry.weight >= 0.6 && entry.raw < 0.56)
    .map((entry) => entry.childPartId)
    .filter((value) => typeof value === "string");
}

function getPartSpanShareMap(partBlueprints) {
  const shares = new Map();
  const total = (Array.isArray(partBlueprints) ? partBlueprints : []).reduce(
    (sum, part) => sum + getPartSpanMeasure(part),
    0,
  );

  if (!(total > 0)) {
    return shares;
  }

  for (const part of partBlueprints) {
    if (typeof part?.partId !== "string") {
      continue;
    }

    shares.set(part.partId, getPartSpanMeasure(part) / total);
  }

  return shares;
}

function getDominantSpanOwner(partBlueprints) {
  const shares = getPartSpanShareMap(partBlueprints);
  let owner = undefined;
  let maxShare = -1;

  for (const [partId, share] of shares.entries()) {
    if (share > maxShare) {
      owner = partId;
      maxShare = share;
    }
  }

  return owner;
}

function scorePartAttachmentCredibility(partBlueprints, partGraph) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return 0;
  }

  if (!isRecord(partGraph) || !Array.isArray(partGraph.edges) || partGraph.edges.length === 0) {
    return 0.76;
  }

  const scores = getAttachmentEdgeScores(partBlueprints, partGraph);

  if (scores.length === 0) {
    return 0.76;
  }

  const totalWeight = scores.reduce((sum, value) => sum + value.weight, 0);

  if (!(totalWeight > 0)) {
    return 0.76;
  }

  return roundMetric(scores.reduce((sum, value) => sum + value.weighted, 0) / totalWeight);
}

function convertGltfHalfExtentsToBlender(halfExtents) {
  return [
    Math.abs(halfExtents[0] ?? 0),
    Math.abs(halfExtents[2] ?? 0),
    Math.abs(halfExtents[1] ?? 0),
  ];
}

function buildBoundsFromCenterAndHalfExtents(center, halfExtents) {
  return {
    min: center.map((value, index) =>
      Number((value - Math.abs(halfExtents[index] ?? 0)).toFixed(4))),
    max: center.map((value, index) =>
      Number((value + Math.abs(halfExtents[index] ?? 0)).toFixed(4))),
    span: halfExtents.map((value) => Number((Math.abs(value ?? 0) * 2).toFixed(4))),
  };
}

function buildHostOcclusionZone(label, center, halfExtents, weight) {
  return {
    label,
    weight,
    bounds: buildBoundsFromCenterAndHalfExtents(
      convertGltfPositionToBlenderLocation(center),
      convertGltfHalfExtentsToBlender(halfExtents),
    ),
  };
}

function getHostCompositionProfile(anchor) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(anchor);
  const sharedHeadZones = [
    buildHostOcclusionZone("face-core", [0, 0.073, 0.023], [0.03, 0.018, 0.019], 0.52),
    buildHostOcclusionZone("eye-band", [0, 0.078, 0.018], [0.045, 0.013, 0.015], 0.32),
    buildHostOcclusionZone("nose-zone", [0, 0.066, 0.03], [0.02, 0.012, 0.01], 0.16),
  ];

  if (normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear") {
    return {
      region: "head-side",
      critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.082, 0.02]),
      critiqueDistance: 0.18,
      critiqueOrthoScale: 0.19,
      preferredSpan: [0.028, 0.02, 0.03],
      maxSpan: [0.036, 0.026, 0.038],
      occlusionZones: sharedHeadZones,
    };
  }

  if (normalizedAnchor === "forehead" || normalizedAnchor === "head-top") {
    return {
      region: normalizedAnchor,
      critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.086, 0.018]),
      critiqueDistance: 0.18,
      critiqueOrthoScale: 0.19,
      preferredSpan: [0.03, 0.023, 0.031],
      maxSpan: [0.039, 0.03, 0.042],
      occlusionZones: sharedHeadZones,
    };
  }

  if (normalizedAnchor === "back-head") {
    return {
      region: "back-head",
      critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.094, -0.004]),
      critiqueDistance: 0.18,
      critiqueOrthoScale: 0.19,
      preferredSpan: [0.031, 0.024, 0.034],
      maxSpan: [0.041, 0.032, 0.046],
      occlusionZones: [
        buildHostOcclusionZone("back-head-overflow", [0, 0.085, 0.006], [0.046, 0.014, 0.02], 0.28),
      ],
    };
  }

  if (isChestRuntimeAnchor(normalizedAnchor)) {
    return {
      region: "chest",
      critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.04, 0.031]),
      critiqueDistance: 0.15,
      critiqueOrthoScale: 0.16,
      preferredSpan: [0.038, 0.028, 0.04],
      maxSpan: [0.05, 0.034, 0.052],
      occlusionZones: [
        buildHostOcclusionZone("neck-front", [0, 0.052, 0.028], [0.03, 0.012, 0.014], 0.4),
      ],
    };
  }

  if (isTailRuntimeAnchor(normalizedAnchor)) {
    return {
      region: "tail",
      critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.052, -0.074]),
      critiqueDistance: 0.17,
      critiqueOrthoScale: 0.17,
      preferredSpan: [0.036, 0.026, 0.044],
      maxSpan: [0.05, 0.034, 0.058],
      occlusionZones: [],
    };
  }

  return {
    region: "body",
    critiqueCenter: convertGltfPositionToBlenderLocation([0, 0.06, 0.02]),
    critiqueDistance: 0.18,
    critiqueOrthoScale: 0.19,
    preferredSpan: [0.036, 0.026, 0.04],
    maxSpan: [0.048, 0.034, 0.052],
    occlusionZones: sharedHeadZones,
  };
}

function getHostCompositionProfileForExecution(execution, geometryRecipe = null) {
  const baseProfile = getHostCompositionProfile(execution.anchor);
  const hostFitEnvelope = getExecutionHostFitEnvelope(execution, geometryRecipe);

  const profile = !hostFitEnvelope
    ? baseProfile
    : {
    ...baseProfile,
    preferredSpan: Array.isArray(hostFitEnvelope.anchorEnvelope)
      ? hostFitEnvelope.anchorEnvelope.map((value, index) =>
          Number(
            Math.min(value ?? baseProfile.preferredSpan[index], baseProfile.preferredSpan[index]).toFixed(4),
          ))
      : baseProfile.preferredSpan,
    maxSpan: Array.isArray(hostFitEnvelope.maxSpan)
      ? hostFitEnvelope.maxSpan.map((value, index) =>
          Number(
            Math.min(value ?? baseProfile.maxSpan[index], baseProfile.maxSpan[index]).toFixed(4),
          ))
      : baseProfile.maxSpan,
    preferredYaw:
      typeof hostFitEnvelope.preferredYaw === "number"
        ? hostFitEnvelope.preferredYaw
        : undefined,
    screenFacingBias:
      typeof hostFitEnvelope.screenFacingBias === "number"
        ? hostFitEnvelope.screenFacingBias
        : undefined,
    faceIntrusionBudget:
      typeof hostFitEnvelope.faceIntrusionBudget === "number"
        ? hostFitEnvelope.faceIntrusionBudget
        : undefined,
    eyeKeepout: hostFitEnvelope.eyeKeepout === true,
    earClearance:
      typeof hostFitEnvelope.earClearance === "number"
        ? hostFitEnvelope.earClearance
        : undefined,
  };

  if (
    isCompactCameraCharmVariant(execution, geometryRecipe) &&
    ["left-ear", "right-ear"].includes(normalizeRuntimeAccessoryAnchor(execution.anchor))
  ) {
    return {
      ...profile,
      preferredSpan: [0.03, 0.018, 0.03],
      maxSpan: [0.035, 0.022, 0.034],
      faceIntrusionBudget: Math.max(profile.faceIntrusionBudget ?? 0.08, 0.12),
      earClearance: Math.max(profile.earClearance ?? 0.014, 0.015),
      preferredYaw:
        typeof profile.preferredYaw === "number"
          ? Math.max(profile.preferredYaw, 20)
          : 20,
      screenFacingBias:
        typeof profile.screenFacingBias === "number"
          ? Math.min(0.94, profile.screenFacingBias + 0.02)
          : 0.94,
    };
  }

  return profile;
}

function scoreTargetSpanFit(
  actual,
  target,
  { undersizeTolerance = 0.6, oversizeTolerance = 0.22 } = {},
) {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  const tolerance = target * (actual >= target ? oversizeTolerance : undersizeTolerance);
  return roundMetric(1 - Math.abs(actual - target) / Math.max(tolerance, 0.0001));
}

function scoreSpanLimitFit(actual, maximum) {
  if (!Number.isFinite(actual) || !Number.isFinite(maximum) || maximum <= 0) {
    return 0;
  }

  if (actual <= maximum) {
    return 1;
  }

  return roundMetric(1 - (actual - maximum) / Math.max(maximum * 0.3, 0.0001));
}

function calculateBoundsOverlapRatio(bounds, zoneBounds) {
  if (!bounds || !zoneBounds) {
    return 0;
  }

  const overlapSpan = [0, 1, 2].map((axis) =>
    Math.max(
      0,
      Math.min(bounds.max[axis] ?? 0, zoneBounds.max[axis] ?? 0) -
        Math.max(bounds.min[axis] ?? 0, zoneBounds.min[axis] ?? 0),
    ));
  const overlapVolume = overlapSpan.reduce((product, value) => product * value, 1);
  const boundsVolume = bounds.span.reduce((product, value) => product * Math.max(value, 0.0001), 1);

  if (overlapVolume <= 0 || boundsVolume <= 0) {
    return 0;
  }

  return clamp01(overlapVolume / boundsVolume);
}

function getFaceIntrusionSeverity(execution, geometryRecipe, partBlueprints) {
  const bounds = computePartBounds(partBlueprints);

  if (!bounds) {
    return 0;
  }

  const hostProfile = getHostCompositionProfileForExecution(execution, geometryRecipe);
  const faceKeepoutZones = getExecutionFaceKeepoutZones(execution, geometryRecipe);
  const keepoutZoneIds = new Set(
    faceKeepoutZones.map((zone) => zone.zoneId).filter((value) => typeof value === "string"),
  );
  const overlapSeverity = hostProfile.occlusionZones.reduce((sum, zone) => {
    const overlapRatio = calculateBoundsOverlapRatio(bounds, zone.bounds);
    const severityWeight =
      keepoutZoneIds.size === 0 || keepoutZoneIds.has(zone.label)
        ? zone.weight
        : zone.label === "eye-band" || zone.label === "nose-zone"
          ? zone.weight * 1.08
          : zone.weight * 0.9;
    return sum + overlapRatio * severityWeight;
  }, 0);
  const envelope = getExecutionHostFitEnvelope(execution, geometryRecipe);
  const budget =
    typeof envelope?.faceIntrusionBudget === "number" ? envelope.faceIntrusionBudget : 0.22;
  const spanOverflow = bounds.span.reduce((sum, value, index) => {
    const maxSpan = hostProfile.maxSpan[index] ?? value;
    return sum + Math.max(0, value - maxSpan) / Math.max(maxSpan, 0.0001);
  }, 0);
  const boundsCenter = computeBoundsCenter(bounds);
  let lateralRelief = 1;

  if (
    boundsCenter &&
    ["left-ear", "right-ear"].includes(normalizeRuntimeAccessoryAnchor(execution.anchor))
  ) {
    const lateralClearance = Math.max(0, Math.abs(boundsCenter[0]) - 0.028);
    const verticalClearance = Math.max(0, (boundsCenter[1] ?? 0) - 0.094);
    const reliefScore = clamp01(lateralClearance / 0.012 + verticalClearance / 0.02);
    lateralRelief = Number(lerpNumber(1, 0.45, reliefScore).toFixed(4));
  }

  return roundMetric(
    clamp01(overlapSeverity * lateralRelief / Math.max(budget, 0.08) + spanOverflow * 0.18),
  );
}

function scoreHostComposition(anchorAccuracy, scaleFit, occlusionRisk, faceIntrusionSeverity = 0) {
  return roundMetric(
    anchorAccuracy * 0.22 +
      scaleFit * 0.32 +
      occlusionRisk * 0.34 +
      (1 - faceIntrusionSeverity) * 0.12,
  );
}

function scoreSilhouetteStrength(partBlueprints, execution, geometryRecipe) {
  const bounds = computePartBounds(partBlueprints);

  if (!bounds) {
    return 0;
  }

  const [spanX, spanY, spanZ] = bounds.span;
  const [targetX, targetY, targetZ] = getVisualTargetForExecution(
    execution,
    geometryRecipe,
  );
  const spanScore =
    scoreTargetSpanFit(spanX, targetX, { undersizeTolerance: 0.72, oversizeTolerance: 0.18 }) *
      0.42 +
    scoreTargetSpanFit(spanY, targetY, { undersizeTolerance: 0.72, oversizeTolerance: 0.16 }) *
      0.16 +
    scoreTargetSpanFit(spanZ, targetZ, { undersizeTolerance: 0.72, oversizeTolerance: 0.18 }) *
      0.42;
  const silhouetteShares = getSilhouetteRoleShares(partBlueprints, geometryRecipe);
  const ownershipScore = clamp01(
    0.5 +
      silhouetteShares.primary * 0.8 +
      silhouetteShares.secondary * 0.34 -
      silhouetteShares.attachment * 0.58,
  );

  return roundMetric(spanScore * 0.82 + ownershipScore * 0.18);
}

function getVisualTargetForExecution(execution, geometryRecipe = null) {
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  let familyTargets = {
    scarf: [0.078, 0.02, 0.058],
    "camera-charm": [0.065, 0.032, 0.06],
    "boat-charm": [0.07, 0.03, 0.07],
    "rocket-charm": [0.055, 0.03, 0.085],
    "device-generic-charm": [0.06, 0.028, 0.07],
    "vehicle-generic-charm": [0.064, 0.03, 0.07],
    "fish-charm": [0.08, 0.04, 0.045],
    "berry-charm": [0.06, 0.04, 0.055],
    "cloud-charm": [0.065, 0.035, 0.045],
    cloud: [0.065, 0.035, 0.045],
    flower: [0.072, 0.03, 0.06],
    "clover-charm": [0.068, 0.03, 0.056],
    "open-botanical-ornament": [0.07, 0.03, 0.058],
    "open-symbol-ornament": [0.064, 0.028, 0.054],
    tie: [0.035, 0.03, 0.085],
    bow: [0.06, 0.03, 0.05],
    bell: [0.04, 0.03, 0.05],
  };
  let familyTarget = familyTargets[shapeClass] ?? [0.05, 0.03, 0.04];
  const outlineProfile = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "outlineProfile",
  );

  if (shapeClass === "device-generic-charm") {
    if (typeof outlineProfile === "string" && outlineProfile.includes("tall")) {
      familyTarget = [0.028, 0.019, 0.036];
    } else if (typeof outlineProfile === "string" && outlineProfile.includes("compact")) {
      familyTarget = [0.03, 0.019, 0.034];
    } else {
      familyTarget = [0.031, 0.019, 0.035];
    }
  }
  const hostProfile = getHostCompositionProfileForExecution(execution, geometryRecipe);

  return familyTarget.map((value, index) =>
    Number(Math.min(value, (hostProfile.preferredSpan[index] ?? value) * 1.06).toFixed(4)));
}

function buildProjectedViewScores(partBlueprints, execution, anchorAccuracy) {
  const bounds = computePartBounds(partBlueprints);

  if (!bounds) {
    return [
      { view: "front", readability: 0, silhouette: 0, anchorFit: anchorAccuracy },
      { view: "three-quarter", readability: 0, silhouette: 0, anchorFit: anchorAccuracy },
      { view: "side", readability: 0, silhouette: 0, anchorFit: anchorAccuracy },
    ];
  }

  const [targetX, targetY, targetZ] = getVisualTargetForExecution(execution, null);
  const [spanX, spanY, spanZ] = bounds.span;
  const frontReadability = roundMetric(
    scoreTargetSpanFit(spanX, targetX, { undersizeTolerance: 0.7, oversizeTolerance: 0.2 }) *
      0.58 +
      scoreTargetSpanFit(spanZ, targetZ, { undersizeTolerance: 0.7, oversizeTolerance: 0.2 }) *
        0.42,
  );
  const sideReadability = roundMetric(
    scoreTargetSpanFit(spanY, targetY, { undersizeTolerance: 0.72, oversizeTolerance: 0.18 }) *
      0.28 +
      scoreTargetSpanFit(spanZ, targetZ, { undersizeTolerance: 0.72, oversizeTolerance: 0.18 }) *
        0.72,
  );
  const diagonalSpan = Math.sqrt(spanX ** 2 + spanZ ** 2);
  const diagonalTarget = Math.sqrt(targetX ** 2 + targetZ ** 2);
  const threeQuarterReadability = roundMetric(
    scoreTargetSpanFit(diagonalSpan, diagonalTarget, {
      undersizeTolerance: 0.72,
      oversizeTolerance: 0.18,
    }) *
      0.64 +
      scoreTargetSpanFit(spanY, targetY, {
        undersizeTolerance: 0.72,
        oversizeTolerance: 0.18,
      }) *
        0.16 +
      anchorAccuracy * 0.2,
  );

  return [
    {
      view: "front",
      readability: frontReadability,
      silhouette: roundMetric(frontReadability * 0.84 + anchorAccuracy * 0.16),
      anchorFit: anchorAccuracy,
    },
    {
      view: "three-quarter",
      readability: threeQuarterReadability,
      silhouette: roundMetric(threeQuarterReadability * 0.86 + anchorAccuracy * 0.14),
      anchorFit: anchorAccuracy,
    },
    {
      view: "side",
      readability: sideReadability,
      silhouette: roundMetric(sideReadability * 0.82 + anchorAccuracy * 0.18),
      anchorFit: anchorAccuracy,
    },
  ];
}

function scoreVisualReadability(viewScores) {
  if (!Array.isArray(viewScores) || viewScores.length === 0) {
    return 0;
  }

  return roundMetric(
    viewScores.reduce((sum, score) => sum + (score.readability ?? 0), 0) /
      viewScores.length,
  );
}

function scoreLookalikeRisk(
  execution,
  geometryRecipe,
  partBlueprints,
  criticalPartsPresent,
  archetypeMatch,
  visualReadability,
) {
  const partIds = new Set(
    partBlueprints
      .map((part) => (typeof part.partId === "string" ? part.partId : null))
      .filter((value) => typeof value === "string"),
  );
  const genericPartCount = [
    "token",
    "accent",
    "core",
    "gem",
    "ring",
    "hang-slot",
  ].filter((partId) => partIds.has(partId)).length;
  const negativeLookalikes = Array.isArray(geometryRecipe?.negativeLookalikes)
    ? geometryRecipe.negativeLookalikes.length
    : 0;
  const silhouetteShares = getSilhouetteRoleShares(partBlueprints, geometryRecipe);

  return roundMetric(
    clamp01(
      0.86 -
        criticalPartsPresent * 0.26 -
        archetypeMatch * 0.18 -
        visualReadability * 0.22 -
        Math.min(0.18, partBlueprints.length * 0.025) +
        genericPartCount * 0.05 +
        Math.max(0, 0.2 - silhouetteShares.primary) * 0.24 +
        Math.max(0, silhouetteShares.attachment - 0.18) * 0.42 +
        (negativeLookalikes > 0 ? 0.04 : 0) +
        (isOpenNounExecution(execution) ? 0.06 : 0),
    ),
  );
}

function scoreCohesion(partBlueprints, partGraph) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return 0;
  }

  if (!isRecord(partGraph) || !Array.isArray(partGraph.edges) || partGraph.edges.length === 0) {
    return roundMetric(0.72);
  }

  const partMap = new Map(
    partBlueprints
      .filter((part) => typeof part.partId === "string" && Array.isArray(part.location))
      .map((part) => [part.partId, part]),
  );
  const scoredEdges = partGraph.edges
    .filter(
      (edge) =>
        isRecord(edge) &&
        typeof edge.parentPartId === "string" &&
        typeof edge.childPartId === "string" &&
        partMap.has(edge.parentPartId) &&
        partMap.has(edge.childPartId),
    )
    .map((edge) => {
      const parent = partMap.get(edge.parentPartId);
      const child = partMap.get(edge.childPartId);
      const actual = subtractVector(child.location, parent.location);
      const expected = Array.isArray(child.expectedParentOffset)
        ? child.expectedParentOffset
        : Array.isArray(edge.localOffset)
          ? edge.localOffset
          : [0, 0, 0];
      const drift = getVectorMagnitude(subtractVector(actual, expected));
      const allowed =
        typeof edge.allowedDrift === "number" && edge.allowedDrift > 0
          ? edge.allowedDrift
          : typeof edge.maxDrift === "number" && edge.maxDrift > 0
            ? edge.maxDrift
            : 0.01;
      const raw = clamp01(1 - drift / Math.max(allowed, 0.004));
      const weighted =
        raw *
        (typeof edge.cohesionWeight === "number" && edge.cohesionWeight > 0
          ? edge.cohesionWeight
          : 0.8) *
        (edge.flushMount === true ? 1.04 : 1) *
        (typeof edge.supportDependency === "string" ? 1.03 : 1);

      return {
        raw,
        weighted,
      };
    });

  if (scoredEdges.length === 0) {
    return roundMetric(0.72);
  }

  return roundMetric(
    scoredEdges.reduce((sum, edge) => sum + edge.weighted, 0) / scoredEdges.length,
  );
}

function normalizeAngleDegrees(value) {
  let normalized = value % 360;
  if (normalized > 180) {
    normalized -= 360;
  }
  if (normalized <= -180) {
    normalized += 360;
  }
  return Number(normalized.toFixed(4));
}

function computeCameraRotationDegrees(cameraLocation, targetLocation) {
  const direction = subtractVector(targetLocation, cameraLocation);
  const planarDistance = Math.max(0.0001, Math.hypot(direction[0], direction[1]));
  const pitch = 90 + (Math.atan2(direction[2], planarDistance) * 180) / Math.PI;
  const yaw = -(Math.atan2(direction[0], direction[1]) * 180) / Math.PI;

  return [normalizeAngleDegrees(pitch), 0, normalizeAngleDegrees(yaw)];
}

function buildRenderCritiqueViewDefinitions(execution, runtimeArtifacts) {
  const bounds = computePartBounds(runtimeArtifacts.partBlueprints);
  const accessoryCenter = computeBoundsCenter(bounds) ?? runtimeArtifacts.targetAnchorPosition ?? [0, 0, 0];
  const hostProfile = getHostCompositionProfileForExecution(
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const accessoryCenterBlend = isHardSurfaceOpenNounExecution(
    execution,
    runtimeArtifacts.geometryRecipe,
  )
    ? 0.34
    : 0.46;
  const center = [
    Number(
      lerpNumber(
        accessoryCenter[0] ?? 0,
        hostProfile.critiqueCenter[0] ?? 0,
        accessoryCenterBlend,
      ).toFixed(4),
    ),
    Number(
      lerpNumber(
        accessoryCenter[1] ?? 0,
        hostProfile.critiqueCenter[1] ?? 0,
        accessoryCenterBlend,
      ).toFixed(4),
    ),
    Number(
      lerpNumber(
        accessoryCenter[2] ?? 0,
        hostProfile.critiqueCenter[2] ?? 0,
        accessoryCenterBlend,
      ).toFixed(4),
    ),
  ];
  const spanMax = bounds ? Math.max(...bounds.span) : 0.05;
  const critiqueDistance = Number(
    Math.max(hostProfile.critiqueDistance, Math.min(hostProfile.critiqueDistance * 1.18, spanMax * 3.6)).toFixed(4),
  );
  const orthoScale = Number(
    Math.max(hostProfile.critiqueOrthoScale, Math.min(hostProfile.critiqueOrthoScale * 1.2, spanMax * 4.6)).toFixed(4),
  );
  const hostCenter = hostProfile.critiqueCenter ?? center;
  const hostDistance = Number((critiqueDistance * 1.12).toFixed(4));
  const hostOrthoScale = Number((Math.max(orthoScale * 1.16, hostProfile.critiqueOrthoScale)).toFixed(4));
  const lateralSign = execution.anchor === "right-ear" ? -1 : 1;

  return [
    {
      view: "front",
      location: [
        center[0],
        Number((center[1] - critiqueDistance).toFixed(4)),
        Number((center[2] + critiqueDistance * 0.24).toFixed(4)),
      ],
      target: center,
      orthoScale,
    },
    {
      view: "three-quarter",
      location: [
        Number((center[0] + lateralSign * critiqueDistance * 0.7).toFixed(4)),
        Number((center[1] - critiqueDistance * 0.78).toFixed(4)),
        Number((center[2] + critiqueDistance * 0.28).toFixed(4)),
      ],
      target: center,
      orthoScale,
    },
    {
      view: "side",
      location: [
        Number((center[0] + lateralSign * critiqueDistance * 1.02).toFixed(4)),
        Number((center[1] - critiqueDistance * 0.16).toFixed(4)),
        Number((center[2] + critiqueDistance * 0.16).toFixed(4)),
      ],
      target: center,
      orthoScale,
    },
    {
      view: "host-front",
      location: [
        hostCenter[0],
        Number((hostCenter[1] - hostDistance).toFixed(4)),
        Number((hostCenter[2] + hostDistance * 0.24).toFixed(4)),
      ],
      target: hostCenter,
      orthoScale: hostOrthoScale,
    },
    {
      view: "host-three-quarter",
      location: [
        Number((hostCenter[0] + lateralSign * hostDistance * 0.72).toFixed(4)),
        Number((hostCenter[1] - hostDistance * 0.78).toFixed(4)),
        Number((hostCenter[2] + hostDistance * 0.28).toFixed(4)),
      ],
      target: hostCenter,
      orthoScale: hostOrthoScale,
    },
  ].map((entry) => ({
    ...entry,
    rotation: computeCameraRotationDegrees(entry.location, entry.target),
  }));
}

async function encodeImageFileAsDataUrl(filePath) {
  const buffer = await readFile(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function sanitizeRenderCritiquePayload(payload, fallbackRequestedNoun) {
  if (!isRecord(payload)) {
    return null;
  }

  const repairActions = Array.isArray(payload.repairActions)
    ? payload.repairActions
        .map((action) => {
          if (!isRecord(action) || typeof action.actionType !== "string") {
            return null;
          }

          return {
            actionType: action.actionType,
            reason:
              typeof action.reason === "string" && action.reason.trim()
                ? action.reason.trim()
                : "render critique 建议继续修正。",
            source:
              action.source === "structural" ||
              action.source === "visual" ||
              action.source === "hybrid"
                ? action.source
                : "hybrid",
            targetPartIds: Array.isArray(action.targetPartIds)
              ? action.targetPartIds.filter((value) => typeof value === "string")
              : undefined,
            targetRoles: Array.isArray(action.targetRoles)
              ? action.targetRoles.filter((value) => typeof value === "string")
              : undefined,
            intensity:
              typeof action.intensity === "number"
                ? roundMetric(action.intensity)
                : 0.66,
          };
        })
        .filter((value) => isRecord(value))
    : [];
  const repairIntensityHints = Array.isArray(payload.repairIntensityHints)
    ? payload.repairIntensityHints
        .filter(
          (entry) =>
            isRecord(entry) &&
            typeof entry.actionType === "string" &&
            typeof entry.intensity === "number",
        )
        .map((entry) => ({
          actionType: entry.actionType,
          intensity: roundMetric(entry.intensity),
        }))
    : [];

  return {
    requestedNoun:
      typeof payload.requestedNoun === "string" && payload.requestedNoun.trim()
        ? payload.requestedNoun.trim()
        : fallbackRequestedNoun,
    renderNounFidelity:
      typeof payload.renderNounFidelity === "number"
        ? roundMetric(payload.renderNounFidelity)
        : null,
    criticalPartsVisible:
      typeof payload.criticalPartsVisible === "number"
        ? roundMetric(payload.criticalPartsVisible)
        : null,
    silhouetteReadability:
      typeof payload.silhouetteReadability === "number"
        ? roundMetric(payload.silhouetteReadability)
        : null,
    lookalikeRisk:
      typeof payload.lookalikeRisk === "number" ? roundMetric(payload.lookalikeRisk) : null,
    cohesionScore:
      typeof payload.cohesionScore === "number" ? roundMetric(payload.cohesionScore) : null,
    cohesionIssues: Array.isArray(payload.cohesionIssues)
      ? payload.cohesionIssues.filter((value) => typeof value === "string")
      : [],
    dominantFailureMode:
      typeof payload.dominantFailureMode === "string" && payload.dominantFailureMode.trim()
        ? payload.dominantFailureMode.trim()
        : undefined,
    oversizeParts: Array.isArray(payload.oversizeParts)
      ? payload.oversizeParts.filter((value) => typeof value === "string")
      : [],
    hiddenCriticalParts: Array.isArray(payload.hiddenCriticalParts)
      ? payload.hiddenCriticalParts.filter((value) => typeof value === "string")
      : [],
    flattenedStructureParts: Array.isArray(payload.flattenedStructureParts)
      ? payload.flattenedStructureParts.filter((value) => typeof value === "string")
      : [],
    flattenedPartIds: Array.isArray(payload.flattenedPartIds)
      ? payload.flattenedPartIds.filter((value) => typeof value === "string")
      : Array.isArray(payload.flattenedStructureParts)
        ? payload.flattenedStructureParts.filter((value) => typeof value === "string")
        : [],
    detachedPartIds: Array.isArray(payload.detachedPartIds)
      ? payload.detachedPartIds.filter((value) => typeof value === "string")
      : [],
    hostInterferenceZones: Array.isArray(payload.hostInterferenceZones)
      ? payload.hostInterferenceZones.filter((value) => typeof value === "string")
      : [],
    hostIntrusionZones: Array.isArray(payload.hostIntrusionZones)
      ? payload.hostIntrusionZones.filter((value) => typeof value === "string")
      : Array.isArray(payload.hostInterferenceZones)
        ? payload.hostInterferenceZones.filter((value) => typeof value === "string")
        : [],
    silhouetteBreakpoints: Array.isArray(payload.silhouetteBreakpoints)
      ? payload.silhouetteBreakpoints.filter((value) => typeof value === "string")
      : [],
    dominantSpanOwner:
      typeof payload.dominantSpanOwner === "string" && payload.dominantSpanOwner.trim()
        ? payload.dominantSpanOwner.trim()
        : undefined,
    faceIntrusionSeverity:
      typeof payload.faceIntrusionSeverity === "number"
        ? roundMetric(payload.faceIntrusionSeverity)
        : null,
    partAttachmentCredibility:
      typeof payload.partAttachmentCredibility === "number"
        ? roundMetric(payload.partAttachmentCredibility)
        : null,
    nounReadOrder: Array.isArray(payload.nounReadOrder)
      ? payload.nounReadOrder.filter((value) => typeof value === "string")
      : [],
    finalReadOrder: Array.isArray(payload.finalReadOrder)
      ? payload.finalReadOrder.filter((value) => typeof value === "string")
      : [],
    firstReadPart:
      typeof payload.firstReadPart === "string" && payload.firstReadPart.trim()
        ? payload.firstReadPart.trim()
        : Array.isArray(payload.finalReadOrder) &&
            typeof payload.finalReadOrder[0] === "string"
          ? payload.finalReadOrder[0].trim()
          : Array.isArray(payload.nounReadOrder) &&
              typeof payload.nounReadOrder[0] === "string"
            ? payload.nounReadOrder[0].trim()
            : undefined,
    dominantFailureLayer:
      payload.dominantFailureLayer === "silhouette" ||
      payload.dominantFailureLayer === "assembly" ||
      payload.dominantFailureLayer === "host-fit" ||
      payload.dominantFailureLayer === "render-readability" ||
      payload.dominantFailureLayer === "anchor-projection" ||
      payload.dominantFailureLayer === "outline-compiler" ||
      payload.dominantFailureLayer === "attachment-cohesion" ||
      payload.dominantFailureLayer === "critique-timeout"
        ? payload.dominantFailureLayer
        : undefined,
    rootSilhouetteFailure:
      typeof payload.rootSilhouetteFailure === "string" &&
      payload.rootSilhouetteFailure.trim()
        ? payload.rootSilhouetteFailure.trim()
        : undefined,
    assemblyFailure:
      typeof payload.assemblyFailure === "string" && payload.assemblyFailure.trim()
        ? payload.assemblyFailure.trim()
        : undefined,
    hostFitFailure:
      typeof payload.hostFitFailure === "string" && payload.hostFitFailure.trim()
        ? payload.hostFitFailure.trim()
        : undefined,
    readOrderFailure:
      typeof payload.readOrderFailure === "string" && payload.readOrderFailure.trim()
        ? payload.readOrderFailure.trim()
        : undefined,
    rebuildDirective:
      payload.rebuildDirective === "blocking" ||
      payload.rebuildDirective === "silhouette-forming" ||
      payload.rebuildDirective === "assembly-rooting" ||
      payload.rebuildDirective === "host-fit" ||
      payload.rebuildDirective === "render-driven-rebuild" ||
      payload.rebuildDirective === "final-review"
        ? payload.rebuildDirective
        : undefined,
    targetRootSpan:
      Array.isArray(payload.targetRootSpan) &&
      payload.targetRootSpan.length === 3 &&
      payload.targetRootSpan.every((value) => typeof value === "number")
        ? payload.targetRootSpan.map((value) => Number(value.toFixed(4)))
        : undefined,
    targetDepthProfile:
      payload.targetDepthProfile === "balanced" ||
      payload.targetDepthProfile === "front-loaded" ||
      payload.targetDepthProfile === "rear-loaded" ||
      payload.targetDepthProfile === "thin-slab" ||
      payload.targetDepthProfile === "deep-body"
        ? payload.targetDepthProfile
        : undefined,
    targetAttachmentPose:
      typeof payload.targetAttachmentPose === "string" &&
      payload.targetAttachmentPose.trim()
        ? payload.targetAttachmentPose.trim()
        : undefined,
    projectedAnchorPose:
      Array.isArray(payload.projectedAnchorPose) &&
      payload.projectedAnchorPose.length === 3 &&
      payload.projectedAnchorPose.every((value) => typeof value === "number")
        ? payload.projectedAnchorPose.map((value) => Number(value.toFixed(4)))
        : undefined,
    anchorPlaneOffset:
      Array.isArray(payload.anchorPlaneOffset) &&
      payload.anchorPlaneOffset.length === 3 &&
      payload.anchorPlaneOffset.every((value) => typeof value === "number")
        ? payload.anchorPlaneOffset.map((value) => Number(value.toFixed(4)))
        : undefined,
    earSideTangentOffset:
      Array.isArray(payload.earSideTangentOffset) &&
      payload.earSideTangentOffset.length === 3 &&
      payload.earSideTangentOffset.every((value) => typeof value === "number")
        ? payload.earSideTangentOffset.map((value) => Number(value.toFixed(4)))
        : undefined,
    anchorProjectionFailureKind:
      payload.anchorProjectionFailureKind === "face-intrusion" ||
      payload.anchorProjectionFailureKind === "floating-off-ear" ||
      payload.anchorProjectionFailureKind === "readability-on-plane"
        ? payload.anchorProjectionFailureKind
        : undefined,
    outlineCompilerMode:
      payload.outlineCompilerMode === "device-front-facing" ||
      payload.outlineCompilerMode === "vehicle-upright-outline" ||
      payload.outlineCompilerMode === "generic-profile-relief"
        ? payload.outlineCompilerMode
        : undefined,
    outlineProjectionVariantId:
      typeof payload.outlineProjectionVariantId === "string" &&
      payload.outlineProjectionVariantId.trim()
        ? payload.outlineProjectionVariantId.trim()
        : undefined,
    nextPassPriority:
      payload.nextPassPriority === "blocking" ||
      payload.nextPassPriority === "silhouette-forming" ||
      payload.nextPassPriority === "assembly-rooting" ||
      payload.nextPassPriority === "host-fit" ||
      payload.nextPassPriority === "render-driven-rebuild" ||
      payload.nextPassPriority === "final-review"
        ? payload.nextPassPriority
        : undefined,
    firstReadResult:
      typeof payload.firstReadResult === "string" && payload.firstReadResult.trim()
        ? payload.firstReadResult.trim()
        : undefined,
    visualVeto:
      typeof payload.visualVeto === "boolean" ? payload.visualVeto : undefined,
    visualVetoReason:
      typeof payload.visualVetoReason === "string" && payload.visualVetoReason.trim()
        ? payload.visualVetoReason.trim()
        : undefined,
    variantSwitchRecommended:
      typeof payload.variantSwitchRecommended === "boolean"
        ? payload.variantSwitchRecommended
        : undefined,
    repairIntensityHints,
    repairActions,
    actualApproximationLabel:
      typeof payload.actualApproximationLabel === "string" && payload.actualApproximationLabel.trim()
        ? payload.actualApproximationLabel.trim()
        : undefined,
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary.trim()
        : null,
  };
}

function buildRenderCritiqueInstruction() {
  return [
    "You are reviewing a low-poly accessory attached to a fox desk pet in PromptPet-AR.",
    "Judge the visible model only, not the requested text alone.",
    "The payload includes view descriptors, expectedSilhouetteGoals, and sometimes runtimeDesignContract; use them as the contract for what the render should prove.",
    "Be strict about noun fidelity, root silhouette readability, assembly credibility, host-relative scale, face occlusion, and whether the accessory looks natural on the fox.",
    "If the accessory is too large, covers the eyes or nose, floats away from the ear-side plane, or dominates the fox head/body, lower the visible scores and mark anchor-projection or host-fit as the dominant failure layer.",
    "If the object still looks like a slab, long bar, generic token, or disconnected primitive pieces, lower cohesion/readability and direct the worker toward outline-compiler, silhouette, or assembly rebuilds instead of more host-fit tweaks.",
    "If the object is not oversized but still reads too dim, too dark, too low-contrast, or too small to read, call that out clearly in summary/visualVetoReason instead of pretending it is only a host-fit issue.",
    "When runtimeDesignContract is present, treat primaryReadTarget, requiredVisibleParts, hostNoGoZones, compositionEnvelope, and partRootingRules as hard acceptance rules.",
    "For chest-wrap accessories, an unreadable chest bar, missing centered knot, tails not emerging from the knot, or any face intrusion are contract violations.",
    "You must identify both firstReadResult and firstReadPart, and explicitly decide whether the result should be visually vetoed because it still reads as a slab, bar, badge, token, or random block.",
    "You must identify the dominant failure mode, dominant failure layer, oversize parts, hidden critical parts, flattened parts, detached parts, host interference/intrusion zones, silhouette breakpoints, dominant span owner, face intrusion severity, part attachment credibility, noun read order, final read order, root silhouette failure, assembly failure, host fit failure, read order failure, rebuild directive, target root span, target depth profile, and target attachment pose.",
    "Use nextPassPriority to tell the worker whether the next pass should focus on blocking, silhouette-forming, assembly-rooting, host-fit, render-driven-rebuild, or final-review.",
    "If the current variant still reads as a slab/bar/token after two passes, set variantSwitchRecommended=true.",
    "Use repairIntensityHints when one repair type should be applied more strongly than the default.",
    "Return strict JSON only.",
  ].join(" ");
}

function buildLightweightRenderCritiqueInstruction() {
  return [
    "You are reviewing one PromptPet fox accessory render.",
    "Return JSON only.",
    "Be strict about first read and dominant silhouette.",
    "Use the provided views, expectedSilhouetteGoals, and runtimeDesignContract as the acceptance contract.",
    'If the noun is not readable, firstReadResult must be one of: "generic-slab", "generic-bar", "generic-block", "generic-token", "generic-unreadable".',
    "If runtimeDesignContract says tails must emerge from a knot or hostNoGoZones must stay clear, treat violations as hard failures.",
    "dominantSpanOwner should be a part id from criticalParts when possible.",
    'dominantFailureLayer must be one of: "silhouette", "assembly", "host-fit", "render-readability", "anchor-projection", "outline-compiler", "attachment-cohesion", "critique-timeout".',
    'nextPassPriority must be one of: "silhouette-forming", "assembly-rooting", "host-fit", "render-driven-rebuild", "final-review".',
    "All numeric scores must be 0..1.",
    "Keep strings short and arrays compact.",
    "Required keys: requestedNoun, firstReadResult, firstReadPart, dominantSpanOwner, renderNounFidelity, criticalPartsVisible, silhouetteReadability, lookalikeRisk, cohesionScore, dominantFailureMode, dominantFailureLayer, faceIntrusionSeverity, partAttachmentCredibility, flattenedPartIds, detachedPartIds, hostIntrusionZones, visualVeto, visualVetoReason, nextPassPriority, summary.",
  ].join(" ");
}

function buildRenderCritiqueInput(execution, geometryRecipe, qualityMetrics, repairActions, runtimeArtifacts) {
  const bounds = computePartBounds(runtimeArtifacts.partBlueprints);
  const hostProfile = getHostCompositionProfileForExecution(execution, geometryRecipe);
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );
  const contractVisibleParts = Array.isArray(runtimeDesignContract?.requiredVisibleParts)
    ? runtimeDesignContract.requiredVisibleParts
    : [];
  const contractCriticalViewGoals = Array.isArray(runtimeDesignContract?.criticalViewGoals)
    ? runtimeDesignContract.criticalViewGoals
    : [];
  const partGraphEdges = Array.isArray(runtimeArtifacts.partGraph?.edges)
    ? runtimeArtifacts.partGraph.edges
        .filter((edge) => isRecord(edge))
        .map((edge) => ({
          parentPartId: edge.parentPartId,
          childPartId: edge.childPartId,
          relation: edge.relation,
          mountFace: edge.mountFace,
          edgeConstraint: edge.edgeConstraint,
          spanOwnership: edge.spanOwnership,
        }))
    : [];
  const structuralBlueprint = isRecord(geometryRecipe?.structuralBlueprint)
    ? {
        representationMode: geometryRecipe.structuralBlueprint.representationMode,
        familyPolicyId: geometryRecipe.structuralBlueprint.familyPolicyId,
        primarySilhouette: geometryRecipe.structuralBlueprint.primarySilhouette,
        silhouetteTemplate: geometryRecipe.structuralBlueprint.silhouetteTemplate,
        silhouetteBlocks: Array.isArray(geometryRecipe.structuralBlueprint.silhouetteBlocks)
          ? geometryRecipe.structuralBlueprint.silhouetteBlocks
          : [],
        assemblySegments: Array.isArray(geometryRecipe.structuralBlueprint.assemblySegments)
          ? geometryRecipe.structuralBlueprint.assemblySegments
          : [],
        mountStrategy: geometryRecipe.structuralBlueprint.mountStrategy,
        readOrderTargets: Array.isArray(geometryRecipe.structuralBlueprint.readOrderTargets)
          ? geometryRecipe.structuralBlueprint.readOrderTargets
          : [],
        criticalViewGoals: Array.isArray(geometryRecipe.structuralBlueprint.criticalViewGoals)
          ? geometryRecipe.structuralBlueprint.criticalViewGoals
          : [],
        hostFitEnvelope: geometryRecipe.structuralBlueprint.hostFitEnvelope,
        partSpanTargets: getStructuralBlueprintPartSpanTargets(execution, geometryRecipe),
        partDepthTargets: getStructuralBlueprintPartDepthTargets(execution, geometryRecipe),
        attachmentAnchors: getStructuralBlueprintAttachmentAnchors(execution, geometryRecipe),
        faceKeepoutZones: geometryRecipe.structuralBlueprint.faceKeepoutZones,
        silhouetteKeepouts: getStructuralBlueprintSilhouetteKeepouts(execution, geometryRecipe),
        assemblyTensionProfile: geometryRecipe.structuralBlueprint.assemblyTensionProfile,
        dominantContour: getStructuralBlueprintDominantContour(execution, geometryRecipe),
        sideDepthProfile: getStructuralBlueprintSideDepthProfile(execution, geometryRecipe),
        dominantSpanOwner: getStructuralBlueprintDominantSpanOwner(execution, geometryRecipe),
        outlineProfile: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "outlineProfile",
        ),
        reliefFeatureLayout: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "reliefFeatureLayout",
        ),
        attachmentMask: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "attachmentMask",
        ),
        readabilityMaterialPolicy: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "readabilityMaterialPolicy",
        ),
        critiqueLightingProfile: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "critiqueLightingProfile",
        ),
        deviceMinReadableSpan: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "deviceMinReadableSpan",
        ),
        boatMinReadableSpan: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "boatMinReadableSpan",
        ),
        reliefFlushDepth: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "reliefFlushDepth",
        ),
        attachmentCohesionBudget: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "attachmentCohesionBudget",
        ),
        profileVariantId: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "profileVariantId",
        ),
        outlineCompilerMode: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "outlineCompilerMode",
        ),
        outlineProjectionVariantId: getEffectiveStructuralBlueprintValue(
          execution,
          geometryRecipe,
          "outlineProjectionVariantId",
        ),
        symmetryPolicy: geometryRecipe.structuralBlueprint.symmetryPolicy,
        deformationPolicy: geometryRecipe.structuralBlueprint.deformationPolicy,
      }
    : null;
  const partProfiles = Array.isArray(geometryRecipe?.partProfiles)
    ? geometryRecipe.partProfiles.map((profile) => ({
        partId: profile.partId,
        profile: profile.profile,
        silhouetteRole: profile.silhouetteRole,
        spanBias: profile.spanBias,
        depthBias: profile.depthBias,
      }))
    : [];
  const attachmentRules = Array.isArray(geometryRecipe?.attachmentRules)
    ? geometryRecipe.attachmentRules.map((rule) => ({
        partId: rule.partId,
        parentPartId: rule.parentPartId,
        mountFace: rule.mountFace,
        edgeConstraint: rule.edgeConstraint,
        orientationConstraint: rule.orientationConstraint,
        allowedDrift: rule.allowedDrift,
        spanOwnership: rule.spanOwnership,
      }))
    : [];

  return {
    requestedNoun: execution.requestedNoun ?? geometryRecipe?.requestedNoun ?? execution.shapeLabel,
    requestedLabel: execution.requestedLabel ?? execution.shapeLabel,
    anchor: execution.anchor,
    designArchetype: getExecutionDesignArchetype(execution, geometryRecipe),
    runtimeShapeClass: getExecutionRuntimeShapeClass(execution, geometryRecipe),
    blueprintFamily:
      typeof execution.blueprintFamily === "string"
        ? execution.blueprintFamily
        : typeof geometryRecipe?.blueprintFamily === "string"
          ? geometryRecipe.blueprintFamily
          : undefined,
    variantId:
      typeof geometryRecipe?.variantId === "string"
        ? geometryRecipe.variantId
        : typeof execution.variantId === "string"
          ? execution.variantId
          : undefined,
    variantCandidates: Array.isArray(geometryRecipe?.variantCandidates)
      ? geometryRecipe.variantCandidates
      : [],
    criticalParts: uniqueStrings([
      ...getExecutionCriticalParts(geometryRecipe),
      ...contractVisibleParts,
    ]),
    readOrderTargets: buildFallbackReadOrderTargets(execution, geometryRecipe),
    criticalViewGoals: uniqueStrings([
      ...(Array.isArray(execution?.criticalViewGoals) ? execution.criticalViewGoals : []),
      ...(Array.isArray(geometryRecipe?.criticalViewGoals) ? geometryRecipe.criticalViewGoals : []),
      ...contractCriticalViewGoals,
      typeof runtimeDesignContract?.compositionEnvelope === "string"
        ? runtimeDesignContract.compositionEnvelope
        : null,
    ]),
    expectedSilhouetteGoals: uniqueStrings([
      ...(Array.isArray(execution?.criticalViewGoals) ? execution.criticalViewGoals : []),
      ...(Array.isArray(geometryRecipe?.criticalViewGoals) ? geometryRecipe.criticalViewGoals : []),
      ...contractCriticalViewGoals,
      typeof runtimeDesignContract?.compositionEnvelope === "string"
        ? runtimeDesignContract.compositionEnvelope
        : null,
      typeof runtimeDesignContract?.primaryReadTarget === "string"
        ? `first-read:${runtimeDesignContract.primaryReadTarget}`
        : null,
      ...(
        Array.isArray(runtimeDesignContract?.partRootingRules)
          ? runtimeDesignContract.partRootingRules.map(
              (rule) => `${rule.partId}:${rule.rule}:${rule.parentPartId}`,
            )
          : []
      ),
      typeof structuralBlueprint?.primarySilhouette === "string"
        ? structuralBlueprint.primarySilhouette
        : null,
      typeof structuralBlueprint?.dominantContour === "string"
        ? structuralBlueprint.dominantContour
        : null,
      typeof structuralBlueprint?.outlineProfile === "string"
        ? structuralBlueprint.outlineProfile
        : null,
    ]),
    structuralBlueprint,
    runtimeDesignContract,
    partProfiles,
    attachmentRules,
    partImportanceWeights:
      isRecord(geometryRecipe?.partImportanceWeights)
        ? geometryRecipe.partImportanceWeights
        : {},
    hostContext: {
      region: hostProfile.region,
      preferredSpan: hostProfile.preferredSpan,
      maxSpan: hostProfile.maxSpan,
      faceIntrusionBudget: hostProfile.faceIntrusionBudget,
      eyeKeepout: hostProfile.eyeKeepout === true,
      preferredYaw: hostProfile.preferredYaw,
      screenFacingBias: hostProfile.screenFacingBias,
      protectedHostZones: Array.isArray(runtimeDesignContract?.hostNoGoZones)
        ? runtimeDesignContract.hostNoGoZones
        : [],
      currentSpan: bounds?.span ?? null,
      projectedAnchorPose: runtimeArtifacts.anchorProjection?.projectedAnchorPose,
      anchorPlaneOffset: runtimeArtifacts.anchorProjection?.anchorPlaneOffset,
      earSideTangentOffset: runtimeArtifacts.anchorProjection?.earSideTangentOffset,
      anchorProjectionFailureKind:
        runtimeArtifacts.anchorProjection?.anchorProjectionFailureKind,
    },
    negativeLookalikes: Array.isArray(execution.negativeLookalikes)
      ? execution.negativeLookalikes
      : Array.isArray(geometryRecipe?.negativeLookalikes)
        ? geometryRecipe.negativeLookalikes
        : [],
    currentMetrics: {
      shapeReadability: qualityMetrics.shapeReadability,
      visualReadability: qualityMetrics.visualReadability,
      anchorAccuracy: qualityMetrics.anchorAccuracy,
      scaleFit: qualityMetrics.scaleFit,
      silhouetteStrength: qualityMetrics.silhouetteStrength,
      occlusionRisk: qualityMetrics.occlusionRisk,
      hostComposition: qualityMetrics.hostComposition,
      nounFidelity: qualityMetrics.nounFidelity,
      criticalPartsPresent: qualityMetrics.criticalPartsPresent,
      cohesionScore: qualityMetrics.cohesionScore,
      lookalikeRisk: qualityMetrics.lookalikeRisk,
      faceIntrusionSeverity: qualityMetrics.faceIntrusionSeverity,
      dominantSpanOwner: qualityMetrics.dominantSpanOwner,
      partAttachmentCredibility: qualityMetrics.partAttachmentCredibility,
    },
    existingRepairActions: repairActions.map((action) => ({
      actionType: action.actionType,
      source: action.source,
      targetPartIds: action.targetPartIds ?? [],
      targetRoles: action.targetRoles ?? [],
      intensity: action.intensity ?? 0.5,
      reason: action.reason,
    })),
    partGraphEdges,
  };
}

async function tryBuildRenderCritiqueWithOpenAiResponses(config, critiqueInput, critiqueViews) {
  const providerLabel = getAiProviderLabel(config.provider);
  try {
    const timeoutMs = getRenderCritiqueTransportTimeoutMs(config, critiqueViews);
    logOpenAiCritiqueDebug(
      `responses:start noun=${critiqueInput.requestedNoun ?? "unknown"} views=${critiqueViews.length} timeoutMs=${timeoutMs}`,
    );
    const response = await fetchWithDeadline(`${config.baseUrl.replace(/\/+$/, "")}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        instructions: buildRenderCritiqueInstruction(),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(critiqueInput),
              },
              ...critiqueViews.map((view) => ({
                type: "input_image",
                image_url: view.dataUrl,
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "promptpet_render_critique",
            strict: true,
            schema: openAiRenderCritiqueSchema,
          },
        },
        max_output_tokens: 900,
      }),
    }, timeoutMs);

    if (!response.ok) {
      const rawText = await response.text();
      logOpenAiCritiqueDebug(`responses:http-error status=${response.status}`);
      return {
        payload: null,
        failureNote: getOpenAiFailureNote(response.status, rawText, config.provider),
      };
    }

    const payload = await response.json();
    const parsed =
      isRecord(payload) && isRecord(payload.output_parsed)
        ? sanitizeRenderCritiquePayload(payload.output_parsed, critiqueInput.requestedNoun)
        : null;

    if (parsed) {
      logOpenAiCritiqueDebug("responses:parsed");
      return {
        payload: parsed,
        failureNote: null,
      };
    }

    const text = extractOpenAiText(payload);

    if (!text) {
      logOpenAiCritiqueDebug("responses:empty-text");
      return {
        payload: null,
        failureNote: `${providerLabel} render critique 没有返回可用文本。`,
      };
    }

    logOpenAiCritiqueDebug("responses:text-success");
    return {
      payload: sanitizeRenderCritiquePayload(
        parseJsonText(text),
        critiqueInput.requestedNoun,
      ),
      failureNote: null,
    };
  } catch (error) {
    logOpenAiCritiqueDebug(
      `responses:error ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      payload: null,
      failureNote:
        (error instanceof Error && /deadline-exceeded|timeout/i.test(error.message)) ||
        error?.name === "TimeoutError"
          ? `${providerLabel} render critique 请求超时。`
          : error instanceof Error && error.message
            ? `${providerLabel} render critique 请求失败：${error.message}`
            : `${providerLabel} render critique 请求失败。`,
    };
  }
}

async function tryBuildRenderCritiqueWithOpenAiChatCompletions(
  config,
  critiqueInput,
  critiqueViews,
  options = {},
) {
  const providerLabel = getAiProviderLabel(config.provider);
  try {
    const timeoutMs = getRenderCritiqueTransportTimeoutMs(config, critiqueViews);
    const lightweightMode = options.lightweightMode === true;
    const systemInstruction = lightweightMode
      ? buildLightweightRenderCritiqueInstruction()
      : buildRenderCritiqueInstruction();
    const inputPayload = lightweightMode
      ? buildCompactRenderCritiqueInput(critiqueInput)
      : critiqueInput;
    logOpenAiCritiqueDebug(
      `chat:start noun=${critiqueInput.requestedNoun ?? "unknown"} views=${critiqueViews.length} timeoutMs=${timeoutMs}`,
    );
    const response = await fetchWithDeadline(
      `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          store: false,
          messages: [
            {
              role: "system",
              content: systemInstruction,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: JSON.stringify(inputPayload),
                },
                ...critiqueViews.map((view) => ({
                  type: "image_url",
                  image_url: {
                    url: view.dataUrl,
                  },
                })),
              ],
            },
          ],
          ...(lightweightMode
            ? {}
            : {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "promptpet_render_critique",
                    strict: true,
                    schema: openAiRenderCritiqueSchema,
                  },
                },
          }),
          max_completion_tokens: lightweightMode ? 420 : 900,
        }),
      },
      timeoutMs,
    );

    const rawText = await response.text();

    if (!response.ok) {
      logOpenAiCritiqueDebug(`chat:http-error status=${response.status}`);
      return {
        payload: null,
        failureNote: getOpenAiFailureNote(response.status, rawText, config.provider),
      };
    }

    const payload = parseJsonText(rawText);
    const text = extractChatCompletionText(payload);

    if (!text) {
      logOpenAiCritiqueDebug("chat:empty-text");
      return {
        payload: null,
        failureNote: `${providerLabel} render critique chat/completions 没有返回可用 JSON。`,
      };
    }

    logOpenAiCritiqueDebug("chat:success");
    return {
      payload: sanitizeRenderCritiquePayload(
        parseJsonText(text),
        critiqueInput.requestedNoun,
      ),
      failureNote: null,
    };
  } catch (error) {
    logOpenAiCritiqueDebug(`chat:error ${error instanceof Error ? error.message : String(error)}`);
    return {
      payload: null,
      failureNote:
        (error instanceof Error && /deadline-exceeded|timeout/i.test(error.message)) ||
        error?.name === "TimeoutError"
          ? `${providerLabel} render critique chat/completions 请求超时。`
          : error instanceof Error && error.message
            ? `${providerLabel} render critique chat/completions 失败：${error.message}`
            : `${providerLabel} render critique chat/completions 失败。`,
    };
  }
}

function mergeRenderRepairActions(baseActions, critiqueActions) {
  return mergeRenderRepairActionsFromLib(baseActions, critiqueActions);
}

function inferDominantFailureLayerFromReport(report) {
  return inferDominantFailureLayerFromReportFromLib(report);
}

function inferNextPassPriorityFromFailureLayer(layer) {
  return inferNextPassPriorityFromFailureLayerFromLib(layer);
}

function inferRebuildDirectiveFromFailureLayer(layer) {
  return inferRebuildDirectiveFromFailureLayerFromLib(layer);
}

function inferTargetDepthProfile(runtimeShapeClass) {
  return inferTargetDepthProfileFromLib(runtimeShapeClass);
}

function buildFallbackReadOrderTargets(execution, geometryRecipe) {
  return buildFallbackReadOrderTargetsFromLib(execution, geometryRecipe);
}

function augmentRepairActionsWithCritiqueHints(report, repairActions) {
  const nextActions = [...(Array.isArray(repairActions) ? repairActions : [])];
  const flattenedPartIds = Array.isArray(report?.flattenedPartIds)
    ? report.flattenedPartIds
    : Array.isArray(report?.flattenedStructureParts)
      ? report.flattenedStructureParts
      : [];
  const detachedPartIds = Array.isArray(report?.detachedPartIds)
    ? report.detachedPartIds
    : [];
  const hostIntrusionZones = Array.isArray(report?.hostIntrusionZones)
    ? report.hostIntrusionZones
    : Array.isArray(report?.hostInterferenceZones)
      ? report.hostInterferenceZones
      : [];
  const applyIntensityHint = (actionType, fallbackTargets = {}) => {
    if (!Array.isArray(report?.repairIntensityHints)) {
      return;
    }

    const hint = report.repairIntensityHints.find((entry) => entry.actionType === actionType);

    if (!hint) {
      return;
    }

    const existing = nextActions.find((action) => action.actionType === actionType);

    if (existing) {
      existing.intensity = Math.max(existing.intensity ?? 0.5, hint.intensity);
      return;
    }

    nextActions.push({
      actionType,
      source: "visual",
      reason: `render critique 强化了 ${actionType} 的执行强度。`,
      intensity: hint.intensity,
      ...fallbackTargets,
    });
  };

  if (Array.isArray(report?.oversizeParts) && report.oversizeParts.length > 0) {
    nextActions.push({
      actionType: "rebalance-part-ratio",
      source: "visual",
      reason: "render critique 发现部分部件过大，需要重新压缩主次比例。",
      targetPartIds: report.oversizeParts,
      intensity: 0.72,
    });
  }

  if (Array.isArray(report?.hiddenCriticalParts) && report.hiddenCriticalParts.length > 0) {
    nextActions.push({
      actionType: "promote-critical-part",
      source: "visual",
      reason: "关键部件被遮蔽，需要抬高可读度。",
      targetPartIds: report.hiddenCriticalParts,
      intensity: 0.74,
    });
  }

  if (flattenedPartIds.length > 0) {
    nextActions.push({
      actionType: "reshape-silhouette",
      source: "visual",
      reason: "render critique 发现结构被压扁，需要重塑轮廓厚度。",
      targetPartIds: flattenedPartIds,
      intensity: 0.7,
    });
  }

  if (detachedPartIds.length > 0) {
    nextActions.push({
      actionType: "re-parent-part",
      source: "structural",
      reason: "render critique 发现关键子件像漂浮件，需要重新挂回父结构。",
      targetPartIds: detachedPartIds,
      intensity: 0.78,
    });
    nextActions.push({
      actionType: "tighten-cohesion",
      source: "hybrid",
      reason: "需要继续收紧 detached parts 的父子关系。",
      targetPartIds: detachedPartIds,
      intensity: 0.72,
    });
  }

  if (hostIntrusionZones.length > 0) {
    nextActions.push({
      actionType: "re-anchor",
      source: "visual",
      reason: "挂件与宿主脸部/构图冲突，需要重新贴合锚点。",
      intensity: 0.72,
    });
  }

  if (typeof report?.faceIntrusionSeverity === "number" && report.faceIntrusionSeverity > 0.28) {
    nextActions.push({
      actionType: "re-anchor",
      source: "visual",
      reason: "render critique 发现挂件仍明显侵入脸部，需要优先做 host-fit。",
      intensity: 0.82,
    });
    nextActions.push({
      actionType: "rebuild-from-root",
      source: "hybrid",
      reason: "需要缩小并围绕 root 重新装配，避免压脸。",
      intensity: 0.76,
    });
  }

  if (
    typeof report?.dominantSpanOwner === "string" &&
    ["hang-slot", "camera-top", "boat-mast", "boat-sail"].includes(report.dominantSpanOwner)
  ) {
    nextActions.push({
      actionType: "rebalance-part-ratio",
      source: "hybrid",
      reason: "当前主轮廓被次件抢走，需要把主轮廓重新还给主体件。",
      targetPartIds: [report.dominantSpanOwner],
      intensity: 0.74,
    });
    nextActions.push({
      actionType: "rebuild-from-root",
      source: "structural",
      reason: "主轮廓归属错误，需要重建结构关系。",
      intensity: 0.72,
    });
  }

  if (
    typeof report?.firstReadPart === "string" &&
    ["hang-slot", "camera-top", "boat-mast", "boat-sail"].includes(report.firstReadPart)
  ) {
    nextActions.push({
      actionType: "rebuild-from-root",
      source: "structural",
      reason: "首读先读到次件而不是主件，需要回到 root contour 重建。",
      targetPartIds: [report.firstReadPart],
      intensity: 0.78,
    });
  }

  const dominantFailureLayer = inferDominantFailureLayerFromReport(report);
  const nextPassPriority =
    typeof report?.nextPassPriority === "string"
      ? report.nextPassPriority
      : inferNextPassPriorityFromFailureLayer(dominantFailureLayer);
  const rebuildDirective =
    typeof report?.rebuildDirective === "string"
      ? report.rebuildDirective
      : inferRebuildDirectiveFromFailureLayer(dominantFailureLayer);

  if (nextPassPriority === "assembly-rooting") {
    nextActions.push({
      actionType: "tighten-cohesion",
      source: "hybrid",
      reason: "下一轮优先收紧装配整体性。",
      intensity: 0.68,
    });
    nextActions.push({
      actionType: "re-parent-part",
      source: "structural",
      reason: "render critique 认为 attachment credibility 不足，需要回到 assembly rooting。",
      intensity: 0.72,
    });
  } else if (nextPassPriority === "host-fit") {
    nextActions.push({
      actionType: "re-anchor",
      source: "visual",
      reason: "下一轮优先处理宿主贴合与避脸。",
      intensity: typeof report?.faceIntrusionSeverity === "number" && report.faceIntrusionSeverity > 0.28 ? 0.82 : 0.7,
    });
    nextActions.push({
      actionType: "re-orient",
      source: "visual",
      reason: "下一轮优先处理挂件朝向。",
      intensity: 0.64,
    });
  } else if (
    nextPassPriority === "silhouette-forming" ||
    nextPassPriority === "render-driven-rebuild"
  ) {
    nextActions.push({
      actionType: "reshape-silhouette",
      source: "hybrid",
      reason: "下一轮优先重建 root silhouette，而不是继续只做位移或缩放。",
      targetPartIds: Array.isArray(report?.hiddenCriticalParts)
        ? report.hiddenCriticalParts
        : undefined,
      intensity: nextPassPriority === "render-driven-rebuild" ? 0.8 : 0.72,
    });
  } else if (nextPassPriority === "final-review") {
    nextActions.push({
      actionType: "promote-critical-part",
      source: "visual",
      reason: "进入 final review 前再提高关键件首读性。",
      targetPartIds: Array.isArray(report?.hiddenCriticalParts)
        ? report.hiddenCriticalParts
        : undefined,
      intensity: 0.6,
    });
  }

  if (
    rebuildDirective === "silhouette-forming" ||
    dominantFailureLayer === "silhouette"
  ) {
    nextActions.push({
      actionType: "rebuild-from-root",
      source: "structural",
      reason:
        report?.rootSilhouetteFailure ??
        "当前 first read 仍读不到 root silhouette，需要直接回到 silhouette forming。",
      intensity: 0.78,
    });
  } else if (
    rebuildDirective === "assembly-rooting" ||
    dominantFailureLayer === "assembly"
  ) {
    nextActions.push({
      actionType: "rebuild-from-root",
      source: "structural",
      reason:
        report?.assemblyFailure ??
        "当前装配关系不可信，需要围绕 assembly root 重新挂接。",
      intensity:
        typeof report?.partAttachmentCredibility === "number" &&
        report.partAttachmentCredibility < 0.76
          ? 0.78
          : 0.62,
    });
  }

  applyIntensityHint("tighten-cohesion");
  applyIntensityHint("rebuild-from-root");
  applyIntensityHint("promote-critical-part");
  applyIntensityHint("rebalance-part-ratio");
  applyIntensityHint("reshape-silhouette");
  applyIntensityHint("re-anchor");
  applyIntensityHint("re-orient");

  return mergeRenderRepairActions([], nextActions);
}

async function captureRenderCritiqueViews(
  task,
  execution,
  runtimeArtifacts,
  backendConfig,
  toolNames,
  invokedTools,
) {
  if (
    !toolNames.has("create_camera") ||
    !toolNames.has("configure_render_settings") ||
    !toolNames.has("render_image")
  ) {
    return {
      critiqueViews: [],
      failureNote: "当前 Blender MCP 工具链不支持 create_camera/configure_render_settings/render_image。",
    };
  }

  const critiqueDir = path.join(
    path.dirname(task.artifacts.posterFile),
    "_runtime-critique",
  );
  await mkdir(critiqueDir, { recursive: true });
  const critiqueLightingProfile = getHardSurfaceCritiqueLightingProfile(
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const cameraNames = [];
  const critiqueViews = [];
  const viewSpecs = buildRenderCritiqueViewDefinitions(execution, runtimeArtifacts);

  try {
    try {
      for (const spec of viewSpecs) {
        const hostCompositionView = spec.view.startsWith("host-");
        await invokePolyMcpTool(
          backendConfig.serverUrl,
          "configure_render_settings",
          [],
          {
            engine: "BLENDER_EEVEE",
            samples: 12,
            resolution_x: 320,
            resolution_y: 320,
            resolution_percentage: 100,
            file_format: "PNG",
            color_mode: "RGBA",
            color_depth: "8",
            transparent: false,
            use_compositing: false,
            use_sequencer: false,
            use_denoising: false,
            use_motion_blur: false,
            use_bloom: false,
            exposure: critiqueLightingProfile
              ? hostCompositionView
                ? critiqueLightingProfile.hostExposure
                : critiqueLightingProfile.accessoryExposure
              : 0.35,
            gamma: critiqueLightingProfile
              ? hostCompositionView
                ? critiqueLightingProfile.hostGamma
                : critiqueLightingProfile.accessoryGamma
              : 1.04,
          },
        );
        invokedTools.push("configure_render_settings");

        const cameraName = `CritiqueCam_${task.generationId.slice(0, 8)}_${execution.requestId}_${spec.view}`;
        const outputPath = path.join(
          critiqueDir,
          `${execution.requestId}-${spec.view}.png`,
        );
        await invokePolyMcpTool(
          backendConfig.serverUrl,
          "create_camera",
          [],
          {
            name: cameraName,
            location: spec.location,
            rotation: spec.rotation,
            camera_type: "ORTHO",
            orthographic_scale: spec.orthoScale,
            focal_length: 85,
            clip_start: 0.001,
            clip_end: 20,
          },
        );
        invokedTools.push("create_camera");
        cameraNames.push(cameraName);

        const renderPayload = await invokePolyMcpTool(
          backendConfig.serverUrl,
          "render_image",
          [],
          {
            output_path: outputPath,
            return_base64: false,
            use_viewport: false,
          },
        );
        invokedTools.push("render_image");
        const renderResult = extractInvokeResult(renderPayload);
        const resolvedPath =
          isRecord(renderResult) && typeof renderResult.output_path === "string"
            ? renderResult.output_path
            : isRecord(renderResult) && typeof renderResult.filepath === "string"
              ? renderResult.filepath
              : outputPath;

        if (!(await fileExists(resolvedPath))) {
          return {
            critiqueViews: [],
            failureNote: `render_image 没有生成可用评审图：${spec.view}`,
          };
        }

        critiqueViews.push({
          view: spec.view,
          filePath: resolvedPath,
          dataUrl: await encodeImageFileAsDataUrl(resolvedPath),
        });
      }
    } catch (error) {
      return {
        critiqueViews: [],
        failureNote:
          error instanceof Error && error.message
            ? `render critique 视图捕获失败：${error.message}`
            : "render critique 视图捕获失败。",
      };
    }
  } finally {
    if (cameraNames.length > 0) {
      try {
        await invokePolyMcpTool(
          backendConfig.serverUrl,
          "delete_objects",
          [],
          {
            object_names: cameraNames,
            delete_data: true,
            delete_hierarchy: true,
            confirm: true,
          },
        );
        invokedTools.push("delete_objects");
      } catch {}
    }
  }

  return {
    critiqueViews,
    failureNote:
      critiqueViews.length === viewSpecs.length
        ? null
        : `render critique 评审图不完整：expected=${viewSpecs.length}, actual=${critiqueViews.length}`,
  };
}

function buildFallbackRenderCritiqueReport({
  execution,
  geometryRecipe,
  partBlueprints,
  partGraph,
  anchorProjection,
  outlineCompilerMode,
  outlineProjectionVariantId,
  qualityMetrics,
  viewScores,
  repairActions,
  requestedNoun,
  runtimeShapeClass,
  critiqueTransport,
  summary,
  dominantFailureMode,
  cohesionIssues = [],
  nextPassPriority,
  dominantFailureLayer,
}) {
  const normalizedCritiqueTransport = buildVisionCritiqueTransport(critiqueTransport);
  const source = normalizedCritiqueTransport.source;
  const renderCritiqueAvailable = normalizedCritiqueTransport.renderCritiqueAvailable;
  const renderCritiquePolicy = normalizedCritiqueTransport.renderCritiquePolicy;
  const fallbackReadOrder = buildFallbackReadOrderTargets(execution, geometryRecipe);
  const detachedPartIdsFromGeometry = getDetachedPartIdsFromAttachmentScores(
    partBlueprints,
    partGraph,
  );
  const hardSurfaceFallbackLooksGeneric =
    isHardSurfaceOpenNounExecution(execution, geometryRecipe) &&
    (
      qualityMetrics.scaleFit < 0.58 ||
      qualityMetrics.silhouetteStrength < 0.64 ||
      qualityMetrics.visualReadability < 0.62 ||
      qualityMetrics.partAttachmentCredibility < 0.46 ||
      qualityMetrics.lookalikeRisk > 0.4
    );
  const allowsViewportFallbackAcceptance =
    renderCritiqueAvailable !== true &&
    source === "viewport-capture" &&
    renderCritiquePolicy === "viewport-fallback-allowed";
  const resolvedFailureLayer =
    ((!renderCritiqueAvailable &&
      !allowsViewportFallbackAcceptance &&
      /render-critique|timeout|不可用|unavailable|failed/i.test(
        [dominantFailureMode, summary, ...cohesionIssues].filter(Boolean).join(" "),
      ))
      ? "critique-timeout"
      : undefined) ??
    dominantFailureLayer ??
    inferDominantFailureLayerFromReport({
      faceIntrusionSeverity: qualityMetrics.faceIntrusionSeverity,
      partAttachmentCredibility: qualityMetrics.partAttachmentCredibility,
      flattenedStructureParts:
        qualityMetrics.silhouetteStrength < 0.78 || hardSurfaceFallbackLooksGeneric
          ? fallbackReadOrder.slice(0, 1)
          : [],
    });
  const resolvedNextPassPriority =
    nextPassPriority ?? inferNextPassPriorityFromFailureLayer(resolvedFailureLayer);
  const fallbackFirstRead =
    qualityMetrics.lookalikeRisk > 0.52 || hardSurfaceFallbackLooksGeneric
      ? runtimeShapeClass === "boat-charm"
        ? "generic long bar"
        : runtimeShapeClass === "camera-charm"
          ? "generic slab"
          : runtimeShapeClass === "rocket-charm"
            ? "generic spike"
          : "generic token"
      : requestedNoun ?? execution.shapeLabel;
  const visualVetoReason =
    qualityMetrics.faceIntrusionSeverity > 0.28
      ? "挂件仍明显侵入眼区或脸部主轮廓，不能算通过。"
      : /generic|slab|bar|token|badge/i.test(fallbackFirstRead)
        ? `主视图 first read 仍像 ${fallbackFirstRead}，不能算通过。`
        : undefined;

  return attachVisionCritiqueTransport({
    reportId: `critique-${execution.executionId}`,
    executionId: execution.executionId,
    requestId: execution.requestId,
    requestedNoun,
    designArchetype: getExecutionDesignArchetype(execution, geometryRecipe),
    runtimeShapeClass,
    source,
    renderCritiquePolicy,
    viewScores,
    lookalikeRisk: qualityMetrics.lookalikeRisk,
    criticalPartsPresent: qualityMetrics.criticalPartsPresent,
    nounFidelity: qualityMetrics.nounFidelity,
    renderNounFidelity:
      renderCritiqueAvailable === true ? qualityMetrics.nounFidelity : undefined,
    criticalPartsVisible:
      renderCritiqueAvailable === true ? qualityMetrics.criticalPartsPresent : undefined,
    silhouetteReadability:
      renderCritiqueAvailable === true ? qualityMetrics.visualReadability : undefined,
    cohesionScore: qualityMetrics.cohesionScore,
    cohesionIssues,
    dominantFailureMode,
    oversizeParts:
      qualityMetrics.scaleFit < 0.78 && typeof qualityMetrics.dominantSpanOwner === "string"
        ? [qualityMetrics.dominantSpanOwner]
        : [],
    hiddenCriticalParts:
      qualityMetrics.criticalPartsPresent < 0.8 ? fallbackReadOrder.slice(0, 2) : [],
    flattenedStructureParts:
      qualityMetrics.silhouetteStrength < 0.78 ? fallbackReadOrder.slice(0, 2) : [],
    flattenedPartIds:
      qualityMetrics.silhouetteStrength < 0.78 ? fallbackReadOrder.slice(0, 2) : [],
    detachedPartIds:
      detachedPartIdsFromGeometry.length > 0
        ? detachedPartIdsFromGeometry
        : qualityMetrics.partAttachmentCredibility < 0.76
          ? fallbackReadOrder.slice(1, 3)
          : [],
    hostInterferenceZones:
      qualityMetrics.faceIntrusionSeverity > 0.28 ? ["eye-zone", "face-outline"] : [],
    hostIntrusionZones:
      qualityMetrics.faceIntrusionSeverity > 0.28 ? ["eye-zone", "face-outline"] : [],
    silhouetteBreakpoints:
      qualityMetrics.silhouetteStrength < 0.78
        ? fallbackReadOrder.slice(0, 2).map((partId) => `${partId}-break`)
        : [],
    dominantSpanOwner: qualityMetrics.dominantSpanOwner,
    faceIntrusionSeverity: qualityMetrics.faceIntrusionSeverity,
    partAttachmentCredibility: qualityMetrics.partAttachmentCredibility,
    projectedAnchorPose: anchorProjection?.projectedAnchorPose,
    anchorPlaneOffset: anchorProjection?.anchorPlaneOffset,
    earSideTangentOffset: anchorProjection?.earSideTangentOffset,
    anchorProjectionFailureKind: anchorProjection?.anchorProjectionFailureKind,
    outlineCompilerMode,
    outlineProjectionVariantId,
    nounReadOrder: fallbackReadOrder,
    finalReadOrder: fallbackReadOrder,
    firstReadPart: fallbackReadOrder[0],
    dominantFailureLayer: resolvedFailureLayer,
    rootSilhouetteFailure:
      resolvedFailureLayer === "silhouette" || resolvedFailureLayer === "outline-compiler"
        ? "root silhouette 仍像 generic slab，需要改成更明确的主轮廓。"
        : undefined,
    assemblyFailure:
      resolvedFailureLayer === "assembly" ||
      resolvedFailureLayer === "attachment-cohesion"
        ? "关键子件的依附关系仍不可信，需要回到 assembly root 重建。"
        : undefined,
    hostFitFailure:
      resolvedFailureLayer === "host-fit" ||
      resolvedFailureLayer === "anchor-projection"
        ? "挂件仍侵入狐狸脸部或耳侧包络区，需要继续做 host-fit。"
        : undefined,
    readOrderFailure:
      fallbackReadOrder.length > 0
        ? `首读顺序仍不稳定：${fallbackReadOrder.join(" -> ")}`
        : undefined,
    rebuildDirective: inferRebuildDirectiveFromFailureLayer(resolvedFailureLayer),
    targetRootSpan:
      runtimeShapeClass === "camera-charm"
        ? [0.02, 0.013, 0.015]
        : runtimeShapeClass === "boat-charm"
          ? [0.025, 0.012, 0.016]
          : undefined,
    targetDepthProfile: inferTargetDepthProfile(runtimeShapeClass),
    targetAttachmentPose: getTargetAttachmentPose(execution, geometryRecipe),
    nextPassPriority: resolvedNextPassPriority,
    firstReadResult: fallbackFirstRead,
    visualVeto: Boolean(visualVetoReason),
    visualVetoReason,
    variantSwitchRecommended:
      (Boolean(visualVetoReason) || hardSurfaceFallbackLooksGeneric) &&
      isHardSurfaceOpenNounExecution(execution, geometryRecipe),
    repairIntensityHints: [],
    actualApproximationLabel:
      qualityMetrics.lookalikeRisk > 0.42
        ? `${requestedNoun ?? execution.shapeLabel} 近似件`
        : undefined,
    repairActions,
    summary,
  }, normalizedCritiqueTransport);
}

async function buildRenderCritiqueReport(
  task,
  execution,
  geometryRecipe,
  qualityMetrics,
  viewScores,
  repairActions,
  runtimeArtifacts,
  backendConfig,
  toolNames,
  invokedTools,
) {
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const requestedNoun = execution.requestedNoun ?? geometryRecipe?.requestedNoun;

  if (!isOpenNounExecution(execution)) {
    return {
      renderCritiqueAvailable: true,
      report: buildFallbackRenderCritiqueReport({
        execution,
        geometryRecipe,
        partBlueprints: runtimeArtifacts.partBlueprints,
        partGraph: runtimeArtifacts.partGraph,
        anchorProjection: runtimeArtifacts.anchorProjection,
        outlineCompilerMode: runtimeArtifacts.outlineCompilerMode,
        outlineProjectionVariantId: runtimeArtifacts.outlineProjectionVariantId,
        qualityMetrics,
        viewScores,
        repairActions,
        requestedNoun,
        runtimeShapeClass,
        critiqueTransport: buildVisionCritiqueTransport({
          source: "render-hybrid",
          provider: "local",
          endpoint: "local-hybrid",
          renderCritiqueAvailable: true,
          capturedViews: [],
          transportViews: [],
        }),
        summary: `${requestedNoun ?? execution.shapeLabel} 混合评审：render ${Math.round(
          qualityMetrics.nounFidelity * 100,
        )}% / 轮廓 ${Math.round(qualityMetrics.visualReadability * 100)}% / cohesion ${Math.round(
          qualityMetrics.cohesionScore * 100,
        )}%`,
        dominantFailureMode:
          qualityMetrics.lookalikeRisk > 0.42
            ? "lookalike-risk-high"
            : qualityMetrics.cohesionScore < 0.78
              ? "structure-not-cohesive"
              : "minor-polish",
        cohesionIssues:
          qualityMetrics.cohesionScore < 0.78
            ? ["部件装配仍然不够紧，继续做结构精修。"]
            : [],
        nextPassPriority:
          qualityMetrics.cohesionScore < 0.78
            ? "assembly-rooting"
            : "final-review",
      }),
    };
  }

  const critiqueCapture = await captureRenderCritiqueViews(
    task,
    execution,
    runtimeArtifacts,
    backendConfig,
    toolNames,
    invokedTools,
  );

  logOpenAiCritiqueDebug(
    `views:captured request=${execution.requestId} count=${Array.isArray(critiqueCapture.critiqueViews) ? critiqueCapture.critiqueViews.length : 0}`,
  );

  if (!Array.isArray(critiqueCapture.critiqueViews) || critiqueCapture.critiqueViews.length === 0) {
    return {
      renderCritiqueAvailable: false,
      report: buildFallbackRenderCritiqueReport({
        execution,
        geometryRecipe,
        partBlueprints: runtimeArtifacts.partBlueprints,
        partGraph: runtimeArtifacts.partGraph,
        anchorProjection: runtimeArtifacts.anchorProjection,
        outlineCompilerMode: runtimeArtifacts.outlineCompilerMode,
        outlineProjectionVariantId: runtimeArtifacts.outlineProjectionVariantId,
        qualityMetrics,
        viewScores,
        repairActions,
        requestedNoun,
        runtimeShapeClass,
        critiqueTransport: buildVisionCritiqueTransport({
          source: "blueprint-projection",
          provider: "local",
          endpoint: "blueprint-projection",
          renderCritiqueAvailable: false,
          failureNote: critiqueCapture.failureNote,
          capturedViews: critiqueCapture.critiqueViews,
          transportViews: [],
        }),
        summary: `${requestedNoun ?? execution.shapeLabel} 当前仅完成 blueprint critique，render critique unavailable。`,
        dominantFailureMode: "render-critique-unavailable",
        cohesionIssues: uniqueStrings([
          qualityMetrics.cohesionScore < 0.82
            ? "Open noun 当前仍缺少真正的 render critique，只完成了结构侧自检。"
            : "Open noun 当前缺少 render critique，不能标记为 implemented。",
          critiqueCapture.failureNote,
        ]),
        nextPassPriority:
          qualityMetrics.faceIntrusionSeverity > 0.28
            ? "host-fit"
            : "render-driven-rebuild",
      }),
    };
  }

  const config = resolveLlmProviderConfig("vision", {
    env: applyLlmRequestConfigToEnv(
      process.env,
      task.input.llmConfig ?? task.handoffRecipe.llmConfig,
    ),
  });
  const providerLabel = config ? getAiProviderLabel(config.provider) : "AI";

  if (!config) {
    return {
      renderCritiqueAvailable: false,
      report: buildFallbackRenderCritiqueReport({
        execution,
        geometryRecipe,
        partBlueprints: runtimeArtifacts.partBlueprints,
        partGraph: runtimeArtifacts.partGraph,
        anchorProjection: runtimeArtifacts.anchorProjection,
        outlineCompilerMode: runtimeArtifacts.outlineCompilerMode,
        outlineProjectionVariantId: runtimeArtifacts.outlineProjectionVariantId,
        qualityMetrics,
        viewScores,
        repairActions,
        requestedNoun,
        runtimeShapeClass,
        critiqueTransport: buildVisionCritiqueTransport({
          source: "viewport-capture",
          provider: "local",
          endpoint: "viewport-capture",
          renderCritiqueAvailable: false,
          failureNote: `已产出 viewport 评审图，但当前没有可用 ${providerLabel} render critique 配置。`,
          capturedViews: critiqueCapture.critiqueViews,
          transportViews: critiqueCapture.critiqueViews,
        }),
        summary: `${requestedNoun ?? execution.shapeLabel} 已产出 viewport 评审图，但当前无法完成 AI render critique。`,
        dominantFailureMode: "render-critique-unconfigured",
        cohesionIssues: [`已产出 viewport 评审图，但当前没有可用 ${providerLabel} render critique 配置。`],
        nextPassPriority:
          qualityMetrics.faceIntrusionSeverity > 0.28
            ? "host-fit"
            : "render-driven-rebuild",
      }),
    };
  }

  if (!supportsRemoteRenderCritique(config)) {
    return {
      renderCritiqueAvailable: false,
      report: buildFallbackRenderCritiqueReport({
        execution,
        geometryRecipe,
        partBlueprints: runtimeArtifacts.partBlueprints,
        partGraph: runtimeArtifacts.partGraph,
        anchorProjection: runtimeArtifacts.anchorProjection,
        outlineCompilerMode: runtimeArtifacts.outlineCompilerMode,
        outlineProjectionVariantId: runtimeArtifacts.outlineProjectionVariantId,
        qualityMetrics,
        viewScores,
        repairActions,
        requestedNoun,
        runtimeShapeClass,
        critiqueTransport: buildVisionCritiqueTransport({
          source: "viewport-capture",
          provider: config.provider,
          model: config.model,
          endpoint: "viewport-capture",
          renderCritiqueAvailable: false,
          renderCritiquePolicy: "viewport-fallback-allowed",
          failureNote: `${providerLabel} 当前不支持我们这套 image_url render critique payload，已退回 viewport-capture 评审。`,
          capturedViews: critiqueCapture.critiqueViews,
          transportViews: critiqueCapture.critiqueViews,
        }),
        summary: `${requestedNoun ?? execution.shapeLabel} 已产出 viewport 评审图，但当前 ${providerLabel} 不支持 image_url render critique，已退回本地 viewport 评审。`,
        dominantFailureMode: undefined,
        cohesionIssues: [
          `${providerLabel} 当前不支持我们这套 image_url render critique payload，已退回 viewport-capture 评审。`,
        ],
        nextPassPriority:
          qualityMetrics.faceIntrusionSeverity > 0.28
            ? "host-fit"
            : "render-driven-rebuild",
      }),
    };
  }

  const critiqueInput = buildRenderCritiqueInput(
    execution,
    geometryRecipe,
    qualityMetrics,
    repairActions,
    runtimeArtifacts,
  );
  const preferChatCompletions = shouldPreferChatCompletionsForRenderCritique(config);
  const critiqueViewsForTransport = selectRenderCritiqueViewsForTransport(
    config,
    critiqueCapture.critiqueViews,
  );
  const critiqueRequestPayload = buildVisionCritiquePayloadContract(
    critiqueInput,
    critiqueViewsForTransport,
  );
  logOpenAiCritiqueDebug(
    `views:transport request=${execution.requestId} count=${critiqueViewsForTransport.length} selected=${critiqueViewsForTransport.map((entry) => entry?.view).join(",")}`,
  );
  const chatAttempt = preferChatCompletions
      ? await tryBuildRenderCritiqueWithOpenAiChatCompletions(
        config,
        critiqueRequestPayload,
        critiqueViewsForTransport,
        { lightweightMode: true },
      )
    : { payload: null, failureNote: null };
  const responsesAttempt =
    preferChatCompletions || chatAttempt.payload
      ? { payload: null, failureNote: chatAttempt.failureNote }
      : await tryBuildRenderCritiqueWithOpenAiResponses(
          config,
          critiqueRequestPayload,
          critiqueViewsForTransport,
        );
  const chatFallbackAttempt =
    preferChatCompletions ||
    chatAttempt.payload ||
    responsesAttempt.payload ||
    !shouldAttemptRenderCritiqueChatFallback(responsesAttempt.failureNote)
      ? { payload: null, failureNote: preferChatCompletions ? chatAttempt.failureNote : responsesAttempt.failureNote }
      : await tryBuildRenderCritiqueWithOpenAiChatCompletions(
          config,
          critiqueRequestPayload,
          critiqueViewsForTransport,
          { lightweightMode: preferChatCompletions },
        );
  const critiquePayload =
    chatAttempt.payload ?? responsesAttempt.payload ?? chatFallbackAttempt.payload;

  if (!critiquePayload) {
    const critiqueFailureNote = uniqueStrings([
      responsesAttempt.failureNote,
      chatAttempt.failureNote,
      chatFallbackAttempt.failureNote,
    ]).join(" / ");
    const timeoutFailure = [
      chatAttempt.failureNote,
      responsesAttempt.failureNote,
      chatFallbackAttempt.failureNote,
    ].some(isRenderCritiqueTimeoutFailure);

    return {
      renderCritiqueAvailable: false,
      report: buildFallbackRenderCritiqueReport({
        execution,
        geometryRecipe,
        partBlueprints: runtimeArtifacts.partBlueprints,
        partGraph: runtimeArtifacts.partGraph,
        anchorProjection: runtimeArtifacts.anchorProjection,
        outlineCompilerMode: runtimeArtifacts.outlineCompilerMode,
        outlineProjectionVariantId: runtimeArtifacts.outlineProjectionVariantId,
        qualityMetrics,
        viewScores,
        repairActions,
        requestedNoun,
        runtimeShapeClass,
        critiqueTransport: buildVisionCritiqueTransport({
          source: "viewport-capture",
          provider: config.provider,
          model: config.model,
          endpoint: "viewport-capture",
          renderCritiqueAvailable: false,
          failureNote: critiqueFailureNote,
          capturedViews: critiqueCapture.critiqueViews,
          transportViews: critiqueViewsForTransport,
        }),
        summary: `${requestedNoun ?? execution.shapeLabel} 已产出 viewport 评审图，但 render critique 不可用。`,
        dominantFailureMode: timeoutFailure
          ? "render-critique-timeout"
          : "render-critique-failed",
        cohesionIssues: uniqueStrings([
          `viewport 评审图已产出，但 ${providerLabel} render critique 失败。`,
          timeoutFailure ? "连续当前代理超时，不能继续把 render critique 当成稳定可用。" : undefined,
          preferChatCompletions
            ? `当前自定义 ${providerLabel} base URL 已直接改走 chat/completions 视觉评审。`
            : undefined,
          responsesAttempt.failureNote,
          chatAttempt.failureNote,
          chatFallbackAttempt.failureNote,
        ]),
        nextPassPriority:
          qualityMetrics.faceIntrusionSeverity > 0.28
            ? "host-fit"
            : "render-driven-rebuild",
      }),
    };
  }

  const mergedRepairActions = augmentRepairActionsWithCritiqueHints(
    critiquePayload,
    mergeRenderRepairActions(repairActions, critiquePayload.repairActions),
  );
  const renderLookalikeRisk = Math.max(
    qualityMetrics.lookalikeRisk,
    critiquePayload.lookalikeRisk ?? qualityMetrics.lookalikeRisk,
  );
  const renderCohesionScore =
    typeof critiquePayload.cohesionScore === "number"
      ? Math.min(qualityMetrics.cohesionScore, critiquePayload.cohesionScore)
      : qualityMetrics.cohesionScore;

  return {
    renderCritiqueAvailable: true,
    report: attachVisionCritiqueTransport({
      reportId: `critique-${execution.executionId}`,
      executionId: execution.executionId,
      requestId: execution.requestId,
      requestedNoun: critiquePayload.requestedNoun ?? requestedNoun,
      designArchetype: getExecutionDesignArchetype(execution, geometryRecipe),
      runtimeShapeClass,
      source: "render-hybrid",
      viewScores,
      lookalikeRisk: renderLookalikeRisk,
      criticalPartsPresent: qualityMetrics.criticalPartsPresent,
      nounFidelity: qualityMetrics.nounFidelity,
      renderNounFidelity:
        critiquePayload.renderNounFidelity ?? qualityMetrics.nounFidelity,
      criticalPartsVisible:
        critiquePayload.criticalPartsVisible ?? qualityMetrics.criticalPartsPresent,
      silhouetteReadability:
        critiquePayload.silhouetteReadability ?? qualityMetrics.visualReadability,
      cohesionScore: renderCohesionScore,
      cohesionIssues: critiquePayload.cohesionIssues ?? [],
      dominantFailureMode: critiquePayload.dominantFailureMode,
      oversizeParts: critiquePayload.oversizeParts ?? [],
      hiddenCriticalParts: critiquePayload.hiddenCriticalParts ?? [],
      flattenedStructureParts: critiquePayload.flattenedStructureParts ?? [],
      flattenedPartIds:
        critiquePayload.flattenedPartIds ?? critiquePayload.flattenedStructureParts ?? [],
      detachedPartIds: critiquePayload.detachedPartIds ?? [],
      hostInterferenceZones: critiquePayload.hostInterferenceZones ?? [],
      hostIntrusionZones:
        critiquePayload.hostIntrusionZones ?? critiquePayload.hostInterferenceZones ?? [],
      silhouetteBreakpoints: critiquePayload.silhouetteBreakpoints ?? [],
      dominantSpanOwner:
        critiquePayload.dominantSpanOwner ?? qualityMetrics.dominantSpanOwner,
      faceIntrusionSeverity:
        critiquePayload.faceIntrusionSeverity ?? qualityMetrics.faceIntrusionSeverity,
      partAttachmentCredibility:
        critiquePayload.partAttachmentCredibility ??
        qualityMetrics.partAttachmentCredibility,
      projectedAnchorPose:
        critiquePayload.projectedAnchorPose ??
        runtimeArtifacts.anchorProjection?.projectedAnchorPose,
      anchorPlaneOffset:
        critiquePayload.anchorPlaneOffset ??
        runtimeArtifacts.anchorProjection?.anchorPlaneOffset,
      earSideTangentOffset:
        critiquePayload.earSideTangentOffset ??
        runtimeArtifacts.anchorProjection?.earSideTangentOffset,
      anchorProjectionFailureKind:
        critiquePayload.anchorProjectionFailureKind ??
        runtimeArtifacts.anchorProjection?.anchorProjectionFailureKind,
      outlineCompilerMode:
        critiquePayload.outlineCompilerMode ?? runtimeArtifacts.outlineCompilerMode,
      outlineProjectionVariantId:
        critiquePayload.outlineProjectionVariantId ??
        runtimeArtifacts.outlineProjectionVariantId,
      nounReadOrder: critiquePayload.nounReadOrder ?? [],
      finalReadOrder:
        critiquePayload.finalReadOrder ??
        critiquePayload.nounReadOrder ??
        buildFallbackReadOrderTargets(execution, geometryRecipe),
      firstReadPart:
        critiquePayload.firstReadPart ??
        critiquePayload.finalReadOrder?.[0] ??
        critiquePayload.nounReadOrder?.[0],
      dominantFailureLayer:
        critiquePayload.dominantFailureLayer ??
        inferDominantFailureLayerFromReport(critiquePayload),
      rootSilhouetteFailure: critiquePayload.rootSilhouetteFailure,
      assemblyFailure: critiquePayload.assemblyFailure,
      hostFitFailure: critiquePayload.hostFitFailure,
      readOrderFailure: critiquePayload.readOrderFailure,
      rebuildDirective:
        critiquePayload.rebuildDirective ??
        inferRebuildDirectiveFromFailureLayer(
          critiquePayload.dominantFailureLayer ??
            inferDominantFailureLayerFromReport(critiquePayload),
        ),
      targetRootSpan: critiquePayload.targetRootSpan,
      targetDepthProfile:
        critiquePayload.targetDepthProfile ?? inferTargetDepthProfile(runtimeShapeClass),
      targetAttachmentPose: critiquePayload.targetAttachmentPose,
      nextPassPriority:
        critiquePayload.nextPassPriority ??
        inferNextPassPriorityFromFailureLayer(
          critiquePayload.dominantFailureLayer ??
            inferDominantFailureLayerFromReport(critiquePayload),
        ),
      firstReadResult:
        critiquePayload.firstReadResult ??
        critiquePayload.finalReadOrder?.[0] ??
        critiquePayload.nounReadOrder?.[0] ??
        requestedNoun ??
        execution.shapeLabel,
      visualVeto:
        critiquePayload.visualVeto ??
        Boolean(
          critiquePayload.visualVetoReason ||
            (typeof critiquePayload.firstReadResult === "string" &&
              /generic|slab|bar|token|badge/i.test(critiquePayload.firstReadResult)),
        ),
      visualVetoReason:
        critiquePayload.visualVetoReason ??
        (typeof critiquePayload.firstReadResult === "string" &&
        /generic|slab|bar|token|badge/i.test(critiquePayload.firstReadResult)
          ? `主视图 first read 仍像 ${critiquePayload.firstReadResult}，需要否决并切换表达方式。`
          : undefined),
      variantSwitchRecommended:
        critiquePayload.variantSwitchRecommended ??
        (typeof critiquePayload.firstReadResult === "string" &&
        /generic|slab|bar|token|badge/i.test(critiquePayload.firstReadResult)
          ? true
          : undefined),
      repairIntensityHints: critiquePayload.repairIntensityHints ?? [],
      actualApproximationLabel:
        critiquePayload.actualApproximationLabel ??
        (renderLookalikeRisk > 0.42 ? `${requestedNoun ?? execution.shapeLabel} 近似件` : undefined),
      repairActions: mergedRepairActions,
      summary:
        critiquePayload.summary ??
        `${requestedNoun ?? execution.shapeLabel} render critique 已完成。`,
    }, buildVisionCritiqueTransport({
      source: "render-hybrid",
      provider: config.provider,
      model: config.model,
      endpoint: chatAttempt.payload
        ? "chat/completions"
        : responsesAttempt.payload
          ? "responses"
          : "chat/completions",
      renderCritiqueAvailable: true,
      capturedViews: critiqueCapture.critiqueViews,
      transportViews: critiqueViewsForTransport,
    })),
  };
}

function canonicalizeVisualCritiqueReport(
  execution,
  geometryRecipe,
  report,
  renderCritiqueAvailable,
) {
  return canonicalizeVisualCritiqueReportFromLib(
    execution,
    geometryRecipe,
    report,
    renderCritiqueAvailable,
  );
}

function buildRuntimeRepairActions(
  execution,
  geometryRecipe,
  partBlueprints,
  partGraph,
  qualityMetrics,
) {
  return buildRuntimeRepairActionsFromLib(
    execution,
    geometryRecipe,
    partBlueprints,
    partGraph,
    qualityMetrics,
  );
}

function getCapabilityRootEmbedStrength(
  execution,
  geometryRecipe,
  partId,
  parentPartId,
  rootPartId,
  repairActions = [],
) {
  return getCapabilityRootEmbedStrengthFromLib(
    execution,
    geometryRecipe,
    partId,
    parentPartId,
    rootPartId,
    repairActions,
  );
}

function getCapabilityPlacementRecoveryOffset(
  execution,
  geometryRecipe,
  repairActions = [],
) {
  return getCapabilityPlacementRecoveryOffsetFromLib(
    execution,
    geometryRecipe,
    repairActions,
  );
}

function scoreAnchorAccuracy(placementOffset, desiredPlacementOffset) {
  const delta = getVectorMagnitude(
    subtractVector(placementOffset, desiredPlacementOffset),
  );

  return roundMetric(1 - delta / 0.02);
}

function scoreAnchorFitConfidence(rawAnchorFitDelta) {
  const delta = getVectorMagnitude(rawAnchorFitDelta);
  return roundMetric(1 - delta / 0.09);
}

function scoreOcclusionRisk(
  execution,
  geometryRecipe,
  placementOffset,
  desiredPlacementOffset,
  partBlueprints,
) {
  const bounds = computePartBounds(partBlueprints);
  const placementDelta = getVectorMagnitude(
    subtractVector(placementOffset, desiredPlacementOffset),
  );

  if (!bounds) {
    return roundMetric(1 - placementDelta / 0.02);
  }

  const hostProfile = getHostCompositionProfileForExecution(execution, geometryRecipe);
  const overlapPenalty = hostProfile.occlusionZones.reduce((sum, zone) => {
    const overlapRatio = calculateBoundsOverlapRatio(bounds, zone.bounds);
    return sum + overlapRatio * zone.weight;
  }, 0);
  const overflowPenalty = bounds.span.reduce((sum, value, index) => {
    const maxSpan = hostProfile.maxSpan[index] ?? value;
    return sum + Math.max(0, value - maxSpan) / Math.max(maxSpan, 0.0001);
  }, 0);
  const faceIntrusionSeverity = getFaceIntrusionSeverity(
    execution,
    geometryRecipe,
    partBlueprints,
  );

  return roundMetric(
    1 -
      placementDelta / 0.03 -
      overlapPenalty * 0.92 -
      overflowPenalty * 0.22 -
      faceIntrusionSeverity * 0.4,
  );
}

function scoreScaleFit(execution, geometryRecipe, overallScaleMultiplier, partBlueprints) {
  const ideal = getIdealAccessoryScaleMultiplier(
    getExecutionRuntimeShapeClass(execution),
  );
  const multiplierScore = roundMetric(1 - Math.abs(overallScaleMultiplier - ideal) / 0.28);
  const bounds = computePartBounds(partBlueprints);

  if (!bounds) {
    return multiplierScore;
  }

  const hostProfile = getHostCompositionProfileForExecution(execution, geometryRecipe);
  const preferredScores = bounds.span.map((value, index) =>
    scoreTargetSpanFit(value, hostProfile.preferredSpan[index] ?? value, {
      undersizeTolerance: 0.72,
      oversizeTolerance: 0.18,
    }));
  const maxScores = bounds.span.map((value, index) =>
    scoreSpanLimitFit(value, hostProfile.maxSpan[index] ?? value));

  return roundMetric(
    preferredScores[0] * 0.24 +
      preferredScores[1] * 0.14 +
      preferredScores[2] * 0.24 +
      maxScores[0] * 0.12 +
      maxScores[1] * 0.06 +
      maxScores[2] * 0.12 +
      multiplierScore * 0.08,
  );
}

function getExecutionDesignArchetype(execution, geometryRecipe) {
  if (typeof execution.designArchetype === "string" && execution.designArchetype) {
    return execution.designArchetype;
  }

  return isRecord(geometryRecipe) && typeof geometryRecipe.designArchetype === "string"
    ? geometryRecipe.designArchetype
    : "known-family";
}

function getExecutionCriticalParts(geometryRecipe) {
  return isRecord(geometryRecipe) && Array.isArray(geometryRecipe.criticalParts)
    ? geometryRecipe.criticalParts.filter((value) => typeof value === "string")
    : [];
}

function partMatchesCriticalPart(part, criticalPart) {
  if (!isRecord(part) || typeof criticalPart !== "string") {
    return false;
  }

  const partId = typeof part.partId === "string" ? part.partId : "";
  const role = typeof part.role === "string" ? part.role : "";

  return (
    partId === criticalPart ||
    partId.startsWith(`${criticalPart}-`) ||
    criticalPart.startsWith(`${partId}-`) ||
    role === criticalPart ||
    role.includes(criticalPart)
  );
}

function scoreCriticalPartsPresent(partBlueprints, geometryRecipe) {
  const criticalParts = getExecutionCriticalParts(geometryRecipe);

  if (criticalParts.length === 0) {
    return 1;
  }

  const matchedCount = criticalParts.filter((criticalPart) =>
    partBlueprints.some((part) => partMatchesCriticalPart(part, criticalPart)),
  ).length;

  return roundMetric(matchedCount / criticalParts.length);
}

function scoreArchetypeMatch(execution, geometryRecipe, partBlueprints, criticalPartsPresent) {
  const designArchetype = getExecutionDesignArchetype(execution, geometryRecipe);
  const partIds = new Set(
    partBlueprints
      .map((part) => (typeof part.partId === "string" ? part.partId : null))
      .filter((value) => typeof value === "string"),
  );

  if (designArchetype === "known-family") {
    return 1;
  }

  if (designArchetype === "device-charm") {
    return roundMetric(
      (partIds.has("device-body") ? 0.4 : 0) +
        (partIds.has("screen-face") || partIds.has("camera-lens") ? 0.4 : 0) +
        (partIds.has("hang-slot") ? 0.2 : 0),
    );
  }

  if (designArchetype === "vehicle-charm") {
    return roundMetric(
      (partIds.has("rocket-body") || partIds.has("boat-hull") || partIds.has("vehicle-body")
        ? 0.4
        : 0) +
        (partIds.has("rocket-nose") ||
        partIds.has("rocket-fin-left") ||
        partIds.has("rocket-fin-right") ||
        partIds.has("rocket-nozzle") ||
        partIds.has("boat-sail") ||
        partIds.has("boat-mast") ||
        partIds.has("vehicle-front") ||
        partIds.has("vehicle-rear")
          ? 0.4
          : 0) +
        (partIds.has("hang-slot") ? 0.2 : 0),
    );
  }

  if (designArchetype === "tool-charm") {
    return roundMetric(
      (partIds.has("tool-body") ? 0.45 : 0) +
        (partIds.has("tool-head") ? 0.35 : 0) +
        (partIds.has("hang-slot") ? 0.2 : 0),
    );
  }

  return roundMetric(criticalPartsPresent * 0.8 + 0.2);
}

function requiresNounFidelityGate(execution, geometryRecipe) {
  const requestedNoun =
    typeof execution.requestedNoun === "string" && execution.requestedNoun.trim()
      ? execution.requestedNoun.trim()
      : isRecord(geometryRecipe) && typeof geometryRecipe.requestedNoun === "string"
        ? geometryRecipe.requestedNoun.trim()
        : "";
  const designArchetype = getExecutionDesignArchetype(execution, geometryRecipe);

  return Boolean(
    requestedNoun &&
      (execution.familyResolutionSource === "open-noun" ||
        designArchetype !== "known-family"),
  );
}

function getNounFidelityThreshold(execution, geometryRecipe) {
  return getExecutionDesignArchetype(execution, geometryRecipe) === "known-family"
    ? 0.78
    : 0.74;
}

async function evaluateRuntimeExecutionQuality(
  task,
  execution,
  runtimeArtifacts,
  backendConfig,
  toolNames,
  invokedTools,
) {
  const thresholds = getExecutionMetricThresholds(
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const partCountPassed =
    runtimeArtifacts.createdNames.length >= runtimeArtifacts.hardMinimumPartCount;
  const shapeReadability = scoreRoleCoverage(
    runtimeArtifacts.partBlueprints,
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const placementAnchorAccuracy = scoreAnchorAccuracy(
    runtimeArtifacts.placementOffset,
    runtimeArtifacts.desiredPlacementOffset,
  );
  const anchorFitConfidence = scoreAnchorFitConfidence(
    runtimeArtifacts.rawAnchorFitDelta,
  );
  const anchorAccuracy = roundMetric(
    placementAnchorAccuracy * 0.7 + anchorFitConfidence * 0.3,
  );
  const viewScores = buildProjectedViewScores(
    runtimeArtifacts.partBlueprints,
    execution,
    anchorAccuracy,
  );
  const visualReadability = scoreVisualReadability(viewScores);
  const colorIsolation = roundMetric(execution.colorIntent ? 1 : 0.9);
  const faceIntrusionSeverity = getFaceIntrusionSeverity(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.partBlueprints,
  );
  const occlusionRisk = scoreOcclusionRisk(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.placementOffset,
    runtimeArtifacts.desiredPlacementOffset,
    runtimeArtifacts.partBlueprints,
  );
  const scaleFit = scoreScaleFit(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.overallScaleMultiplier,
    runtimeArtifacts.partBlueprints,
  );
  const hostComposition = scoreHostComposition(
    anchorAccuracy,
    scaleFit,
    occlusionRisk,
    faceIntrusionSeverity,
  );
  const silhouetteStrength = scoreSilhouetteStrength(
    runtimeArtifacts.partBlueprints,
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const criticalPartsPresent = scoreCriticalPartsPresent(
    runtimeArtifacts.partBlueprints,
    runtimeArtifacts.geometryRecipe,
  );
  const archetypeMatch = scoreArchetypeMatch(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.partBlueprints,
    criticalPartsPresent,
  );
  const geometricCohesionScore = scoreCohesion(
    runtimeArtifacts.partBlueprints,
    runtimeArtifacts.partGraph,
  );
  const partAttachmentCredibility = scorePartAttachmentCredibility(
    runtimeArtifacts.partBlueprints,
    runtimeArtifacts.partGraph,
  );
  const dominantSpanOwner = getDominantSpanOwner(runtimeArtifacts.partBlueprints);
  const geometricLookalikeRisk = scoreLookalikeRisk(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.partBlueprints,
    criticalPartsPresent,
    archetypeMatch,
    visualReadability,
  );
  const nounFidelity = roundMetric(
    criticalPartsPresent * 0.32 +
      archetypeMatch * 0.24 +
      shapeReadability * 0.12 +
      visualReadability * 0.18 +
      silhouetteStrength * 0.14,
  );
  const nounFidelityGatePassed =
    !requiresNounFidelityGate(execution, runtimeArtifacts.geometryRecipe) ||
    (
      criticalPartsPresent >= 0.72 &&
      archetypeMatch >= 0.72 &&
      nounFidelity >=
        getNounFidelityThreshold(execution, runtimeArtifacts.geometryRecipe)
    );
  const explicitShapeGatePassed =
    !requiresExplicitShapeGate(execution) ||
    (
      runtimeArtifacts.partBlueprints.length >=
        Math.max(runtimeArtifacts.hardMinimumPartCount, 4) &&
      shapeReadability >= 0.84 &&
      visualReadability >= 0.8 &&
      silhouetteStrength >= 0.8
    );
  const hardGatePassed =
    partCountPassed &&
    placementAnchorAccuracy >= thresholds.placementAnchorAccuracy &&
    colorIsolation >= thresholds.colorIsolation;
  const repairActions = buildRuntimeRepairActions(
    execution,
    runtimeArtifacts.geometryRecipe,
    runtimeArtifacts.partBlueprints,
    runtimeArtifacts.partGraph,
    {
      shapeReadability,
      visualReadability,
      anchorAccuracy,
      colorIsolation,
      occlusionRisk,
      scaleFit,
      hostComposition,
      silhouetteStrength,
      faceIntrusionSeverity,
      dominantSpanOwner,
      partAttachmentCredibility,
      lookalikeRisk: geometricLookalikeRisk,
      nounFidelity,
      criticalPartsPresent,
      archetypeMatch,
      cohesionScore: geometricCohesionScore,
    },
  );
  const renderCritique = await buildRenderCritiqueReport(
    task,
    execution,
    runtimeArtifacts.geometryRecipe,
    {
      shapeReadability,
      visualReadability,
      anchorAccuracy,
      colorIsolation,
      occlusionRisk,
      scaleFit,
      hostComposition,
      silhouetteStrength,
      faceIntrusionSeverity,
      dominantSpanOwner,
      partAttachmentCredibility,
      lookalikeRisk: geometricLookalikeRisk,
      nounFidelity,
      criticalPartsPresent,
      archetypeMatch,
      cohesionScore: geometricCohesionScore,
    },
    viewScores,
    repairActions,
    runtimeArtifacts,
    backendConfig,
    toolNames,
    invokedTools,
  );
  const canonicalVisualCritiqueReport = canonicalizeVisualCritiqueReport(
    execution,
    runtimeArtifacts.geometryRecipe,
    renderCritique.report,
    renderCritique.renderCritiqueAvailable,
  );
  const critiqueDrivenRepairActions = mergeRenderRepairActions(
    canonicalVisualCritiqueReport.repairActions,
    buildRepresentationDrivenRepairActions(canonicalVisualCritiqueReport),
  );
  const lookalikeRisk =
    typeof canonicalVisualCritiqueReport.lookalikeRisk === "number"
      ? canonicalVisualCritiqueReport.lookalikeRisk
      : geometricLookalikeRisk;
  const visualVeto = canonicalVisualCritiqueReport.visualVeto === true;
  const renderNounFidelity =
    typeof canonicalVisualCritiqueReport.renderNounFidelity === "number"
      ? canonicalVisualCritiqueReport.renderNounFidelity
      : nounFidelity;
  const silhouetteReadability =
    typeof canonicalVisualCritiqueReport.silhouetteReadability === "number"
      ? canonicalVisualCritiqueReport.silhouetteReadability
      : visualReadability;
  const cohesionScore =
    typeof canonicalVisualCritiqueReport.cohesionScore === "number"
      ? canonicalVisualCritiqueReport.cohesionScore
      : geometricCohesionScore;
  const visualAcceptanceGatePassed =
    canonicalVisualCritiqueReport.visualAcceptanceGatePassed !== false;
  const viewportCritiqueAcceptanceAllowed = allowsViewportCritiqueAcceptanceFromLib(
    canonicalVisualCritiqueReport,
    renderCritique.renderCritiqueAvailable,
  );
  const qualityScoreWeights = [
    [shapeReadability, 0.17],
    [visualReadability, 0.08],
    [anchorAccuracy, 0.15],
    [colorIsolation, 0.08],
    [occlusionRisk, 0.08],
    [scaleFit, 0.09],
    [hostComposition, 0.11],
    [silhouetteStrength, 0.09],
    [nounFidelity, 0.08],
    [criticalPartsPresent, 0.05],
    [archetypeMatch, 0.04],
    [renderNounFidelity, 0.06],
    [silhouetteReadability, 0.06],
    [cohesionScore, 0.14],
    [1 - lookalikeRisk, 0.04],
  ];
  const totalQualityWeight = qualityScoreWeights.reduce(
    (sum, [, weight]) => sum + weight,
    0,
  );
  const weightedQualitySum = qualityScoreWeights.reduce(
    (sum, [metric, weight]) => sum + metric * weight,
    0,
  );
  const qualityScore = roundMetric(
    totalQualityWeight > 0 ? weightedQualitySum / totalQualityWeight : 0,
  );
  const structuralQualityPassed =
    hardGatePassed &&
    explicitShapeGatePassed &&
    nounFidelityGatePassed &&
    qualityScore >=
      getExecutionQualityThreshold(execution, runtimeArtifacts.geometryRecipe) &&
    shapeReadability >= thresholds.shapeReadability &&
    visualReadability >= thresholds.visualReadability &&
    scaleFit >= thresholds.scaleFit &&
    silhouetteStrength >= thresholds.silhouetteStrength &&
    occlusionRisk >= thresholds.occlusionRisk &&
    hostComposition >= thresholds.hostComposition &&
    cohesionScore >= thresholds.cohesionScore &&
    renderNounFidelity >= thresholds.renderNounFidelity &&
    lookalikeRisk <= thresholds.maxLookalikeRisk &&
    faceIntrusionSeverity <= 0.32;
  const qualityGatePassed =
    structuralQualityPassed &&
    (
      !isOpenNounExecution(execution) ||
      renderCritique.renderCritiqueAvailable ||
      viewportCritiqueAcceptanceAllowed
    ) &&
    !visualVeto &&
    visualAcceptanceGatePassed;
  const precisionThresholds = getExecutionPrecisionThresholds(
    execution,
    runtimeArtifacts.geometryRecipe,
  );
  const dominantFailureModes = uniqueStrings([
    typeof canonicalVisualCritiqueReport.dominantFailureMode === "string"
      ? canonicalVisualCritiqueReport.dominantFailureMode
      : undefined,
    criticalPartsPresent < precisionThresholds.criticalPartsPresent
      ? "critical-parts-underweight"
      : undefined,
    renderNounFidelity < precisionThresholds.renderNounFidelity
      ? "noun-fidelity-too-low"
      : undefined,
    silhouetteReadability < precisionThresholds.silhouetteReadability
      ? "silhouette-not-readable"
      : undefined,
    cohesionScore < precisionThresholds.cohesionScore ? "structure-not-cohesive" : undefined,
    scaleFit < precisionThresholds.scaleFit ? "host-scale-misaligned" : undefined,
    hostComposition < precisionThresholds.hostComposition ? "host-composition-poor" : undefined,
    faceIntrusionSeverity > 0.28 ? "face-intrusion-too-high" : undefined,
    isHardSurfaceOpenNounExecution(execution, runtimeArtifacts.geometryRecipe) &&
    canonicalVisualCritiqueReport.canonicalDominantSpanOwner &&
    !["device-body", "boat-hull"].includes(canonicalVisualCritiqueReport.canonicalDominantSpanOwner)
      ? "dominant-span-owner-wrong"
      : undefined,
    visualAcceptanceGatePassed ? undefined : "visual-acceptance-failed",
    visualVeto ? "visual-veto" : undefined,
    lookalikeRisk > precisionThresholds.maxLookalikeRisk ? "lookalike-risk-high" : undefined,
  ]);
  const precisionGatePassed =
    qualityGatePassed &&
    criticalPartsPresent >= precisionThresholds.criticalPartsPresent &&
    renderNounFidelity >= precisionThresholds.renderNounFidelity &&
    silhouetteReadability >= precisionThresholds.silhouetteReadability &&
    cohesionScore >= precisionThresholds.cohesionScore &&
    scaleFit >= precisionThresholds.scaleFit &&
    hostComposition >= precisionThresholds.hostComposition &&
    lookalikeRisk <= precisionThresholds.maxLookalikeRisk &&
    faceIntrusionSeverity <= 0.28 &&
    !visualVeto &&
    visualAcceptanceGatePassed &&
    (!isHardSurfaceOpenNounExecution(execution, runtimeArtifacts.geometryRecipe) ||
      !canonicalVisualCritiqueReport.canonicalDominantSpanOwner ||
      canonicalVisualCritiqueReport.canonicalDominantSpanOwner === "device-body" ||
      canonicalVisualCritiqueReport.canonicalDominantSpanOwner === "boat-hull");
  const precisionReady = precisionGatePassed && dominantFailureModes.length === 0;

  return {
    hardGatePassed,
    partCountPassed,
    structuralQualityPassed,
    qualityGatePassed,
    precisionGatePassed,
    precisionReady,
    qualityScore,
    renderCritiqueAvailable: renderCritique.renderCritiqueAvailable,
    visualAcceptanceGatePassed,
    faceIntrusionSeverity,
    dominantSpanOwner:
      canonicalVisualCritiqueReport.canonicalDominantSpanOwner ??
      dominantSpanOwner,
    partAttachmentCredibility,
    dominantFailureModes,
    qualityMetrics: {
      shapeReadability,
      visualReadability,
      anchorAccuracy,
      colorIsolation,
      occlusionRisk,
      scaleFit,
      hostComposition,
      silhouetteStrength,
      lookalikeRisk,
      nounFidelity,
      criticalPartsPresent,
      archetypeMatch,
      cohesionScore,
    },
    visualCritiqueReport: {
      ...canonicalVisualCritiqueReport,
      repairActions: critiqueDrivenRepairActions,
      silhouetteReadability,
      renderNounFidelity,
      cohesionScore,
    },
  };
}

function buildExecutionQualityNote(execution, qualityReport, passIndex) {
  const anchorLabel = getAccessoryAnchorLabel(execution.anchor);
  const metrics = qualityReport.qualityMetrics;

  return `${anchorLabel} · ${execution.shapeLabel} 第 ${passIndex} 轮评估：总分 ${Math.round(
    qualityReport.qualityScore * 100,
  )}% / 形状 ${Math.round(metrics.shapeReadability * 100)}% / 视觉 ${Math.round(
    metrics.visualReadability * 100,
  )}% / 落位 ${Math.round(
    metrics.anchorAccuracy * 100,
  )}% / 尺寸 ${Math.round(metrics.scaleFit * 100)}% / 宿主 ${Math.round(
    metrics.hostComposition * 100,
  )}% / 轮廓 ${Math.round(metrics.silhouetteStrength * 100)}% / cohesion ${Math.round(
    metrics.cohesionScore * 100,
  )}% / noun ${Math.round(
    metrics.nounFidelity * 100,
  )}% / 风险 ${Math.round(metrics.lookalikeRisk * 100)}%`;
}

function getGeneratedAccessoryMinimumPartCount(kind) {
  const minimums = {
    "necklace-chain": 7,
    "earring-hoop": 2,
    "pendant-charm": 3,
    scarf: 4,
    tie: 5,
    badge: 1,
    bow: 5,
    bell: 4,
    flower: 7,
    "clover-charm": 7,
    star: 6,
    cloud: 5,
    leaf: 2,
    forest: 4,
    mushroom: 4,
    dessert: 4,
    candy: 3,
    "dessert-hang": 4,
    "charm-token": 2,
    "fish-charm": 6,
    "berry-charm": 6,
    "cloud-charm": 5,
    "open-botanical-ornament": 6,
    "open-symbol-ornament": 6,
    "generic-animal-charm": 5,
    "generic-food-charm": 5,
    "generic-ornament": 4,
  };

  return minimums[kind] ?? 1;
}

async function getAnchorPosition(
  backendConfig,
  toolNames,
  referenceObject,
  direction,
  distance,
  offset = [0, 0, 0],
) {
  if (direction !== "center" && toolNames.has("calculate_position_relative_to")) {
    const payload = await invokePolyMcpTool(
      backendConfig.serverUrl,
      "calculate_position_relative_to",
      [],
      {
        reference_object: referenceObject,
        direction,
        distance,
        offset,
      },
    );
    const result = extractInvokeResult(payload);

    if (Array.isArray(result) && result.length === 3) {
      return result.map((value) => Number(value));
    }
  }

  const payload = await invokePolyMcpTool(
    backendConfig.serverUrl,
    "get_object_position",
    [],
    {
      object_name: referenceObject,
    },
  );
  const result = extractInvokeResult(payload);

  if (isRecord(result)) {
    const fallbackVector =
      direction === "front" && Array.isArray(result.front)
        ? result.front
        : Array.isArray(result.center)
          ? result.center
          : Array.isArray(result.location)
            ? result.location
            : null;

    if (fallbackVector) {
      return addVector(
        fallbackVector.map((value) => Number(value)),
        offset,
      );
    }
  }

  throw new Error(`无法确定动态配饰锚点位置：${referenceObject}`);
}

async function resolveGeneratedAnchorReferenceObject(
  execution,
  backendConfig,
  referenceObject,
  anchorObject,
) {
  if (
    execution?.executionMode !== "runtime-generated" ||
    typeof referenceObject !== "string" ||
    typeof anchorObject !== "string" ||
    referenceObject.length === 0 ||
    anchorObject.length === 0 ||
    referenceObject === anchorObject
  ) {
    return {
      referenceObject,
      fallbackUsed: false,
    };
  }

  const payload = await invokePolyMcpTool(
    backendConfig.serverUrl,
    "get_object_position",
    [],
    {
      object_name: referenceObject,
    },
  );
  const result = extractInvokeResult(payload);
  const radius =
    isRecord(result) && typeof result.radius === "number" ? result.radius : null;
  const size =
    isRecord(result) && Array.isArray(result.size)
      ? result.size.filter((value) => typeof value === "number")
      : [];
  const largestDimension =
    size.length > 0 ? Math.max(...size.map((value) => Math.abs(Number(value)))) : null;
  const placeholderLikeReference =
    (typeof radius === "number" && radius < 0.001) ||
    (typeof largestDimension === "number" && largestDimension < 0.002);

  return placeholderLikeReference
    ? {
        referenceObject: anchorObject,
        fallbackUsed: true,
        fallbackReason: `reference-object-too-small:${referenceObject}`,
      }
    : {
        referenceObject,
        fallbackUsed: false,
      };
}

function normalizeGeneratedAccessoryAnchor(anchor) {
  return normalizeRuntimeAccessoryAnchor(anchor);
}

function isDeviceFamilyRuntimeAccessory(family) {
  return isDeviceFamilyRuntimeAccessoryFromLib(family);
}

function isVehicleFamilyRuntimeAccessory(family) {
  return (
    family === "boat-charm" ||
    family === "rocket-charm" ||
    family === "vehicle-generic-charm"
  );
}

function getGeneratedAccessoryFamilyOffset(anchor, family) {
  const normalizedAnchor = normalizeGeneratedAccessoryAnchor(anchor);
  let anchorOffset = [0, 0, 0];

  if (normalizedAnchor === "head-top") {
    anchorOffset = [0, -0.002, 0.02];
  } else if (normalizedAnchor === "back-head") {
    anchorOffset = [0, 0.014, -0.002];
  } else if (normalizedAnchor === "chest-left") {
    anchorOffset = [0.016, 0.002, 0];
  } else if (normalizedAnchor === "chest-right") {
    anchorOffset = [-0.016, 0.002, 0];
  } else if (normalizedAnchor === "tail-top") {
    anchorOffset = [0, 0.012, 0.01];
  } else if (normalizedAnchor === "tail-left") {
    anchorOffset = [0.014, 0.008, 0.008];
  } else if (normalizedAnchor === "tail-right") {
    anchorOffset = [-0.014, 0.008, 0.008];
  } else if (normalizedAnchor === "tail-base") {
    anchorOffset = [0, 0.006, -0.006];
  }

  if (family === "necklace-chain") {
    return addVector(anchorOffset, [0, 0.012, 0.004]);
  }

  if (family === "pendant-charm") {
    return addVector(anchorOffset, [0, 0.008, 0.002]);
  }

  if (family === "scarf") {
    return addVector(
      anchorOffset,
      isChestRuntimeAnchor(normalizedAnchor)
        ? [0, 0.01, 0.004]
        : [0, -0.002, 0.001],
    );
  }

  if (family === "earring-hoop") {
    return addVector(
      anchorOffset,
      normalizedAnchor === "left-ear"
        ? [0.012, -0.02, -0.002]
        : [-0.012, -0.02, -0.002],
    );
  }

  if (isDeviceFamilyRuntimeAccessory(family)) {
    return addVector(
      anchorOffset,
      isChestRuntimeAnchor(normalizedAnchor)
        ? [0, 0.004, 0.001]
        : [0, -0.0045, 0.0032],
    );
  }

  if (isVehicleFamilyRuntimeAccessory(family)) {
    return addVector(
      anchorOffset,
      isChestRuntimeAnchor(normalizedAnchor)
        ? [0, 0.005, 0.001]
        : [0, -0.003, 0.002],
    );
  }

  if (family === "cloud") {
    return addVector(
      anchorOffset,
      isChestRuntimeAnchor(normalizedAnchor)
        ? [0, 0.004, 0.001]
        : [0, -0.004, -0.001],
    );
  }

  return anchorOffset;
}

function convertGltfPositionToBlenderLocation(position) {
  return [
    Number((position[0] ?? 0).toFixed(4)),
    Number((-(position[2] ?? 0)).toFixed(4)),
    Number((position[1] ?? 0).toFixed(4)),
  ];
}

function getRuntimeAccessoryBasePosition(anchor, family) {
  const normalizedAnchor = normalizeGeneratedAccessoryAnchor(anchor);

  if (normalizedAnchor === "left-ear") {
    if (family === "earring-hoop") {
      return [0.029, 0.0793, 0.0166];
    }

    if (isDeviceFamilyRuntimeAccessory(family)) {
      return [0.0282, 0.0836, 0.0186];
    }

    if (isVehicleFamilyRuntimeAccessory(family)) {
      return [0.0286, 0.086, 0.0168];
    }

    if (family === "tie") {
      return [0.0278, 0.0848, 0.0158];
    }

    if (family === "cloud" || family === "cloud-charm") {
      return [0.0284, 0.0868, 0.0159];
    }

    return [0.029, 0.0893, 0.0166];
  }

  if (normalizedAnchor === "right-ear") {
    if (family === "earring-hoop") {
      return [-0.029, 0.0793, 0.0166];
    }

    if (isDeviceFamilyRuntimeAccessory(family)) {
      return [-0.0282, 0.0836, 0.0186];
    }

    if (isVehicleFamilyRuntimeAccessory(family)) {
      return [-0.0286, 0.086, 0.0168];
    }

    if (family === "tie") {
      return [-0.0278, 0.0848, 0.0158];
    }

    if (family === "cloud" || family === "cloud-charm") {
      return [-0.0284, 0.0868, 0.0159];
    }

    return [-0.029, 0.0893, 0.0166];
  }

  if (normalizedAnchor === "forehead") {
    return [0.0068, 0.11, 0.0061];
  }

  if (normalizedAnchor === "head-top") {
    return [0.0014, 0.114, 0.002];
  }

  if (normalizedAnchor === "back-head") {
    return [0.001, 0.098, -0.01];
  }

  if (normalizedAnchor === "chest-left") {
    return [0.018, 0.0396, 0.0305];
  }

  if (normalizedAnchor === "chest-right") {
    return [-0.018, 0.0396, 0.0305];
  }

  if (normalizedAnchor === "tail-top") {
    return [0.0008, 0.056, -0.084];
  }

  if (normalizedAnchor === "tail-left") {
    return [0.018, 0.052, -0.08];
  }

  if (normalizedAnchor === "tail-right") {
    return [-0.018, 0.052, -0.08];
  }

  if (normalizedAnchor === "tail-base") {
    return [0.0008, 0.043, -0.058];
  }

  if (family === "bell") {
    return [0.0068, 0.0391, 0.0302];
  }

  if (family === "necklace-chain") {
    return [0.0013, 0.0435, 0.0292];
  }

  if (family === "pendant-charm") {
    return [0.0013, 0.0404, 0.0301];
  }

  if (family === "bow") {
    return [0.0023, 0.0346, 0.0313];
  }

  if (family === "tie") {
    return [0.0023, 0.0344, 0.0312];
  }

  if (family === "cloud" || family === "cloud-charm") {
    return [0.0016, 0.0396, 0.0309];
  }

  return [0.0013, 0.0375, 0.0307];
}

function getLegacyRuntimeAnchorPosition(execution) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  const runtimeAnchorPosition = addVector(
    getRuntimeAccessoryBasePosition(execution.anchor, shapeClass),
    addVector(
      getGeneratedAccessoryFamilyOffset(execution.anchor, shapeClass),
      getAccessoryInstanceOffset(
        execution.anchor,
        parseExecutionOrdinal(execution.instanceId),
      ),
    ),
  );

  return convertGltfPositionToBlenderLocation(runtimeAnchorPosition);
}

function getRuntimeAnchorFitBlendPolicy(execution, runtimeShapeClass, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  if (isRecord(runtimeDesignContract?.anchorFitPolicy)) {
    const basePolicy = {
      blendWeights: Array.isArray(runtimeDesignContract.anchorFitPolicy.blendWeights)
        ? runtimeDesignContract.anchorFitPolicy.blendWeights
        : [0.2, 0.2, 0.2],
      maxDeltas: Array.isArray(runtimeDesignContract.anchorFitPolicy.maxDeltas)
        ? runtimeDesignContract.anchorFitPolicy.maxDeltas
        : [0.018, 0.012, 0.018],
    };

    if (isHostCoupledChestWrapExecution(execution, geometryRecipe)) {
      const currentVariantId = getExecutionVariantId(execution, geometryRecipe) ?? "";
      const compactRecovery = /compact/i.test(currentVariantId);
      const hostFitEnvelope = getExecutionHostFitEnvelope(execution, geometryRecipe);
      const faceIntrusionBudget =
        typeof hostFitEnvelope?.faceIntrusionBudget === "number"
          ? hostFitEnvelope.faceIntrusionBudget
          : 0.08;
      const faceTightness = clamp01((0.14 - faceIntrusionBudget) / 0.08);

      return {
        blendWeights: compactRecovery
          ? [
              1,
              1,
              Number(Math.max(basePolicy.blendWeights[2] ?? 0.2, 0.92).toFixed(4)),
            ]
          : [
              Number(Math.max(basePolicy.blendWeights[0] ?? 0.2, 0.9).toFixed(4)),
              Number(Math.max(basePolicy.blendWeights[1] ?? 0.2, 0.96 + faceTightness * 0.04).toFixed(4)),
              Number(Math.max(basePolicy.blendWeights[2] ?? 0.2, 0.84 + faceTightness * 0.06).toFixed(4)),
            ],
        maxDeltas: compactRecovery
          ? [
              Number(Math.max(basePolicy.maxDeltas[0] ?? 0.018, 0.036).toFixed(4)),
              Number(Math.max(basePolicy.maxDeltas[1] ?? 0.012, 0.034).toFixed(4)),
              Number(Math.max(basePolicy.maxDeltas[2] ?? 0.018, 0.028).toFixed(4)),
            ]
          : [
              Number(Math.max(basePolicy.maxDeltas[0] ?? 0.018, 0.032).toFixed(4)),
              Number(Math.max(basePolicy.maxDeltas[1] ?? 0.012, 0.028 + faceTightness * 0.004).toFixed(4)),
              Number(Math.max(basePolicy.maxDeltas[2] ?? 0.018, 0.024).toFixed(4)),
            ],
      };
    }

    return {
      blendWeights: basePolicy.blendWeights,
      maxDeltas: basePolicy.maxDeltas,
    };
  }

  if (isExtendedCurveAnchor(execution.anchor)) {
    return {
      blendWeights: [1, 1, 1],
      maxDeltas: [0.04, 0.024, 0.04],
    };
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);
  const isEarSideAnchor =
    normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear";

  if (
    isEarSideAnchor &&
    isBotanicalBloomRuntimeShapeClass(runtimeShapeClass)
  ) {
    if (normalizedAnchor === "left-ear") {
      return {
        blendWeights: [0.58, 0.58, 0],
        maxDeltas: [0.03, 0.02, 0.018],
      };
    }

    return {
      blendWeights: [0.2, 0.2, 0.2],
      maxDeltas: [0.018, 0.012, 0.018],
    };
  }

  if (isEarSideAnchor && isOpenNounExecution(execution)) {
    return {
      blendWeights: [0.3, 0.3, 0.3],
      maxDeltas: [0.022, 0.015, 0.02],
    };
  }

  return {
    blendWeights: [0.2, 0.2, 0.2],
    maxDeltas: [0.018, 0.012, 0.018],
  };
}


function getRuntimeAccessoryAnchorObject(anchor, context, objectAliases) {
  const normalizedAnchor = normalizeGeneratedAccessoryAnchor(anchor);

  if (isHeadRuntimeAnchor(normalizedAnchor)) {
    return resolveObjectAliases(context.objects.head, objectAliases);
  }

  if (normalizedAnchor === "tail-base") {
    return resolveObjectAliases(context.objects.tail, objectAliases);
  }

  if (isTailRuntimeAnchor(normalizedAnchor)) {
    return resolveObjectAliases(
      context.objects.tailTip ?? context.objects.tail,
      objectAliases,
    );
  }

  return resolveObjectAliases(context.objects.chest, objectAliases);
}

function getGeneratedAnchorConfig(
  anchor,
  family,
  context,
  objectAliases,
  execution = null,
  geometryRecipe = null,
) {
  const normalizedAnchor = normalizeGeneratedAccessoryAnchor(anchor);
  const headObject = resolveObjectAliases(context.objects.head, objectAliases);
  const chestObject = resolveObjectAliases(context.objects.chest, objectAliases);
  const tailObject = resolveObjectAliases(context.objects.tail, objectAliases);
  const tailTipObject = resolveObjectAliases(
    context.objects.tailTip ?? context.objects.tail,
    objectAliases,
  );
  const contractReferenceOffset = getExecutionAnchorReferenceOffset(
    execution,
    geometryRecipe,
  );

  if (normalizedAnchor === "left-ear") {
    return {
      anchorObject: headObject,
      referenceObject: resolveObjectAliases(
        context.objects.accessoryFlower ?? context.objects.head,
        objectAliases,
      ),
      direction: "center",
      offset:
        family === "bell"
          ? [0.004, -0.002, -0.002]
          : isDeviceFamilyRuntimeAccessory(family)
            ? [0.007, -0.007, 0.004]
            : isVehicleFamilyRuntimeAccessory(family)
              ? [0.008, -0.005, 0.008]
            : [0.008, -0.004, 0.006],
    };
  }

  if (normalizedAnchor === "right-ear") {
    return {
      anchorObject: headObject,
      referenceObject: headObject,
      direction: "center",
      offset:
        family === "bell"
          ? [-0.034, -0.004, 0.044]
          : isDeviceFamilyRuntimeAccessory(family)
            ? [-0.035, -0.007, 0.042]
            : isVehicleFamilyRuntimeAccessory(family)
              ? [-0.038, -0.005, 0.046]
            : [-0.044, -0.004, 0.054],
    };
  }

  if (normalizedAnchor === "forehead") {
    return {
      anchorObject: headObject,
      referenceObject: resolveObjectAliases(
        context.objects.accessoryCrown ?? context.objects.head,
        objectAliases,
      ),
      direction: "center",
      offset: [0, -0.002, 0.02],
    };
  }

  if (normalizedAnchor === "head-top") {
    return {
      anchorObject: headObject,
      referenceObject: headObject,
      direction: "center",
      offset: [0, -0.004, 0.04],
    };
  }

  if (normalizedAnchor === "back-head") {
    return {
      anchorObject: headObject,
      referenceObject: headObject,
      direction: "center",
      offset: [0, 0.016, 0.006],
    };
  }

  if (normalizedAnchor === "chest-left") {
    return {
      anchorObject: chestObject,
      referenceObject: chestObject,
      direction: "center",
      offset: contractReferenceOffset ?? [0.018, 0.005, 0.004],
    };
  }

  if (normalizedAnchor === "chest-right") {
    return {
      anchorObject: chestObject,
      referenceObject: chestObject,
      direction: "center",
      offset: contractReferenceOffset ?? [-0.018, 0.005, 0.004],
    };
  }

  if (normalizedAnchor === "tail-top") {
    return {
      anchorObject: tailTipObject,
      referenceObject: tailTipObject,
      direction: "center",
      offset: [0, 0.018, 0.012],
    };
  }

  if (normalizedAnchor === "tail-left") {
    return {
      anchorObject: tailTipObject,
      referenceObject: tailTipObject,
      direction: "center",
      offset: [0.018, 0.012, 0.008],
    };
  }

  if (normalizedAnchor === "tail-right") {
    return {
      anchorObject: tailTipObject,
      referenceObject: tailTipObject,
      direction: "center",
      offset: [-0.018, 0.012, 0.008],
    };
  }

  if (normalizedAnchor === "tail-base") {
    return {
      anchorObject: tailObject,
      referenceObject: tailObject,
      direction: "center",
      offset: [0, 0.01, -0.006],
    };
  }

  return {
    anchorObject: chestObject,
    referenceObject: resolveObjectAliases(
      family === "bow"
        ? context.objects.accessoryTie ?? context.objects.chest
        : family === "bell"
          ? context.objects.accessoryBell ?? context.objects.chest
          : family === "scarf"
            ? context.objects.accessoryScarf ?? context.objects.chest
            : context.objects.accessoryTag ?? context.objects.chest,
      objectAliases,
    ),
    direction: "center",
    offset:
      contractReferenceOffset ??
      (family === "bow"
        ? [0, 0.004, 0.006]
        : family === "scarf"
          ? [0, 0.008, 0.006]
          : [0, 0.006, 0.004]),
  };
}

async function getExecutionAnchorPosition(
  execution,
  backendConfig,
  toolNames,
  objectAliases,
  context,
  geometryRecipe = null,
) {
  const shapeClass = getExecutionRuntimeShapeClass(execution);
  const anchorConfig = getGeneratedAnchorConfig(
    execution.anchor,
    shapeClass,
    context,
    objectAliases,
    execution,
    geometryRecipe,
  );
  const ordinalOffset = getAccessoryInstanceOffset(
    execution.anchor,
    parseExecutionOrdinal(execution.instanceId),
  );
  const familyOffset = getGeneratedAccessoryFamilyOffset(
    execution.anchor,
    shapeClass,
  );
  const effectiveReference = await resolveGeneratedAnchorReferenceObject(
    execution,
    backendConfig,
    anchorConfig.referenceObject,
    anchorConfig.anchorObject,
  );

  return {
    anchorConfig,
    effectiveReferenceObject: effectiveReference.referenceObject,
    referenceFallbackUsed: effectiveReference.fallbackUsed === true,
    referenceFallbackReason:
      typeof effectiveReference.fallbackReason === "string"
        ? effectiveReference.fallbackReason
        : undefined,
    anchorPosition: await getAnchorPosition(
      backendConfig,
      toolNames,
      effectiveReference.referenceObject,
      anchorConfig.direction,
      0,
      addVector(addVector(anchorConfig.offset, familyOffset), ordinalOffset),
    ),
  };
}

async function resetBaseAccessoryObjects(
  backendConfig,
  context,
  objectAliases,
  invokedTools,
) {
  for (const objectKey of Object.keys(accessoryLabels)) {
    if (objectKey === "accessoryNone") {
      continue;
    }

    const resolvedName = resolveObjectAliases(context.objects[objectKey], objectAliases);

    if (typeof resolvedName !== "string" || resolvedName.length === 0) {
      continue;
    }

    await invokePolyMcpTool(
      backendConfig.serverUrl,
      "transform_object",
      [],
      {
        object_name: resolvedName,
        scale: hiddenAccessoryScale,
      },
    );
    invokedTools.push("transform_object");
  }
}

async function assignAccessoryMaterialToObject(
  backendConfig,
  context,
  invokedTools,
  objectName,
  materialName = context.materials.accessory,
) {
  await invokePolyMcpTool(
    backendConfig.serverUrl,
    "assign_material",
    [],
    {
      object_name: objectName,
      material_name: materialName,
      slot_index: 0,
      assign_to: "DATA",
    },
  );
  invokedTools.push("assign_material");
}

function sanitizeMaterialToken(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function getLinearRgbaLuminance(color) {
  const safeColor = Array.isArray(color) ? color : [0, 0, 0, 1];
  return (
    (safeColor[0] ?? 0) * 0.2126 +
    (safeColor[1] ?? 0) * 0.7152 +
    (safeColor[2] ?? 0) * 0.0722
  );
}

function liftLinearRgba(color, amount) {
  return mixLinearRgba(color, [1, 1, 1, Array.isArray(color) ? color[3] ?? 1 : 1], clamp01(amount));
}

function darkenLinearRgba(color, amount) {
  return mixLinearRgba(color, [0, 0, 0, Array.isArray(color) ? color[3] ?? 1 : 1], clamp01(amount));
}

function ensureMinimumFeatureContrast(featureColor, bodyColor, minContrast, preferLighter = false) {
  const feature = Array.isArray(featureColor) ? featureColor : [0, 0, 0, 1];
  const body = Array.isArray(bodyColor) ? bodyColor : [0, 0, 0, 1];
  const contrastFloor = Number.isFinite(minContrast) ? Math.max(0, minContrast) : 0;
  const featureLuminance = getLinearRgbaLuminance(feature);
  const bodyLuminance = getLinearRgbaLuminance(body);
  const delta = Math.abs(featureLuminance - bodyLuminance);

  if (delta >= contrastFloor) {
    return feature;
  }

  const liftAmount = Math.min(0.9, contrastFloor - delta + 0.18);
  if (preferLighter || featureLuminance <= bodyLuminance) {
    return liftLinearRgba(feature, liftAmount);
  }

  return darkenLinearRgba(feature, liftAmount * 0.8);
}

function usesChestWrapMonochromeAccessoryPalette(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  if (runtimeDesignContract?.capabilityClass === "host-coupled-chest-wrap") {
    return true;
  }

  const capabilitySources = [
    execution?.capabilityBundle,
    geometryRecipe?.capabilityBundle,
  ];

  return capabilitySources.some((bundle) => {
    const capabilities = Array.isArray(bundle?.capabilities) ? bundle.capabilities : [];
    return capabilities.includes("host-coupled") && capabilities.includes("chest-wrap");
  });
}

function isHostCoupledChestWrapExecution(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );
  const requiredCapabilities = ["host-coupled", "chest-wrap"];

  if (runtimeDesignContract?.capabilityClass === "host-coupled-chest-wrap") {
    return true;
  }

  if (
    Array.isArray(runtimeDesignContract?.requiredCapabilities) &&
    requiredCapabilities.every((capability) =>
      runtimeDesignContract.requiredCapabilities.includes(capability),
    )
  ) {
    return true;
  }

  return [execution?.capabilityBundle, geometryRecipe?.capabilityBundle].some((bundle) => {
    const capabilities = Array.isArray(bundle?.capabilities) ? bundle.capabilities : [];
    return requiredCapabilities.every((capability) => capabilities.includes(capability));
  });
}

function isChestFrontRuntimeAnchor(anchor) {
  return (
    anchor === "chest-center" ||
    anchor === "chest-left" ||
    anchor === "chest-right"
  );
}

function isHostCoupledChestRigidFrontReadableExecution(
  execution,
  geometryRecipe = null,
) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution?.anchor);
  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );
  const requiredCapabilities = ["host-coupled", "front-readable", "rigid-body"];

  if (!isChestFrontRuntimeAnchor(normalizedAnchor)) {
    return false;
  }

  if (
    runtimeDesignContract?.capabilityClass ===
    "host-coupled-chest-rigid-front-readable"
  ) {
    return true;
  }

  if (
    Array.isArray(runtimeDesignContract?.requiredCapabilities) &&
    requiredCapabilities.every((capability) =>
      runtimeDesignContract.requiredCapabilities.includes(capability),
    ) &&
    !runtimeDesignContract.requiredCapabilities.includes("chest-wrap")
  ) {
    return true;
  }

  return [execution?.capabilityBundle, geometryRecipe?.capabilityBundle].some((bundle) => {
    const capabilities = Array.isArray(bundle?.capabilities) ? bundle.capabilities : [];
    return (
      requiredCapabilities.every((capability) => capabilities.includes(capability)) &&
      !capabilities.includes("chest-wrap")
    );
  });
}

function getExecutionAccessoryZonePalette(
  execution,
  context,
  geometryRecipe = null,
  repairActions = [],
) {
  const colorIntent =
    isRecord(execution?.colorIntent) && typeof execution.colorIntent.hex === "string"
      ? execution.colorIntent
      : null;
  const accessoryColor = colorIntent
    ? hexToLinearRgba(colorIntent.hex)
    : Array.isArray(context?.palette?.accessoryColor)
      ? context.palette.accessoryColor
      : hexToLinearRgba("#D7A954");
  const colorText = [
    typeof colorIntent?.requestedText === "string" ? colorIntent.requestedText : null,
    typeof colorIntent?.label === "string" ? colorIntent.label : null,
    typeof execution?.requestedColorText === "string" ? execution.requestedColorText : null,
    typeof execution?.requestedColor?.label === "string" ? execution.requestedColor.label : null,
  ]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
  const matchedPalette = promptColorPalettes.find(({ keywords }) =>
    keywords.some((keyword) => colorText.includes(String(keyword).toLowerCase())),
  )?.palette;
  const usesMonochromeChestWrapPalette = usesChestWrapMonochromeAccessoryPalette(
    execution,
    geometryRecipe,
  );
  const readabilityPolicy = getHardSurfaceReadabilityMaterialPolicy(
    execution,
    geometryRecipe,
  );
  const readabilityLift = Math.max(
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
    getRepairActionIntensity(repairActions, "promote-critical-part") * 0.72,
  );
  const bodyColor = readabilityPolicy
    ? liftLinearRgba(
        accessoryColor,
        clamp01(readabilityPolicy.bodyLift + readabilityLift * 0.08),
      )
    : accessoryColor;
  const detailBase = usesMonochromeChestWrapPalette
    ? mixLinearRgba(accessoryColor, [1, 1, 1, 1], 0.035)
    : matchedPalette?.detailColor ??
      mixLinearRgba(accessoryColor, [1, 1, 1, 1], 0.72);
  const accentBase = readabilityPolicy
    ? darkenLinearRgba(
        accessoryColor,
        clamp01(readabilityPolicy.accentShadow - readabilityLift * 0.04),
      )
    : usesMonochromeChestWrapPalette
      ? darkenLinearRgba(accessoryColor, 0.08)
      : matchedPalette?.accentColor ??
        mixLinearRgba(accessoryColor, [0, 0, 0, 1], 0.34);
  const detailColor = readabilityPolicy
    ? ensureMinimumFeatureContrast(
        liftLinearRgba(
          detailBase,
          clamp01(readabilityPolicy.detailLift + readabilityLift * 0.1),
        ),
        bodyColor,
        readabilityPolicy.featureContrastFloor,
        true,
      )
    : usesMonochromeChestWrapPalette
      ? detailBase
      : detailBase;
  const accentColor = readabilityPolicy
    ? ensureMinimumFeatureContrast(
        liftLinearRgba(
          accentBase,
          clamp01(readabilityPolicy.accentLift + readabilityLift * 0.08),
        ),
        bodyColor,
        Math.max(0.08, readabilityPolicy.featureContrastFloor * 0.78),
        readabilityPolicy.preferLighterFeatures === true,
      )
    : usesMonochromeChestWrapPalette
      ? accentBase
      : accentBase;

  return {
    accessory: bodyColor,
    detail: detailColor,
    accent: accentColor,
    glow:
      matchedPalette?.glowColor ??
      liftLinearRgba(detailColor, readabilityPolicy ? 0.12 : 0.08),
    body: bodyColor,
  };
}

async function ensureAccessoryMaterialForExecution(
  execution,
  backendConfig,
  context,
  invokedTools,
  baseColorOverride = null,
) {
  const colorIntent =
    isRecord(execution?.colorIntent) &&
    typeof execution.colorIntent.hex === "string" &&
    typeof execution.colorIntent.label === "string"
      ? execution.colorIntent
      : null;

  if (!colorIntent) {
    return context.materials.accessory;
  }

  const materialName = [
    context.materials.accessory,
    sanitizeMaterialToken(execution.requestId ?? execution.family ?? "request"),
    sanitizeMaterialToken(execution.instanceId ?? "instance"),
  ]
    .filter(Boolean)
    .join("_");
  const accessoryColor =
    Array.isArray(baseColorOverride) && baseColorOverride.length >= 3
      ? baseColorOverride
      : hexToLinearRgba(colorIntent.hex);

  await invokePolyMcpTool(
    backendConfig.serverUrl,
    "create_material",
    [],
    {
      name: materialName,
      base_color: accessoryColor,
      roughness: context.recipe.accessoryMaterialRoughness,
      emission_color: accessoryColor,
      emission_strength: context.recipe.accessoryEmissionStrength,
    },
  );
  invokedTools.push("create_material");

  return materialName;
}

async function createExecutionAccessoryMaterial(
  backendConfig,
  context,
  invokedTools,
  materialName,
  baseColor,
  roughnessMultiplier = 1,
  emissionMultiplier = 1,
) {
  await invokePolyMcpTool(
    backendConfig.serverUrl,
    "create_material",
    [],
    {
      name: materialName,
      base_color: baseColor,
      roughness: Number(
        (context.recipe.accessoryMaterialRoughness * roughnessMultiplier).toFixed(4),
      ),
      emission_color: baseColor,
      emission_strength: Number(
        (context.recipe.accessoryEmissionStrength * emissionMultiplier).toFixed(4),
      ),
    },
  );
  invokedTools.push("create_material");
}

async function ensureAccessoryMaterialSetForExecution(
  execution,
  geometryRecipe,
  backendConfig,
  context,
  invokedTools,
  materialZones = [],
  repairActions = [],
) {
  const requestedZones = uniqueStrings(
    (Array.isArray(materialZones) ? materialZones : [])
      .filter((value) => typeof value === "string" && value.length > 0)
      .concat("accessory"),
  );
  const materialBaseName = [
    context.materials.accessory,
    sanitizeMaterialToken(execution?.requestId ?? execution?.family ?? "request"),
    sanitizeMaterialToken(execution?.instanceId ?? "instance"),
  ]
    .filter(Boolean)
    .join("_");
  const palette = getExecutionAccessoryZonePalette(
    execution,
    context,
    geometryRecipe,
    repairActions,
  );
  const materialNames = {};

  for (const zone of requestedZones) {
    if (zone === "accessory") {
      materialNames[zone] = await ensureAccessoryMaterialForExecution(
        execution,
        backendConfig,
        context,
        invokedTools,
        palette.accessory,
      );
      continue;
    }

    const materialName = `${materialBaseName}_${sanitizeMaterialToken(zone)}`;
    const baseColor =
      Array.isArray(palette[zone]) && palette[zone].length >= 3
        ? palette[zone]
        : palette.accessory;
    const roughnessMultiplier =
      zone === "detail" ? 0.94 : zone === "accent" ? 0.86 : 1;
    const emissionMultiplier =
      zone === "detail" ? 0.92 : zone === "accent" ? 0.82 : 1;

    await createExecutionAccessoryMaterial(
      backendConfig,
      context,
      invokedTools,
      materialName,
      baseColor,
      roughnessMultiplier,
      emissionMultiplier,
    );
    materialNames[zone] = materialName;
  }

  return materialNames;
}

async function duplicateAccessoryObject(
  backendConfig,
  toolNames,
  objectName,
  invokedTools,
) {
  if (!toolNames.has("duplicate_object")) {
    throw new Error("当前 Blender MCP server 不支持 duplicate_object，无法生成多实例稳定配件。");
  }

  const payload = await invokePolyMcpTool(
    backendConfig.serverUrl,
    "duplicate_object",
    [],
    {
      object_name: objectName,
      linked: false,
      count: 1,
      offset: [0, 0, 0],
      recursive: false,
    },
  );
  invokedTools.push("duplicate_object");
  const result = extractInvokeResult(payload);

  if (
    !isRecord(result) ||
    !Array.isArray(result.duplicates) ||
    !isRecord(result.duplicates[0]) ||
    typeof result.duplicates[0].name !== "string"
  ) {
    throw new Error(`duplicate_object 没有返回新配件名：${objectName}`);
  }

  return result.duplicates[0].name;
}

async function placeAccessoryObjectForExecution(
  execution,
  objectName,
  backendConfig,
  toolNames,
  objectAliases,
  context,
  invokedTools,
  scale,
  materialName,
) {
  const { anchorPosition } = await getExecutionAnchorPosition(
    execution,
    backendConfig,
    toolNames,
    objectAliases,
    context,
  );

  await invokePolyMcpTool(
    backendConfig.serverUrl,
    "transform_object",
    [],
    {
      object_name: objectName,
      location: anchorPosition,
      scale,
    },
  );
  invokedTools.push("transform_object");
  await assignAccessoryMaterialToObject(
    backendConfig,
    context,
    invokedTools,
    objectName,
    materialName,
  );
}

async function applyStableAccessoryExecution(
  execution,
  backendConfig,
  toolNames,
  objectAliases,
  context,
  invokedTools,
  familyUseCounts,
  createdObjectNames,
) {
  const resolvedObjectKey =
    getAccessoryObjectKeyFromFamily(execution.family) ??
    getAccessoryObjectKeyFromFamily(execution.fallbackFamily);

  if (!resolvedObjectKey || !context.objects[resolvedObjectKey]) {
    return {
      applied: false,
      note: `${execution.shapeLabel} 缺少稳定配件锚点，当前无法执行。`,
    };
  }

  const baseObjectName = resolveObjectAliases(
    context.objects[resolvedObjectKey],
    objectAliases,
  );

  if (typeof baseObjectName !== "string" || baseObjectName.length === 0) {
    return {
      applied: false,
      note: `${execution.shapeLabel} 对应的稳定配件对象不存在，当前无法执行。`,
    };
  }

  const visibleScale = visibleAccessoryScales[resolvedObjectKey] ?? [1, 1, 1];
  const currentUseCount = familyUseCounts.get(resolvedObjectKey) ?? 0;
  let targetObjectName = baseObjectName;
  const materialName = await ensureAccessoryMaterialForExecution(
    execution,
    backendConfig,
    context,
    invokedTools,
  );

  if (currentUseCount > 0) {
    targetObjectName = await duplicateAccessoryObject(
      backendConfig,
      toolNames,
      baseObjectName,
      invokedTools,
    );
    createdObjectNames.push(targetObjectName);
  }

  familyUseCounts.set(resolvedObjectKey, currentUseCount + 1);

  await placeAccessoryObjectForExecution(
    execution,
    targetObjectName,
    backendConfig,
    toolNames,
    objectAliases,
    context,
    invokedTools,
    visibleScale,
    materialName,
  );

  return {
    applied: true,
    objectName: targetObjectName,
    note:
      execution.executionMode === "approximate-fallback"
        ? `${execution.shapeLabel} 当前先用 ${getExecutionResolvedLabel(execution)} 做近似。`
        : `${getExecutionResolvedLabel(execution)} 已挂到${getAccessoryAnchorLabel(execution.anchor)}。`,
  };
}

async function createGeneratedAccessory(
  task,
  backendConfig,
  toolNames,
  objectAliases,
  context,
  invokedTools,
  execution,
  refinementOptions = {},
) {
  if (!execution) {
    return {
      createdNames: [],
      geometryRecipe: null,
    };
  }

  const customizations = getTaskCustomizations(task);
  const baseGeometryRecipe = getGeometryRecipeForExecution(customizations, execution);
  const pendingRepairActions = Array.isArray(refinementOptions.repairActions)
    ? refinementOptions.repairActions
    : [];
  const geometryRecipe = cloneGeometryRecipeWithVariant(
    baseGeometryRecipe,
    typeof refinementOptions.variantId === "string"
      ? refinementOptions.variantId
      : typeof baseGeometryRecipe?.variantId === "string"
        ? baseGeometryRecipe.variantId
        : execution.variantId,
    {
      execution,
      repairActions: pendingRepairActions,
      capabilityRerouteId:
        typeof refinementOptions.capabilityRerouteId === "string"
          ? refinementOptions.capabilityRerouteId
          : undefined,
    },
  );
  const basePartGraph = getAccessoryPartGraphForExecution(customizations, execution);
  const partGraph = syncPartGraphLocalOffsetsWithGeometryRecipe(
    basePartGraph,
    geometryRecipe,
  );
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const passIndex =
    typeof refinementOptions.passIndex === "number" &&
    refinementOptions.passIndex > 0
      ? Math.floor(refinementOptions.passIndex)
      : 1;
  const targetPassCount =
    typeof refinementOptions.targetPassCount === "number" &&
    refinementOptions.targetPassCount > 0
      ? Math.floor(refinementOptions.targetPassCount)
      : 1;
  const {
    anchorPosition: fittedAnchorPosition,
    effectiveReferenceObject,
    referenceFallbackUsed,
    referenceFallbackReason,
  } = await getExecutionAnchorPosition(
    execution,
    backendConfig,
    toolNames,
    objectAliases,
    context,
    geometryRecipe,
  );
  const legacyAnchorPosition = getLegacyRuntimeAnchorPosition(execution);
  const rawAnchorFitDelta = subtractVector(
    fittedAnchorPosition,
    legacyAnchorPosition,
  );
  const anchorFitBlendPolicy = getRuntimeAnchorFitBlendPolicy(
    execution,
    shapeClass,
    geometryRecipe,
  );
  const blendedAnchorDelta = rawAnchorFitDelta.map((value, index) => {
    const maxDelta =
      anchorFitBlendPolicy.maxDeltas[index] ??
      anchorFitBlendPolicy.maxDeltas[0] ??
      0.018;
    const blendWeight =
      anchorFitBlendPolicy.blendWeights[index] ??
      anchorFitBlendPolicy.blendWeights[0] ??
      0.2;
    const clamped = Math.max(-maxDelta, Math.min(maxDelta, value));

    return Number((clamped * blendWeight).toFixed(4));
  });
  // Botanical left-ear clusters benefit from stronger x/y host-rooting, but the same z pull
  // caused face intrusion in smoke, so keep depth conservative unless the anchor is curve-like.
  const targetAnchorPosition = anchorFitBlendPolicy.blendWeights.every(
    (value) => value >= 1,
  )
    ? fittedAnchorPosition
    : addVector(
        legacyAnchorPosition,
        blendedAnchorDelta,
      );
  const anchorObject = getRuntimeAccessoryAnchorObject(
    execution.anchor,
    context,
    objectAliases,
  );
  const nodePrefix = buildRuntimeNodePrefix(
    task.generationId,
    shapeClass,
    execution.anchor,
    parseExecutionOrdinal(execution.instanceId),
  );
  const baseName = nodePrefix;
  const runtimeBlueprint =
    geometryRecipe?.parts?.length > 0
      ? buildRuntimePartBlueprints(
          geometryRecipe,
          execution,
          targetAnchorPosition,
          passIndex,
          targetPassCount,
          baseName,
          partGraph,
          Array.isArray(refinementOptions.repairActions)
            ? refinementOptions.repairActions
            : [],
        )
      : {
          partBlueprints: [],
          placementOffset: [0, 0, 0],
          desiredPlacementOffset: [0, 0, 0],
          overallScaleMultiplier: 1,
      };
  const geometryPartZoneMap = new Map(
    Array.isArray(geometryRecipe?.parts)
      ? geometryRecipe.parts
          .filter(
            (part) => isRecord(part) && typeof part.partId === "string",
          )
          .map((part) => [
            part.partId,
            typeof part.materialZone === "string" ? part.materialZone : "accessory",
          ])
      : [],
  );
  let createdNames = [];
  const createdPartNames = new Map();
  const shouldUseBatchAccessoryCreation =
    toolNames.has("batch_create_objects") &&
    process.env.BLENDER_MCP_ENABLE_BATCH_ACCESSORY === "1";

  if (runtimeBlueprint.partBlueprints.length > 0) {
    const partOperations = buildGeneratedAccessoryOperationsFromBlueprints(
      runtimeBlueprint.partBlueprints,
    );
    const partOperationMap = new Map(
      runtimeBlueprint.partBlueprints.map((part, index) => [part.partId, partOperations[index]]),
    );
    const assemblyRootPartId =
      typeof partGraph?.rootPartId === "string"
        ? partGraph.rootPartId
        : typeof geometryRecipe?.assemblyRootPartId === "string"
          ? geometryRecipe.assemblyRootPartId
          : runtimeBlueprint.partBlueprints[0]?.partId;
    const orderedPartBlueprints = sortRuntimePartBlueprintsForAssembly(
      runtimeBlueprint.partBlueprints,
      assemblyRootPartId,
    );

    if (shouldUseBatchAccessoryCreation) {
      try {
        for (const part of orderedPartBlueprints) {
          const operation = partOperationMap.get(part.partId);

          if (!operation) {
            continue;
          }

          const parentObjectName =
            typeof part.parentPartId === "string" && createdPartNames.has(part.parentPartId)
              ? createdPartNames.get(part.parentPartId)
              : anchorObject;
          const payload = await invokePolyMcpTool(
            backendConfig.serverUrl,
            "batch_create_objects",
            [],
            {
              operations: [operation],
              group_name: `${baseName}_group`,
              parent_to: parentObjectName,
            },
          );
          const result = extractInvokeResult(payload);
          const createdName =
            isRecord(result) && Array.isArray(result.created_objects)
              ? result.created_objects
                  .map((entry) =>
                    isRecord(entry) && typeof entry.name === "string" ? entry.name : null,
                  )
                  .find((value) => typeof value === "string")
              : null;

          if (typeof createdName === "string") {
            createdNames.push(createdName);
            createdPartNames.set(part.partId, createdName);
          }

          invokedTools.push("batch_create_objects");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "unknown batch_create_objects error";
        if (createdNames.length > 0) {
          try {
            await invokePolyMcpTool(
              backendConfig.serverUrl,
              "delete_objects",
              [],
              {
                object_names: createdNames,
                delete_data: true,
                delete_hierarchy: true,
                confirm: true,
              },
            );
            invokedTools.push("delete_objects");
          } catch {}
        }
        log(
          `dynamic accessory hierarchical batch_create_objects failed; falling back to create_mesh_object: ${message}`,
        );
        createdNames = [];
        createdPartNames.clear();
      }
    }

    if (createdNames.length === 0) {
      for (const part of orderedPartBlueprints) {
        const operation = partOperationMap.get(part.partId);

        if (!operation) {
          continue;
        }

        const operationName =
          isRecord(operation.parameters) && typeof operation.parameters.name === "string"
            ? operation.parameters.name
            : null;
        if (operationName && createdNames.includes(operationName)) {
          continue;
        }

        const payload = await invokePolyMcpTool(
          backendConfig.serverUrl,
          "create_mesh_object",
          [],
          operation.parameters,
        );
        const result = extractInvokeResult(payload);
        if (isRecord(result) && typeof result.name === "string") {
          createdNames.push(result.name);
          createdPartNames.set(part.partId, result.name);
        }
        invokedTools.push("create_mesh_object");
      }
    }

    const missingBlueprintParts = orderedPartBlueprints.filter(
      (part) => !createdPartNames.has(part.partId),
    );

    if (missingBlueprintParts.length > 0) {
      log(
        `dynamic accessory partial-create ${baseName}: expected=${orderedPartBlueprints.length} actual=${createdPartNames.size} missing=${missingBlueprintParts
          .map((part) => part.partId)
          .join(",")}`,
      );

      for (const part of missingBlueprintParts) {
        const operation = partOperationMap.get(part.partId);

        if (!operation) {
          continue;
        }

        const payload = await invokePolyMcpTool(
          backendConfig.serverUrl,
          "create_mesh_object",
          [],
          operation.parameters,
        );
        const result = extractInvokeResult(payload);

        if (isRecord(result) && typeof result.name === "string") {
          createdNames.push(result.name);
          createdPartNames.set(part.partId, result.name);
        }

        invokedTools.push("create_mesh_object");
      }

      const unresolvedPartIds = orderedPartBlueprints
        .filter((part) => !createdPartNames.has(part.partId))
        .map((part) => part.partId);

      if (unresolvedPartIds.length > 0) {
        log(
          `dynamic accessory partial-create unresolved ${baseName}: ${unresolvedPartIds.join(",")}`,
        );
      }
    }
  } else {
    const operations = geometryRecipe?.parts?.length > 0
      ? buildGeneratedAccessoryOperationsFromGeometryRecipe(
          geometryRecipe,
          targetAnchorPosition,
          baseName,
        )
      : buildGeneratedAccessoryOperations(
          execution.family,
          execution.anchor,
          targetAnchorPosition,
          baseName,
        );
    for (const operation of operations) {
      const payload = await invokePolyMcpTool(
        backendConfig.serverUrl,
        "create_mesh_object",
        [],
        operation.parameters,
      );
      const result = extractInvokeResult(payload);
      if (isRecord(result) && typeof result.name === "string") {
        createdNames.push(result.name);
      }
      invokedTools.push("create_mesh_object");
    }
  }

  const materialNamesByZone = await ensureAccessoryMaterialSetForExecution(
    execution,
    geometryRecipe,
    backendConfig,
    context,
    invokedTools,
    Array.isArray(geometryRecipe?.parts)
      ? geometryRecipe.parts.map((part) => part.materialZone)
      : [],
    Array.isArray(refinementOptions.repairActions) ? refinementOptions.repairActions : [],
  );

  if (
    process.env.PROMPTPET_DEBUG_DEVICE_MATERIALS === "1" &&
    (shapeClass === "device-generic-charm" || shapeClass === "camera-charm")
  ) {
    log(
      `debug-material-zones ${nodePrefix}: zones=${JSON.stringify(
        Array.from(geometryPartZoneMap.entries()),
      )} materials=${JSON.stringify(materialNamesByZone)}`,
    );
  }

  if (
    createdPartNames.size > 0 &&
    Array.isArray(runtimeBlueprint.partBlueprints) &&
    runtimeBlueprint.partBlueprints.length > 0
  ) {
    for (const part of runtimeBlueprint.partBlueprints) {
      const objectName = createdPartNames.get(part.partId);

      if (!objectName) {
        continue;
      }

      const materialName =
        materialNamesByZone[
          typeof part.materialZone === "string"
            ? part.materialZone
            : geometryPartZoneMap.get(part.partId)
        ] ?? materialNamesByZone.accessory;
      if (
        process.env.PROMPTPET_DEBUG_DEVICE_MATERIALS === "1" &&
        (shapeClass === "device-generic-charm" || shapeClass === "camera-charm")
      ) {
        log(
          `debug-material-assign ${nodePrefix}: part=${part.partId} zone=${
            typeof part.materialZone === "string"
              ? part.materialZone
              : geometryPartZoneMap.get(part.partId) ?? "accessory"
          } material=${materialName} object=${objectName}`,
        );
      }
      await assignAccessoryMaterialToObject(
        backendConfig,
        context,
        invokedTools,
        objectName,
        materialName,
      );
    }
  } else {
    for (const objectName of createdNames) {
      await assignAccessoryMaterialToObject(
        backendConfig,
        context,
        invokedTools,
        objectName,
        materialNamesByZone.accessory,
      );
    }
  }

  return {
    createdNames,
    nodePrefix,
    exportedPartIds: runtimeBlueprint.partBlueprints.map((part) => part.partId),
    geometryRecipe,
    partGraph,
    partBlueprints: runtimeBlueprint.partBlueprints,
    placementOffset: runtimeBlueprint.placementOffset,
    desiredPlacementOffset: runtimeBlueprint.desiredPlacementOffset,
    overallScaleMultiplier: runtimeBlueprint.overallScaleMultiplier,
    baseScaleMultiplier: runtimeBlueprint.baseScaleMultiplier,
    hostFitScaleClamp: runtimeBlueprint.hostFitScaleClamp,
    stageScaleMultiplier: runtimeBlueprint.stageScaleMultiplier,
    anchorProjection: runtimeBlueprint.anchorProjection,
    outlineCompilerMode: runtimeBlueprint.outlineCompilerMode,
    outlineProjectionVariantId: runtimeBlueprint.outlineProjectionVariantId,
    compactEnvelopeClampDebug: runtimeBlueprint.compactEnvelopeClampDebug,
    selectionDebug: runtimeBlueprint.selectionDebug,
    targetAnchorPosition,
    legacyAnchorPosition,
    fittedAnchorPosition,
    rawAnchorFitDelta,
    effectiveReferenceObject,
    referenceFallbackUsed,
    referenceFallbackReason,
  };
}

async function executeDynamicCustomizationStage(
  task,
  backendConfig,
  toolNames,
  objectAliases,
  context,
  invokedTools,
) {
  const customizations = getTaskCustomizations(task);
  const resolvedExecutionPlan = getResolvedExecutionPlanFromCustomizations(
    customizations,
  );

  if (
    task.input.generationMode !== "dynamic-custom" ||
    !customizations ||
    !resolvedExecutionPlan
  ) {
    return [];
  }

  const customizationProfile = isCustomizationProfile(
    customizations.customizationProfile,
  )
    ? customizations.customizationProfile
    : "safe-overlay";
  const attemptBudgetMs =
    typeof customizations.runtimeAttemptBudgetMs === "number"
      ? customizations.runtimeAttemptBudgetMs
      : customizationProfile === "experimental-addon"
        ? 300000
        : 45000;
  const stageStartedAt = Date.now();

  if (isRecord(customizations)) {
    customizations.resolvedExecutionPlan = resolvedExecutionPlan;
  }

  await writeStatus(
    task,
    "rendering",
    customizationProfile === "experimental-addon"
      ? "正在现场生成/挂载多实例配件，并应用实验定制覆盖。"
      : "正在按执行计划挂载稳定配件，并应用安全颜色与材质覆盖。",
  );

  const dynamicNotes = [];
  const repairActionsByExecutionId = new Map();
  const variantStateByExecutionId = new Map();
  const appliedRepairStatsByExecutionId = new Map();
  const capabilityEscalationBootstrapStateByExecutionId = new Map();
  const capabilityTraitRerouteStateByExecutionId = new Map();
  const hasOpenNounRuntimeExecution = resolvedExecutionPlan.addAccessories.some(
    (execution) =>
      execution.executionMode === "runtime-generated" &&
      isOpenNounExecution(execution),
  );
  const hasHardSurfaceOpenNounRuntimeExecution = resolvedExecutionPlan.addAccessories.some(
    (execution) =>
      execution.executionMode === "runtime-generated" &&
      isHardSurfaceOpenNounExecution(execution),
  );
  const runtimeBudgetMs =
    customizationProfile === "experimental-addon" && hasOpenNounRuntimeExecution
      ? Math.max(attemptBudgetMs, 360000)
      : attemptBudgetMs;
  const minimumRequiredPassCount = Math.max(
    1,
    ...resolvedExecutionPlan.addAccessories.map((execution) =>
      getExecutionTargetPassCount(customizationProfile, execution),
    ),
  );
  const softTargetPassCount =
    customizationProfile === "experimental-addon" && hasOpenNounRuntimeExecution
      ? 8
      : minimumRequiredPassCount;
  const safetyPassCap =
    customizationProfile === "experimental-addon" && hasOpenNounRuntimeExecution ? 24 : 24;
  customizations.runtimeAttemptBudgetMs = runtimeBudgetMs;
  const deleteCreatedObjects = async (objectNames) => {
    if (!Array.isArray(objectNames) || objectNames.length === 0) {
      return;
    }

    try {
      await invokePolyMcpTool(
        backendConfig.serverUrl,
        "delete_objects",
        [],
        {
          object_names: objectNames,
          delete_data: true,
          delete_hierarchy: true,
          confirm: true,
        },
      );
      invokedTools.push("delete_objects");
    } catch (error) {
      log(
        `runtime cleanup skipped: ${
          error instanceof Error ? error.message : "delete_objects unavailable"
        }`,
      );
    }
  };
  const isStructuralRepairAction = (action) =>
    isRecord(action) &&
    (action.source === "structural" ||
      action.actionType === "tighten-cohesion" ||
      action.actionType === "re-parent-part" ||
      action.actionType === "rebuild-from-root");
  const countStructuralRepairs = (repairActions) =>
    Array.isArray(repairActions)
      ? repairActions.filter((action) => isStructuralRepairAction(action)).length
      : 0;
  const countStructuralRebuilds = (repairActions) =>
    Array.isArray(repairActions)
      ? repairActions.filter(
          (action) =>
            isRecord(action) &&
            (action.actionType === "rebuild-from-root" ||
              action.actionType === "re-parent-part"),
        ).length
      : 0;
  const countRepairActionsByLayer = (repairActions) => {
    const counts = {
      silhouette: 0,
      assembly: 0,
      "host-fit": 0,
      "render-readability": 0,
      "anchor-projection": 0,
      "outline-compiler": 0,
      "attachment-cohesion": 0,
      "critique-timeout": 0,
    };

    if (!Array.isArray(repairActions)) {
      return counts;
    }

    for (const action of repairActions) {
      const layer = classifyRepairActionFailureLayer(action);
      counts[layer] += 1;
    }

    return counts;
  };
  const getCapabilityTraitRerouteId = (repairActions) => {
    if (!Array.isArray(repairActions)) {
      return null;
    }

    const rerouteAction = repairActions.find(
      (action) =>
        isRecord(action) &&
        action.actionType === "reroute-trait-profile" &&
        typeof action.targetTraitProfile === "string" &&
        action.targetTraitProfile.trim(),
    );

    return typeof rerouteAction?.targetTraitProfile === "string"
      ? rerouteAction.targetTraitProfile.trim()
      : null;
  };
  const createEmptyAppliedRepairStats = () => ({
    structuralCount: 0,
    renderDrivenCount: 0,
    rebuildCount: 0,
    rebuildCountByLayer: {
      silhouette: 0,
      assembly: 0,
      "host-fit": 0,
      "render-readability": 0,
      "anchor-projection": 0,
      "outline-compiler": 0,
      "attachment-cohesion": 0,
      "critique-timeout": 0,
    },
  });
  const buildVariantSwitchBootstrapRepairActions = ({
    execution,
    geometryRecipe,
    currentVariantId,
    nextVariantId,
  }) => {
    if (
      !isHostCoupledChestWrapExecution(execution, geometryRecipe) ||
      typeof nextVariantId !== "string" ||
      !/compact/i.test(nextVariantId) ||
      nextVariantId === currentVariantId
    ) {
      return [];
    }

    return [
      {
        actionType: "rebuild-from-root",
        source: "structural",
        reason: "compact variant 需要用新的胸前挂载合同重新起步，避免沿用 wrap-forward 的失败惯性。",
        intensity: 0.92,
      },
      {
        actionType: "re-anchor",
        source: "structural",
        reason: "compact variant 切换后先重新压到胸前安全包络，避免继续贴脸。",
        intensity: 0.84,
      },
      {
        actionType: "tighten-cohesion",
        source: "structural",
        reason: "compact variant 切换后先把 knot 与双尾重新收紧到同一根部上。",
        targetPartIds: ["knot", "tail-left", "tail-right"],
        intensity: 0.82,
      },
      {
        actionType: "reshape-silhouette",
        source: "visual",
        reason: "compact variant 切换后优先重写主轮廓，停止继续维护胸前横条读感。",
        targetPartIds: ["wrap-band", "knot", "tail-left", "tail-right"],
        intensity: 0.88,
      },
      {
        actionType: "promote-critical-part",
        source: "visual",
        reason: "compact variant 切换后让 knot 和双尾先进入首轮阅读，而不是继续让 wrap-band 抢首读。",
        targetPartIds: ["knot", "tail-left", "tail-right"],
        intensity: 0.84,
      },
      {
        actionType: "rebalance-part-ratio",
        source: "visual",
        reason: "compact variant 切换后先压缩 wrap-band 占比，把主跨度让回给 knot。",
        targetPartIds: ["wrap-band", "knot"],
        intensity: 0.8,
      },
    ];
  };
  const formatDebugPartState = (part) => {
    if (!isRecord(part) || typeof part.partId !== "string") {
      return "missing";
    }

    const scale = Array.isArray(part.scale)
      ? part.scale.map((value) => Number((value ?? 0).toFixed(3))).join("/")
      : "n/a";
    const offset = Array.isArray(part.localOffset)
      ? part.localOffset.map((value) => Number((value ?? 0).toFixed(3))).join("/")
      : "n/a";

    return `${part.partId}[scale=${scale};offset=${offset}]`;
  };
  const getAppliedRepairStats = (executionId) => {
    const current = appliedRepairStatsByExecutionId.get(executionId);

    if (isRecord(current)) {
      return {
        structuralCount:
          typeof current.structuralCount === "number" ? current.structuralCount : 0,
        renderDrivenCount:
          typeof current.renderDrivenCount === "number" ? current.renderDrivenCount : 0,
        rebuildCount:
          typeof current.rebuildCount === "number" ? current.rebuildCount : 0,
        rebuildCountByLayer: isRecord(current.rebuildCountByLayer)
          ? {
              silhouette:
                typeof current.rebuildCountByLayer.silhouette === "number"
                  ? current.rebuildCountByLayer.silhouette
                  : 0,
              assembly:
                typeof current.rebuildCountByLayer.assembly === "number"
                  ? current.rebuildCountByLayer.assembly
                  : 0,
              "host-fit":
                typeof current.rebuildCountByLayer["host-fit"] === "number"
                  ? current.rebuildCountByLayer["host-fit"]
                  : 0,
              "render-readability":
                typeof current.rebuildCountByLayer["render-readability"] === "number"
                  ? current.rebuildCountByLayer["render-readability"]
                  : 0,
              "anchor-projection":
                typeof current.rebuildCountByLayer["anchor-projection"] === "number"
                  ? current.rebuildCountByLayer["anchor-projection"]
                  : 0,
              "outline-compiler":
                typeof current.rebuildCountByLayer["outline-compiler"] === "number"
                  ? current.rebuildCountByLayer["outline-compiler"]
                  : 0,
              "attachment-cohesion":
                typeof current.rebuildCountByLayer["attachment-cohesion"] === "number"
                  ? current.rebuildCountByLayer["attachment-cohesion"]
                  : 0,
              "critique-timeout":
                typeof current.rebuildCountByLayer["critique-timeout"] === "number"
                  ? current.rebuildCountByLayer["critique-timeout"]
                  : 0,
            }
          : {
              silhouette: 0,
              assembly: 0,
              "host-fit": 0,
              "render-readability": 0,
              "anchor-projection": 0,
              "outline-compiler": 0,
              "attachment-cohesion": 0,
              "critique-timeout": 0,
            },
      };
    }

    return createEmptyAppliedRepairStats();
  };
  const buildExecutionPassState = (executionReports) => {
    const appliedExecutions = [];
    const failedExecutions = [];
    const partialExecutions = [];

    for (const report of executionReports) {
      if (!isRecord(report) || !isRecord(report.execution)) {
        continue;
      }

      const executionId = report.execution.executionId;
      const createdNames = Array.isArray(report.createdNames) ? report.createdNames : [];

      if (report.execution.executionMode === "runtime-generated") {
        if (report.qualityReport?.hardGatePassed) {
          appliedExecutions.push(executionId);
          continue;
        }

        if (createdNames.length > 0) {
          partialExecutions.push(executionId);
          failedExecutions.push(executionId);
          continue;
        }

        failedExecutions.push(executionId);
        continue;
      }

      if (report.qualityAccepted) {
        appliedExecutions.push(executionId);
      } else {
        failedExecutions.push(executionId);
      }
    }

    return {
      appliedExecutions,
      failedExecutions,
      partialExecutions,
    };
  };
  const summarizeExecutionReports = ({
    executionReports,
    createdObjectNames,
    appliedExecutions,
    failedExecutions,
    partialExecutions,
    passNotes,
    passIndex,
  }) => {
    const runtimeReports = executionReports.filter(
      (report) => report.execution.executionMode === "runtime-generated",
    );
    const aggregateMetrics =
      executionReports.length > 0
        ? {
            shapeReadability: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.shapeReadability,
                0,
              ) / executionReports.length,
            ),
            visualReadability: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.visualReadability,
                0,
              ) / executionReports.length,
            ),
            anchorAccuracy: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.anchorAccuracy,
                0,
              ) / executionReports.length,
            ),
            colorIsolation: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.colorIsolation,
                0,
              ) / executionReports.length,
            ),
            occlusionRisk: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.occlusionRisk,
                0,
              ) / executionReports.length,
            ),
            scaleFit: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.scaleFit,
                0,
              ) / executionReports.length,
            ),
            hostComposition: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.hostComposition,
                0,
              ) / executionReports.length,
            ),
            silhouetteStrength: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.silhouetteStrength,
                0,
              ) / executionReports.length,
            ),
            lookalikeRisk: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.lookalikeRisk,
                0,
              ) / executionReports.length,
            ),
            nounFidelity: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.nounFidelity,
                0,
              ) / executionReports.length,
            ),
            criticalPartsPresent: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.criticalPartsPresent,
                0,
              ) / executionReports.length,
            ),
            archetypeMatch: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.archetypeMatch,
                0,
              ) / executionReports.length,
            ),
            cohesionScore: roundMetric(
              executionReports.reduce(
                (sum, report) => sum + report.qualityReport.qualityMetrics.cohesionScore,
                0,
              ) / executionReports.length,
            ),
          }
        : {
            shapeReadability: 0,
            visualReadability: 0,
            anchorAccuracy: 0,
            colorIsolation: 0,
            occlusionRisk: 0,
            scaleFit: 0,
            hostComposition: 0,
            silhouetteStrength: 0,
            lookalikeRisk: 1,
            nounFidelity: 0,
            criticalPartsPresent: 0,
            archetypeMatch: 0,
            cohesionScore: 0,
          };
    const aggregateQualityScore =
      executionReports.length > 0
        ? roundMetric(
            executionReports.reduce(
              (sum, report) => sum + report.qualityReport.qualityScore,
              0,
            ) / executionReports.length,
          )
        : 0;
    const hardGatePassed = executionReports.every(
      (report) => report.qualityReport.hardGatePassed,
    );
    const minimumPassesMet = runtimeReports.every(
      (report) => passIndex >= report.targetPassCount,
    );
    const qualityGatePassed =
      hardGatePassed &&
      minimumPassesMet &&
      executionReports.every((report) => report.qualityAccepted) &&
      aggregateQualityScore >= 0.76;
    const visualAcceptanceGatePassed = executionReports.every(
      (report) => report.qualityReport.visualAcceptanceGatePassed !== false,
    );
    const aggregateVisualFailureReasons = uniqueStrings(
      executionReports.flatMap((report) =>
        Array.isArray(report.qualityReport.visualCritiqueReport?.visualFailureReasons)
          ? report.qualityReport.visualCritiqueReport.visualFailureReasons
          : [],
      ),
    );
    const aggregateDominantFailureModes = uniqueStrings(
      executionReports.flatMap((report) =>
        Array.isArray(report.qualityReport.dominantFailureModes)
          ? report.qualityReport.dominantFailureModes
          : [],
      ),
    );
    const precisionGatePassed =
      hardGatePassed &&
      minimumPassesMet &&
      executionReports.every((report) => report.qualityReport.precisionGatePassed === true) &&
      aggregateQualityScore >= 0.78;
    const precisionReady =
      precisionGatePassed && aggregateDominantFailureModes.length === 0;
    const structuralQualityPassed =
      hardGatePassed &&
      minimumPassesMet &&
      executionReports.every((report) => report.qualityReport.structuralQualityPassed) &&
      aggregateQualityScore >= 0.74;
    const visualCritiqueReports = executionReports
      .map((report) => report.qualityReport.visualCritiqueReport)
      .filter((report) => isRecord(report) && typeof report.reportId === "string");
    const aggregateRenderNounFidelity =
      visualCritiqueReports.length > 0
        ? roundMetric(
            visualCritiqueReports.reduce((sum, report) => {
              if (typeof report.renderNounFidelity === "number") {
                return sum + report.renderNounFidelity;
              }

              return sum + (typeof report.nounFidelity === "number" ? report.nounFidelity : 0);
            }, 0) / visualCritiqueReports.length,
          )
        : 0;
    const renderCritiqueAvailableCount = runtimeReports.reduce(
      (sum, report) => sum + (report.qualityReport.renderCritiqueAvailable === true ? 1 : 0),
      0,
    );
    const renderCritiqueTimeoutCount = runtimeReports.reduce(
      (sum, report) =>
        sum +
        (Array.isArray(report.qualityReport.dominantFailureModes) &&
        report.qualityReport.dominantFailureModes.includes("render-critique-timeout")
          ? 1
          : 0),
      0,
    );
    const structuralRepairSignatures = visualCritiqueReports
      .flatMap((report) =>
        Array.isArray(report.repairActions)
          ? report.repairActions.filter((action) => isStructuralRepairAction(action))
          : [],
      )
      .map((action) =>
        JSON.stringify({
          actionType: action.actionType,
          targetPartIds: Array.isArray(action.targetPartIds)
            ? [...action.targetPartIds].sort()
            : [],
          targetRoles: Array.isArray(action.targetRoles)
            ? [...action.targetRoles].sort()
            : [],
        }),
      )
      .sort();

    return {
      appliedExecutions,
      createdObjectNames,
      failedExecutions,
      partialExecutions,
      passNotes,
      executionReports,
      aggregateMetrics,
      aggregateQualityScore,
      hardGatePassed,
      structuralQualityPassed,
      qualityGatePassed,
      precisionGatePassed,
      precisionReady,
      visualAcceptanceGatePassed,
      visualFailureReasons: aggregateVisualFailureReasons,
      visualCritiqueReports,
      aggregateRenderNounFidelity,
      renderCritiqueAvailableCount,
      renderCritiqueTimeoutCount,
      structuralRepairSignatures,
      totalRebuildCount: executionReports.reduce(
        (sum, report) => sum + (report.appliedRepairStats?.rebuildCount ?? 0),
        0,
      ),
      dominantFailureModes: aggregateDominantFailureModes,
    };
  };
  const captureExecutionReportSnapshot = (report) => {
    if (
      !isRecord(report) ||
      !isRecord(report.execution) ||
      typeof report.execution.executionId !== "string"
    ) {
      return null;
    }

    const snapshot = structuredClone(report);
    snapshot.executionId = report.execution.executionId;
    snapshot.passIndex =
      typeof report.passIndex === "number" && report.passIndex > 0
        ? Math.floor(report.passIndex)
        : 1;
    return snapshot;
  };
  const restorePreferredExecutionReports = async (
    selectedSnapshots,
    currentPassResult,
    activePassIndex,
  ) => {
    if (!(selectedSnapshots instanceof Map) || selectedSnapshots.size === 0) {
      return currentPassResult;
    }

    const currentReportsByExecutionId = new Map(
      currentPassResult.executionReports
        .filter(
          (report) =>
            isRecord(report) &&
            isRecord(report.execution) &&
            typeof report.execution.executionId === "string",
        )
        .map((report) => [report.execution.executionId, report]),
    );
    const selectedReports = resolvedExecutionPlan.addAccessories.flatMap((execution) => {
      const snapshot = selectedSnapshots.get(execution.executionId);
      const currentReport = currentReportsByExecutionId.get(execution.executionId);

      if (!snapshot && !currentReport) {
        return [];
      }

      return [
        {
          ...structuredClone(snapshot ?? currentReport),
          execution,
        },
      ];
    });

    if (selectedReports.length !== resolvedExecutionPlan.addAccessories.length) {
      return currentPassResult;
    }

    const restoreRequired = selectedReports.some((report) => {
      const currentReport = currentReportsByExecutionId.get(report.execution.executionId);

      if (!currentReport) {
        return true;
      }

      return (
        report.passIndex !== currentReport.passIndex ||
        JSON.stringify(report.createdNames ?? []) !==
          JSON.stringify(currentReport.createdNames ?? [])
      );
    });

    if (!restoreRequired) {
      return currentPassResult;
    }

    if (Array.isArray(currentPassResult.createdObjectNames) && currentPassResult.createdObjectNames.length > 0) {
      await deleteCreatedObjects(currentPassResult.createdObjectNames);
      resolvedExecutionPlan.repairPassTriggered = true;
    }

    await resetBaseAccessoryObjects(
      backendConfig,
      context,
      objectAliases,
      invokedTools,
    );

    const recreatedObjectNames = [];
    const restoredPassNotes = [
      ...currentPassResult.passNotes,
      "已恢复当前最佳执行快照，避免较差末轮覆盖更完整的 runtime 导出。",
    ];
    const familyUseCounts = new Map();

    for (const report of selectedReports) {
      const execution = report.execution;

      if (execution.executionMode === "runtime-generated") {
        const restoredResult = await createGeneratedAccessory(
          task,
          backendConfig,
          toolNames,
          objectAliases,
          context,
          invokedTools,
          execution,
          {
            passIndex: report.passIndex ?? activePassIndex,
            targetPassCount: report.targetPassCount,
            repairActions: Array.isArray(report.usedRepairActions)
              ? structuredClone(report.usedRepairActions)
              : [],
            variantId:
              report.usedVariantId ??
              report.geometryRecipe?.variantId ??
              execution.variantId,
          },
        );

        report.createdNames = restoredResult.createdNames;
        report.geometryRecipe = restoredResult.geometryRecipe;
        report.partGraph = restoredResult.partGraph;
        report.partBlueprints = restoredResult.partBlueprints;
        report.placementOffset = restoredResult.placementOffset;
        report.desiredPlacementOffset = restoredResult.desiredPlacementOffset;
        report.overallScaleMultiplier = restoredResult.overallScaleMultiplier;
        recreatedObjectNames.push(...restoredResult.createdNames);
        execution.runtimeDesignSource =
          restoredResult.geometryRecipe?.runtimeDesignSource ??
          execution.runtimeDesignSource ??
          "rule-compiler";
        execution.runtimeNodePrefix = restoredResult.nodePrefix;
        execution.targetAnchorPosition = Array.isArray(restoredResult.targetAnchorPosition)
          ? [...restoredResult.targetAnchorPosition]
          : undefined;
        execution.legacyAnchorPosition = Array.isArray(restoredResult.legacyAnchorPosition)
          ? [...restoredResult.legacyAnchorPosition]
          : undefined;
        execution.fittedAnchorPosition = Array.isArray(restoredResult.fittedAnchorPosition)
          ? [...restoredResult.fittedAnchorPosition]
          : undefined;
        execution.rawAnchorFitDelta = Array.isArray(restoredResult.rawAnchorFitDelta)
          ? [...restoredResult.rawAnchorFitDelta]
          : undefined;
        execution.placementOffset = Array.isArray(restoredResult.placementOffset)
          ? [...restoredResult.placementOffset]
          : undefined;
        execution.desiredPlacementOffset = Array.isArray(restoredResult.desiredPlacementOffset)
          ? [...restoredResult.desiredPlacementOffset]
          : undefined;
        execution.overallScaleMultiplier =
          typeof restoredResult.overallScaleMultiplier === "number"
            ? restoredResult.overallScaleMultiplier
            : undefined;
        execution.effectiveReferenceObject =
          typeof restoredResult.effectiveReferenceObject === "string"
            ? restoredResult.effectiveReferenceObject
            : undefined;
        execution.referenceFallbackUsed =
          restoredResult.referenceFallbackUsed === true;
        execution.referenceFallbackReason =
          typeof restoredResult.referenceFallbackReason === "string"
            ? restoredResult.referenceFallbackReason
            : undefined;
        execution.exportedNodeNames = [...restoredResult.createdNames];
        execution.exportedPartIds = Array.isArray(restoredResult.exportedPartIds)
          ? [...restoredResult.exportedPartIds]
          : Array.isArray(restoredResult.partBlueprints)
            ? restoredResult.partBlueprints
                .map((part) => (typeof part?.partId === "string" ? part.partId : null))
                .filter((value) => typeof value === "string")
            : undefined;
        const openNounRepairRequirementPassed =
          !isOpenNounExecution(execution) ||
          ((report.appliedRepairStats?.structuralCount ?? 0) >= 1 &&
            (report.appliedRepairStats?.renderDrivenCount ?? 0) >= 1);
        report.qualityAccepted =
          report.qualityReport?.precisionGatePassed === true &&
          activePassIndex >= report.targetPassCount &&
          openNounRepairRequirementPassed &&
          report.legacyFallbackImplementationBlocked !== true &&
          report.plannerBackedImplementationBlocked !== true;
        continue;
      }

      const stableResult = await applyStableAccessoryExecution(
        execution,
        backendConfig,
        toolNames,
        objectAliases,
        context,
        invokedTools,
        familyUseCounts,
        recreatedObjectNames,
      );

      report.createdNames = stableResult.applied
        ? [stableResult.objectName ?? execution.executionId]
        : [];
      report.qualityAccepted = stableResult.applied;
    }

    const restoredPassState = buildExecutionPassState(selectedReports);

    return summarizeExecutionReports({
      executionReports: selectedReports,
      createdObjectNames: recreatedObjectNames,
      appliedExecutions: restoredPassState.appliedExecutions,
      failedExecutions: restoredPassState.failedExecutions,
      partialExecutions: restoredPassState.partialExecutions,
      passNotes: restoredPassNotes,
      passIndex: activePassIndex,
    });
  };
  const runExecutionPass = async (passIndex) => {
    const familyUseCounts = new Map();
    const createdObjectNames = [];
    const appliedExecutions = [];
    const failedExecutions = [];
    const partialExecutions = [];
    const passNotes = [];
    const executionReports = [];

    await resetBaseAccessoryObjects(
      backendConfig,
      context,
      objectAliases,
      invokedTools,
    );

    for (const execution of resolvedExecutionPlan.addAccessories) {
      if (
        execution.executionMode === "runtime-generated" &&
        customizationProfile === "experimental-addon"
      ) {
        const targetPassCount = getExecutionTargetPassCount(
          customizationProfile,
          execution,
        );
        const pendingRepairActions =
          repairActionsByExecutionId.get(execution.executionId) ?? [];
        const previousRepairStats = getAppliedRepairStats(execution.executionId);
        const layerCounts = countRepairActionsByLayer(pendingRepairActions);
        const appliedRepairStats = {
          structuralCount:
            previousRepairStats.structuralCount +
            countStructuralRepairs(pendingRepairActions),
          renderDrivenCount:
            previousRepairStats.renderDrivenCount +
            (Array.isArray(pendingRepairActions) && pendingRepairActions.length > 0
              ? 1
              : 0),
          rebuildCount:
            previousRepairStats.rebuildCount +
            countStructuralRebuilds(pendingRepairActions),
          rebuildCountByLayer: {
            silhouette:
              previousRepairStats.rebuildCountByLayer.silhouette +
              (layerCounts.silhouette > 0 ? 1 : 0),
            assembly:
              previousRepairStats.rebuildCountByLayer.assembly +
              (layerCounts.assembly > 0 ? 1 : 0),
            "host-fit":
              previousRepairStats.rebuildCountByLayer["host-fit"] +
              (layerCounts["host-fit"] > 0 ? 1 : 0),
            "render-readability":
              previousRepairStats.rebuildCountByLayer["render-readability"] +
              (layerCounts["render-readability"] > 0 ? 1 : 0),
            "anchor-projection":
              previousRepairStats.rebuildCountByLayer["anchor-projection"] +
              (layerCounts["anchor-projection"] > 0 ? 1 : 0),
            "outline-compiler":
              previousRepairStats.rebuildCountByLayer["outline-compiler"] +
              (layerCounts["outline-compiler"] > 0 ? 1 : 0),
            "attachment-cohesion":
              previousRepairStats.rebuildCountByLayer["attachment-cohesion"] +
              (layerCounts["attachment-cohesion"] > 0 ? 1 : 0),
            "critique-timeout":
              previousRepairStats.rebuildCountByLayer["critique-timeout"] +
              (layerCounts["critique-timeout"] > 0 ? 1 : 0),
          },
        };
        appliedRepairStatsByExecutionId.set(
          execution.executionId,
          appliedRepairStats,
        );
        const currentVariantId =
          variantStateByExecutionId.get(execution.executionId) ??
          execution.variantId;
        const activeCapabilityRerouteId =
          capabilityTraitRerouteStateByExecutionId.get(execution.executionId) ?? null;
        const generatedResult = await createGeneratedAccessory(
          task,
          backendConfig,
          toolNames,
          objectAliases,
          context,
          invokedTools,
          execution,
          {
            passIndex,
            targetPassCount,
            repairActions: pendingRepairActions,
            variantId: currentVariantId,
            capabilityRerouteId: activeCapabilityRerouteId,
          },
        );
        const generatedNames = generatedResult.createdNames;
        if (
          process.env.PROMPTPET_DEBUG_PART_SELECTION === "1" &&
          isRecord(generatedResult.selectionDebug) &&
          typeof generatedResult.selectionDebug.totalPartCount === "number" &&
          generatedResult.selectionDebug.totalPartCount > generatedNames.length
        ) {
          passNotes.push(
            [
              `debug-part-selection ${execution.shapeLabel} 第 ${passIndex} 轮`,
              `source=${generatedResult.selectionDebug.selectedPartSource ?? "unknown"}`,
              `created=${generatedNames.length}/${generatedResult.selectionDebug.totalPartCount}`,
              `selected=${Array.isArray(generatedResult.selectionDebug.selectedPartIds) ? generatedResult.selectionDebug.selectedPartIds.join(",") : ""}`,
              `graph=${Array.isArray(generatedResult.selectionDebug.graphSelectedPartIds) ? generatedResult.selectionDebug.graphSelectedPartIds.join(",") : ""}`,
              `family=${Array.isArray(generatedResult.selectionDebug.familySelectedPartIds) ? generatedResult.selectionDebug.familySelectedPartIds.join(",") : ""}`,
            ].join(" | "),
          );
        }
        const hardMinimumPartCount = getExecutionHardMinimumPartCount(
          execution,
          generatedResult.geometryRecipe,
        );
        const qualityReport = await evaluateRuntimeExecutionQuality(
          task,
          execution,
          {
            ...generatedResult,
            hardMinimumPartCount,
          },
          backendConfig,
          toolNames,
          invokedTools,
        );
        const qualityNote = buildExecutionQualityNote(
          execution,
          qualityReport,
          passIndex,
        );
        if (
          process.env.PROMPTPET_DEBUG_CHEST_WRAP_COMPACT === "1" &&
          isHostCoupledChestWrapExecution(execution, generatedResult.geometryRecipe) &&
          /compact/i.test(String(currentVariantId ?? generatedResult.geometryRecipe?.variantId ?? ""))
        ) {
          const debugReadTargets = Array.isArray(generatedResult.geometryRecipe?.readOrderTargets)
            ? generatedResult.geometryRecipe.readOrderTargets.join("->")
            : "none";
          const debugDominantSpanOwner =
            getStructuralBlueprintDominantSpanOwner(execution, generatedResult.geometryRecipe) ??
            "none";
          const compactWrapBand = Array.isArray(generatedResult.partBlueprints)
            ? generatedResult.partBlueprints.find((part) => part?.partId === "wrap-band")
            : null;
          const compactKnot = Array.isArray(generatedResult.partBlueprints)
            ? generatedResult.partBlueprints.find((part) => part?.partId === "knot")
            : null;
          const compactTailLeft = Array.isArray(generatedResult.partBlueprints)
            ? generatedResult.partBlueprints.find((part) => part?.partId === "tail-left")
            : null;
          const compactEnvelopeDebug = isRecord(generatedResult.compactEnvelopeClampDebug)
            ? generatedResult.compactEnvelopeClampDebug
            : null;
          passNotes.push(
            [
              `debug chest-wrap compact 第 ${passIndex} 轮`,
              `variant=${currentVariantId ?? generatedResult.geometryRecipe?.variantId ?? "unknown"}`,
              `reroute=${generatedResult.geometryRecipe?.capabilityRerouteId ?? "base"}`,
              `readTargets=${debugReadTargets}`,
              `dominant=${debugDominantSpanOwner}`,
              `reportLayer=${qualityReport.visualCritiqueReport?.dominantFailureLayer ?? "none"}`,
              `controllerLayer=${qualityReport.visualCritiqueReport?.controllerFailureLayer ?? "none"}`,
              `reportRead=${Array.isArray(qualityReport.visualCritiqueReport?.finalReadOrder) ? qualityReport.visualCritiqueReport.finalReadOrder.join("->") : "none"}`,
              `reportDom=${qualityReport.visualCritiqueReport?.dominantSpanOwner ?? "none"}`,
              `overallScale=${typeof generatedResult.overallScaleMultiplier === "number" ? generatedResult.overallScaleMultiplier.toFixed(3) : "n/a"}`,
              `hostFitClamp=${typeof generatedResult.hostFitScaleClamp === "number" ? generatedResult.hostFitScaleClamp.toFixed(3) : "n/a"}`,
              compactEnvelopeDebug
                ? `envelope=${Array.isArray(compactEnvelopeDebug.spanBefore) ? compactEnvelopeDebug.spanBefore.join("/") : "n/a"}->${Array.isArray(compactEnvelopeDebug.spanAfter) ? compactEnvelopeDebug.spanAfter.join("/") : "n/a"} target=${Array.isArray(compactEnvelopeDebug.targetSpan) ? compactEnvelopeDebug.targetSpan.join("/") : "n/a"}`
                : "envelope=no-op",
              `qScale=${qualityReport.qualityMetrics?.scaleFit ?? "n/a"}`,
              `qHost=${qualityReport.qualityMetrics?.hostComposition ?? "n/a"}`,
              `qSil=${qualityReport.qualityMetrics?.silhouetteStrength ?? "n/a"}`,
              `qRead=${qualityReport.qualityMetrics?.visualReadability ?? "n/a"}`,
              formatDebugPartState(compactWrapBand),
              formatDebugPartState(compactKnot),
              formatDebugPartState(compactTailLeft),
            ].join(" | "),
          );
        }
        createdObjectNames.push(...generatedNames);
        execution.runtimeDesignSource =
          generatedResult.geometryRecipe?.runtimeDesignSource ??
          execution.runtimeDesignSource ??
          "rule-compiler";
        execution.runtimeNodePrefix = generatedResult.nodePrefix;
        execution.targetAnchorPosition = Array.isArray(generatedResult.targetAnchorPosition)
          ? [...generatedResult.targetAnchorPosition]
          : undefined;
        execution.legacyAnchorPosition = Array.isArray(generatedResult.legacyAnchorPosition)
          ? [...generatedResult.legacyAnchorPosition]
          : undefined;
        execution.fittedAnchorPosition = Array.isArray(generatedResult.fittedAnchorPosition)
          ? [...generatedResult.fittedAnchorPosition]
          : undefined;
        execution.rawAnchorFitDelta = Array.isArray(generatedResult.rawAnchorFitDelta)
          ? [...generatedResult.rawAnchorFitDelta]
          : undefined;
        execution.placementOffset = Array.isArray(generatedResult.placementOffset)
          ? [...generatedResult.placementOffset]
          : undefined;
        execution.desiredPlacementOffset = Array.isArray(generatedResult.desiredPlacementOffset)
          ? [...generatedResult.desiredPlacementOffset]
          : undefined;
        execution.overallScaleMultiplier =
          typeof generatedResult.overallScaleMultiplier === "number"
            ? generatedResult.overallScaleMultiplier
            : undefined;
        execution.hostFitScaleClamp =
          typeof generatedResult.hostFitScaleClamp === "number"
            ? generatedResult.hostFitScaleClamp
            : undefined;
        execution.stageScaleMultiplier =
          typeof generatedResult.stageScaleMultiplier === "number"
            ? generatedResult.stageScaleMultiplier
            : undefined;
        execution.effectiveReferenceObject =
          typeof generatedResult.effectiveReferenceObject === "string"
            ? generatedResult.effectiveReferenceObject
            : undefined;
        execution.referenceFallbackUsed =
          generatedResult.referenceFallbackUsed === true;
        execution.referenceFallbackReason =
          typeof generatedResult.referenceFallbackReason === "string"
            ? generatedResult.referenceFallbackReason
            : undefined;
        execution.exportedNodeNames = [...generatedNames];
        execution.exportedPartIds = Array.isArray(generatedResult.exportedPartIds)
          ? [...generatedResult.exportedPartIds]
          : Array.isArray(generatedResult.partBlueprints)
            ? generatedResult.partBlueprints
                .map((part) => (typeof part?.partId === "string" ? part.partId : null))
                .filter((value) => typeof value === "string")
            : undefined;
        const resolvedVariantId =
          typeof generatedResult.geometryRecipe?.variantId === "string"
            ? generatedResult.geometryRecipe.variantId
            : currentVariantId;
        const currentExecutionSnapshot = {
          executionId: execution.executionId,
          execution: {
            executionId: execution.executionId,
            variantId: resolvedVariantId,
          },
          usedVariantId: resolvedVariantId,
          passIndex,
          qualityAccepted: false,
          qualityReport,
        };
        const baseController = buildRuntimeFailureLayerController({
          dominantFailureLayer:
            qualityReport.visualCritiqueReport?.dominantFailureLayer ??
            execution.dominantFailureLayer,
          dominantFailureModes: qualityReport.dominantFailureModes,
        });
        const plateauEvidence = detectExecutionSnapshotPlateau({
          executionId: execution.executionId,
          currentVariantId: resolvedVariantId,
          failureLayer: baseController.failureLayer,
          snapshots: executionReportSnapshots,
          currentSnapshot: currentExecutionSnapshot,
        });
        const failureLayerController = buildRuntimeFailureLayerController({
          dominantFailureLayer: baseController.failureLayer,
          dominantFailureModes: qualityReport.dominantFailureModes,
          plateauReason: plateauEvidence.plateauReason ?? plateauReason,
          repeatedFailureCount: getControllerRepeatedFailureCount({
            appliedRepairStats,
            failureLayer: baseController.failureLayer,
            executionId: execution.executionId,
            executionReportSnapshots,
            currentVariantId: resolvedVariantId,
            currentSnapshot: currentExecutionSnapshot,
            plateauStableSnapshotCount: plateauEvidence.stableSnapshotCount,
          }),
        });
        if (isRecord(qualityReport.visualCritiqueReport)) {
          qualityReport.visualCritiqueReport.controllerFailureLayer =
            failureLayerController.failureLayer;
          qualityReport.visualCritiqueReport.controllerDirective =
            failureLayerController.rebuildDirective;
          qualityReport.visualCritiqueReport.repeatedFailureCount =
            failureLayerController.repeatedFailureCount;
          qualityReport.visualCritiqueReport.stagnationDetected =
            failureLayerController.stagnationDetected;
          qualityReport.visualCritiqueReport.plateauReason =
            failureLayerController.plateauReason;
          qualityReport.visualCritiqueReport.repairActions =
            applyFailureLayerControllerEscalation(
              qualityReport.visualCritiqueReport,
              qualityReport.visualCritiqueReport.repairActions,
              failureLayerController,
            );
        }
        qualityReport.controllerFailureLayer = failureLayerController.failureLayer;
        qualityReport.controllerDirective = failureLayerController.rebuildDirective;
        const nextRepairActions = Array.isArray(qualityReport.visualCritiqueReport?.repairActions)
          ? [...qualityReport.visualCritiqueReport.repairActions]
          : [];
        if (
          isOpenNounExecution(execution) &&
          appliedRepairStats.structuralCount < 1 &&
          passIndex < targetPassCount &&
          countStructuralRepairs(nextRepairActions) === 0
        ) {
          nextRepairActions.push({
            actionType: "tighten-cohesion",
            reason: "open noun 在进入通过态前，至少执行一轮结构收紧修复。",
            source: "structural",
            intensity: 0.52,
          });
        }
        repairActionsByExecutionId.set(
          execution.executionId,
          nextRepairActions,
        );
        let blueprintVariantSwitched = false;
        if (
          shouldSwitchBlueprintVariant(
            execution,
            qualityReport,
            generatedResult.geometryRecipe,
            passIndex,
          )
        ) {
          const preferredVariantId = getPreferredRecoveryVariantId(
            execution,
            generatedResult.geometryRecipe,
            currentVariantId,
            qualityReport,
          );
          const nextVariantId =
            typeof preferredVariantId === "string" && preferredVariantId.trim()
              ? preferredVariantId
              : getNextBlueprintVariantId(
                  execution,
                  generatedResult.geometryRecipe,
                  currentVariantId,
                );
          if (nextVariantId && nextVariantId !== currentVariantId) {
            variantStateByExecutionId.set(execution.executionId, nextVariantId);
            const bootstrapRepairActions = buildVariantSwitchBootstrapRepairActions({
              execution,
              geometryRecipe: generatedResult.geometryRecipe,
              currentVariantId,
              nextVariantId,
            });
            repairActionsByExecutionId.set(
              execution.executionId,
              bootstrapRepairActions,
            );
            appliedRepairStatsByExecutionId.set(
              execution.executionId,
              createEmptyAppliedRepairStats(),
            );
            const switchReport = qualityReport.visualCritiqueReport;
            const switchEvidence = isRecord(switchReport)
              ? [
                  typeof switchReport.repeatedFailureCount === "number"
                    ? `repeat=${switchReport.repeatedFailureCount}`
                    : null,
                  typeof switchReport.renderNounFidelity === "number"
                    ? `noun=${Math.round(switchReport.renderNounFidelity * 100)}%`
                    : typeof switchReport.nounFidelity === "number"
                      ? `noun=${Math.round(switchReport.nounFidelity * 100)}%`
                      : null,
                  typeof switchReport.silhouetteReadability === "number"
                    ? `renderSil=${Math.round(switchReport.silhouetteReadability * 100)}%`
                    : null,
                  switchReport.visualVeto === true ? "visualVeto=1" : "visualVeto=0",
                  switchReport.variantSwitchRecommended === true
                    ? "switchRecommended=1"
                    : "switchRecommended=0",
                  Array.isArray(switchReport.finalReadOrder) &&
                  switchReport.finalReadOrder.length > 0
                    ? `read=${switchReport.finalReadOrder.join("->")}`
                    : null,
                ]
                  .filter((value) => typeof value === "string" && value.trim())
                  .join(" / ")
              : "";
            passNotes.push(
              `${execution.shapeLabel} 第 ${passIndex} 轮触发 reference blueprint variant switch：${currentVariantId ?? "default"} -> ${nextVariantId}${switchEvidence ? `（${switchEvidence}）` : ""}`,
            );
            if (bootstrapRepairActions.length > 0) {
              passNotes.push(
                `${execution.shapeLabel} 第 ${passIndex} 轮已重置上一变体的 repair state，并为 ${nextVariantId} 注入 compact bootstrap repairs。`,
                );
            }
            capabilityEscalationBootstrapStateByExecutionId.delete(execution.executionId);
            capabilityTraitRerouteStateByExecutionId.delete(execution.executionId);
            blueprintVariantSwitched = true;
          } else if (currentVariantId) {
            variantStateByExecutionId.set(execution.executionId, currentVariantId);
          }
        } else if (currentVariantId) {
          variantStateByExecutionId.set(execution.executionId, currentVariantId);
        }
        if (!blueprintVariantSwitched) {
          const capabilityBootstrapRepairActions =
            buildCapabilityEscalationBootstrapRepairActions(
              execution,
              generatedResult.geometryRecipe,
              qualityReport,
              resolvedVariantId,
            );
          const capabilityEscalationToken = [
            resolvedVariantId ?? currentVariantId ?? "default",
            failureLayerController.failureLayer,
            failureLayerController.rebuildDirective,
          ].join(":");

          if (
            capabilityBootstrapRepairActions.length > 0 &&
            capabilityEscalationBootstrapStateByExecutionId.get(execution.executionId) !==
              capabilityEscalationToken
          ) {
            repairActionsByExecutionId.set(
              execution.executionId,
              capabilityBootstrapRepairActions,
            );
            appliedRepairStatsByExecutionId.set(
              execution.executionId,
              createEmptyAppliedRepairStats(),
            );
            capabilityEscalationBootstrapStateByExecutionId.set(
              execution.executionId,
              capabilityEscalationToken,
            );
            const capabilityTraitRerouteId = getCapabilityTraitRerouteId(
              capabilityBootstrapRepairActions,
            );
            if (capabilityTraitRerouteId) {
              capabilityTraitRerouteStateByExecutionId.set(
                execution.executionId,
                capabilityTraitRerouteId,
              );
            }
            passNotes.push(
              `${execution.shapeLabel} 第 ${passIndex} 轮触发 capability reroute bootstrap：${resolvedVariantId ?? currentVariantId ?? "default"} 保持不变，但 repair queue 已重置为 capability-level bootstrap。`,
            );
          }
        }
        const openNounRepairRequirementPassed =
          !isOpenNounExecution(execution) ||
          (appliedRepairStats.structuralCount >= 1 &&
            appliedRepairStats.renderDrivenCount >= 1);
        const legacyFallbackImplementationBlocked =
          execution.sourceMode === "legacy-fallback";
        const plannerBackedImplementationBlocked =
          isOpenNounExecution(execution) &&
          !hasPlannerBackedRuntimeContractFromLib(
            execution,
            generatedResult.geometryRecipe,
          );
        const executionQualityAccepted =
          qualityReport.precisionGatePassed &&
          passIndex >= targetPassCount &&
          openNounRepairRequirementPassed &&
          !legacyFallbackImplementationBlocked &&
          !plannerBackedImplementationBlocked;
        executionReports.push({
          execution,
          passIndex,
          qualityReport,
          qualityAccepted: executionQualityAccepted,
          qualityNote,
          targetPassCount,
          usedVariantId:
            currentVariantId ??
            generatedResult.geometryRecipe?.variantId,
          usedRepairActions: Array.isArray(pendingRepairActions)
            ? structuredClone(pendingRepairActions)
            : [],
          createdNames: generatedNames,
          hardMinimumPartCount,
          geometryRecipe: generatedResult.geometryRecipe,
          partGraph: generatedResult.partGraph,
          partBlueprints: generatedResult.partBlueprints,
          placementOffset: generatedResult.placementOffset,
          desiredPlacementOffset: generatedResult.desiredPlacementOffset,
          overallScaleMultiplier: generatedResult.overallScaleMultiplier,
          appliedRepairStats,
          legacyFallbackImplementationBlocked,
          plannerBackedImplementationBlocked,
        });

        if (qualityReport.hardGatePassed) {
          appliedExecutions.push(execution.executionId);
          if (executionQualityAccepted) {
            passNotes.push(`已通过质量门槛：${execution.shapeLabel}`);
          } else if (legacyFallbackImplementationBlocked) {
            passNotes.push(
              `命中 legacy fallback，只能近似展示：${execution.shapeLabel}`,
            );
          } else if (plannerBackedImplementationBlocked) {
            passNotes.push(
              `缺少 planner-backed contract，只能近似展示：${execution.shapeLabel}`,
            );
          } else if (
            isOpenNounExecution(execution) &&
            !openNounRepairRequirementPassed
          ) {
            passNotes.push(
              `已过质量门槛但还没完成必需 repair：${execution.shapeLabel}（结构修复 ${appliedRepairStats.structuralCount}/1，render-driven ${appliedRepairStats.renderDrivenCount}/1）`,
            );
          } else if (passIndex < targetPassCount) {
            passNotes.push(
              `已过硬门槛但未到最少精修轮次：${execution.shapeLabel}（当前 ${passIndex}/${targetPassCount} 轮）`,
            );
          } else {
            passNotes.push(
              `精度仍未过线，继续精修：${execution.shapeLabel}${qualityReport.dominantFailureModes.length > 0 ? `（${qualityReport.dominantFailureModes.join(" / ")}）` : ""}`,
            );
          }
        } else if (generatedNames.length > 0) {
          partialExecutions.push(execution.executionId);
          failedExecutions.push(execution.executionId);
          passNotes.push(
            `首版仍未过硬门槛：${execution.shapeLabel}（${generatedNames.length}/${hardMinimumPartCount}）`,
          );
        } else {
          failedExecutions.push(execution.executionId);
          passNotes.push(`现场生成失败：${execution.shapeLabel}`);
        }
        continue;
      }

      const stableResult = await applyStableAccessoryExecution(
        execution,
        backendConfig,
        toolNames,
        objectAliases,
        context,
        invokedTools,
        familyUseCounts,
        createdObjectNames,
      );

      if (stableResult.applied) {
        appliedExecutions.push(execution.executionId);
      } else {
        failedExecutions.push(execution.executionId);
      }

      executionReports.push({
        execution,
        passIndex,
        qualityReport: {
          hardGatePassed: stableResult.applied,
          partCountPassed: stableResult.applied,
          structuralQualityPassed: stableResult.applied,
          qualityGatePassed: stableResult.applied,
          precisionGatePassed: stableResult.applied,
          precisionReady: stableResult.applied,
          visualAcceptanceGatePassed: stableResult.applied,
          qualityScore: stableResult.applied ? 1 : 0,
          dominantFailureModes: [],
          qualityMetrics: {
            shapeReadability: stableResult.applied ? 1 : 0,
            visualReadability: stableResult.applied ? 1 : 0,
            anchorAccuracy: stableResult.applied ? 1 : 0,
            colorIsolation: 1,
            occlusionRisk: stableResult.applied ? 1 : 0,
            scaleFit: stableResult.applied ? 1 : 0,
            hostComposition: stableResult.applied ? 1 : 0,
            silhouetteStrength: stableResult.applied ? 1 : 0,
            lookalikeRisk: stableResult.applied ? 0 : 1,
            nounFidelity: stableResult.applied ? 1 : 0,
            criticalPartsPresent: stableResult.applied ? 1 : 0,
            archetypeMatch: stableResult.applied ? 1 : 0,
            cohesionScore: stableResult.applied ? 1 : 0,
          },
          visualCritiqueReport: {
            reportId: `critique-${execution.executionId}`,
            executionId: execution.executionId,
            requestId: execution.requestId,
            requestedNoun: execution.requestedNoun,
            designArchetype: execution.designArchetype,
            runtimeShapeClass: execution.runtimeShapeClass,
            source: "render-hybrid",
            viewScores: [],
            lookalikeRisk: stableResult.applied ? 0 : 1,
            criticalPartsPresent: stableResult.applied ? 1 : 0,
            nounFidelity: stableResult.applied ? 1 : 0,
            renderNounFidelity: stableResult.applied ? 1 : 0,
            criticalPartsVisible: stableResult.applied ? 1 : 0,
            silhouetteReadability: stableResult.applied ? 1 : 0,
            cohesionScore: stableResult.applied ? 1 : 0,
            cohesionIssues: [],
            dominantFailureMode: stableResult.applied ? "none" : "stable-path-failed",
            oversizeParts: [],
            hiddenCriticalParts: [],
            flattenedStructureParts: [],
            hostInterferenceZones: [],
            nextPassPriority: "final-review",
            rawFirstReadResult: execution.requestedNoun ?? execution.shapeLabel,
            firstReadResult: execution.requestedNoun ?? execution.shapeLabel,
            canonicalFirstRead: execution.requestedNoun ?? execution.shapeLabel,
            repairIntensityHints: [],
            visualAcceptanceGatePassed: stableResult.applied,
            visualFailureReasons: [],
            repairActions: [],
            summary: stableResult.applied
              ? "稳定路径不需要额外视觉修复。"
              : "稳定路径未通过。",
          },
        },
        qualityAccepted: stableResult.applied,
        renderCritiqueAvailable: true,
        qualityNote:
          stableResult.applied
            ? `${getAccessoryAnchorLabel(execution.anchor)} · ${getExecutionResolvedLabel(execution)} 已按稳定路径落位。`
            : `${execution.shapeLabel} 当前没有通过稳定执行。`,
        targetPassCount: 1,
        createdNames: stableResult.applied
          ? [stableResult.objectName ?? execution.executionId]
          : [],
        hardMinimumPartCount: 1,
        geometryRecipe: getGeometryRecipeForExecution(customizations, execution),
        partBlueprints: [],
        placementOffset: [0, 0, 0],
        desiredPlacementOffset: [0, 0, 0],
        overallScaleMultiplier: 1,
      });

      if (stableResult.note) {
        passNotes.push(stableResult.note);
      }
    }

    return summarizeExecutionReports({
      executionReports,
      createdObjectNames,
      appliedExecutions,
      failedExecutions,
      partialExecutions,
      passNotes,
      passIndex,
    });
  };

  let passCount = 0;
  let passResult = null;
  let stopReasonOverride = null;
  let plateauReason = null;
  const passHistory = [];
  const executionReportSnapshots = [];

  const getMetricRangeFromPassHistory = (entries, selector) => {
    const values = entries
      .map((entry) => selector(entry))
      .filter((value) => typeof value === "number" && Number.isFinite(value));

    if (values.length === 0) {
      return 0;
    }

    return Math.max(...values) - Math.min(...values);
  };

  const getSharedCapabilityRerouteIds = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const sets = entries.map(
      (entry) =>
        new Set(
          Array.isArray(entry?.capabilityRerouteIds)
            ? entry.capabilityRerouteIds.filter((value) => typeof value === "string")
            : [],
        ),
    );
    if (sets.some((set) => set.size === 0)) {
      return [];
    }

    return [...sets[0]].filter((value) => sets.every((set) => set.has(value)));
  };

  const getQualityPlateauReason = (recentPasses) => {
    if (recentPasses.length < 3) {
      return null;
    }

    const [older, previous, current] = recentPasses.slice(-3);
    const cohesionImprovementA =
      previous.aggregateMetrics.cohesionScore - older.aggregateMetrics.cohesionScore;
    const cohesionImprovementB =
      current.aggregateMetrics.cohesionScore - previous.aggregateMetrics.cohesionScore;
    const renderImprovementA =
      previous.aggregateRenderNounFidelity - older.aggregateRenderNounFidelity;
    const renderImprovementB =
      current.aggregateRenderNounFidelity - previous.aggregateRenderNounFidelity;
    const hostImprovementA =
      previous.aggregateMetrics.hostComposition - older.aggregateMetrics.hostComposition;
    const hostImprovementB =
      current.aggregateMetrics.hostComposition - previous.aggregateMetrics.hostComposition;
    const silhouetteImprovementA =
      previous.aggregateMetrics.silhouetteStrength - older.aggregateMetrics.silhouetteStrength;
    const silhouetteImprovementB =
      current.aggregateMetrics.silhouetteStrength - previous.aggregateMetrics.silhouetteStrength;
    const noNewStructuralRepairActions =
      JSON.stringify(older.structuralRepairSignatures) ===
        JSON.stringify(previous.structuralRepairSignatures) &&
      JSON.stringify(previous.structuralRepairSignatures) ===
        JSON.stringify(current.structuralRepairSignatures);
    const stableFailureModes =
      JSON.stringify(previous.dominantFailureModes) ===
      JSON.stringify(current.dominantFailureModes);
    const recentFour = recentPasses.slice(-4);
    const recentSix = recentPasses.slice(-6);
    const recentVariantIds = uniqueStrings(
      recentFour.flatMap((entry) =>
        Array.isArray(entry.variantIds) ? entry.variantIds.filter((value) => typeof value === "string") : [],
      ),
    );
    const sharedCapabilityRerouteIds = getSharedCapabilityRerouteIds(recentSix);
    const genericReadLoop =
      recentFour.length >= 4 &&
      recentFour.every((entry) =>
        Array.isArray(entry.canonicalFirstReads) &&
        entry.canonicalFirstReads.length > 0 &&
        entry.canonicalFirstReads.every(
          (value) => typeof value === "string" && /^generic-/.test(value),
        ),
      );
    const variantCycleDetected = recentFour.length >= 4 && recentVariantIds.length >= 2;
    const faceIntrusionImprovementA =
      previous.aggregateFaceIntrusionSeverity - older.aggregateFaceIntrusionSeverity;
    const faceIntrusionImprovementB =
      current.aggregateFaceIntrusionSeverity - previous.aggregateFaceIntrusionSeverity;
    const readabilityPlateauLoop =
      recentFour.length >= 4 &&
      genericReadLoop &&
      recentFour.every(
        (entry) =>
          entry.aggregateMetrics.scaleFit >= 0.52 &&
          entry.aggregateFaceIntrusionSeverity < 0.18 &&
          entry.aggregateMetrics.hostComposition >= 0.58,
      );
    const severeGenericRepresentationLoop =
      recentFour.length >= 4 &&
      genericReadLoop &&
      variantCycleDetected &&
      recentFour.every(
        (entry) =>
          entry.aggregateMetrics.scaleFit < 0.52 &&
          entry.aggregateMetrics.hostComposition < 0.58 &&
          entry.aggregateMetrics.silhouetteStrength < 0.58,
      );
    const rerouteFailureModeSignatures = recentSix.map((entry) =>
      JSON.stringify(entry.dominantFailureModes),
    );
    const rerouteFailureModesStable =
      recentSix.length >= 6 &&
      rerouteFailureModeSignatures.every(
        (signature) => signature === rerouteFailureModeSignatures[0],
      );
    const rerouteReadabilityRange = getMetricRangeFromPassHistory(
      recentSix,
      (entry) => entry.aggregateMetrics.visualReadability,
    );
    const rerouteSilhouetteRange = getMetricRangeFromPassHistory(
      recentSix,
      (entry) => entry.aggregateMetrics.silhouetteStrength,
    );
    const rerouteScaleFitRange = getMetricRangeFromPassHistory(
      recentSix,
      (entry) => entry.aggregateMetrics.scaleFit,
    );
    const rerouteHostCompositionRange = getMetricRangeFromPassHistory(
      recentSix,
      (entry) => entry.aggregateMetrics.hostComposition,
    );
    const rerouteRenderFidelityRange = getMetricRangeFromPassHistory(
      recentSix,
      (entry) => entry.aggregateRenderNounFidelity,
    );
    const rerouteSteadyStateLoop =
      recentSix.length >= 6 &&
      sharedCapabilityRerouteIds.length > 0 &&
      rerouteFailureModesStable &&
      rerouteReadabilityRange <= 0.04 &&
      rerouteSilhouetteRange <= 0.04 &&
      rerouteScaleFitRange <= 0.04 &&
      rerouteHostCompositionRange <= 0.03 &&
      rerouteRenderFidelityRange <= 0.035;

    if (hasHardSurfaceOpenNounRuntimeExecution) {
      const hardSurfaceOpenNounPlateau =
        (
          passCount >= 8 &&
          current.totalRebuildCount >= 2 &&
          Math.abs(cohesionImprovementA) < 0.02 &&
          Math.abs(cohesionImprovementB) < 0.02 &&
          Math.abs(renderImprovementA) < 0.02 &&
          Math.abs(renderImprovementB) < 0.02 &&
          Math.abs(hostImprovementA) < 0.02 &&
          Math.abs(hostImprovementB) < 0.02 &&
          Math.abs(silhouetteImprovementA) < 0.02 &&
          Math.abs(silhouetteImprovementB) < 0.02 &&
          noNewStructuralRepairActions &&
          stableFailureModes
        ) ||
        (
          passCount >= 10 &&
          variantCycleDetected &&
          genericReadLoop &&
          Math.abs(cohesionImprovementA) < 0.02 &&
          Math.abs(cohesionImprovementB) < 0.02 &&
          Math.abs(renderImprovementA) < 0.02 &&
          Math.abs(renderImprovementB) < 0.02 &&
          Math.abs(hostImprovementA) < 0.02 &&
          Math.abs(hostImprovementB) < 0.02 &&
          Math.abs(silhouetteImprovementA) < 0.02 &&
          Math.abs(silhouetteImprovementB) < 0.02 &&
          Math.abs(faceIntrusionImprovementA) < 0.02 &&
          Math.abs(faceIntrusionImprovementB) < 0.02 &&
          stableFailureModes
        ) ||
        (
          passCount >= 8 &&
          readabilityPlateauLoop &&
          Math.abs(renderImprovementA) < 0.03 &&
          Math.abs(renderImprovementB) < 0.03 &&
          Math.abs(silhouetteImprovementA) < 0.03 &&
          Math.abs(silhouetteImprovementB) < 0.03 &&
          stableFailureModes
        ) ||
        (
          passCount >= 12 &&
          severeGenericRepresentationLoop &&
          Math.abs(renderImprovementA) < 0.03 &&
          Math.abs(renderImprovementB) < 0.03 &&
          stableFailureModes
        )
      ;

      if (hardSurfaceOpenNounPlateau) {
        return "已完成至少 8 轮；如果结果已经不过度压脸却仍长期 generic/unreadable，就停止继续 shrink，按 representation/readability plateau 诚实停机。";
      }
    }

    if (
      hasOpenNounRuntimeExecution &&
      Math.abs(cohesionImprovementA) < 0.02 &&
      Math.abs(cohesionImprovementB) < 0.02 &&
      Math.abs(renderImprovementA) < 0.02 &&
      Math.abs(renderImprovementB) < 0.02 &&
      noNewStructuralRepairActions
    ) {
      return "连续 3 轮 cohesion / render fidelity 提升不足且没有新增结构修复动作。";
    }

    if (passCount >= Math.max(softTargetPassCount, 12) && rerouteSteadyStateLoop) {
      return `同一 capability reroute 已连续 ${recentSix.length} 轮停在窄幅 steady-state，readability/silhouette/scale/host 只在小范围振荡，继续执行只会空转。`;
    }

    return null;
  };

  const hasRenderCritiqueTimeoutPlateau = (recentPasses) => {
    if (!hasOpenNounRuntimeExecution || recentPasses.length < 3) {
      return false;
    }

    const recentThree = recentPasses.slice(-3);

    return (
      passCount >= Math.max(minimumRequiredPassCount, 6) &&
      recentThree.every((entry) => entry.renderCritiqueAvailableCount === 0) &&
      recentThree.every((entry) => entry.renderCritiqueTimeoutCount > 0)
    );
  };

  while (
    Date.now() - stageStartedAt < runtimeBudgetMs &&
    passCount < safetyPassCap
  ) {
    if (passResult && passResult.createdObjectNames.length > 0) {
      await deleteCreatedObjects(passResult.createdObjectNames);
      resolvedExecutionPlan.repairPassTriggered = true;
    }

    passCount += 1;
    passResult = await runExecutionPass(passCount);
    executionReportSnapshots.push(
      ...passResult.executionReports
        .map((report) => captureExecutionReportSnapshot(report))
        .filter((snapshot) => snapshot !== null),
    );
    const passSummary = `第 ${passCount} 轮评估：总分 ${Math.round(
      passResult.aggregateQualityScore * 100,
    )}% / 形状 ${Math.round(
      passResult.aggregateMetrics.shapeReadability * 100,
    )}% / 落位 ${Math.round(
      passResult.aggregateMetrics.anchorAccuracy * 100,
    )}% / 轮廓 ${Math.round(
      passResult.aggregateMetrics.silhouetteStrength * 100,
    )}%`;
    dynamicNotes.push(passSummary);
    dynamicNotes.push(...passResult.passNotes);
    passHistory.push({
      aggregateMetrics: passResult.aggregateMetrics,
      aggregateRenderNounFidelity: passResult.aggregateRenderNounFidelity,
      renderCritiqueAvailableCount: passResult.renderCritiqueAvailableCount,
      renderCritiqueTimeoutCount: passResult.renderCritiqueTimeoutCount,
      aggregateFaceIntrusionSeverity: passResult.visualCritiqueReports.reduce(
        (maxValue, report) =>
          Math.max(
            maxValue,
            typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0,
          ),
        0,
      ),
      structuralRepairSignatures: passResult.structuralRepairSignatures,
      dominantFailureModes: [...passResult.dominantFailureModes].sort(),
      totalRebuildCount: passResult.totalRebuildCount,
      variantIds: uniqueStrings(
        passResult.executionReports
          .map((report) => report.usedVariantId)
          .filter((value) => typeof value === "string"),
      ),
      canonicalFirstReads: uniqueStrings(
        passResult.visualCritiqueReports
          .map((report) => report.canonicalFirstRead)
          .filter((value) => typeof value === "string"),
      ),
      capabilityRerouteIds: uniqueStrings(
        passResult.executionReports
          .map((report) => report.geometryRecipe?.capabilityRerouteId)
          .filter((value) => typeof value === "string"),
      ),
    });
    const dominantPassRuntimeController = selectDominantRuntimeController(
      passResult.executionReports
        .filter((report) => report.execution.executionMode === "runtime-generated")
        .map((report) => ({
          controllerFailureLayer:
            report.qualityReport.controllerFailureLayer ??
            report.qualityReport.visualCritiqueReport?.controllerFailureLayer,
          controllerDirective:
            report.qualityReport.controllerDirective ??
            report.qualityReport.visualCritiqueReport?.controllerDirective,
          repeatedFailureCount:
            report.qualityReport.visualCritiqueReport?.repeatedFailureCount,
          stagnationDetected:
            report.qualityReport.visualCritiqueReport?.stagnationDetected,
          plateauReason:
            report.qualityReport.visualCritiqueReport?.plateauReason,
          dominantFailureModes: report.qualityReport.dominantFailureModes,
        })),
    );

    if (
      passResult.hardGatePassed &&
      passResult.precisionGatePassed &&
      passCount >= minimumRequiredPassCount
    ) {
      break;
    }

    if (hasRenderCritiqueTimeoutPlateau(passHistory)) {
      stopReasonOverride = "partial-approximation";
      plateauReason =
        "连续 3 轮 render critique 都因代理超时不可用；当前只能诚实停在近似实现，避免继续空转。";
      dynamicNotes.push(`触发 render critique 超时停机：${plateauReason}`);
      break;
    }

    if (
      passCount >= softTargetPassCount &&
      dominantPassRuntimeController?.stagnationDetected === true &&
      typeof dominantPassRuntimeController.plateauReason === "string" &&
      dominantPassRuntimeController.plateauReason.trim()
    ) {
      stopReasonOverride = "quality-plateau";
      plateauReason = dominantPassRuntimeController.plateauReason;
      dynamicNotes.push(`触发平台期停机：${plateauReason}`);
      break;
    }

    const passHistoryPlateauReason =
      passCount >= softTargetPassCount ? getQualityPlateauReason(passHistory) : null;
    if (typeof passHistoryPlateauReason === "string" && passHistoryPlateauReason.trim()) {
      stopReasonOverride = "quality-plateau";
      plateauReason = passHistoryPlateauReason;
      dynamicNotes.push(`触发平台期停机：${plateauReason}`);
      break;
    }
  }

  if (!passResult) {
    return dynamicNotes;
  }

  const diagnosticPassResult = passResult;
  const preferredExecutionSnapshots =
    selectPreferredExecutionSnapshots(executionReportSnapshots);
  const restoredPassResult = await restorePreferredExecutionReports(
    preferredExecutionSnapshots,
    passResult,
    passCount,
  );

  if (restoredPassResult !== passResult) {
    dynamicNotes.push("最终导出已回退到当前最佳执行快照，避免末轮退化覆盖更完整结果。");
    passResult = restoredPassResult;
  }

  const budgetUsedMs = Math.min(
    runtimeBudgetMs,
    Math.max(1, Date.now() - stageStartedAt),
  );

  for (const report of passResult.executionReports) {
    const {
      execution,
      qualityReport,
      qualityNote,
      createdNames,
      targetPassCount,
      geometryRecipe,
      plannerBackedImplementationBlocked,
    } = report;
    const approximationLabel =
      typeof geometryRecipe?.requestedNoun === "string" && geometryRecipe.requestedNoun
        ? `${geometryRecipe.requestedNoun} 近似件`
        : typeof execution.requestedNoun === "string" && execution.requestedNoun
          ? `${execution.requestedNoun} 近似件`
          : getExecutionResolvedLabel(execution);
    execution.notes = uniqueStrings([
      ...(Array.isArray(execution.notes) ? execution.notes : []),
      qualityNote,
      `当前执行累计 ${passCount} 轮，目标最少 ${targetPassCount} 轮。`,
      qualityReport.visualCritiqueReport?.summary,
    ]);
    execution.dominantFailureLayer =
      qualityReport.visualCritiqueReport?.dominantFailureLayer;
    execution.finalReadOrder = Array.isArray(
      qualityReport.visualCritiqueReport?.finalReadOrder,
    )
      ? qualityReport.visualCritiqueReport.finalReadOrder
      : Array.isArray(qualityReport.visualCritiqueReport?.nounReadOrder)
        ? qualityReport.visualCritiqueReport.nounReadOrder
        : undefined;
    execution.variantId =
      report.usedVariantId ??
      report.geometryRecipe?.variantId ??
      execution.variantId;
    execution.rawFirstReadResult =
      qualityReport.visualCritiqueReport?.rawFirstReadResult;
    execution.firstReadResult =
      qualityReport.visualCritiqueReport?.firstReadResult;
    execution.canonicalFirstRead =
      qualityReport.visualCritiqueReport?.canonicalFirstRead;
    execution.rawDominantSpanOwnerText =
      qualityReport.visualCritiqueReport?.rawDominantSpanOwnerText;
    execution.canonicalDominantSpanOwner =
      qualityReport.visualCritiqueReport?.canonicalDominantSpanOwner;
    execution.canonicalDetachedPartIds = Array.isArray(
      qualityReport.visualCritiqueReport?.canonicalDetachedPartIds,
    )
      ? qualityReport.visualCritiqueReport.canonicalDetachedPartIds
      : undefined;
    execution.canonicalFlattenedPartIds = Array.isArray(
      qualityReport.visualCritiqueReport?.canonicalFlattenedPartIds,
    )
      ? qualityReport.visualCritiqueReport.canonicalFlattenedPartIds
      : undefined;
    execution.visualVetoReason =
      qualityReport.visualCritiqueReport?.visualVetoReason;
    execution.visualAcceptanceGatePassed =
      qualityReport.visualCritiqueReport?.visualAcceptanceGatePassed;
    execution.visualFailureReasons = Array.isArray(
      qualityReport.visualCritiqueReport?.visualFailureReasons,
    )
      ? qualityReport.visualCritiqueReport.visualFailureReasons
      : undefined;
    execution.anchorProjectionFailureKind =
      qualityReport.visualCritiqueReport?.anchorProjectionFailureKind;
    execution.projectedAnchorPose = Array.isArray(
      qualityReport.visualCritiqueReport?.projectedAnchorPose,
    )
      ? qualityReport.visualCritiqueReport.projectedAnchorPose
      : undefined;
    execution.anchorPlaneOffset = Array.isArray(
      qualityReport.visualCritiqueReport?.anchorPlaneOffset,
    )
      ? qualityReport.visualCritiqueReport.anchorPlaneOffset
      : undefined;
    execution.earSideTangentOffset = Array.isArray(
      qualityReport.visualCritiqueReport?.earSideTangentOffset,
    )
      ? qualityReport.visualCritiqueReport.earSideTangentOffset
      : undefined;

    if (report.qualityAccepted) {
      execution.executionStatus = "implemented";
      execution.nounFidelityStatus = "passed";
      execution.actualGeneratedLabel =
        execution.requestedNoun ?? execution.shapeLabel;
      execution.creationSource =
        execution.executionMode === "runtime-generated"
          ? passCount > 1
            ? "runtime-repaired"
            : "runtime-generated"
          : execution.creationSource;
      execution.approximationReason = undefined;
      execution.failureReason = undefined;
      continue;
    }

    if (createdNames.length > 0) {
      execution.executionStatus = "approximated";
      execution.nounFidelityStatus = "approximated";
      execution.actualGeneratedLabel = approximationLabel;
      execution.creationSource =
        execution.executionMode === "runtime-generated"
          ? passCount > 1
            ? "runtime-repaired"
            : "runtime-generated"
          : execution.creationSource;
      execution.resolvedLabel = execution.resolvedLabel ?? execution.shapeLabel;
      execution.approximationReason =
        execution.approximationReason ??
        (plannerBackedImplementationBlocked
          ? `${execution.shapeLabel} 当前还没有 planner-backed contract，当前按 ${approximationLabel} 近似实现展示。`
          : `${execution.shapeLabel} 在 ${passCount} 轮精修 / ${budgetUsedMs}ms 预算内仍未通过精度门槛，当前按 ${approximationLabel} 近似实现展示。${
              Array.isArray(qualityReport.dominantFailureModes) &&
              qualityReport.dominantFailureModes.length > 0
                ? ` 主要失败模式：${qualityReport.dominantFailureModes.join(" / ")}。`
                : ""
            }`);
      execution.failureReason = undefined;
      execution.notes = uniqueStrings([
        ...execution.notes,
        plannerBackedImplementationBlocked
          ? "当前缺少 planner-backed contract，所以 open noun 不会被记成 fully implemented。"
          : null,
        `最终停在近似实现：硬门槛=${qualityReport.hardGatePassed ? "通过" : "未通过"} / 诚实闸门=${qualityReport.qualityGatePassed ? "通过" : "未通过"} / 精度闸门=${qualityReport.precisionGatePassed ? "通过" : "未通过"}`,
      ]);
      continue;
    }

    execution.executionStatus = "unfulfilled";
    execution.nounFidelityStatus = "missing";
    execution.actualGeneratedLabel = undefined;
    execution.creationSource = "unfulfilled";
    execution.failureReason =
      execution.failureReason ??
      `${getAccessoryAnchorLabel(execution.anchor)} · ${execution.shapeLabel} 在 ${passCount} 轮精修 / ${budgetUsedMs}ms 预算内未能稳定生成。`;
    execution.notes = uniqueStrings([
      ...execution.notes,
      "本次执行未能产出可落地的 runtime 小件实例。",
    ]);
  }

  const unresolvedExecutions = resolvedExecutionPlan.addAccessories.filter(
    (execution) =>
      execution.executionStatus === "approximated" ||
      execution.executionStatus === "unfulfilled",
  );
  const acceptedExecutions = resolvedExecutionPlan.addAccessories.filter(
    (execution) => execution.executionStatus === "implemented",
  );
  const approximatedExecutions = resolvedExecutionPlan.addAccessories.filter(
    (execution) => execution.executionStatus === "approximated",
  );
  const unfulfilledExecutions = resolvedExecutionPlan.addAccessories.filter(
    (execution) => execution.executionStatus === "unfulfilled",
  );

  const stopReason = stopReasonOverride ??
    (passResult.hardGatePassed
      ? passResult.precisionGatePassed
        ? "quality-accepted"
        : unresolvedExecutions.length > 0
          ? Date.now() - stageStartedAt >= runtimeBudgetMs
            ? "budget-exhausted"
            : "partial-approximation"
          : "budget-exhausted"
      : "hard-check-failed");
  const structureRepairCount = resolvedExecutionPlan.addAccessories.reduce(
    (sum, execution) => sum + getAppliedRepairStats(execution.executionId).structuralCount,
    0,
  );
  const diagnosticsExecutionReports = diagnosticPassResult.executionReports;
  const diagnosticsRuntimeExecutionReports = diagnosticsExecutionReports.filter(
    (report) => report.execution.executionMode === "runtime-generated",
  );
  const plannerBlockedExecutionCount = diagnosticsExecutionReports.reduce(
    (sum, report) =>
      sum +
      (report.execution.executionStatus !== "implemented" &&
      report.plannerBackedImplementationBlocked === true
        ? 1
        : 0),
    0,
  );
  const legacyFallbackBlockedExecutionCount = diagnosticsExecutionReports.reduce(
    (sum, report) =>
      sum +
      (report.execution.executionStatus !== "implemented" &&
      report.legacyFallbackImplementationBlocked === true
        ? 1
        : 0),
    0,
  );
  const renderCritiqueUnavailableExecutionCount = diagnosticsRuntimeExecutionReports.reduce(
    (sum, report) =>
      sum +
      (report.execution.executionStatus !== "implemented" &&
      report.qualityReport.renderCritiqueAvailable !== true
        ? 1
        : 0),
    0,
  );
  const renderCritiqueTimeoutExecutionCount = diagnosticsRuntimeExecutionReports.reduce(
    (sum, report) =>
      sum +
      (report.execution.executionStatus !== "implemented" &&
      Array.isArray(report.qualityReport.dominantFailureModes) &&
      report.qualityReport.dominantFailureModes.includes("render-critique-timeout")
        ? 1
        : 0),
    0,
  );
  const renderCritiqueAvailable =
    diagnosticsRuntimeExecutionReports.length === 0
      ? true
      : diagnosticsRuntimeExecutionReports.every(
          (report) => report.qualityReport.renderCritiqueAvailable === true,
        );
  const dominantRuntimeController = selectDominantRuntimeController(
    diagnosticsExecutionReports.map((report) => ({
      controllerFailureLayer:
        report.qualityReport.controllerFailureLayer ??
        report.qualityReport.visualCritiqueReport?.controllerFailureLayer,
      controllerDirective:
        report.qualityReport.controllerDirective ??
        report.qualityReport.visualCritiqueReport?.controllerDirective,
      repeatedFailureCount:
        report.qualityReport.visualCritiqueReport?.repeatedFailureCount,
      stagnationDetected:
        report.qualityReport.visualCritiqueReport?.stagnationDetected,
      plateauReason:
        report.qualityReport.visualCritiqueReport?.plateauReason,
      dominantFailureModes: report.qualityReport.dominantFailureModes,
    })),
  );
  const stopDiagnostics = buildRuntimeStopDiagnostics({
    reason: stopReason,
    dominantFailureModes:
      dominantRuntimeController?.dominantFailureModes ??
      passResult.dominantFailureModes,
    dominantFailureLayer: dominantRuntimeController?.controllerFailureLayer,
    repeatedFailureCount: dominantRuntimeController?.repeatedFailureCount,
    plannerBlockedExecutionCount,
    legacyFallbackBlockedExecutionCount,
    renderCritiqueUnavailableExecutionCount,
    renderCritiqueTimeoutExecutionCount,
    acceptedExecutionCount: acceptedExecutions.length,
    approximatedExecutionCount: approximatedExecutions.length,
    unfulfilledExecutionCount: unfulfilledExecutions.length,
    passCount,
    minimumRequiredPassCount,
    softTargetPassCount,
    budgetUsedMs,
    runtimeAttemptBudgetMs: runtimeBudgetMs,
    qualityScore: passResult.aggregateQualityScore,
    hardGatePassed: passResult.hardGatePassed,
    qualityGatePassed: passResult.qualityGatePassed,
    precisionGatePassed: passResult.precisionGatePassed,
    precisionReady: passResult.precisionReady,
    visualAcceptanceGatePassed: passResult.visualAcceptanceGatePassed,
    plateauReason:
      plateauReason ??
      dominantRuntimeController?.plateauReason ??
      undefined,
  });
  const critiqueSource =
    passResult.visualCritiqueReports.some((report) => report.source === "render-hybrid")
      ? "render-hybrid"
      : passResult.visualCritiqueReports.some((report) => report.source === "viewport-capture")
        ? "viewport-capture"
        : passResult.visualCritiqueReports.length > 0
          ? "blueprint-projection"
          : undefined;

  customizations.budgetUsedMs = budgetUsedMs;
  customizations.refinementPassCount = passCount;
  customizations.qualityScore = passResult.aggregateQualityScore;
  customizations.qualityGatePassed = passResult.qualityGatePassed;
  customizations.precisionGatePassed = passResult.precisionGatePassed;
  customizations.precisionReady = passResult.precisionReady;
  customizations.visualAcceptanceGatePassed = passResult.visualAcceptanceGatePassed;
  customizations.stopReason = stopReason;
  customizations.stopDiagnostics = stopDiagnostics;
  customizations.qualityMetrics = passResult.aggregateMetrics;
  customizations.visualCritiqueReports = passResult.visualCritiqueReports;
  customizations.structureRepairCount = structureRepairCount;
  customizations.renderCritiqueAvailable = renderCritiqueAvailable;
  customizations.critiqueSource = critiqueSource;
  customizations.sourceModes = uniqueStrings(
    resolvedExecutionPlan.addAccessories
      .map((execution) => execution.sourceMode)
      .filter((value) => typeof value === "string"),
  );
  customizations.referenceUsed = resolvedExecutionPlan.addAccessories.some(
    (execution) => typeof execution.referenceId === "string" && execution.referenceId,
  );
  customizations.blueprintFamilies = uniqueStrings(
    resolvedExecutionPlan.addAccessories
      .map((execution) => execution.blueprintFamily)
      .filter((value) => typeof value === "string"),
  );
  customizations.variantIds = uniqueStrings(
    resolvedExecutionPlan.addAccessories
      .map((execution) => execution.variantId)
      .filter((value) => typeof value === "string"),
  );
  customizations.rawFirstReadResults = uniqueStrings(
    passResult.visualCritiqueReports
      .map((report) => report.rawFirstReadResult)
      .filter((value) => typeof value === "string"),
  );
  customizations.firstReadResults = uniqueStrings(
    passResult.visualCritiqueReports
      .map((report) => report.firstReadResult)
      .filter((value) => typeof value === "string"),
  );
  customizations.canonicalFirstReads = uniqueStrings(
    passResult.visualCritiqueReports
      .map((report) => report.canonicalFirstRead)
      .filter((value) => typeof value === "string"),
  );
  customizations.rawDominantSpanOwnerTexts = uniqueStrings(
    passResult.visualCritiqueReports
      .map((report) => report.rawDominantSpanOwnerText)
      .filter((value) => typeof value === "string"),
  );
  customizations.visualVetoReasons = uniqueStrings(
    passResult.visualCritiqueReports
      .map((report) => report.visualVetoReason)
      .filter((value) => typeof value === "string"),
  );
  customizations.visualFailureReasons = passResult.visualFailureReasons;
  customizations.dominantFailureModes = passResult.dominantFailureModes;
  customizations.dominantFailureLayer =
    unresolvedExecutions.find(
      (execution) => typeof execution.dominantFailureLayer === "string",
    )?.dominantFailureLayer ??
    passResult.visualCritiqueReports.find(
      (report) => typeof report.dominantFailureLayer === "string",
    )?.dominantFailureLayer;
  customizations.rebuildCountByLayer = resolvedExecutionPlan.addAccessories.reduce(
    (totals, execution) => {
      const stats = getAppliedRepairStats(execution.executionId).rebuildCountByLayer;

      return {
        silhouette: (totals.silhouette ?? 0) + (stats.silhouette ?? 0),
        assembly: (totals.assembly ?? 0) + (stats.assembly ?? 0),
        "host-fit": (totals["host-fit"] ?? 0) + (stats["host-fit"] ?? 0),
        "render-readability":
          (totals["render-readability"] ?? 0) +
          (stats["render-readability"] ?? 0),
        "anchor-projection":
          (totals["anchor-projection"] ?? 0) + (stats["anchor-projection"] ?? 0),
        "outline-compiler":
          (totals["outline-compiler"] ?? 0) + (stats["outline-compiler"] ?? 0),
        "attachment-cohesion":
          (totals["attachment-cohesion"] ?? 0) + (stats["attachment-cohesion"] ?? 0),
        "critique-timeout":
          (totals["critique-timeout"] ?? 0) + (stats["critique-timeout"] ?? 0),
      };
    },
    {
      silhouette: 0,
      assembly: 0,
      "host-fit": 0,
      "render-readability": 0,
      "anchor-projection": 0,
      "outline-compiler": 0,
      "attachment-cohesion": 0,
      "critique-timeout": 0,
    },
  );
  customizations.finalReadOrder =
    unresolvedExecutions.find(
      (execution) => Array.isArray(execution.finalReadOrder) && execution.finalReadOrder.length > 0,
    )?.finalReadOrder ??
    passResult.visualCritiqueReports.find(
      (report) => Array.isArray(report.finalReadOrder) && report.finalReadOrder.length > 0,
    )?.finalReadOrder;
  customizations.precisionFailureSummary =
    unresolvedExecutions.length > 0
      ? uniqueStrings(
          unresolvedExecutions.flatMap((execution) => {
            const parts = [];
            if (execution.requestedNoun) {
              parts.push(execution.requestedNoun);
            } else {
              parts.push(execution.shapeLabel);
            }
            if (execution.dominantFailureLayer) {
              parts.push(`主失败层=${execution.dominantFailureLayer}`);
            }
            if (Array.isArray(execution.finalReadOrder) && execution.finalReadOrder.length > 0) {
              parts.push(`首读顺序=${execution.finalReadOrder.join(" -> ")}`);
            }
            if (execution.approximationReason) {
              parts.push(execution.approximationReason);
            }

            return parts.length > 0 ? [parts.join(" / ")] : [];
          }),
        ).join(" || ")
      : undefined;
  customizations.faceIntrusionSeverity = passResult.visualCritiqueReports.reduce((maxValue, report) => {
    if (typeof report.faceIntrusionSeverity !== "number") {
      return maxValue;
    }

    return Math.max(maxValue, report.faceIntrusionSeverity);
  }, 0);
  customizations.dominantSpanOwner =
    passResult.visualCritiqueReports.find(
      (report) =>
        typeof report.dominantSpanOwner === "string" &&
        ["device-body", "boat-hull", "body"].includes(report.dominantSpanOwner),
    )?.dominantSpanOwner ??
    passResult.visualCritiqueReports.find(
      (report) => typeof report.dominantSpanOwner === "string" && report.dominantSpanOwner,
    )?.dominantSpanOwner;
  customizations.canonicalDominantSpanOwner =
    passResult.visualCritiqueReports.find(
      (report) =>
        typeof report.canonicalDominantSpanOwner === "string" &&
        ["device-body", "boat-hull", "body", "core"].includes(
          report.canonicalDominantSpanOwner,
        ),
    )?.canonicalDominantSpanOwner ??
    passResult.visualCritiqueReports.find(
      (report) =>
        typeof report.canonicalDominantSpanOwner === "string" &&
        report.canonicalDominantSpanOwner,
    )?.canonicalDominantSpanOwner;
  customizations.plateauReason = plateauReason ?? undefined;

  synchronizeCustomizationExecutionFacts(
    customizations,
    resolvedExecutionPlan,
    passResult.executionReports,
  );
  await persistResolvedCustomizationsToTask(task, customizations);
  const stopDiagnosticNotes = buildRuntimeStopDiagnosticNotes(stopDiagnostics);

  if (stopDiagnosticNotes.length > 0) {
    dynamicNotes.push(...stopDiagnosticNotes);
  } else {
    dynamicNotes.push(
      `本次 runtime 精修共执行 ${passCount} 轮，预算使用 ${budgetUsedMs}ms，停止原因：${stopReason}。`,
    );
  }

  if (unresolvedExecutions.length > 0) {
    dynamicNotes.push(
      `本次 runtime 尝试预算内仍未完整落地这些显式配件：${unresolvedExecutions
        .map((execution) => `${getAccessoryAnchorLabel(execution.anchor)} · ${execution.shapeLabel}`)
        .join(" / ")}；结果页会按近似实现或未实现展示。`,
    );
  }

  if (
    Array.isArray(customizations.executedCustomizations) &&
    customizations.executedCustomizations.length > 0
  ) {
    dynamicNotes.push(`本次实际执行：${customizations.executedCustomizations.join(" / ")}`);
  }

  if (
    Array.isArray(customizations.deferredCustomizations) &&
    customizations.deferredCustomizations.length > 0
  ) {
    dynamicNotes.push(`当前延后执行：${customizations.deferredCustomizations.join(" / ")}`);
  }

  if (
    Array.isArray(customizations.experimentalWarnings) &&
    customizations.experimentalWarnings.length > 0
  ) {
    dynamicNotes.push(
      ...customizations.experimentalWarnings.filter((note) => typeof note === "string"),
    );
  }

  if (
    Array.isArray(customizations.unsupportedNotes) &&
    customizations.unsupportedNotes.length > 0
  ) {
    dynamicNotes.push(...customizations.unsupportedNotes);
  }

  return dynamicNotes;
}

async function tryCaptureViewportPoster(task, backendConfig, toolNames) {
  if (!toolNames.has("capture_viewport_image")) {
    return {
      usedFallback: false,
      note: null,
    };
  }

  await writeStatus(
    task,
    "exporting",
    "渲染封面图未落盘，正在尝试 viewport 截图兜底。",
  );

  const payload = await invokePolyMcpTool(
    backendConfig.serverUrl,
    "capture_viewport_image",
    [],
    {
      resolution: [1080, 1080],
      samples: 16,
      return_base64: false,
      include_overlays: false,
    },
  );
  const result = extractInvokeResult(payload);

  if (!isRecord(result) || typeof result.filepath !== "string") {
    throw new Error(
      "capture_viewport_image 没有返回可复制的 filepath，无法补写 thumbnail.png。",
    );
  }

  if (!(await fileExists(result.filepath))) {
    throw new Error(
      `capture_viewport_image 已返回 filepath，但文件不存在: ${result.filepath}`,
    );
  }

  await mkdir(path.dirname(task.artifacts.posterFile), { recursive: true });
  await copyFile(result.filepath, task.artifacts.posterFile);

  return {
    usedFallback: true,
    note: "render_image 未直接产出海报，已回退为 capture_viewport_image 生成 thumbnail.png。",
  };
}

async function packageUsdzWithUsdzip(usdzipBin, usdFile, usdzFile) {
  const candidateArgs = [
    [usdzFile, "--arkitAsset", usdFile],
    ["--arkitAsset", usdFile, usdzFile],
  ];
  let lastError = "unknown usdzip failure";

  for (const args of candidateArgs) {
    try {
      await execFileAsync(usdzipBin, args, {
        cwd: path.dirname(usdzFile),
      });

      if (await fileExists(usdzFile)) {
        return;
      }

      lastError = `usdzip 已执行但未产出 ${usdzFile}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown usdzip execution error";
      lastError = `${message} (args: ${args.join(" ")})`;
    }
  }

  throw new Error(`无法打包 model.usdz: ${lastError}`);
}

async function tryBuildQuickLookUsdz(task, backendConfig) {
  await writeStatus(task, "exporting", "正在导出 iPhone Quick Look 所需的 USD 资产。");

  await invokePolyMcpTool(backendConfig.serverUrl, "export_file", [], {
    file_path: task.artifacts.usdFile,
    file_format: "usd",
    selected_only: false,
    apply_modifiers: true,
  });

  if (!(await fileExists(task.artifacts.usdFile))) {
    throw new Error(
      `export_file 已调用 usd 导出，但没有得到中间文件: ${task.artifacts.usdFile}`,
    );
  }

  await writeStatus(task, "exporting", "正在打包 iPhone Quick Look 所需的 USDZ。");
  await packageUsdzWithUsdzip(
    backendConfig.usdzipBin,
    task.artifacts.usdFile,
    task.artifacts.usdzFile,
  );

  if (!(await fileExists(task.artifacts.usdzFile))) {
    throw new Error(
      `usdzip 已执行完成，但没有得到 model.usdz: ${task.artifacts.usdzFile}`,
    );
  }

  return {
    invokedTools: ["export_file (usd)", "usdzip --arkitAsset"],
    notes: ["当前结果额外产出 model.usdz，可直接用于 iPhone Quick Look。"],
    outputFiles: buildOutputFiles({ includeUsdz: true }),
  };
}

async function executePolyHttpPlan(task, backendConfig) {
  const { plan, context } = await loadPolyPlan(task, backendConfig);
  const toolsInfo = await listPolyMcpTools(backendConfig.serverUrl);
  const requiredTools = Array.isArray(plan.requiredTools)
    ? plan.requiredTools.filter((value) => typeof value === "string")
    : [];
  const objectAliases = new Map();
  const dynamicNotes = [];
  let dynamicStageApplied = false;

  for (const toolName of requiredTools) {
    if (!toolsInfo.toolNames.has(toolName) && !toolsInfo.rawText.includes(toolName)) {
      throw new Error(
        `Blender MCP server 缺少必需工具: ${toolName}。请先检查 /mcp/list_tools 输出。`,
      );
    }
  }

  const invokedTools = [];

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];

    if (!isRecord(step) || typeof step.tool !== "string") {
      throw new Error(`执行计划第 ${index + 1} 步缺少合法的 tool 字段。`);
    }

    const status =
      step.status === "rendering" || step.status === "exporting"
        ? step.status
        : "rendering";
    const message =
      typeof step.message === "string"
        ? step.message
        : `正在调用 Blender MCP 工具 ${step.tool} (${index + 1}/${plan.steps.length})`;

    await writeStatus(task, status, message);

    const args = Array.isArray(step.args) ? step.args : [];
    const kwargs = isRecord(step.kwargs) ? step.kwargs : {};
    const resolvedArgs = resolveObjectAliases(args, objectAliases);
    const resolvedKwargs = resolveObjectAliases(kwargs, objectAliases);

    if (
      !dynamicStageApplied &&
      step.tool === "import_file" &&
      typeof resolvedKwargs.file_path === "string" &&
      resolvedKwargs.file_path === foxBasePosterStageSource
    ) {
      const notes = await executeDynamicCustomizationStage(
        task,
        backendConfig,
        toolsInfo.toolNames,
        objectAliases,
        context,
        invokedTools,
      );
      dynamicNotes.push(...notes);
      dynamicStageApplied = true;
    }

    const payload = await invokePolyMcpTool(
      backendConfig.serverUrl,
      step.tool,
      resolvedArgs,
      resolvedKwargs,
    );

    if (step.tool === "import_file") {
      const result = extractInvokeResult(payload);
      const importedObjects =
        isRecord(result) && Array.isArray(result.imported_objects)
          ? result.imported_objects
          : [];

      registerImportedObjectAliases(objectAliases, importedObjects);
    }

    invokedTools.push(step.tool);
  }

  const hasModel = await fileExists(task.artifacts.modelFile);
  let hasPoster = await fileExists(task.artifacts.posterFile);
  let posterFallbackNote = null;

  if (!hasPoster) {
    const fallback = await tryCaptureViewportPoster(
      task,
      backendConfig,
      toolsInfo.toolNames,
    );

    hasPoster = await fileExists(task.artifacts.posterFile);
    posterFallbackNote = fallback.note;
    if (fallback.usedFallback) {
      invokedTools.push("capture_viewport_image (fallback)");
    }
  }

  if (!hasModel || !hasPoster) {
    throw new Error(
      `Blender MCP 调用完成，但没有得到完整输出文件。model=${hasModel} poster=${hasPoster}`,
    );
  }

  let quickLookNotes = [];
  let outputFiles = buildOutputFiles({ includeUsdz: false });

  try {
    const quickLookResult = await tryBuildQuickLookUsdz(task, backendConfig);
    invokedTools.push(...quickLookResult.invokedTools);
    quickLookNotes = quickLookResult.notes;
    outputFiles = quickLookResult.outputFiles;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown Quick Look packaging error";

    quickLookNotes = [
      `当前结果的 model.usdz 打包失败，但 generation 仍保持 ready：${message}`,
    ];
  }

  const notes = Array.isArray(plan.metadata?.notes)
    ? plan.metadata.notes.filter((value) => typeof value === "string")
    : [];

  return {
    metadataPatch: {
      structuredPrompt: buildStructuredPromptFromTask(
        task,
        context.styleLabel,
        context.recipe,
      ),
      styleLabel:
        typeof plan.metadata?.styleLabel === "string"
          ? plan.metadata.styleLabel
          : undefined,
      outputFiles,
      notes: [
        ...(posterFallbackNote ? [posterFallbackNote] : []),
        `当前结果通过真实 Blender MCP HTTP 工具链导出。Server: ${backendConfig.serverUrl}`,
        `本次调用工具: ${invokedTools.join(" -> ")}`,
        ...dynamicNotes,
        ...quickLookNotes,
        ...notes,
      ],
    },
  };
}

async function executeBackend(task, backendConfig) {
  if (backendConfig.backend === "mock-assets") {
    return executeMockAssets(task);
  }

  if (backendConfig.backend === "poly-http-plan") {
    return executePolyHttpPlan(task, backendConfig);
  }

  throw new Error(`未知的 BLENDER_MCP_BACKEND: ${backendConfig.backend}`);
}

async function processTask(task, backendConfig) {
  const existingStatus = await readStatusFile(task.artifacts.statusFile);

  if (existingStatus?.status === "ready" || existingStatus?.status === "failed") {
    return {
      state: "skipped",
      reason: `status is ${existingStatus.status}`,
    };
  }

  if (existingStatus?.status === "rendering" && !shouldRecoverRenderingStatus(existingStatus)) {
    return {
      state: "skipped",
      reason: "status is rendering and still fresh",
    };
  }

  if (existingStatus?.status === "rendering") {
    const ageMs = getStatusAgeMs(existingStatus);
    log(
      `recovering stale rendering task ${task.generationId} after ${
        ageMs === null ? "unknown age" : `${Math.round(ageMs / 1000)}s`
      }`,
    );
  }

  log(`processing ${task.generationId} with backend=${backendConfig.backend}`);

  try {
    const executionResult = await executeBackend(task, backendConfig);
    const modelStats = await stat(task.artifacts.modelFile);
    const existingMetadata = await readExistingMetadata(task.artifacts.metadataFile);
    const metadata = buildMetadata(
      task,
      existingMetadata,
      modelStats.size,
      executionResult.metadataPatch,
    );

    await persistResolvedCustomizationsToTask(task, getTaskCustomizations(task));
    await writeJsonFile(task.artifacts.metadataFile, metadata);
    await persistCustomizationSummaryFactsToTask(
      task,
      metadata.customizationSummary,
    );
    await writeStatus(task, "ready", "Blender MCP worker 已完成导出。");

    return {
      state: "processed",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown worker error";

    await writeStatus(task, "failed", "本地 worker 处理失败。", {
      errorMessage: message,
    });

    return {
      state: "failed",
      reason: message,
    };
  }
}

async function getCandidateIds(idFilter) {
  if (idFilter) {
    return [idFilter];
  }

  try {
    const entries = await readdir(outputRoot, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function runCycle(idFilter, backendConfig) {
  const lease = await acquireWorkerLease(backendConfig);

  if (!lease) {
    return {
      processed: 0,
      failed: 0,
      skippedByLease: true,
    };
  }

  const ids = await getCandidateIds(idFilter);
  let processed = 0;
  let failed = 0;

  try {
    for (const id of ids) {
      const task = await readTaskManifestForId(id);

      if (!task) {
        logWorkerCoordination(`task skipped missing-manifest id=${id}`);
        continue;
      }

      const result = await processTask(task, backendConfig);

      if (result.state === "processed") {
        processed += 1;
        continue;
      }

      if (result.state === "failed") {
        failed += 1;
        log(`failed ${id}: ${result.reason}`);
        continue;
      }

      logWorkerCoordination(`task skipped id=${id} reason=${result.reason ?? "unknown"}`);
    }
  } finally {
    await releaseWorkerLease(lease);
  }

  return {
    processed,
    failed,
    skippedByLease: false,
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const backendConfig = getBackendConfig(options);

  if (options.watch) {
    log(
      `watching blender-mcp tasks every ${options.intervalMs}ms with backend=${backendConfig.backend}`,
    );

    while (true) {
      const summary = await runCycle(options.id, backendConfig);

      if (summary.processed > 0 || summary.failed > 0) {
        log(
          `cycle finished: processed=${summary.processed}, failed=${summary.failed}`,
        );
      }

      await sleep(options.intervalMs);
    }
  }

  const summary = await runCycle(options.id, backendConfig);

  log(`done: processed=${summary.processed}, failed=${summary.failed}`);
}

await run();
