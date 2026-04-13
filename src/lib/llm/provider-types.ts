export type LlmRole = "semantic" | "design" | "vision";

export type LlmProvider = "openai" | "deepseek";

export type LlmRequestConfig = {
  provider?: LlmProvider;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export type PersistedLlmRequestConfig = Omit<LlmRequestConfig, "apiKey">;

export type LlmCredentialSource =
  | "SEMANTIC_API_KEY"
  | "DESIGN_API_KEY"
  | "VISION_API_KEY"
  | "LLM_API_KEY"
  | "DEEPSEEK_API_KEY"
  | "OPENAI_COMPAT_API_KEY"
  | "OPENAI_API_KEY";

export type ResolvedLlmCredential = {
  apiKey: string;
  source: LlmCredentialSource;
};

export type LlmProviderConfig = {
  role: LlmRole;
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  credentialSource: LlmCredentialSource;
};
