import { Camera } from "./camera.model";
import { Color } from "./color.model";
import { Dictionary } from "./dictionary.model";
import { DirectionalLight } from "./directional-light.model";
import { Plane } from "./plane.model";
import { Material } from "./material.model";
import { Sphere } from "./sphere.model";

export interface Components {
  cameras: Dictionary<Camera>;
  lights: Dictionary<DirectionalLight>;
  planes: Dictionary<Plane>;
  spheres: Dictionary<Sphere>;
  colors: Dictionary<Color>;
  materials: Dictionary<Material>;
}
