"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./model-viewer-stage.module.css";

type ModelViewerStageProps = {
  modelUrl: string;
  posterUrl: string;
  title: string;
  autoRotate?: boolean;
};

export function ModelViewerStage({
  modelUrl,
  posterUrl,
  title,
  autoRotate = false,
}: ModelViewerStageProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    async function registerViewer() {
      await import("@google/model-viewer");

      if (!active || !viewerRef.current) {
        return;
      }

      const viewer = viewerRef.current;
      const handleLoad = () => setIsLoaded(true);
      const handleError = () => setIsLoaded(false);

      viewer.addEventListener("load", handleLoad);
      viewer.addEventListener("error", handleError);

      cleanup = () => {
        viewer.removeEventListener("load", handleLoad);
        viewer.removeEventListener("error", handleError);
      };
    }

    void registerViewer();

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.glow} />
      <model-viewer
        ref={viewerRef}
        className={styles.viewer}
        src={modelUrl}
        poster={posterUrl}
        alt={title}
        camera-controls="true"
        camera-orbit="30deg 78deg 120%"
        camera-target="0m 0.04m 0m"
        field-of-view="24deg"
        min-camera-orbit="auto 48deg auto"
        max-camera-orbit="auto 95deg auto"
        interaction-prompt="none"
        shadow-intensity="0.92"
        exposure="1.08"
        tone-mapping="commerce"
        auto-rotate={autoRotate ? "true" : undefined}
        auto-rotate-delay="1200"
      />
      <div className={`${styles.loadedState} ${isLoaded ? styles.visible : ""}`}>
        可旋转预览
      </div>
    </div>
  );
}
