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
    const file = await readFile(path.join(getOutputDirectory(id), "thumbnail.png"));

    return new NextResponse(file, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${id}-thumbnail.png"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "没有找到导出的封面图。" },
      { status: 404 },
    );
  }
}
