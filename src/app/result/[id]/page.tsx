import type { Metadata } from "next";

import { ResultExperience } from "@/components/result-experience";
import { getGenerationById } from "@/lib/generation-service";

type ResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: ResultPageProps): Promise<Metadata> {
  const { id } = await params;
  const generation = await getGenerationById(id);

  if (!generation) {
    return {
      title: "结果未找到",
      description: "这个 PromptPet-AR 结果还没有准备好。",
    };
  }

  return {
    title: generation.name,
    description: generation.prompt,
    openGraph: {
      title: `${generation.name} · PromptPet-AR`,
      description: generation.prompt,
      images: [generation.posterUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: `${generation.name} · PromptPet-AR`,
      description: generation.prompt,
      images: [generation.posterUrl],
    },
  };
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const generation = await getGenerationById(id);

  return <ResultExperience id={id} initialGeneration={generation} />;
}
