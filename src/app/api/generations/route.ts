import { NextResponse } from "next/server";

import { createGeneration } from "@/lib/generation-service";
import { validateGenerationInput } from "@/lib/generation-validation";
import { GeneratorAdapterUnavailableError } from "@/lib/generator-adapters";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const validation = validateGenerationInput(payload);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status },
    );
  }

  try {
    const generation = await createGeneration(validation.data);

    return NextResponse.json(generation, { status: 201 });
  } catch (error) {
    if (error instanceof GeneratorAdapterUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }

    throw error;
  }
}
