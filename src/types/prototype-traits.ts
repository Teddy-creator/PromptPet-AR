export const prototypeCandidateSources = [
  "llm",
  "rule-fallback",
  "retrieval",
] as const;

export type PrototypeCandidateSource = (typeof prototypeCandidateSources)[number];

export type PrototypeCandidate = {
  id: string;
  confidence: number;
  source: PrototypeCandidateSource;
};

export const semanticTraits = [
  "rigid",
  "soft",
  "open-top",
  "closed-top",
  "has-handle",
  "flat-face",
  "cylindrical",
  "micro-hangable",
  "chest-safe",
  "ear-safe",
] as const;

export type SemanticTrait = (typeof semanticTraits)[number];

export type RetrievedPrototypeMatch = {
  prototypeId: string;
  score: number;
  matchedTraits: SemanticTrait[];
  referenceIds: string[];
  objectCategory: string;
  familyHint?: string;
  reasons: string[];
};

export type PromptSemanticContractV2 = {
  requestId: string;
  requestedNoun: string;
  prototypeCandidates: PrototypeCandidate[];
  traits: SemanticTrait[];
  negativeLookalikes: string[];
  retrievalMatches?: RetrievedPrototypeMatch[];
};
