import Module from "node:module";

type GeometryPartCandidate = {
  partId: string;
  primitive?: unknown;
  role?: unknown;
  size?: unknown;
  offset?: unknown;
  scale?: unknown;
  rotation?: unknown;
};

type GeometryRecipeCandidate = {
  requestedNoun?: string;
  displayLabel: string;
  runtimeDesignSource?: string;
  parts: GeometryPartCandidate[];
};

function buildFlowerSemanticPayload() {
  return {
    accessoryRequests: [
      {
        requestedLabel: "小花挂件",
        requestedNoun: "小花",
        nounSpan: "小花",
        nounGloss: "small flower",
        objectCategory: "flower",
        designConfidence: 0.96,
        requestedAnchorPhrase: "左耳",
        familyGuess: "open-botanical-ornament",
        familyResolutionSource: "openai",
        prototypeCandidates: [{ id: "flower", confidence: 0.98 }],
        traits: ["soft", "ear-safe", "micro-hangable"],
        mustKeep: true,
        allowApproximation: true,
      },
    ],
  };
}

function buildFlowerDesignPayload() {
  return {
    plans: [
      {
        taskId: "design-openai-req-0",
        designArchetype: "botanical-charm",
        semanticClass: "flower",
        shapeDescription: "small flower face",
        criticalParts: [
          "core",
          "petal-1",
          "petal-2",
          "petal-3",
          "petal-4",
          "petal-5",
          "stem",
        ],
        optionalParts: ["leaf-left", "leaf-right"],
        partGraphIntent: "keep a readable flower",
        profileCurves: ["rounded petal ring"],
        silhouetteHints: ["flower face"],
        negativeLookalikes: ["green blob"],
        repairPriorities: ["noun-fidelity"],
        hangingStrategy: "ear-side bloom",
        fallbackFamily: "flower",
        parts: [
          {
            partId: "core",
            primitive: "sphere",
            role: "flower-center",
            size: 0.34,
            offset: [0, 0, 0],
            scale: [0.55, 0.55, 0.3],
            rotation: [0, 0, 0],
          },
          {
            partId: "petal-1",
            primitive: "sphere",
            role: "top-petal",
            size: 0.28,
            offset: [0, 0.34, 0.02],
            scale: [0.42, 0.48, 0.2],
            rotation: [0, 0, 0],
          },
          {
            partId: "petal-2",
            primitive: "sphere",
            role: "left-petal",
            size: 0.28,
            offset: [-0.28, 0.08, 0.02],
            scale: [0.42, 0.48, 0.2],
            rotation: [0, 0, 24],
          },
        ],
      },
    ],
    notes: ["planner topology drift guard regression"],
  };
}

function buildStarSemanticPayload() {
  return {
    accessoryRequests: [
      {
        requestedLabel: "星星挂件",
        requestedNoun: "星星",
        nounSpan: "星星挂件",
        nounGloss: "star charm",
        objectCategory: "symbol",
        designConfidence: 0.97,
        requestedAnchorPhrase: "左耳",
        familyGuess: "star",
        familyResolutionSource: "openai",
        prototypeCandidates: [{ id: "star", confidence: 0.99 }],
        traits: ["flat-face", "ear-safe", "micro-hangable"],
        mustKeep: true,
        allowApproximation: true,
      },
    ],
  };
}

function buildStarDesignPayload() {
  return {
    plans: [
      {
        taskId: "design-openai-req-0",
        designArchetype: "symbol-charm",
        semanticClass: "star",
        shapeDescription: "five-point star with a thick center and short rays",
        criticalParts: ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"],
        optionalParts: [],
        partGraphIntent: "keep a compact readable five-point star",
        profileCurves: ["clear five-point silhouette"],
        silhouetteHints: ["star silhouette"],
        negativeLookalikes: ["round badge"],
        repairPriorities: ["noun-fidelity", "host-fit"],
        hangingStrategy: "top point ear-side charm",
        fallbackFamily: "star",
        parts: [
          {
            partId: "core",
            primitive: "icosphere",
            role: "central mass",
            size: 0.34,
            offset: [0, 0, 0],
            scale: [0.7, 0.7, 0.18],
            rotation: [0, 0, 0],
          },
          {
            partId: "ray-1",
            primitive: "cone",
            role: "top point",
            size: 0.32,
            offset: [0, 0.62, 0],
            scale: [0.22, 0.5, 0.18],
            rotation: [0, 0, 0],
          },
          {
            partId: "ray-2",
            primitive: "cone",
            role: "upper-right point",
            size: 0.29,
            offset: [0.58, 0.18, 0],
            scale: [0.22, 0.44, 0.18],
            rotation: [0, 0, -72],
          },
          {
            partId: "ray-3",
            primitive: "cone",
            role: "lower-right point",
            size: 0.29,
            offset: [0.36, -0.5, 0],
            scale: [0.22, 0.44, 0.18],
            rotation: [0, 0, -144],
          },
          {
            partId: "ray-4",
            primitive: "cone",
            role: "lower-left point",
            size: 0.29,
            offset: [-0.36, -0.5, 0],
            scale: [0.22, 0.44, 0.18],
            rotation: [0, 0, 144],
          },
          {
            partId: "ray-5",
            primitive: "cone",
            role: "upper-left point",
            size: 0.29,
            offset: [-0.58, 0.18, 0],
            scale: [0.22, 0.44, 0.18],
            rotation: [0, 0, 72],
          },
        ],
      },
    ],
    notes: ["planner stable geometry guard regression"],
  };
}

function buildCameraSemanticPayload() {
  return {
    accessoryRequests: [
      {
        requestedLabel: "相机挂件",
        requestedNoun: "相机",
        nounSpan: "相机挂件",
        nounGloss: "camera charm",
        objectCategory: "device",
        designConfidence: 0.97,
        requestedAnchorPhrase: "左耳",
        familyGuess: "generic-ornament",
        familyResolutionSource: "openai",
        prototypeCandidates: [{ id: "camera", confidence: 0.99 }],
        traits: ["rigid", "flat-face", "micro-hangable", "ear-safe"],
        mustKeep: true,
        allowApproximation: true,
      },
    ],
  };
}

function buildSkeletalDesignPayload() {
  return {
    plans: [
      {
        semanticClass: "device",
      },
    ],
    notes: ["skeletal planner payload regression"],
  };
}

function buildEmptyDesignPayload() {
  return {
    plans: [],
    notes: [],
  };
}

function createMockFetch(semanticPayload: Record<string, unknown>, designPayload: Record<string, unknown>) {

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const bodyText = typeof init?.body === "string" ? init.body : "";
    const body = bodyText ? JSON.parse(bodyText) : {};
    const isDesignPlanner =
      (typeof body.instructions === "string" &&
        body.instructions.includes("runtime accessory design planner")) ||
      (typeof body.input === "string" && body.input.includes("\"runtimeDesignTasks\"")) ||
      (Array.isArray(body.messages) &&
        body.messages.some(
          (message: { content?: unknown }) =>
            typeof message?.content === "string" &&
            (
              message.content.includes("runtime accessory design planner") ||
              message.content.includes("\"runtimeDesignTasks\"")
            ),
        ));
    const payload = isDesignPlanner ? designPayload : semanticPayload;
    const responsesPayload = { output_parsed: payload };
    const chatPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify(payload),
          },
        },
      ],
    };

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

    throw new Error(`Unexpected fetch URL during planner topology guard check: ${url}`);
  };
}

function findGeometryRecipeByNoun(
  recipe: {
    geometryRecipes: GeometryRecipeCandidate[];
  },
  noun: string,
) {
  return recipe.geometryRecipes.find((candidate) =>
    (candidate.requestedNoun ?? candidate.displayLabel).includes(noun),
  );
}

function stablePartSignature(part: GeometryPartCandidate) {
  return JSON.stringify({
    primitive: part.primitive,
    role: part.role,
    size: part.size,
    offset: part.offset,
    scale: part.scale,
    rotation: part.rotation ?? null,
  });
}

async function main() {
  process.env.SEMANTIC_API_KEY = "planner-topology-guard-key";
  process.env.SEMANTIC_BASE_URL = "https://api.openai.com/v1";
  process.env.SEMANTIC_MODEL = "gpt-4.1-mini";
  process.env.DESIGN_API_KEY = "planner-topology-guard-key";
  process.env.DESIGN_BASE_URL = "https://api.openai.com/v1";
  process.env.DESIGN_MODEL = "gpt-4.1-mini";
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
          throw new Error("Keychain disabled for planner topology guard check");
        },
      };
    }

    return originalLoad(...args);
  };

  const { parsePromptCustomizationRecipe } = await import(
    "../src/lib/prompt-customization"
  );
  globalThis.fetch = createMockFetch(
    buildFlowerSemanticPayload(),
    buildFlowerDesignPayload(),
  ) as typeof fetch;

  const recipe = await parsePromptCustomizationRecipe({
    prompt: "做一只小狐狸桌宠，左耳一个绿色小花挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
  });
  const runtimeTask = recipe.runtimeDesignTasks.find(
    (candidate) => candidate.taskId === "design-openai-req-0",
  );
  const geometryRecipe = recipe.geometryRecipes.find((candidate) =>
    (candidate.requestedNoun ?? candidate.displayLabel).includes("小花"),
  );
  const partGraph = recipe.partGraphs.find((candidate) => candidate.taskId === "design-openai-req-0");

  const failures: string[] = [];

  if (!geometryRecipe) {
    failures.push("missing flower geometry recipe");
  } else {
    const partIds = geometryRecipe.parts.map((part) => part.partId);

    if (!partIds.includes("petal-left") || !partIds.includes("petal-right")) {
      failures.push(`expected canonical flower part ids, got ${partIds.join(", ")}`);
    }

    if (partIds.includes("petal-1")) {
      failures.push(`expected planner drift ids to be rejected, got ${partIds.join(", ")}`);
    }

    if (!geometryRecipe.criticalParts.includes("petal-left")) {
      failures.push(
        `expected canonical critical parts after planner merge, got ${geometryRecipe.criticalParts.join(", ")}`,
      );
    }
  }

  if (!runtimeTask) {
    failures.push("missing rebuilt flower runtime task");
  } else {
    if (runtimeTask.semanticClass !== "flower") {
      failures.push(`expected flower semanticClass after promotion, got ${runtimeTask.semanticClass}`);
    }

    if (!runtimeTask.criticalParts.includes("petal-left") || runtimeTask.criticalParts.includes("leaf-left")) {
      failures.push(
        `expected canonical flower runtime critical parts, got ${runtimeTask.criticalParts.join(", ")}`,
      );
    }
  }

  if (!partGraph) {
    failures.push("missing rebuilt flower part graph");
  } else {
    const nodeIds = partGraph.nodes.map((node) => node.partId);

    if (!nodeIds.includes("petal-left") || nodeIds.includes("petal-1")) {
      failures.push(`expected rebuilt canonical part graph, got ${nodeIds.join(", ")}`);
    }
  }

  globalThis.fetch = createMockFetch(
    buildStarSemanticPayload(),
    buildEmptyDesignPayload(),
  ) as typeof fetch;
  const baselineStarRecipe = await parsePromptCustomizationRecipe({
    prompt: "做一只小狐狸桌宠，左耳一个金色星星挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
  });
  globalThis.fetch = createMockFetch(
    buildStarSemanticPayload(),
    buildStarDesignPayload(),
  ) as typeof fetch;
  const plannedStarRecipe = await parsePromptCustomizationRecipe({
    prompt: "做一只小狐狸桌宠，左耳一个金色星星挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
  });
  const baselineStarGeometry = findGeometryRecipeByNoun(baselineStarRecipe, "星");
  const plannedStarGeometry = findGeometryRecipeByNoun(plannedStarRecipe, "星");
  const baselineStarGraph = baselineStarRecipe.partGraphs.find(
    (candidate) => candidate.taskId === "design-openai-req-0",
  );
  const plannedStarGraph = plannedStarRecipe.partGraphs.find(
    (candidate) => candidate.taskId === "design-openai-req-0",
  );

  if (!baselineStarGeometry) {
    failures.push("missing baseline star geometry recipe");
  }

  if (!plannedStarGeometry) {
    failures.push("missing planner-backed star geometry recipe");
  } else {
    if (plannedStarGeometry.runtimeDesignSource !== "hybrid") {
      failures.push(
        `expected preserved star geometry to stay hybrid, got ${plannedStarGeometry.runtimeDesignSource}`,
      );
    }
  }

  if (baselineStarGeometry && plannedStarGeometry) {
    const baselinePartMap = new Map(baselineStarGeometry.parts.map((part) => [part.partId, part] as const));

    for (const plannedPart of plannedStarGeometry.parts) {
      const baselinePart = baselinePartMap.get(plannedPart.partId);

      if (!baselinePart) {
        failures.push(`unexpected star part after planner merge: ${plannedPart.partId}`);
        continue;
      }

      if (stablePartSignature(plannedPart) !== stablePartSignature(baselinePart)) {
        failures.push(
          `expected stable star geometry for ${plannedPart.partId} to be preserved; baseline=${stablePartSignature(
            baselinePart,
          )} planned=${stablePartSignature(plannedPart)}`,
        );
      }
    }
  }

  if (!baselineStarGraph || !plannedStarGraph) {
    failures.push("missing star part graph for stable geometry comparison");
  } else {
    const baselineNodeRoleMap = new Map(
      baselineStarGraph.nodes.map((node) => [node.partId, node.role] as const),
    );

    for (const node of plannedStarGraph.nodes) {
      if (baselineNodeRoleMap.get(node.partId) !== node.role) {
        failures.push(
          `expected star part graph role to remain stable for ${node.partId}, got ${node.role}`,
        );
      }
    }
  }

  globalThis.fetch = createMockFetch(
    buildCameraSemanticPayload(),
    buildSkeletalDesignPayload(),
  ) as typeof fetch;
  const cameraRecipe = await parsePromptCustomizationRecipe({
    prompt: "做一只小狐狸桌宠，左耳一个银色相机挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
  });
  const cameraRuntimeTask = cameraRecipe.runtimeDesignTasks.find(
    (candidate) => candidate.taskId === "design-openai-req-0",
  );
  const cameraGeometry = findGeometryRecipeByNoun(cameraRecipe, "相机");

  if (!cameraRuntimeTask) {
    failures.push("missing camera runtime task");
  } else {
    if (cameraRuntimeTask.runtimeShapeClass !== "camera-charm") {
      failures.push(
        `expected camera runtime shape class camera-charm, got ${cameraRuntimeTask.runtimeShapeClass ?? "(none)"}`,
      );
    }

    if (cameraRuntimeTask.sourceMode !== "cached-reference") {
      failures.push(
        `expected camera runtime task to keep cached-reference source mode, got ${cameraRuntimeTask.sourceMode ?? "(none)"}`,
      );
    }

    if (cameraRuntimeTask.runtimeDesignSource !== "hybrid") {
      failures.push(
        `expected reference-backed camera runtime task to promote runtimeDesignSource=hybrid even with skeletal planner payload, got ${cameraRuntimeTask.runtimeDesignSource ?? "(none)"}`,
      );
    }
  }

  if (!cameraGeometry) {
    failures.push("missing camera geometry recipe");
  } else {
    if (cameraGeometry.runtimeDesignSource !== "hybrid") {
      failures.push(
        `expected reference-backed camera geometry to promote runtimeDesignSource=hybrid even with skeletal planner payload, got ${cameraGeometry.runtimeDesignSource ?? "(none)"}`,
      );
    }

    const partIds = cameraGeometry.parts.map((part) => part.partId);
    if (!partIds.includes("device-body") || !partIds.includes("camera-lens")) {
      failures.push(`expected camera geometry to preserve cached-reference topology, got ${partIds.join(", ")}`);
    }
  }

  if (failures.length > 0) {
    console.error("[planner-topology-guard] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("[planner-topology-guard] all cases passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
