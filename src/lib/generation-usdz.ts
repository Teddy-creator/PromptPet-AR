import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";

import { foxBaseContract } from "./fox-base-contract";
import { getOutputDirectory, loadGenerationRecord } from "./generation-persistence";

const mockUsdzPath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  foxBaseContract.demoFiles.usdzPath,
);

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveUsdzSourcePath(id: string) {
  const generatedUsdzPath = path.join(getOutputDirectory(id), "model.usdz");

  if (await fileExists(generatedUsdzPath)) {
    return generatedUsdzPath;
  }

  const record = await loadGenerationRecord(id);

  if (record?.adapterKey === "mock" && (await fileExists(mockUsdzPath))) {
    return mockUsdzPath;
  }

  return null;
}
