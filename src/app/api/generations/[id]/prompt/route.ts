import { NextResponse } from "next/server";

import { getGenerationPromptById } from "@/lib/generation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const prompt = await getGenerationPromptById(id);

  if (!prompt) {
    return NextResponse.json(
      { error: "没有找到 prompt 文本。" },
      { status: 404 },
    );
  }

  return new NextResponse(prompt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="${id}-prompt.txt"`,
    },
  });
}
