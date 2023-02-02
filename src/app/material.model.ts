import { Color } from "./color.model";
import { ComponentData } from "./component-data.model";

export interface Material extends ComponentData {
  baseColor: Color;
  roughness: number;
  metalness: number;
  alpha: number;
  alphaSquared: number;
  specularF0: Color;
  shadowedF90: number;
  diffuseReflectance: Color;
}
