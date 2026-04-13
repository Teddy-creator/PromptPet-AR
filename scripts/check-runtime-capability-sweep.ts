import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

type CorpusEntry = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  generationMode: "dynamic-custom";
  customizationProfile: "safe-overlay" | "experimental-addon";
  mockPayload: {
    accessoryRequests?: Array<Record<string, unknown>>;
  };
  expect: {
    runtimeShapeClass: string;
    resolutionSource: string;
    requiredCapabilities: string[];
    forbiddenCapabilities?: string[];
    requiresDesignContract: boolean;
    capabilityClass?: string;
    primaryReadTarget?: string;
    requiredVisibleParts?: string[];
  };
};

type CorpusFile = {
  cases: CorpusEntry[];
};

function createMockSemanticFetch(entry: CorpusEntry) {
  const responsesPayload = {
    output_parsed: entry.mockPayload,
  };
  const chatPayload = {
    choices: [
      {
        message: {
          content: JSON.stringify(entry.mockPayload),
        },
      },
    ],
  };

  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/responses")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return responsesPayload;
        },
        async text() {
          return JSON.stringify(responsesPayload);
        },
      } satisfies Pick<Response, "ok" | "status" | "json" | "text">;
    }

    if (url.endsWith("/chat/completions")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return chatPayload;
        },
        async text() {
          return JSON.stringify(chatPayload);
        },
      } satisfies Pick<Response, "ok" | "status" | "json" | "text">;
    }

    throw new Error(`Unexpected fetch URL during runtime capability sweep: ${url}`);
  };
}

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.includes(needle));
}

function includesNone(haystack: string[], needles: string[]) {
  return needles.every((needle) => !haystack.includes(needle));
}

async function main() {
  process.env.SEMANTIC_API_KEY = "runtime-capability-sweep-key";
  process.env.SEMANTIC_BASE_URL = "https://api.openai.com/v1";
  process.env.SEMANTIC_MODEL = "gpt-4.1-mini";
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
          throw new Error("Keychain disabled for runtime capability sweep");
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
    "runtime-capability-heldout.json",
  );
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const failures: string[] = [];
  let capabilityBundlePassCount = 0;
  let designContractPassCount = 0;
  let controlIsolationPassCount = 0;

  for (const entry of corpus.cases) {
    globalThis.fetch = createMockSemanticFetch(entry) as typeof fetch;

    const recipe = await parsePromptCustomizationRecipe({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: entry.generationMode,
      customizationProfile: entry.customizationProfile,
    });
    const request = recipe.accessoryRequests.find(
      (candidate) => candidate.requestId !== "theme-default-request",
    );

    if (!request) {
      failures.push(`${entry.id}: missing explicit accessory request`);
      continue;
    }

    const runtimeTask = recipe.runtimeDesignTasks.find(
      (candidate) => candidate.requestId === request.requestId,
    );
    const brief = recipe.nounDesignBriefs.find(
      (candidate) => candidate.requestId === request.requestId,
    );
    const geometryRecipe = recipe.geometryRecipes.find(
      (candidate) => candidate.requestId === request.requestId,
    );
    const execution = recipe.resolvedExecutionPlan.addAccessories.find(
      (candidate) => candidate.requestId === request.requestId,
    );

    if (!runtimeTask) {
      failures.push(`${entry.id}: missing runtimeDesignTask`);
      continue;
    }

    if (runtimeTask.runtimeShapeClass !== entry.expect.runtimeShapeClass) {
      failures.push(
        `${entry.id}: expected runtimeShapeClass=${entry.expect.runtimeShapeClass}, got ${runtimeTask.runtimeShapeClass ?? "(none)"}`,
      );
    }

    if (!runtimeTask.capabilityBundle) {
      failures.push(`${entry.id}: missing capabilityBundle on runtimeDesignTask`);
      continue;
    }

    if (!includesAll(runtimeTask.capabilityBundle.capabilities, entry.expect.requiredCapabilities)) {
      failures.push(
        `${entry.id}: capabilityBundle missing required capabilities ${entry.expect.requiredCapabilities.join(", ")}`,
      );
    } else {
      capabilityBundlePassCount += 1;
    }

    if (
      entry.expect.forbiddenCapabilities &&
      !includesNone(runtimeTask.capabilityBundle.capabilities, entry.expect.forbiddenCapabilities)
    ) {
      failures.push(
        `${entry.id}: capabilityBundle leaked forbidden capabilities ${entry.expect.forbiddenCapabilities.join(", ")}`,
      );
    } else if (entry.expect.requiresDesignContract === false) {
      controlIsolationPassCount += 1;
    }

    if (runtimeTask.capabilityBundle.resolutionSource !== entry.expect.resolutionSource) {
      failures.push(
        `${entry.id}: expected resolutionSource=${entry.expect.resolutionSource}, got ${runtimeTask.capabilityBundle.resolutionSource}`,
      );
    }

    const surfacedContracts = [
      runtimeTask.runtimeDesignContract,
      brief?.runtimeDesignContract,
      geometryRecipe?.runtimeDesignContract,
      geometryRecipe?.structuralBlueprint?.runtimeDesignContract,
      execution?.runtimeDesignContract,
    ].filter(Boolean);
    const contract =
      geometryRecipe?.runtimeDesignContract ??
      brief?.runtimeDesignContract ??
      runtimeTask.runtimeDesignContract;

    if (entry.expect.requiresDesignContract) {
      if (!contract) {
        failures.push(`${entry.id}: missing runtimeDesignContract on capability-backed chest path`);
      } else {
        if (contract.capabilityClass !== entry.expect.capabilityClass) {
          failures.push(
            `${entry.id}: expected capabilityClass=${entry.expect.capabilityClass}, got ${contract.capabilityClass}`,
          );
        }

        if (
          entry.expect.primaryReadTarget &&
          contract.primaryReadTarget !== entry.expect.primaryReadTarget
        ) {
          failures.push(
            `${entry.id}: expected primaryReadTarget=${entry.expect.primaryReadTarget}, got ${contract.primaryReadTarget ?? "(none)"}`,
          );
        }

        if (
          entry.expect.requiredVisibleParts &&
          !includesAll(contract.requiredVisibleParts ?? [], entry.expect.requiredVisibleParts)
        ) {
          failures.push(
            `${entry.id}: runtimeDesignContract missing required visible parts ${entry.expect.requiredVisibleParts.join(", ")}`,
          );
        }

        if (surfacedContracts.length < 4) {
          failures.push(
            `${entry.id}: runtimeDesignContract did not stay attached across runtime task / brief / geometry / execution`,
          );
        } else {
          designContractPassCount += 1;
        }
      }

      continue;
    }

    if (contract || surfacedContracts.length > 0) {
      failures.push(
        `${entry.id}: unexpected runtimeDesignContract leaked into a non chest-wrap control path`,
      );
    }
  }

  const capabilityBundleRate =
    corpus.cases.length > 0 ? capabilityBundlePassCount / corpus.cases.length : 1;
  const chestWrapEligibleCount = corpus.cases.filter(
    (entry) => entry.expect.requiresDesignContract,
  ).length;
  const controlCaseCount = corpus.cases.length - chestWrapEligibleCount;
  const designContractRate =
    chestWrapEligibleCount > 0 ? designContractPassCount / chestWrapEligibleCount : 1;
  const controlIsolationRate =
    controlCaseCount > 0 ? controlIsolationPassCount / controlCaseCount : 1;
  const metricsSummary = [
    `cases ${corpus.cases.length}`,
    `bundle ${(capabilityBundleRate * 100).toFixed(1)}%`,
    `contract ${(designContractRate * 100).toFixed(1)}%`,
    `controls ${(controlIsolationRate * 100).toFixed(1)}%`,
  ].join(", ");

  if (failures.length > 0) {
    console.error("Runtime capability sweep failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Runtime capability sweep passed (${metricsSummary}).`);
}

void main();
