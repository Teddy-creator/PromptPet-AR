import foxBaseContractJson from "../../assets/fox-base/fox-base-v10.contract.json";

type Vector3 = [number, number, number];

type FoxBaseAssetContract = {
  assetContractFile: string;
  speciesKey: string;
  supportedSpecies: string[];
  displayName: string;
  templateVersion: string;
  generatorMode: string;
  productCopy: {
    supportedSpeciesLine: string;
    scopeLine: string;
  };
  sourceBlendFile: string;
  exportFiles: {
    modelFile: string;
    runtimeTemplateFile?: string;
    usdFile: string;
    usdzFile: string;
    posterFile: string;
    stageFile: string;
  };
  demoFiles: {
    modelPath: string;
    usdzPath: string;
    posterPath: string;
    modelUrl: string;
    usdzUrl: string;
    posterUrl: string;
  };
  assetExportScaleFactor?: number;
  assetExportFacingRotation?: Vector3;
  recipeDefaults: {
    archetype: string;
    cameraPreset: string;
    posePreset: string;
    arPlacementPreset: string;
    exportScaleFactor: number;
    exportFacingRotation: Vector3;
    stageCameraLocation: Vector3;
    stageCameraRotation: Vector3;
    stageCameraFocalLength: number;
    renderExposure: number;
    renderGamma: number;
  };
  posterRender: {
    resolutionX: number;
    resolutionY: number;
    samples: number;
    fileFormat: string;
    colorMode: string;
    transparent: boolean;
  };
  objects: Record<string, string>;
  stageObjects: Record<string, string>;
  sourceMaterials: Record<string, string>;
  promptControls: string[];
};

export const foxBaseContract =
  foxBaseContractJson as unknown as FoxBaseAssetContract;

export const currentSpeciesKey = foxBaseContract.speciesKey;
export const currentSupportedSpecies = foxBaseContract.supportedSpecies;
export const currentTemplateVersion = foxBaseContract.templateVersion;
export const currentCameraPreset = foxBaseContract.recipeDefaults.cameraPreset;
export const currentPosePreset = foxBaseContract.recipeDefaults.posePreset;
export const currentArPlacementPreset =
  foxBaseContract.recipeDefaults.arPlacementPreset;
export const foxBaseDemoModelUrl = foxBaseContract.demoFiles.modelUrl;
export const foxBaseDemoPosterUrl = foxBaseContract.demoFiles.posterUrl;
export const foxBaseDemoUsdzUrl = foxBaseContract.demoFiles.usdzUrl;
export const supportedSpeciesLine =
  foxBaseContract.productCopy.supportedSpeciesLine;
export const promptScopeLine = foxBaseContract.productCopy.scopeLine;
