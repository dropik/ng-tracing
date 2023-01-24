import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface Plane extends ComponentData {
  center: Vector3;
  normal: Vector3;
}
