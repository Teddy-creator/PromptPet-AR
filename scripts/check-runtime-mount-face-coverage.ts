import fs from "node:fs/promises";
import Module from "node:module";

async function main() {
  process.env.SEMANTIC_API_KEY = "";
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
          throw new Error("Keychain disabled for runtime mount face coverage check");
        },
      };
    }

    return originalLoad(...args);
  };

  const failures: string[] = [];

  try {
    const { parsePromptCustomizationRecipe } = await import(
      "../src/lib/prompt-customization"
    );
    const recipe = await parsePromptCustomizationRecipe({
      prompt: "一只戴黑色围巾的小狐狸",
      style: "cream-toy",
      generationMode: "dynamic-custom",
      customizationProfile: "experimental-addon",
    });

    const scarfTask = recipe.runtimeDesignTasks.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );
    const scarfGraph = recipe.partGraphs.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );

    if (!scarfTask) {
      failures.push("missing scarf runtime design task");
    }

    if (!scarfGraph) {
      failures.push("missing scarf part graph");
    } else {
      const mountFaces = [
        ...new Set(
          scarfGraph.edges
            .map((edge) => edge.mountFace)
            .filter((value): value is string => typeof value === "string"),
        ),
      ];

      if (!mountFaces.includes("bottom-left")) {
        failures.push(`expected scarf graph mountFaces to include bottom-left, got ${mountFaces.join(", ")}`);
      }

      if (!mountFaces.includes("bottom-right")) {
        failures.push(`expected scarf graph mountFaces to include bottom-right, got ${mountFaces.join(", ")}`);
      }
    }

    const workerSource = await fs.readFile(
      new URL("./blender-mcp-worker.mjs", import.meta.url),
      "utf8",
    );

    for (const mountFace of ["bottom-left", "bottom-right", "lower-span"]) {
      if (!workerSource.includes(`edge.mountFace === "${mountFace}"`)) {
        failures.push(`worker is missing explicit mount face handling for ${mountFace}`);
      }
    }
  } finally {
    moduleLoader._load = originalLoad;
  }

  if (failures.length > 0) {
    console.error("runtime mount face coverage regression failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("runtime mount face coverage passed");
}

void main();
