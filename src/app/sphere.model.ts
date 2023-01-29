import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface Sphere extends ComponentData {
  center: Vector3;
  radius: number;
  r2: number;
}
