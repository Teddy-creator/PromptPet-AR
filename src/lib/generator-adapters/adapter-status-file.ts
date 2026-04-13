import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  GenerationStatus,
  GeneratorAdapterKey,
} from "../generation-types";
import { generationStatuses } from "../generation-types";

export type AdapterStatusSignal = {
  version: 1;
  adapterKey: GeneratorAdapterKey;
  status: GenerationStatus;
  updatedAt: string;
  message?: string;
  errorMessage?: string;
  name?: string;
  ar?: {
    androidUrl: string;
    iosUrl: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGenerationStatus(value: unknown): value is GenerationStatus {
  return (
    typeof value === "string" &&
    generationStatuses.includes(value as GenerationStatus)
  );
}

function normalizeAdapterStatusSignal(value: unknown): AdapterStatusSignal | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== 1 ||
    value.adapterKey !== "blender-mcp" ||
    !isGenerationStatus(value.status) ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const ar = isRecord(value.ar)
    ? {
        androidUrl:
          typeof value.ar.androidUrl === "string" ? value.ar.androidUrl : "",
        iosUrl: typeof value.ar.iosUrl === "string" ? value.ar.iosUrl : "",
      }
    : undefined;

  return {
    version: 1,
    adapterKey: "blender-mcp",
    status: value.status,
    updatedAt: value.updatedAt,
    message: typeof value.message === "string" ? value.message : undefined,
    errorMessage:
      typeof value.errorMessage === "string" ? value.errorMessage : undefined,
    name: typeof value.name === "string" ? value.name : undefined,
    ar,
  };
}

export function getAdapterStatusFileAbsolutePath(id: string) {
  return path.join(
    process.cwd(),
    "output",
    "mock-generations",
    id,
    "adapter-status.json",
  );
}

export async function writeAdapterStatusSignal(
  id: string,
  signal: AdapterStatusSignal,
) {
  const filePath = getAdapterStatusFileAbsolutePath(id);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(signal, null, 2), "utf8");
}

export async function readAdapterStatusSignal(id: string) {
  try {
    const file = await readFile(getAdapterStatusFileAbsolutePath(id), "utf8");

    return normalizeAdapterStatusSignal(JSON.parse(file));
  } catch {
    return null;
  }
}
