function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function hasTimeoutFailure(snapshot) {
  return Array.isArray(snapshot?.qualityReport?.dominantFailureModes)
    ? snapshot.qualityReport.dominantFailureModes.includes("render-critique-timeout")
    : false;
}

function getControllerDirective(snapshot) {
  return snapshot?.qualityReport?.controllerDirective ??
    snapshot?.qualityReport?.visualCritiqueReport?.controllerDirective;
}

function getControllerFailureLayer(snapshot) {
  return snapshot?.qualityReport?.controllerFailureLayer ??
    snapshot?.qualityReport?.visualCritiqueReport?.controllerFailureLayer;
}

function getControllerStabilityScore(snapshot) {
  const directive = getControllerDirective(snapshot);
  const layer = getControllerFailureLayer(snapshot);

  if (directive === "escalate-capability" || layer === "stagnation") {
    return 0;
  }

  if (
    directive === "rebuild-geometry-contract" ||
    directive === "rebuild-assembly"
  ) {
    return 0.35;
  }

  if (directive === "re-run-host-fit") {
    return 0.55;
  }

  return 1;
}

function getVisualCritique(snapshot) {
  const report = snapshot?.qualityReport?.visualCritiqueReport;
  return report && typeof report === "object" ? report : null;
}

function getVisualAcceptanceScore(snapshot) {
  const report = getVisualCritique(snapshot);
  if (!report) {
    return 0;
  }

  return snapshot?.qualityReport?.visualAcceptanceGatePassed === true ||
    report.visualAcceptanceGatePassed === true
    ? 1
    : 0;
}

function getRenderNounFidelityScore(snapshot) {
  const report = getVisualCritique(snapshot);
  return numberOrZero(report?.renderNounFidelity ?? report?.nounFidelity);
}

function getSilhouetteReadabilityScore(snapshot) {
  const report = getVisualCritique(snapshot);
  return numberOrZero(report?.silhouetteReadability);
}

function isStagnatedSnapshot(snapshot) {
  const directive = getControllerDirective(snapshot);
  const layer = getControllerFailureLayer(snapshot);
  return directive === "escalate-capability" || layer === "stagnation";
}

function hasMeaningfulVisualImprovement(candidate, currentBest) {
  if (!candidate || !currentBest) {
    return false;
  }

  const qualityDelta =
    numberOrZero(candidate?.qualityReport?.qualityScore) -
    numberOrZero(currentBest?.qualityReport?.qualityScore);
  const renderDelta =
    getRenderNounFidelityScore(candidate) - getRenderNounFidelityScore(currentBest);
  const silhouetteDelta =
    getSilhouetteReadabilityScore(candidate) - getSilhouetteReadabilityScore(currentBest);
  const visualAcceptanceDelta =
    getVisualAcceptanceScore(candidate) - getVisualAcceptanceScore(currentBest);

  return qualityDelta >= 0.01 && (
    silhouetteDelta >= 0.015 ||
    renderDelta >= 0.015 ||
    visualAcceptanceDelta > 0
  );
}

function buildSnapshotPriority(snapshot) {
  return [
    snapshot?.qualityAccepted === true ? 1 : 0,
    snapshot?.qualityReport?.hardGatePassed === true ? 1 : 0,
    isStagnatedSnapshot(snapshot) ? 0 : 1,
    snapshot?.qualityReport?.renderCritiqueAvailable === true ? 1 : 0,
    hasTimeoutFailure(snapshot) ? 0 : 1,
    getVisualAcceptanceScore(snapshot),
    numberOrZero(snapshot?.qualityReport?.qualityScore),
    getRenderNounFidelityScore(snapshot),
    getSilhouetteReadabilityScore(snapshot),
    numberOrZero(snapshot?.qualityReport?.qualityMetrics?.criticalPartsPresent),
    getControllerStabilityScore(snapshot),
    arrayLength(snapshot?.createdNames),
    numberOrZero(snapshot?.passIndex),
  ];
}

export function shouldPreferExecutionSnapshot(candidate, currentBest) {
  if (!candidate) {
    return false;
  }

  if (!currentBest) {
    return true;
  }

  if (
    candidate?.qualityReport?.hardGatePassed === true &&
    currentBest?.qualityReport?.hardGatePassed === true &&
    isStagnatedSnapshot(candidate) &&
    !isStagnatedSnapshot(currentBest) &&
    hasMeaningfulVisualImprovement(candidate, currentBest)
  ) {
    return true;
  }

  const candidatePriority = buildSnapshotPriority(candidate);
  const currentPriority = buildSnapshotPriority(currentBest);

  for (let index = 0; index < candidatePriority.length; index += 1) {
    if (candidatePriority[index] === currentPriority[index]) {
      continue;
    }

    return candidatePriority[index] > currentPriority[index];
  }

  return false;
}

export function selectPreferredExecutionSnapshots(snapshots) {
  const preferredByExecutionId = new Map();

  for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
    const executionId =
      typeof snapshot?.execution?.executionId === "string"
        ? snapshot.execution.executionId
        : typeof snapshot?.executionId === "string"
          ? snapshot.executionId
          : null;

    if (!executionId) {
      continue;
    }

    const currentBest = preferredByExecutionId.get(executionId);
    if (shouldPreferExecutionSnapshot(snapshot, currentBest)) {
      preferredByExecutionId.set(executionId, snapshot);
    }
  }

  return preferredByExecutionId;
}
