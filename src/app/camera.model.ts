import { ComponentData } from "./component-data.model";
import { Vector3 } from "./vector3.model";

export interface Camera extends ComponentData {
  position: Vector3;
  direction: Vector3;
  sensorWidth: number;
  sensorHeight: number;
  focalLength: number;
  aperture: number;
  shutter: number;
  iso: number;
  lensArea: number;
}
