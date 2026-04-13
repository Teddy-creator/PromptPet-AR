export type SceneViewerLaunchMode =
  | "3d_preferred"
  | "3d_only"
  | "ar_preferred"
  | "ar_only";

type BuildSceneViewerIntentUrlInput = {
  modelUrl: string;
  title: string;
  fallbackUrl: string;
  mode?: SceneViewerLaunchMode;
  intentVersion?: "1.0" | "1.1" | "1.2";
  packageName?: "com.google.android.googlequicksearchbox" | "com.google.ar.core";
  disableOcclusion?: boolean;
};

export function buildSceneViewerIntentUrl({
  modelUrl,
  title,
  fallbackUrl,
  mode = "ar_preferred",
  intentVersion = "1.2",
  packageName = "com.google.android.googlequicksearchbox",
  disableOcclusion = true,
}: BuildSceneViewerIntentUrlInput) {
  const query = new URLSearchParams();

  query.set("mode", mode);
  query.set("title", title);
  query.set("file", modelUrl);

  if (disableOcclusion) {
    query.set("disable_occlusion", "true");
  }

  return `intent://arvr.google.com/scene-viewer/${intentVersion}?${query.toString()}#Intent;scheme=https;package=${packageName};action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
    fallbackUrl,
  )};end;`;
}
