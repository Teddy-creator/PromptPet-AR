import { spawn } from "node:child_process";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSmokeManagedChildEnv,
  buildSmokePersistedLlmConfig,
  resolveSmokeLlmConfig,
} from "./lib/smoke-llm-routing.mjs";

type SmokeCase = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  customizationProfile: "safe-overlay" | "experimental-addon";
  expectedSourceModes: Array<"cached-reference" | "canonical-blueprint">;
  requireOverallVisualAcceptance?: boolean;
  expectations: AccessoryExpectation[];
};

type AccessoryExpectation = {
  label: string;
  runtimeShapeClass: string;
  sourceMode: "cached-reference" | "canonical-blueprint";
  anchor: string;
  ordinal: number;
  expectedStatuses: Array<"implemented" | "approximated">;
  expectedCanonicalReads?: string[];
  expectedCanonicalDominantSpanOwner?: string;
  expectedCanonicalDominantSpanOwners?: string[];
  requireVisualAcceptance?: boolean;
  expectedCriticalParts: string[];
  expectedMinNodeCount: number;
  expectedCenter: [number, number, number];
  tolerance: number;
  colorHex: string;
  expectedPartColors?: Record<string, string[]>;
};

type GenerationSummaryRow = {
  requestId: string;
  instanceId: string;
  executionStatus: "implemented" | "approximated" | "unfulfilled";
  sourceMode?: string;
  runtimeShapeClass?: string;
  resolvedAnchorKey?: string;
  instanceOrdinal?: number;
  rawFirstReadResult?: string;
  runtimeNodePrefix?: string;
  exportedNodeNames?: string[];
  exportedPartIds?: string[];
  firstReadResult?: string;
  canonicalFirstRead?: string;
  rawDominantSpanOwnerText?: string;
  canonicalDominantSpanOwner?: string;
  visualAcceptanceGatePassed?: boolean;
  visualFailureReasons?: string[];
};

type GenerationResponse = {
  id: string;
  status: "queued" | "rendering" | "exporting" | "ready" | "failed";
  posterUrl: string;
  modelUrl: string;
  metadata: {
    customizationSummary?: {
      sourceModes?: string[];
      critiqueSource?: string;
      renderCritiqueAvailable?: boolean;
      visualAcceptanceGatePassed?: boolean;
      visualFailureReasons?: string[];
      dominantFailureModes?: string[];
      accessoryFulfillmentRows?: GenerationSummaryRow[];
    };
  };
};

type TaskManifest = {
  generationId: string;
  adapterKey: string;
  artifacts: {
    modelFile: string;
    posterFile: string;
    metadataFile: string;
    taskFile: string;
    statusFile: string;
  };
};

type AdapterStatusSignal = {
  status?: string;
  errorMessage?: string;
  message?: string;
};

type ManagedProcess = {
  name: string;
  child: ReturnType<typeof spawn>;
  detached: boolean;
  logs: string[];
};

type ManagedEnvironment = {
  baseUrl: string;
  managedProcesses: ManagedProcess[];
  managedChildEnv: ManagedProcessEnv;
  workerLeasePath?: string;
  workerPid?: number | null;
};

type ManagedProcessEnv = Record<string, string | undefined>;

type GlbNode = {
  name?: string;
  translation?: number[];
  scale?: number[];
  mesh?: number;
};

type GlbMeshPrimitive = {
  material?: number;
};

type GlbMesh = {
  primitives?: GlbMeshPrimitive[];
};

type GlbMaterial = {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
  };
};

class SmokeValidationError extends Error {
  constructor(
    readonly category:
      | "environment-not-met"
      | "model-not-exported"
      | "node-contract-mismatch"
      | "geometry-missing",
    message: string,
  ) {
    super(`${category}: ${message}`);
    this.name = "SmokeValidationError";
  }
}

const projectRoot = process.cwd();
const defaultSmokePort = Number(process.env.PROMPTPET_SMOKE_PORT ?? "3301");
const defaultBaseUrl = `http://127.0.0.1:${defaultSmokePort}`;
const blenderServerUrl = (process.env.BLENDER_MCP_SERVER_URL ?? "http://127.0.0.1:8010").replace(
  /\/$/,
  "",
);
const nextDevBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const workerBackend = "poly-http-plan";
const workerLeaseRoot = path.join(projectRoot, "output", "mock-generations");
const managedStopTimeoutMs = 2_000;
const forcedManagedExitTimeoutMs = 8_000;
const hasExplicitBlenderServerUrl = typeof process.env.BLENDER_MCP_SERVER_URL === "string";
const externalBaseUrl = process.env.PROMPTPET_BASE_URL?.replace(/\/$/, "") ?? null;
const smokeOnlyFilter = (process.env.PROMPTPET_SMOKE_ONLY ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const signalExitCodeMap: Partial<Record<NodeJS.Signals, number>> = {
  SIGINT: 130,
  SIGTERM: 143,
};

let activeManagedEnvironment: ManagedEnvironment | null = null;
let managedCleanupPromise: Promise<void> | null = null;
let terminationRequested = false;

function getSmokeLlmConfigOrThrow() {
  try {
    return resolveSmokeLlmConfig(process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SmokeValidationError(
      "environment-not-met",
      `smoke LLM 环境不满足：${message}`,
    );
  }
}

const smokeCases: SmokeCase[] = [
  {
    id: "phase11-flower-clover",
    prompt:
      "做一只草莓甜点主题的小狐狸桌宠，莓果粉和奶油白配色，左耳旁边有一朵绿色小花，右耳朵有个红色的四叶草。",
    style: "low-poly",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["canonical-blueprint"],
    expectations: [
      {
        label: "左耳绿色小花",
        runtimeShapeClass: "flower",
        sourceMode: "canonical-blueprint",
        anchor: "left-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["小花", "flower"],
        expectedCriticalParts: ["core", "petal-left", "petal-right"],
        expectedMinNodeCount: 5,
        expectedCenter: [0.03, 0.086, 0.02],
        tolerance: 0.07,
        colorHex: "#37A15A",
      },
      {
        label: "右耳红色四叶草",
        runtimeShapeClass: "clover-charm",
        sourceMode: "canonical-blueprint",
        anchor: "right-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["四叶草", "clover"],
        expectedCriticalParts: ["core", "leaf-top", "stem"],
        expectedMinNodeCount: 6,
        expectedCenter: [-0.03, 0.086, 0.02],
        tolerance: 0.07,
        colorHex: "#B31E2A",
      },
    ],
  },
  {
    id: "phase11-fish-ear",
    prompt: "不要任何配饰，除了左耳一个绿色小鱼挂饰。",
    style: "low-poly",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["canonical-blueprint"],
    expectations: [
      {
        label: "左耳绿色小鱼挂饰",
        runtimeShapeClass: "fish-charm",
        sourceMode: "canonical-blueprint",
        anchor: "left-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["小鱼", "fish"],
        expectedCanonicalDominantSpanOwner: "body",
        expectedCriticalParts: ["body", "tail"],
        expectedMinNodeCount: 2,
        expectedCenter: [0.03, 0.086, 0.018],
        tolerance: 0.06,
        colorHex: "#37A15A",
      },
    ],
  },
  {
    id: "phase11-camera-ear",
    prompt: "做一只小狐狸桌宠，左耳一个银色相机挂件。",
    style: "cream-toy",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["cached-reference"],
    expectations: [
      {
        label: "左耳银色相机挂件",
        runtimeShapeClass: "camera-charm",
        sourceMode: "cached-reference",
        anchor: "left-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["相机", "camera"],
        expectedCanonicalDominantSpanOwner: "device-body",
        requireVisualAcceptance: true,
        expectedCriticalParts: ["device-body", "camera-lens", "camera-top"],
        expectedMinNodeCount: 3,
        expectedCenter: [0.03, 0.084, 0.018],
        tolerance: 0.09,
        colorHex: "#7E8695",
        expectedPartColors: {
          "device-body": ["#7E8695"],
          "camera-lens": ["#6F7885"],
          "camera-top": ["#6F7885", "#F2F3F5"],
        },
      },
    ],
  },
  {
    id: "phase12-chest-wrap",
    prompt: "做一只小狐狸桌宠，胸前系一个黑色小围巾。",
    style: "cream-toy",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["canonical-blueprint"],
    requireOverallVisualAcceptance: false,
    expectations: [
      {
        label: "胸前黑色小围巾",
        runtimeShapeClass: "scarf",
        sourceMode: "canonical-blueprint",
        anchor: "chest-center",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["小围巾", "围巾", "scarf"],
        expectedCanonicalDominantSpanOwner: "knot",
        expectedCriticalParts: ["wrap-band", "knot", "tail-left", "tail-right"],
        expectedMinNodeCount: 4,
        expectedCenter: [0.0024, 0.0368, 0.0291],
        tolerance: 0.05,
        colorHex: "#111111",
      },
    ],
  },
  {
    id: "phase14-star-ear",
    prompt: "做一只小狐狸桌宠，左耳一个金色星星挂件。",
    style: "cream-toy",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["canonical-blueprint"],
    expectations: [
      {
        label: "左耳金色星星挂件",
        runtimeShapeClass: "star",
        sourceMode: "canonical-blueprint",
        anchor: "left-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["星星", "星", "star"],
        expectedCanonicalDominantSpanOwners: ["ray-1", "core"],
        expectedCriticalParts: ["core", "ray-1", "ray-2"],
        expectedMinNodeCount: 6,
        expectedCenter: [0.0463, 0.1036, 0.0121],
        tolerance: 0.08,
        colorHex: "#B38A44",
      },
    ],
  },
  {
    id: "phase14-phone-ear",
    prompt: "不要任何配饰，除了左耳一个橙色手机挂饰。",
    style: "low-poly",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["cached-reference"],
    expectations: [
      {
        label: "左耳橙色手机挂饰",
        runtimeShapeClass: "device-generic-charm",
        sourceMode: "cached-reference",
        anchor: "left-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["手机", "phone"],
        expectedCanonicalDominantSpanOwner: "device-body",
        requireVisualAcceptance: true,
        expectedCriticalParts: ["device-body", "screen-face", "hang-slot"],
        expectedMinNodeCount: 3,
        expectedCenter: [0.03, 0.084, 0.018],
        tolerance: 0.09,
        colorHex: "#E47C2E",
        expectedPartColors: {
          "device-body": ["#D46C24", "#E06E18"],
          "screen-face": ["#FFF3E7", "#FFF4E5"],
          "hang-slot": ["#B85A1E", "#C85B0B", "#D46C24"],
        },
      },
    ],
  },
  {
    id: "phase11-boat-ear",
    prompt: "不要任何配饰，除了右耳一个蓝色小船挂饰。",
    style: "low-poly",
    customizationProfile: "experimental-addon",
    expectedSourceModes: ["cached-reference"],
    expectations: [
      {
        label: "右耳蓝色小船挂饰",
        runtimeShapeClass: "boat-charm",
        sourceMode: "cached-reference",
        anchor: "right-ear",
        ordinal: 1,
        expectedStatuses: ["implemented", "approximated"],
        expectedCanonicalReads: ["小船", "boat"],
        expectedCanonicalDominantSpanOwner: "boat-hull",
        requireVisualAcceptance: true,
        expectedCriticalParts: ["boat-hull", "boat-mast", "boat-sail"],
        expectedMinNodeCount: 3,
        expectedCenter: [-0.03, 0.082, 0.016],
        tolerance: 0.09,
        colorHex: "#426CB2",
      },
    ],
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }

  return String(error);
}

function srgbChannelToLinear(value: number) {
  const normalized = value / 255;

  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function hexToLinearRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const value =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((segment) => segment + segment)
          .join("")
      : sanitized;

  return [
    srgbChannelToLinear(Number.parseInt(value.slice(0, 2), 16)),
    srgbChannelToLinear(Number.parseInt(value.slice(2, 4), 16)),
    srgbChannelToLinear(Number.parseInt(value.slice(4, 6), 16)),
  ] as [number, number, number];
}

function isGenericVisualRead(value: string | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  return (
    /^generic-/i.test(value) ||
    /(slab|bar|token|block|badge|plate|rod|stick|blob|random)/i.test(value)
  );
}

function vectorDistance(
  left: [number, number, number],
  right: [number, number, number],
) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2,
  );
}

function readGlbJson(buffer: ArrayBuffer) {
  const bytes = Buffer.from(buffer);
  const jsonChunkLength = bytes.readUInt32LE(12);
  const jsonChunk = bytes
    .slice(20, 20 + jsonChunkLength)
    .toString("utf8")
    .replace(/\u0000+$/g, "");

  return JSON.parse(jsonChunk) as {
    nodes?: GlbNode[];
    meshes?: GlbMesh[];
    materials?: GlbMaterial[];
  };
}

function getNodeMaterialColor(
  node: GlbNode,
  meshes: GlbMesh[],
  materials: GlbMaterial[],
) {
  if (typeof node.mesh !== "number") {
    return null;
  }

  const primitive = meshes[node.mesh]?.primitives?.[0];

  if (typeof primitive?.material !== "number") {
    return null;
  }

  const factor = materials[primitive.material]?.pbrMetallicRoughness?.baseColorFactor;

  if (!Array.isArray(factor) || factor.length < 3) {
    return null;
  }

  return [factor[0], factor[1], factor[2]] as [number, number, number];
}

function assertCloseColor(
  actual: [number, number, number],
  expectedHex: string,
  label: string,
) {
  const expected = hexToLinearRgb(expectedHex);
  const delta = vectorDistance(actual, expected);

  if (delta > 0.08) {
    throw new SmokeValidationError(
      "geometry-missing",
      `${label} 颜色不对，expected=${expectedHex}, actual=${actual
        .map((value) => value.toFixed(4))
        .join(",")}`,
    );
  }
}

function assertCloseToAnyColor(
  actual: [number, number, number],
  expectedHexes: string[],
  label: string,
  partId: string,
) {
  const bestDelta = expectedHexes.reduce((best, hex) => {
    const delta = vectorDistance(actual, hexToLinearRgb(hex));
    return Math.min(best, delta);
  }, Number.POSITIVE_INFINITY);

  if (bestDelta > 0.08) {
    throw new SmokeValidationError(
      "geometry-missing",
      `${label} ${partId} 颜色不对，expected one of=${expectedHexes.join("/")}, actual=${actual
        .map((value) => value.toFixed(4))
        .join(",")}`,
    );
  }
}

function buildRuntimeNodePrefix(
  generationId: string,
  runtimeShapeClass: string,
  anchor: string,
  ordinal: number,
) {
  return `DynamicAcc_${generationId.slice(0, 8)}_${runtimeShapeClass}_${anchor}_${ordinal}`;
}

function resolveArtifactPath(relativeOrAbsolutePath: string) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(projectRoot, relativeOrAbsolutePath);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 4) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${url}`);
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetchWithRetry(url, init);
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} failed: ${response.status} ${text}`);
  }

  return payload;
}

async function ensureOk(url: string) {
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
}

function pushProcessLog(logs: string[], source: string, chunk: Buffer) {
  const lines = chunk
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    logs.push(`[${source}] ${line}`);
    if (logs.length > 80) {
      logs.shift();
    }
  }
}

function isPidAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EPERM"
    );
  }
}

function buildWorkerLeasePath(serverUrl: string) {
  const backendToken = workerBackend.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const serverToken = serverUrl.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(-64);

  return path.join(workerLeaseRoot, `.worker-lock-${backendToken}-${serverToken}.json`);
}

async function readWorkerLeasePid(lockPath: string): Promise<number | null> {
  try {
    const payload = JSON.parse(await readFile(lockPath, "utf8")) as { pid?: unknown };
    return Number.isInteger(payload.pid) ? Number(payload.pid) : null;
  } catch {
    return null;
  }
}

function startManagedProcess(
  name: string,
  command: string,
  args: string[],
  env: ManagedProcessEnv,
): ManagedProcess {
  const detached = process.platform !== "win32";
  const child = spawn(command, args, {
    cwd: projectRoot,
    detached,
    env: env as NodeJS.ProcessEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs: string[] = [];

  child.stdout?.on("data", (chunk: Buffer) => pushProcessLog(logs, `${name}:stdout`, chunk));
  child.stderr?.on("data", (chunk: Buffer) => pushProcessLog(logs, `${name}:stderr`, chunk));
  child.on("exit", (code, signal) => {
    logs.push(`[${name}:exit] code=${code ?? "null"} signal=${signal ?? "null"}`);
    if (logs.length > 80) {
      logs.shift();
    }
  });

  return { name, child, detached, logs };
}

function formatManagedLogs(processes: ManagedProcess[]) {
  return processes
    .flatMap((processInfo) => processInfo.logs.map((line) => `  ${line}`))
    .slice(-40)
    .join("\n");
}

async function waitForServerReady(
  baseUrl: string,
  managedProcesses: ManagedProcess[],
  timeoutMs: number,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    for (const processInfo of managedProcesses) {
      if (processInfo.child.exitCode !== null) {
        throw new SmokeValidationError(
          "environment-not-met",
          `${processInfo.name} 提前退出，无法启动 smoke 环境。\n${formatManagedLogs(managedProcesses)}`,
        );
      }
    }

    try {
      const response = await fetch(`${baseUrl}/api/generations/non-existent-smoke-health`);
      if (response.status === 404 || response.ok) {
        return;
      }
    } catch {}

    await sleep(1000);
  }

  throw new SmokeValidationError(
    "environment-not-met",
    `Next server 在 ${timeoutMs}ms 内没有准备好。\n${formatManagedLogs(managedProcesses)}`,
  );
}

async function ensureBlenderMcpServerAvailable(serverUrl: string) {
  if (!hasExplicitBlenderServerUrl) {
    throw new SmokeValidationError(
      "environment-not-met",
      "真实 smoke 现在要求显式设置 BLENDER_MCP_SERVER_URL，并指向专用 Blender MCP 端口；推荐使用 8010 这类专用端口，不再复用 8000。",
    );
  }

  let response: Response;
  try {
    response = await fetchWithRetry(`${serverUrl}/mcp/list_tools`, {
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SmokeValidationError(
      "environment-not-met",
      `Blender MCP server 不可用：${serverUrl}。请先启动真实 MCP server，再运行 smoke。原始错误：${message}`,
    );
  }

  if (!response.ok) {
    throw new SmokeValidationError(
      "environment-not-met",
      `Blender MCP server 返回 ${response.status}，当前环境不满足真实导出 smoke。`,
    );
  }

  const bodyText = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {}

  const requiredTools = [
    "import_file",
    "export_file",
    "create_mesh_object",
    "render_image",
    "delete_objects",
  ];
  const availableToolNames = new Set<string>();
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string") {
        availableToolNames.add(entry.name);
      }
    }
  } else if (payload && typeof payload === "object" && "tools" in payload && Array.isArray(payload.tools)) {
    for (const entry of payload.tools) {
      if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string") {
        availableToolNames.add(entry.name);
      }
    }
  }

  if (availableToolNames.size === 0) {
    throw new SmokeValidationError(
      "environment-not-met",
      `Blender MCP server 的 /mcp/list_tools 没有返回可识别工具列表。请确认 ${serverUrl} 是专用 Blender MCP，而不是别的 uvicorn 服务。`,
    );
  }

  const missingTools = requiredTools.filter((toolName) => !availableToolNames.has(toolName));
  if (missingTools.length > 0) {
    throw new SmokeValidationError(
      "environment-not-met",
      `Blender MCP server 缺少必需工具：${missingTools.join(", ")}。当前 ${serverUrl} 很可能不是完整的专用 Blender MCP 服务。`,
    );
  }
}

async function createManagedEnvironment(): Promise<ManagedEnvironment> {
  await ensureBlenderMcpServerAvailable(blenderServerUrl);
  const smokeLlmConfig = getSmokeLlmConfigOrThrow();
  console.log(
    `dynamic-custom smoke LLM: ${smokeLlmConfig.provider} / ${smokeLlmConfig.baseUrl} / ${smokeLlmConfig.model} (${smokeLlmConfig.source})`,
  );

  const workerLeasePath = buildWorkerLeasePath(blenderServerUrl);
  const managedChildEnv = buildSmokeManagedChildEnv(process.env, smokeLlmConfig);
  const app = startManagedProcess(
    "next-dev",
    process.execPath,
    [nextDevBin, "dev", "--port", String(defaultSmokePort), "--hostname", "127.0.0.1"],
    {
      ...managedChildEnv,
      GENERATION_ADAPTER: "blender-mcp",
      PORT: String(defaultSmokePort),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  );
  const environment: ManagedEnvironment = {
    baseUrl: defaultBaseUrl,
    managedProcesses: [app],
    managedChildEnv,
    workerLeasePath,
    workerPid: null,
  };
  activeManagedEnvironment = environment;

  try {
    await waitForServerReady(defaultBaseUrl, environment.managedProcesses, 120_000);
    return environment;
  } catch (error) {
    await cleanupTrackedManagedEnvironment("createManagedEnvironment");
    throw error;
  }
}

function startScopedManagedWorker(
  environment: ManagedEnvironment,
  generationId: string,
) {
  const worker = startManagedProcess(
    `blender-worker:${generationId.slice(0, 8)}`,
    process.execPath,
    [
      "scripts/blender-mcp-worker.mjs",
      "--once",
      "--backend",
      workerBackend,
      "--id",
      generationId,
    ],
    {
      ...environment.managedChildEnv,
      BLENDER_MCP_BACKEND: workerBackend,
      BLENDER_MCP_SERVER_URL: blenderServerUrl,
    },
  );

  environment.managedProcesses.push(worker);
  environment.workerPid = worker.child.pid ?? null;

  return worker;
}

async function runTaskkill(pid: number, force: boolean) {
  await new Promise<void>((resolve, reject) => {
    const args = ["/pid", String(pid), "/T"];
    if (force) {
      args.push("/F");
    }

    const child = spawn("taskkill", args, {
      stdio: "ignore",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0 || code === 128 || code === 255) {
        resolve();
        return;
      }

      reject(new Error(`taskkill failed for pid=${pid} code=${code ?? "null"}`));
    });
  });
}

async function terminateManagedProcess(
  processInfo: ManagedProcess,
  signal: NodeJS.Signals,
  force: boolean,
) {
  const pid = processInfo.child.pid;
  if (typeof pid !== "number" || pid <= 0) {
    return;
  }

  if (processInfo.child.exitCode !== null || processInfo.child.signalCode !== null) {
    return;
  }

  try {
    if (process.platform === "win32") {
      await runTaskkill(pid, force);
      return;
    }

    process.kill(processInfo.detached ? -pid : pid, signal);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "ESRCH" || error.code === "EPERM")
    ) {
      return;
    }
    throw error;
  }
}

async function waitForProcessExit(processInfo: ManagedProcess, timeoutMs: number) {
  if (processInfo.child.exitCode !== null || processInfo.child.signalCode !== null) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const handleExit = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      processInfo.child.off("exit", handleExit);
    };

    processInfo.child.once("exit", handleExit);
  });
}

async function cleanupManagedWorkerLease(environment: ManagedEnvironment) {
  if (!environment.workerLeasePath || !(await fileExists(environment.workerLeasePath))) {
    return;
  }

  const leasePid = await readWorkerLeasePid(environment.workerLeasePath);
  const workerPid = environment.workerPid;
  const hasLeasePid = typeof leasePid === "number";
  const hasWorkerPid = typeof workerPid === "number";
  const ownedByManagedWorker = hasLeasePid && hasWorkerPid && leasePid === workerPid;
  const staleLease =
    (hasLeasePid && !isPidAlive(leasePid)) || (hasWorkerPid && !isPidAlive(workerPid));

  if (!ownedByManagedWorker && !staleLease) {
    return;
  }

  try {
    await unlink(environment.workerLeasePath);
  } catch (error) {
    if (
      !(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }
}

async function cleanupTrackedManagedEnvironment(
  reason: string,
  options: { suppressErrors?: boolean } = {},
) {
  const environment = activeManagedEnvironment;
  if (!environment) {
    return;
  }

  if (!managedCleanupPromise) {
    managedCleanupPromise = (async () => {
      try {
        await stopManagedEnvironment(environment);
      } finally {
        if (activeManagedEnvironment === environment) {
          activeManagedEnvironment = null;
        }
      }
    })().finally(() => {
      managedCleanupPromise = null;
    });
  }

  if (options.suppressErrors) {
    try {
      await managedCleanupPromise;
    } catch (error) {
      console.error(`[managed-cleanup] ${reason} failed: ${formatUnknownError(error)}`);
    }
    return;
  }

  await managedCleanupPromise;
}

async function exitAfterManagedCleanup(reason: string, exitCode: number) {
  if (terminationRequested) {
    process.exit(exitCode);
  }

  terminationRequested = true;
  const forcedExitTimer = setTimeout(() => {
    process.exit(exitCode);
  }, forcedManagedExitTimeoutMs);
  forcedExitTimer.unref?.();

  try {
    await cleanupTrackedManagedEnvironment(reason, { suppressErrors: true });
  } finally {
    clearTimeout(forcedExitTimer);
    process.exit(exitCode);
  }
}

function installManagedEnvironmentLifecycleHooks() {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void exitAfterManagedCleanup(`signal:${signal}`, signalExitCodeMap[signal] ?? 1);
    });
  }

  process.on("beforeExit", (code) => {
    if (terminationRequested || !activeManagedEnvironment) {
      return;
    }

    void cleanupTrackedManagedEnvironment(`beforeExit:${code}`, {
      suppressErrors: true,
    });
  });

  process.on("uncaughtException", (error) => {
    console.error(`dynamic-custom smoke failed: uncaughtException: ${formatUnknownError(error)}`);
    void exitAfterManagedCleanup("uncaughtException", 1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`dynamic-custom smoke failed: unhandledRejection: ${formatUnknownError(reason)}`);
    void exitAfterManagedCleanup("unhandledRejection", 1);
  });
}

async function stopManagedEnvironment(environment: ManagedEnvironment | null) {
  if (!environment) {
    return;
  }

  const processes = [...environment.managedProcesses].reverse();

  await Promise.all(
    processes.map((processInfo) => terminateManagedProcess(processInfo, "SIGTERM", false)),
  );
  const gracefulResults = await Promise.all(
    processes.map((processInfo) => waitForProcessExit(processInfo, managedStopTimeoutMs)),
  );

  await Promise.all(
    processes
      .filter((_, index) => !gracefulResults[index])
      .map((processInfo) => terminateManagedProcess(processInfo, "SIGKILL", true)),
  );
  await Promise.all(
    processes.map((processInfo) => waitForProcessExit(processInfo, managedStopTimeoutMs)),
  );

  await cleanupManagedWorkerLease(environment);
}

async function createGeneration(baseUrl: string, entry: SmokeCase) {
  const llmConfig = buildSmokePersistedLlmConfig(getSmokeLlmConfigOrThrow());

  return requestJson<{ id: string }>(`${baseUrl}/api/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: "dynamic-custom",
      customizationProfile: entry.customizationProfile,
      ...(llmConfig ? { llmConfig } : {}),
    }),
  });
}

async function getTask(baseUrl: string, id: string) {
  return requestJson<TaskManifest>(`${baseUrl}/api/generations/${id}/task`);
}

async function readAdapterStatus(task: TaskManifest) {
  const statusPath = resolveArtifactPath(task.artifacts.statusFile);

  if (!(await fileExists(statusPath))) {
    return null;
  }

  return JSON.parse(await readFile(statusPath, "utf8")) as AdapterStatusSignal;
}

async function pollGeneration(
  baseUrl: string,
  task: TaskManifest,
  timeoutMs: number,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const generation = await requestJson<GenerationResponse>(
      `${baseUrl}/api/generations/${task.generationId}`,
    );

    if (generation.status === "ready") {
      return generation;
    }

    if (generation.status === "failed") {
      const adapterStatus = await readAdapterStatus(task);
      throw new SmokeValidationError(
        "model-not-exported",
        `generation ${task.generationId} 进入 failed。adapter-status=${adapterStatus?.status ?? "missing"} message=${
          adapterStatus?.errorMessage ?? adapterStatus?.message ?? "unknown"
        }`,
      );
    }

    await sleep(2000);
  }

  const adapterStatus = await readAdapterStatus(task);
  throw new SmokeValidationError(
    "environment-not-met",
    `generation ${task.generationId} 在 ${timeoutMs}ms 内未就绪。当前 adapter-status=${
      adapterStatus?.status ?? "missing"
    }，message=${adapterStatus?.message ?? "unknown"}。请检查真实 worker 是否在运行且 backend 不是 mock-assets。`,
  );
}

async function validateArtifactPresence(
  baseUrl: string,
  generation: GenerationResponse,
  task: TaskManifest,
) {
  const expectedModelUrl = `/api/generations/${task.generationId}/model`;
  const expectedPosterUrl = `/api/generations/${task.generationId}/poster`;

  if (generation.modelUrl !== expectedModelUrl || generation.posterUrl !== expectedPosterUrl) {
    throw new SmokeValidationError(
      "environment-not-met",
      `generation 返回的模型仍不是本地真实导出资产。modelUrl=${generation.modelUrl} posterUrl=${generation.posterUrl}`,
    );
  }

  const modelPath = resolveArtifactPath(task.artifacts.modelFile);
  const posterPath = resolveArtifactPath(task.artifacts.posterFile);

  if (!(await fileExists(modelPath))) {
    throw new SmokeValidationError(
      "model-not-exported",
      `缺少真实导出 GLB：${modelPath}`,
    );
  }

  if (!(await fileExists(posterPath))) {
    throw new SmokeValidationError(
      "model-not-exported",
      `缺少真实导出海报：${posterPath}`,
    );
  }

  await ensureOk(`${baseUrl}/result/${task.generationId}`);
  await ensureOk(`${baseUrl}/share/${task.generationId}`);
  await ensureOk(`${baseUrl}${generation.posterUrl}`);
  await ensureOk(`${baseUrl}${generation.modelUrl}`);
}

async function writeReviewDossier(
  entry: SmokeCase,
  baseUrl: string,
  generation: GenerationResponse,
  task: TaskManifest,
) {
  const dossierDir = path.join(projectRoot, "output", "dynamic-custom-review-dossiers");
  const generationDir = path.dirname(resolveArtifactPath(task.artifacts.modelFile));
  const critiqueDir = path.join(generationDir, "_runtime-critique");
  let critiqueAvailable = false;

  try {
    await access(critiqueDir);
    critiqueAvailable = true;
  } catch {}

  await mkdir(dossierDir, { recursive: true });
  await writeFile(
    path.join(dossierDir, `${entry.id}.json`),
    JSON.stringify(
      {
        id: entry.id,
        generationId: generation.id,
        prompt: entry.prompt,
        resultUrl: `${baseUrl}/result/${generation.id}`,
        shareUrl: `${baseUrl}/share/${generation.id}`,
        modelUrl: `${baseUrl}${generation.modelUrl}`,
        thumbnailFile: resolveArtifactPath(task.artifacts.posterFile),
        critiqueDir: critiqueAvailable ? critiqueDir : null,
        customizationSummary: generation.metadata.customizationSummary ?? null,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function validateSourceModes(
  entry: SmokeCase,
  generation: GenerationResponse,
) {
  const summary = generation.metadata.customizationSummary;
  const sourceModes = Array.isArray(summary?.sourceModes)
    ? summary.sourceModes
    : [];

  for (const expectedSourceMode of entry.expectedSourceModes) {
    if (!sourceModes.includes(expectedSourceMode)) {
      throw new SmokeValidationError(
        "node-contract-mismatch",
        `[${entry.id}] metadata.customizationSummary.sourceModes 缺少 ${expectedSourceMode}。actual=${sourceModes.join(",") || "empty"}`,
      );
    }
  }

  if (sourceModes.includes("legacy-fallback")) {
    throw new SmokeValidationError(
      "node-contract-mismatch",
      `[${entry.id}] 金标样本不允许命中 legacy-fallback。`,
    );
  }
}

async function fetchGlb(baseUrl: string, generationId: string) {
  const response = await fetchWithRetry(`${baseUrl}/api/generations/${generationId}/model`);

  if (!response.ok) {
    throw new SmokeValidationError(
      "model-not-exported",
      `GET /api/generations/${generationId}/model failed: ${response.status}`,
    );
  }

  return readGlbJson(await response.arrayBuffer());
}

function findRowForExpectation(
  rows: GenerationSummaryRow[],
  expectation: AccessoryExpectation,
) {
  return rows.find(
    (row) =>
      row.runtimeShapeClass === expectation.runtimeShapeClass &&
      row.sourceMode === expectation.sourceMode &&
      row.resolvedAnchorKey === expectation.anchor &&
      row.instanceOrdinal === expectation.ordinal,
  );
}

function findNodeByName(nodes: GlbNode[], targetName: string) {
  return nodes.find((node) => node.name === targetName);
}

function findExportedNodeName(
  row: GenerationSummaryRow,
  partId: string,
  fallbackName: string,
) {
  const exportedNodeNames = Array.isArray(row.exportedNodeNames) ? row.exportedNodeNames : [];
  const exactMatch = exportedNodeNames.find((nodeName) => nodeName.endsWith(`_${partId}`));

  return exactMatch ?? fallbackName;
}

function validateRuntimeAccessoryNodes(
  generationId: string,
  expectation: AccessoryExpectation,
  row: GenerationSummaryRow,
  glb: {
    nodes?: GlbNode[];
    meshes?: GlbMesh[];
    materials?: GlbMaterial[];
  },
) {
  const nodes = glb.nodes ?? [];
  const meshes = glb.meshes ?? [];
  const materials = glb.materials ?? [];
  const prefix =
    row.runtimeNodePrefix ??
    buildRuntimeNodePrefix(
      generationId,
      expectation.runtimeShapeClass,
      expectation.anchor,
      expectation.ordinal,
    );
  const groupNodes = nodes.filter((node) => (node.name ?? "").startsWith(prefix));

  if (groupNodes.length < expectation.expectedMinNodeCount) {
    throw new SmokeValidationError(
      "geometry-missing",
      `${expectation.label} 缺少运行时导出节点，expected>=${expectation.expectedMinNodeCount}, actual=${groupNodes.length}, prefix=${prefix}`,
    );
  }

  const criticalNodes = expectation.expectedCriticalParts.map((partId) => {
    const expectedNodeName = findExportedNodeName(row, partId, `${prefix}_${partId}`);
    const node = findNodeByName(nodes, expectedNodeName);

    if (!node) {
      throw new SmokeValidationError(
        "node-contract-mismatch",
        `${expectation.label} 缺少关键节点 ${expectedNodeName}`,
      );
    }

    return node;
  });

  const center = criticalNodes
    .reduce<[number, number, number]>(
      (acc, node) => {
        const translation = (node.translation ?? [0, 0, 0]) as [number, number, number];

        return [
          acc[0] + translation[0],
          acc[1] + translation[1],
          acc[2] + translation[2],
        ];
      },
      [0, 0, 0],
    )
    .map((value) => value / criticalNodes.length) as [number, number, number];

  if (vectorDistance(center, expectation.expectedCenter) > expectation.tolerance) {
    throw new SmokeValidationError(
      "geometry-missing",
      `${expectation.label} 落位不对，expected=${expectation.expectedCenter.join(",")}, actual=${center
        .map((value) => value.toFixed(4))
        .join(",")}`,
    );
  }

  for (const node of criticalNodes) {
    const color = getNodeMaterialColor(node, meshes, materials);
    const partId = expectation.expectedCriticalParts.find((value) =>
      (node.name ?? "").endsWith(`_${value}`),
    );

    if (!color) {
      throw new SmokeValidationError(
        "geometry-missing",
        `${expectation.label} 缺少材质颜色信息：${node.name ?? "unknown node"}`,
      );
    }

    const expectedPartColors =
      partId && expectation.expectedPartColors?.[partId]?.length
        ? expectation.expectedPartColors[partId]
        : null;

    if (expectedPartColors && partId) {
      assertCloseToAnyColor(color, expectedPartColors, expectation.label, partId);
    } else {
      assertCloseColor(color, expectation.colorHex, expectation.label);
    }
  }
}

async function validateCase(baseUrl: string, entry: SmokeCase) {
  console.log(`\n[${entry.id}] creating generation`);
  const created = await createGeneration(baseUrl, entry);
  const initialTask = await getTask(baseUrl, created.id);

  if (initialTask.adapterKey !== "blender-mcp") {
    throw new SmokeValidationError(
      "environment-not-met",
      `[${entry.id}] task.adapterKey=${initialTask.adapterKey}。请用 GENERATION_ADAPTER=blender-mcp 启动 Next server，不能再让 smoke 跑在 mock adapter 上。`,
    );
  }

  if (activeManagedEnvironment) {
    startScopedManagedWorker(activeManagedEnvironment, created.id);
  }

  let generation: GenerationResponse | null = null;
  let task: TaskManifest | null = null;
  let summary: GenerationResponse["metadata"]["customizationSummary"] | undefined;

  try {
    generation = await pollGeneration(baseUrl, initialTask, 420_000);
    task = await getTask(baseUrl, created.id);

    await validateArtifactPresence(baseUrl, generation, task);
    await validateSourceModes(entry, generation);

    summary = generation.metadata.customizationSummary;
    const rows = Array.isArray(summary?.accessoryFulfillmentRows)
      ? summary.accessoryFulfillmentRows
      : [];

    const glb = await fetchGlb(baseUrl, created.id);

    for (const expectation of entry.expectations) {
      const row = findRowForExpectation(rows, expectation);

      if (!row) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] 缺少 fulfillment row: ${expectation.runtimeShapeClass} / ${expectation.anchor} / ${expectation.ordinal}`,
        );
      }

      if (!expectation.expectedStatuses.some((status) => status === row.executionStatus)) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} executionStatus=${row.executionStatus}，不在允许集合 ${expectation.expectedStatuses.join(",")} 中。`,
        );
      }

      if (row.sourceMode !== expectation.sourceMode) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} sourceMode=${row.sourceMode ?? "undefined"}，expected=${expectation.sourceMode}`,
        );
      }

      if (!row.runtimeNodePrefix && (!Array.isArray(row.exportedNodeNames) || row.exportedNodeNames.length === 0)) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} 没有写出 runtimeNodePrefix/exportedNodeNames，smoke 无法按新导出契约验 GLB。`,
        );
      }

      validateRuntimeAccessoryNodes(created.id, expectation, row, glb);

      const implementedCritiqueContractSatisfied =
        summary?.renderCritiqueAvailable === true ||
        (
          summary?.critiqueSource === "viewport-capture" &&
          row.visualAcceptanceGatePassed === true &&
          !(summary?.dominantFailureModes ?? []).some((mode: string) =>
            /^render-critique-/i.test(mode),
          )
        );

      if (
        row.executionStatus === "implemented" &&
        (!implementedCritiqueContractSatisfied || !summary?.critiqueSource)
      ) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} 被标为 implemented，但 render critique 不完整。`,
        );
      }

      if (expectation.requireVisualAcceptance && row.visualAcceptanceGatePassed !== true) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} visualAcceptanceGatePassed=${row.visualAcceptanceGatePassed ?? "undefined"}，当前视觉验收未过线。`,
        );
      }

      if (
        Array.isArray(expectation.expectedCanonicalReads) &&
        expectation.expectedCanonicalReads.length > 0 &&
        !expectation.expectedCanonicalReads.includes(row.canonicalFirstRead ?? "")
      ) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} canonicalFirstRead=${row.canonicalFirstRead ?? "undefined"}，expected=${expectation.expectedCanonicalReads.join(" / ")}`,
        );
      }

      if (
        Array.isArray(expectation.expectedCanonicalDominantSpanOwners) &&
        expectation.expectedCanonicalDominantSpanOwners.length > 0 &&
        !expectation.expectedCanonicalDominantSpanOwners.includes(
          row.canonicalDominantSpanOwner ?? "",
        )
      ) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} canonicalDominantSpanOwner=${row.canonicalDominantSpanOwner ?? "undefined"}，expected=${expectation.expectedCanonicalDominantSpanOwners.join(" / ")}`,
        );
      }

      if (
        typeof expectation.expectedCanonicalDominantSpanOwner === "string" &&
        row.canonicalDominantSpanOwner !== expectation.expectedCanonicalDominantSpanOwner
      ) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} canonicalDominantSpanOwner=${row.canonicalDominantSpanOwner ?? "undefined"}，expected=${expectation.expectedCanonicalDominantSpanOwner}`,
        );
      }

      if (isGenericVisualRead(row.canonicalFirstRead ?? row.firstReadResult)) {
        throw new SmokeValidationError(
          "node-contract-mismatch",
          `[${entry.id}] ${expectation.label} 首读仍是 generic shape：${row.canonicalFirstRead ?? row.firstReadResult}`,
        );
      }
    }

    if (
      (entry.requireOverallVisualAcceptance ??
        entry.expectations.some((expectation) => expectation.requireVisualAcceptance)) &&
      summary?.visualAcceptanceGatePassed !== true
    ) {
      throw new SmokeValidationError(
        "node-contract-mismatch",
        `[${entry.id}] metadata.customizationSummary.visualAcceptanceGatePassed=${summary?.visualAcceptanceGatePassed ?? "undefined"}，整体视觉验收没有通过。`,
      );
    }
  } finally {
    if (generation && task) {
      await writeReviewDossier(entry, baseUrl, generation, task);
    }
  }

  console.log(`[${entry.id}] ready`);
  console.log(`  result: ${baseUrl}/result/${created.id}`);
  console.log(`  share:  ${baseUrl}/share/${created.id}`);
  console.log(`  model:  ${baseUrl}${generation.modelUrl}`);
  console.log(
    `  sourceModes: ${(summary?.sourceModes ?? []).join(",") || "none"} / critiqueSource=${summary?.critiqueSource ?? "n/a"} / renderCritiqueAvailable=${summary?.renderCritiqueAvailable ?? "n/a"}`,
  );
  console.log(
    `  visualAcceptanceGatePassed=${summary?.visualAcceptanceGatePassed ?? "n/a"} / visualFailures=${(summary?.visualFailureReasons ?? []).join(" | ") || "none"}`,
  );
  const requireOverallVisualAcceptance =
    entry.requireOverallVisualAcceptance ??
    entry.expectations.some((expectation) => expectation.requireVisualAcceptance);
  console.log(
    `  overallVisualAcceptance=${requireOverallVisualAcceptance ? "required" : "diagnostic-only"}`,
  );
  console.log(
    requireOverallVisualAcceptance
      ? "  smoke passed: real adapter, real GLB export, sourceMode contract, runtime nodes, and required visual acceptance all matched"
      : "  smoke passed: real adapter, real GLB export, sourceMode contract, and runtime nodes matched; visual acceptance is diagnostic-only for this case",
  );
}

async function main() {
  const selectedCases =
    smokeOnlyFilter.length > 0
      ? smokeCases.filter((entry) => smokeOnlyFilter.includes(entry.id))
      : smokeCases;

  if (selectedCases.length === 0) {
    throw new SmokeValidationError(
      "environment-not-met",
      `PROMPTPET_SMOKE_ONLY=${smokeOnlyFilter.join(",")} 没有匹配到任何 smoke case。`,
    );
  }

  const environment = externalBaseUrl
    ? {
        baseUrl: externalBaseUrl,
        managedProcesses: [],
      }
    : await createManagedEnvironment();

  console.log(
    `dynamic-custom smoke running against ${environment.baseUrl}${externalBaseUrl ? " (external server)" : " (managed real adapter environment)"}`,
  );

  try {
    for (const entry of selectedCases) {
      await validateCase(environment.baseUrl, entry);
    }
  } finally {
    if (!externalBaseUrl) {
      await cleanupTrackedManagedEnvironment("main");
    }
  }
}

installManagedEnvironmentLifecycleHooks();

main().catch((error) => {
  if (error instanceof SmokeValidationError) {
    console.error(`dynamic-custom smoke failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`dynamic-custom smoke failed: ${message}`);
  process.exitCode = 1;
});
