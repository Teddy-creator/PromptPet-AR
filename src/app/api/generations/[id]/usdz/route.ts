import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { resolveUsdzSourcePath } from "@/lib/generation-usdz";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const sourcePath = await resolveUsdzSourcePath(id);

    if (!sourcePath) {
      throw new Error("missing usdz");
    }

    const file = await readFile(sourcePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "model/vnd.usdz+zip",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${id}.usdz"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "还没有找到可用于 Quick Look 的 USDZ 文件。" },
      { status: 404 },
    );
  }
}
