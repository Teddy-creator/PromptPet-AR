import type {
  GeneratorAdapter,
  GeneratorAdapterCreateContext,
  GeneratorAdapterSyncResult,
} from "./types";
import { GeneratorAdapterUnavailableError } from "./types";
import { blenderMcpAdapter } from "./blender-mcp-adapter";
import { mockAdapter } from "./mock-adapter";

const adapterRegistry = {
  mock: mockAdapter,
  "blender-mcp": blenderMcpAdapter,
} as const satisfies Record<string, GeneratorAdapter>;

export function getActiveGeneratorAdapter() {
  const requestedKey = process.env.GENERATION_ADAPTER ?? "mock";
  const adapter = adapterRegistry[requestedKey as keyof typeof adapterRegistry];

  if (!adapter) {
    throw new GeneratorAdapterUnavailableError(
      `未知的 GENERATION_ADAPTER: ${requestedKey}。当前支持 mock 或 blender-mcp。`,
    );
  }

  return adapter;
}

export async function buildAdapterGeneration(
  context: GeneratorAdapterCreateContext,
) {
  return getActiveGeneratorAdapter().create(context);
}

export async function resolveAdapterStatus(record: Parameters<GeneratorAdapter["getStatus"]>[0]) {
  const adapter = adapterRegistry[record.adapterKey];

  if (!adapter) {
    return "failed";
  }

  return adapter.getStatus(record);
}

export async function syncAdapterRecord(
  record: Parameters<GeneratorAdapter["getStatus"]>[0],
): Promise<GeneratorAdapterSyncResult> {
  const adapter = adapterRegistry[record.adapterKey];

  if (!adapter?.syncRecord) {
    return {
      record,
      changed: false,
    };
  }

  return adapter.syncRecord(record);
}

export { GeneratorAdapterUnavailableError };
