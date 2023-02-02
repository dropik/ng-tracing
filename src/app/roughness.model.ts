import { Color } from "./color.model";
import { ComponentData } from "./component-data.model";

export interface Roughness extends ComponentData {
  value: number;
  alpha: number;
  alphaSquared: number;
  specularF0: Color;
  shadowedF90: number;
}
