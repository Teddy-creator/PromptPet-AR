import { demoPromptPack } from "../src/data/demo-prompt-pack";

type GenerationResponse = {
  id: string;
  status: "queued" | "rendering" | "exporting" | "ready" | "failed";
  metadata?: {
    customizationSummary?: {
      stopReason?: string;
      qualityScore?: number;
      qualityMetrics?: {
        visualReadability?: number;
        scaleFit?: number;
        hostComposition?: number;
        silhouetteStrength?: number;
      };
      rawFirstReadResults?: string[];
      canonicalFirstReads?: string[];
      dominantFailureModes?: string[];
    };
  };
};

const baseUrl = (process.env.PROMPTPET_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const promptFilter = new Set(
  (process.env.PROMPTPET_DEMO_ONLY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const maxPollCount = Number(process.env.PROMPTPET_DEMO_MAX_POLLS ?? "240");
const pollIntervalMs = Number(process.env.PROMPTPET_DEMO_POLL_MS ?? "2000");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function includesExpectedRead(
  actualReads: string[],
  expectedReads: string[] | undefined,
) {
  if (!expectedReads || expectedReads.length === 0) {
    return true;
  }

  const normalizedActual = actualReads.map((value) => value.toLowerCase());

  return expectedReads.some((expected) =>
    normalizedActual.some((actual) => actual.includes(expected.toLowerCase())),
  );
}

async function createGeneration(payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as GenerationResponse | { error?: string };

  if (!response.ok || !("id" in json)) {
    const message =
      "error" in json && typeof json.error === "string"
        ? json.error
        : `generation create failed with ${response.status}`;
    throw new Error(message);
  }

  return json.id;
}

async function waitForGeneration(id: string) {
  for (let index = 0; index < maxPollCount; index += 1) {
    const response = await fetch(`${baseUrl}/api/generations/${id}`, {
      cache: "no-store",
    });
    const json = (await response.json()) as GenerationResponse;

    if (!response.ok) {
      throw new Error(`generation ${id} fetch failed with ${response.status}`);
    }

    if (json.status === "ready" || json.status === "failed") {
      return json;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`generation ${id} timed out after ${maxPollCount} polls`);
}

async function main() {
  const selectedPrompts = demoPromptPack.filter((entry) =>
    promptFilter.size === 0 ? true : promptFilter.has(entry.id),
  );

  if (selectedPrompts.length === 0) {
    throw new Error("PROMPTPET_DEMO_ONLY 过滤后没有匹配的 demo prompt。");
  }

  const failures: string[] = [];

  for (const entry of selectedPrompts) {
    const payload = {
      prompt: entry.promptZh,
      style: entry.style,
      generationMode: entry.generationMode,
      ...(entry.customizationProfile
        ? { customizationProfile: entry.customizationProfile }
        : {}),
    };
    const id = await createGeneration(payload);
    const result = await waitForGeneration(id);
    const summary = result.metadata?.customizationSummary;
    const actualReads = [
      ...(summary?.rawFirstReadResults ?? []),
      ...(summary?.canonicalFirstReads ?? []),
    ].filter(Boolean);
    const firstReadMatched = includesExpectedRead(actualReads, entry.expectedFirstReads);

    console.log(
      JSON.stringify({
        promptId: entry.id,
        label: entry.shortLabelZh,
        generationId: id,
        status: result.status,
        stopReason: summary?.stopReason ?? null,
        qualityScore: summary?.qualityScore ?? null,
        visualReadability: summary?.qualityMetrics?.visualReadability ?? null,
        scaleFit: summary?.qualityMetrics?.scaleFit ?? null,
        hostComposition: summary?.qualityMetrics?.hostComposition ?? null,
        silhouetteStrength: summary?.qualityMetrics?.silhouetteStrength ?? null,
        actualReads,
        dominantFailureModes: summary?.dominantFailureModes ?? [],
        firstReadMatched,
      }),
    );

    if (result.status !== "ready") {
      failures.push(`${entry.id}: generation did not reach ready`);
      continue;
    }

    if (!firstReadMatched) {
      failures.push(`${entry.id}: expected first read mismatch (${actualReads.join(" / ")})`);
    }
  }

  if (failures.length > 0) {
    console.error(`demo prompt pack failed (${failures.length} issues)`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`demo prompt pack passed (${selectedPrompts.length} prompts)`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
