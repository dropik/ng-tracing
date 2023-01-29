import { Color } from "./color.model";
import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface DirectionalLight extends ComponentData {
  direction: Vector3;
  intensity: number;
  intensityMap: Color;
  lightDir: Vector3;
  diskAngle: number;
  angleRadians: number;
}
