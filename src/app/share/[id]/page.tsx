import type { Metadata } from "next";

import { ShareExperience } from "@/components/share-experience";
import { getGenerationById } from "@/lib/generation-service";

type SharePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const generation = await getGenerationById(id);

  if (!generation) {
    return {
      title: "分享页未找到",
      description: "这个 PromptPet-AR 分享页还没有准备好。",
    };
  }

  return {
    title: `${generation.name} 分享页`,
    description: generation.prompt,
    openGraph: {
      title: `${generation.name} 分享页 · PromptPet-AR`,
      description: generation.prompt,
      images: [generation.posterUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: `${generation.name} 分享页 · PromptPet-AR`,
      description: generation.prompt,
      images: [generation.posterUrl],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const generation = await getGenerationById(id);

  return <ShareExperience id={id} initialGeneration={generation} />;
}
