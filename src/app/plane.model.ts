import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface Plane extends ComponentData {
  p1: Vector3;
  p2: Vector3;
  p3: Vector3;
}
