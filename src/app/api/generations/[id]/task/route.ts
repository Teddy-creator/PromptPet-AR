import { NextResponse } from "next/server";

import { getGenerationTaskById } from "@/lib/generation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const task = await getGenerationTaskById(id);

  if (!task) {
    return NextResponse.json(
      { error: "没有找到 task manifest。" },
      { status: 404 },
    );
  }

  return NextResponse.json(task, {
    headers: {
      "Content-Disposition": `inline; filename="${id}-task.json"`,
    },
  });
}
