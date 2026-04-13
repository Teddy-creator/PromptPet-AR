import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        alt?: string;
        src?: string;
        poster?: string;
        exposure?: string;
        "tone-mapping"?: string;
        "shadow-intensity"?: string;
        "interaction-prompt"?: string;
        "camera-controls"?: string;
        "camera-orbit"?: string;
        "camera-target"?: string;
        "field-of-view"?: string;
        "min-camera-orbit"?: string;
        "max-camera-orbit"?: string;
        "auto-rotate"?: string;
        "auto-rotate-delay"?: string;
      };
    }
  }
}

export {};
