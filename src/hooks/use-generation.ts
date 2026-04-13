"use client";

import { useCallback, useEffect, useState } from "react";

import type { GenerationRecord } from "@/lib/generation-types";

export function useGeneration(
  id: string,
  pollUntilReady: boolean,
  initialGeneration?: GenerationRecord | null,
) {
  const [generation, setGeneration] = useState<GenerationRecord | null>(
    initialGeneration ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialGeneration ? false : true);

  const isTerminal =
    generation?.status === "ready" || generation?.status === "failed";

  const fetchGeneration = useCallback(async () => {
    try {
      const response = await fetch(`/api/generations/${id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | GenerationRecord
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "结果加载失败。");
        return;
      }

      setGeneration(payload);
      setError(null);
    } catch {
      setError("结果加载失败，请刷新再试。");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setGeneration(initialGeneration ?? null);
    setError(null);

    if (initialGeneration) {
      setIsLoading(false);

      if (initialGeneration.status !== "ready") {
        void fetchGeneration();
      }

      return;
    }

    setIsLoading(true);
    void fetchGeneration();
  }, [fetchGeneration, id, initialGeneration]);

  useEffect(() => {
    if (!pollUntilReady || isTerminal) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchGeneration();
    }, 1100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchGeneration, isTerminal, pollUntilReady]);

  return {
    generation,
    error,
    isLoading,
  };
}
