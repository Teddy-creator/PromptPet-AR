import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

type CorpusEntry = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  generationMode: "dynamic-custom";
  customizationProfile: "safe-overlay" | "experimental-addon";
  expect: {
    contractRequestedNounIncludes: string;
    prototypeIdsIncludes?: string[];
    anchorTraitsIncludes?: string[];
    allowGenericTopPrototype?: boolean;
  };
};

type CorpusFile = {
  cases: CorpusEntry[];
};

type CliOptions = {
  seed: number;
  sampleSize: number;
  corpusPath: string;
};

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.some((value) => value.includes(needle)));
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    seed: 20260404,
    sampleSize: 120,
    corpusPath: path.join(
      process.cwd(),
      "src",
      "data",
      "prototype-traits-heldout.json",
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const nextValue = argv[index + 1];

    if (token === "--seed" && nextValue) {
      options.seed = Number(nextValue);
      index += 1;
      continue;
    }

    if (token === "--sample-size" && nextValue) {
      options.sampleSize = Number(nextValue);
      index += 1;
      continue;
    }

    if (token === "--corpus" && nextValue) {
      options.corpusPath = path.isAbsolute(nextValue)
        ? nextValue
        : path.join(process.cwd(), nextValue);
      index += 1;
    }
  }

  return options;
}

function createDeterministicRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function selectSample(entries: CorpusEntry[], seed: number, sampleSize: number) {
  const random = createDeterministicRandom(seed);
  const shuffled = [...entries];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, Math.min(sampleSize, shuffled.length));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const semanticApiKey = process.env.SEMANTIC_API_KEY?.trim();
  const semanticBaseUrl = process.env.SEMANTIC_BASE_URL?.trim();
  const semanticModel = process.env.SEMANTIC_MODEL?.trim();

  if (!semanticApiKey || !semanticBaseUrl || !semanticModel) {
    console.error(
      "Prototype traits heldout requires explicit SEMANTIC_API_KEY, SEMANTIC_BASE_URL, and SEMANTIC_MODEL env vars to avoid ambient provider drift.",
    );
    process.exit(1);
  }

  process.env.LLM_API_KEY = "";
  process.env.DEEPSEEK_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_COMPAT_API_KEY = "";
  process.env.OPENAI_COMPAT_BASE_URL = "";
  process.env.OPENAI_COMPAT_MODEL = "";

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
          throw new Error("Keychain disabled for heldout evaluation");
        },
      };
    }

    return originalLoad(...args);
  };

  const { parsePromptCustomizationRecipe } = await import(
    "../src/lib/prompt-customization"
  );
  const corpus = JSON.parse(
    readFileSync(options.corpusPath, "utf8"),
  ) as CorpusFile;
  const sample = selectSample(corpus.cases, options.seed, options.sampleSize);
  const failures: string[] = [];
  let nonGenericEligibleCount = 0;
  let nonGenericSuccessCount = 0;
  let prototypeExpectationCount = 0;
  let prototypeHitCount = 0;
  let anchorTraitExpectationCount = 0;
  let anchorTraitPassCount = 0;

  for (const entry of sample) {
    const recipe = await parsePromptCustomizationRecipe({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: entry.generationMode,
      customizationProfile: entry.customizationProfile,
    });
    const contract = (recipe.semanticContractsV2 ?? []).find((candidate) =>
      candidate.requestedNoun.includes(entry.expect.contractRequestedNounIncludes),
    );

    if (!contract) {
      failures.push(
        `${entry.id}: missing semantic contract for noun containing "${entry.expect.contractRequestedNounIncludes}"`,
      );
      continue;
    }

    const prototypeIds = contract.prototypeCandidates.map((candidate) => candidate.id);
    const topPrototypeId = contract.prototypeCandidates[0]?.id;

    if (entry.expect.allowGenericTopPrototype !== true) {
      nonGenericEligibleCount += 1;
      if (topPrototypeId && topPrototypeId !== "generic-ornament") {
        nonGenericSuccessCount += 1;
      } else {
        failures.push(
          `${entry.id}: expected non-generic top prototype, got ${topPrototypeId ?? "(none)"}`,
        );
      }
    }

    if (entry.expect.prototypeIdsIncludes) {
      prototypeExpectationCount += 1;
      if (includesAll(prototypeIds, entry.expect.prototypeIdsIncludes)) {
        prototypeHitCount += 1;
      } else {
        failures.push(
          `${entry.id}: expected prototype ids ${entry.expect.prototypeIdsIncludes.join(", ")}, got ${prototypeIds.join(", ") || "(none)"}`,
        );
      }
    }

    if (entry.expect.anchorTraitsIncludes) {
      anchorTraitExpectationCount += 1;
      if (includesAll(contract.traits, entry.expect.anchorTraitsIncludes)) {
        anchorTraitPassCount += 1;
      } else {
        failures.push(
          `${entry.id}: expected anchor traits ${entry.expect.anchorTraitsIncludes.join(", ")}, got ${contract.traits.join(", ") || "(none)"}`,
        );
      }
    }
  }

  const nonGenericRoutingRate =
    nonGenericEligibleCount > 0
      ? nonGenericSuccessCount / nonGenericEligibleCount
      : 1;
  const prototypeHitRate =
    prototypeExpectationCount > 0 ? prototypeHitCount / prototypeExpectationCount : 1;
  const anchorTraitPassRate =
    anchorTraitExpectationCount > 0
      ? anchorTraitPassCount / anchorTraitExpectationCount
      : 1;

  const metricsSummary = [
    `seed ${options.seed}`,
    `sampled ${sample.length}/${corpus.cases.length}`,
    `non-generic ${(nonGenericRoutingRate * 100).toFixed(1)}%`,
    `prototype-hit ${(prototypeHitRate * 100).toFixed(1)}%`,
    `anchor-trait ${(anchorTraitPassRate * 100).toFixed(1)}%`,
  ].join(" | ");

  const thresholdFailures: string[] = [];

  if (nonGenericRoutingRate < 0.8) {
    thresholdFailures.push(
      `non-generic prototype routing rate too low: ${(nonGenericRoutingRate * 100).toFixed(1)}% < 80.0%`,
    );
  }

  if (prototypeHitRate < 0.85) {
    thresholdFailures.push(
      `held-out prototype hit rate too low: ${(prototypeHitRate * 100).toFixed(1)}% < 85.0%`,
    );
  }

  if (anchorTraitPassRate < 1) {
    thresholdFailures.push(
      `anchor-specific trait pass rate too low: ${(anchorTraitPassRate * 100).toFixed(1)}% < 100.0%`,
    );
  }

  if (failures.length > 0 || thresholdFailures.length > 0) {
    console.error("Prototype traits heldout evaluation failed:");
    console.error(`- metrics: ${metricsSummary}`);
    for (const failure of thresholdFailures) {
      console.error(`- ${failure}`);
    }
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Prototype traits heldout evaluation passed (${metricsSummary}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
