import type {
  GenerationArLinks,
  CreateGenerationInput,
  GenerationMetadata,
  PromptCustomizationRecipe,
  GenerationStatus,
  GeneratorAdapterKey,
  PersistedGenerationRecord,
} from "../generation-types";

export class GeneratorAdapterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratorAdapterUnavailableError";
  }
}

export type GeneratorAdapterCreateContext = CreateGenerationInput & {
  id: string;
  createdAtMs: number;
  customizations: PromptCustomizationRecipe;
};

export type GeneratorAdapterCreateResult = {
  name: string;
  modelUrl: string;
  posterUrl: string;
  metadata: GenerationMetadata;
  ar: GenerationArLinks;
  adapterState?: Record<string, unknown>;
};

export type GeneratorAdapterSyncResult = {
  record: PersistedGenerationRecord;
  changed: boolean;
};

export type GeneratorAdapter = {
  key: GeneratorAdapterKey;
  create(context: GeneratorAdapterCreateContext): Promise<GeneratorAdapterCreateResult>;
  getStatus(record: PersistedGenerationRecord): Promise<GenerationStatus>;
  syncRecord?(
    record: PersistedGenerationRecord,
  ): Promise<GeneratorAdapterSyncResult>;
};
