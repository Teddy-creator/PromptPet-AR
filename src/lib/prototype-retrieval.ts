import { getPrototypeDescriptor, prototypeCatalog } from "./prototype-catalog";
import type {
  PromptSemanticContractV2,
  PrototypeCandidate,
  RetrievedPrototypeMatch,
  SemanticTrait,
} from "../types/prototype-traits";

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function computeTraitOverlap(
  canonicalTraits: SemanticTrait[],
  requestedTraits: SemanticTrait[],
) {
  return canonicalTraits.filter((trait) => requestedTraits.includes(trait));
}

function buildMatchReasons(options: {
  candidate?: PrototypeCandidate;
  matchedTokens: string[];
  matchedTraits: SemanticTrait[];
  referenceIds: string[];
}) {
  return uniqueStrings([
    options.candidate
      ? `candidate:${options.candidate.id}@${options.candidate.confidence.toFixed(2)}`
      : null,
    options.matchedTokens.length > 0 ? `tokens:${options.matchedTokens.join("/")}` : null,
    options.matchedTraits.length > 0 ? `traits:${options.matchedTraits.join("/")}` : null,
    options.referenceIds.length > 0 ? `refs:${options.referenceIds.join("/")}` : null,
  ]);
}

export function retrievePrototypeMatches(
  requestedNoun: string,
  prototypeCandidates: PrototypeCandidate[],
  traits: SemanticTrait[],
): RetrievedPrototypeMatch[] {
  const normalizedNoun = normalizeText(requestedNoun);
  const candidateMap = new Map(prototypeCandidates.map((candidate) => [candidate.id, candidate]));

  return prototypeCatalog
    .map((descriptor) => {
      const candidate = candidateMap.get(descriptor.id);
      const matchedTokens = descriptor.matchTokens.filter((token) =>
        normalizedNoun.includes(normalizeText(token)),
      );
      const matchedTraits = computeTraitOverlap(descriptor.canonicalTraits, traits);
      const candidateScore = candidate?.confidence ?? 0;
      const traitScore =
        descriptor.canonicalTraits.length > 0
          ? matchedTraits.length / descriptor.canonicalTraits.length
          : 0;
      const tokenScore = matchedTokens.length > 0 ? Math.min(0.18, matchedTokens.length * 0.08) : 0;
      const referenceBonus = Math.min(0.08, descriptor.referenceIds.length * 0.04);
      const score = Number(
        (candidateScore * 0.72 + traitScore * 0.18 + tokenScore + referenceBonus).toFixed(4),
      );

      return {
        prototypeId: descriptor.id,
        score,
        matchedTraits,
        referenceIds: [...descriptor.referenceIds],
        objectCategory: descriptor.objectCategory,
        familyHint: descriptor.familyHint,
        reasons: buildMatchReasons({
          candidate,
          matchedTokens,
          matchedTraits,
          referenceIds: descriptor.referenceIds,
        }),
      } satisfies RetrievedPrototypeMatch;
    })
    .filter((match) => match.score >= 0.2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function attachRetrievalMatchesToSemanticContracts(
  contracts: PromptSemanticContractV2[],
) {
  return contracts.map((contract) => ({
    ...contract,
    retrievalMatches: retrievePrototypeMatches(
      contract.requestedNoun,
      contract.prototypeCandidates,
      contract.traits,
    ),
  }));
}

export function getRetrievalReferenceIdsForPrototype(prototypeId: string) {
  return [...(getPrototypeDescriptor(prototypeId)?.referenceIds ?? [])];
}
