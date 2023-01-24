import { Color } from "./color.model";
import { ComponentData } from "./component-data.model";

export interface Albedo extends ComponentData {
  color: Color;
}
