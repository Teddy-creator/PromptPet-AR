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
    requestedNounIncludes: string;
    requestedLabelIncludes?: string;
    requestedAnchorPhraseIncludes: string;
    requestedColorIncludes?: string;
    topPrototypeId?: string;
    requireNonGenericTopPrototype?: boolean;
    requestFamily?: string;
    runtimeShapeClass?: string;
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

    throw new Error(`Unexpected fetch URL during semantic heldout: ${url}`);
  };
}

async function main() {
  process.env.SEMANTIC_API_KEY = "semantic-heldout-key";
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
          throw new Error("Keychain disabled for semantic heldout evaluation");
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
    "semantic-heldout.json",
  );
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const failures: string[] = [];
  let semanticPrimaryCount = 0;
  let nonGenericEligibleCount = 0;
  let nonGenericSuccessCount = 0;
  let explicitNounExpectationCount = 0;
  let explicitNounSuccessCount = 0;
  let anchorExpectationCount = 0;
  let anchorSuccessCount = 0;
  let colorExpectationCount = 0;
  let colorSuccessCount = 0;

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

    const contract = (recipe.semanticContractsV2 ?? []).find(
      (candidate) => candidate.requestId === request.requestId,
    );
    const runtimeTask = recipe.runtimeDesignTasks.find(
      (candidate) => candidate.requestId === request.requestId,
    );
    const requestedLabel =
      request.requestedLabel ?? request.shapeLabel ?? request.label;
    const requestedNoun =
      request.requestedNoun ?? contract?.requestedNoun ?? requestedLabel;
    const requestedColor =
      request.requestedColor?.label ??
      request.colorIntent?.label ??
      runtimeTask?.requestedColorText ??
      "";
    const topPrototypeId = contract?.prototypeCandidates[0]?.id;

    if (recipe.parserSource !== "openai") {
      failures.push(
        `${entry.id}: expected semantic parserSource openai, got ${recipe.parserSource}`,
      );
    } else {
      semanticPrimaryCount += 1;
    }

    explicitNounExpectationCount += 1;
    if (requestedNoun.includes(entry.expect.requestedNounIncludes)) {
      explicitNounSuccessCount += 1;
    } else {
      failures.push(
        `${entry.id}: expected requested noun containing "${entry.expect.requestedNounIncludes}", got "${requestedNoun}"`,
      );
    }

    if (entry.expect.requestedLabelIncludes) {
      if (!requestedLabel.includes(entry.expect.requestedLabelIncludes)) {
        failures.push(
          `${entry.id}: expected requested label containing "${entry.expect.requestedLabelIncludes}", got "${requestedLabel}"`,
        );
      }
    }

    anchorExpectationCount += 1;
    if ((request.requestedAnchorPhrase ?? "").includes(entry.expect.requestedAnchorPhraseIncludes)) {
      anchorSuccessCount += 1;
    } else {
      failures.push(
        `${entry.id}: expected requested anchor phrase containing "${entry.expect.requestedAnchorPhraseIncludes}", got "${request.requestedAnchorPhrase ?? "(none)"}"`,
      );
    }

    if (entry.expect.requestedColorIncludes) {
      colorExpectationCount += 1;
      if (requestedColor.includes(entry.expect.requestedColorIncludes)) {
        colorSuccessCount += 1;
      } else {
        failures.push(
          `${entry.id}: expected requested color containing "${entry.expect.requestedColorIncludes}", got "${requestedColor || "(none)"}"`,
        );
      }
    }

    if (entry.expect.requireNonGenericTopPrototype !== false) {
      nonGenericEligibleCount += 1;
      if (topPrototypeId && topPrototypeId !== "generic-ornament") {
        nonGenericSuccessCount += 1;
      } else {
        failures.push(
          `${entry.id}: expected non-generic top prototype, got ${topPrototypeId ?? "(none)"}`,
        );
      }
    }

    if (entry.expect.topPrototypeId && topPrototypeId !== entry.expect.topPrototypeId) {
      failures.push(
        `${entry.id}: expected top prototype ${entry.expect.topPrototypeId}, got ${topPrototypeId ?? "(none)"}`,
      );
    }

    if (entry.expect.requestFamily && request.family !== entry.expect.requestFamily) {
      failures.push(
        `${entry.id}: expected request family ${entry.expect.requestFamily}, got ${request.family}`,
      );
    }

    if (
      entry.expect.runtimeShapeClass &&
      runtimeTask?.runtimeShapeClass !== entry.expect.runtimeShapeClass
    ) {
      failures.push(
        `${entry.id}: expected runtime shape class ${entry.expect.runtimeShapeClass}, got ${runtimeTask?.runtimeShapeClass ?? "(none)"}`,
      );
    }
  }

  const semanticPrimaryRate =
    corpus.cases.length > 0 ? semanticPrimaryCount / corpus.cases.length : 1;
  const nonGenericRouteRate =
    nonGenericEligibleCount > 0
      ? nonGenericSuccessCount / nonGenericEligibleCount
      : 1;
  const explicitNounPreservationRate =
    explicitNounExpectationCount > 0
      ? explicitNounSuccessCount / explicitNounExpectationCount
      : 1;
  const anchorPreservationRate =
    anchorExpectationCount > 0 ? anchorSuccessCount / anchorExpectationCount : 1;
  const colorRescueRate =
    colorExpectationCount > 0 ? colorSuccessCount / colorExpectationCount : 1;

  const metricsSummary = [
    `cases ${corpus.cases.length}`,
    `semantic-primary ${(semanticPrimaryRate * 100).toFixed(1)}%`,
    `non-generic ${(nonGenericRouteRate * 100).toFixed(1)}%`,
    `noun-preserved ${(explicitNounPreservationRate * 100).toFixed(1)}%`,
    `anchor-preserved ${(anchorPreservationRate * 100).toFixed(1)}%`,
    `color-rescued ${(colorRescueRate * 100).toFixed(1)}%`,
  ].join(" | ");

  const thresholdFailures: string[] = [];

  if (semanticPrimaryRate < 1) {
    thresholdFailures.push(
      `semantic parser primary rate too low: ${(semanticPrimaryRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (nonGenericRouteRate < 1) {
    thresholdFailures.push(
      `non-generic route rate too low: ${(nonGenericRouteRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (explicitNounPreservationRate < 1) {
    thresholdFailures.push(
      `explicit noun preservation rate too low: ${(explicitNounPreservationRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (anchorPreservationRate < 1) {
    thresholdFailures.push(
      `anchor preservation rate too low: ${(anchorPreservationRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (colorRescueRate < 1) {
    thresholdFailures.push(
      `color rescue rate too low: ${(colorRescueRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (failures.length > 0 || thresholdFailures.length > 0) {
    console.error("Semantic heldout evaluation failed:");
    console.error(`- metrics: ${metricsSummary}`);
    for (const failure of thresholdFailures) {
      console.error(`- ${failure}`);
    }
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Semantic heldout evaluation passed (${metricsSummary}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
