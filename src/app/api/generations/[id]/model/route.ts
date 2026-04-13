import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getOutputDirectory } from "@/lib/generation-persistence";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const file = await readFile(path.join(getOutputDirectory(id), "model.glb"));

    return new NextResponse(file, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${id}.glb"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "没有找到导出的 GLB 文件。" },
      { status: 404 },
    );
  }
}
