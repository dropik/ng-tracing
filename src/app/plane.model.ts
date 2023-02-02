import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface Plane extends ComponentData {
  v0: Vector3;
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  area: number;
  n: Vector3;
  normal: Vector3;  // normalized n
}
