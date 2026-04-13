import { NextResponse } from "next/server";

import { getGenerationById } from "@/lib/generation-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const generation = await getGenerationById(id);

  if (!generation) {
    return NextResponse.json(
      { error: "没有找到这个召唤结果。" },
      { status: 404 },
    );
  }

  return NextResponse.json(generation);
}
