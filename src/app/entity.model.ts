import { ComponentData } from "./component-data.model";

export interface Entity {
  name: string;
  components: ComponentData[];
}
