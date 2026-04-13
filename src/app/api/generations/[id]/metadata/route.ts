import { NextResponse } from "next/server";

import { getGenerationMetadataById } from "@/lib/generation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const metadata = await getGenerationMetadataById(id);

  if (!metadata) {
    return NextResponse.json(
      { error: "没有找到 metadata。" },
      { status: 404 },
    );
  }

  return NextResponse.json(metadata, {
    headers: {
      "Content-Disposition": `inline; filename="${id}-metadata.json"`,
    },
  });
}
