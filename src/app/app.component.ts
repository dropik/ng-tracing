import { Component, OnInit } from '@angular/core';

interface ComponentData {}

interface Dictionary<T> {
  [key: string]: T;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Color extends ComponentData {
  r: number;
  g: number;
  b: number;
}

interface Sphere extends ComponentData {
  center: Vector3;
  radius: number;
}

interface Plane extends ComponentData {
  p1: Vector3;
  p2: Vector3;
  p3: Vector3;
}

interface DirectionalLight extends ComponentData {
  direction: Vector3;
  intensity: number;
  color: Color;
}

interface Entity {
  name: string;
  components: ComponentData[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public readonly CANVAS_WIDTH = 600;
  public readonly CANVAS_HEIGHT = 400;

  public entities: Dictionary<Entity> = {};
  public planes: Dictionary<Plane> = {};
  public colors: Dictionary<Color> = {};
  public spheres: Dictionary<Sphere> = {};

  ngOnInit(): void {
    // composing initial scene
    const planeId = this.guid();
    const plane: Plane = { p1: { x: -5, y: 0, z: -5 }, p2: { x: -5, y: 0, z: 5 }, p3: { x: 5, y: 0, z: 5 }}
    this.planes[planeId] = plane;
    const planeColor: Color = { r: 150, g: 150, b: 150 };
    this.colors[planeId] = planeColor;
    this.entities[planeId] = { name: "Floor", components: [plane, planeColor] };

    const sphere1Id = this.guid();
    const shpere1: Sphere = { center: { x: -3, y: 0.5, z: 1 }, radius: 1 };
    this.spheres[sphere1Id] = shpere1;
    const sphere1Color: Color = { r: 255, g: 0, b: 0 };
    this.colors[sphere1Id] = sphere1Color;
    this.entities[sphere1Id] = { name: "Sphere 1", components: [shpere1, sphere1Color] };

    const sphere2Id = this.guid();
    const shpere2: Sphere = { center: { x: 2, y: 1, z: 3 }, radius: 2 };
    this.spheres[sphere2Id] = shpere2;
    const sphere2Color: Color = { r: 0, g: 0, b: 255 };
    this.colors[sphere2Id] = sphere2Color;
    this.entities[sphere2Id] = { name: "Sphere 2", components: [shpere2, sphere2Color] };
  }

  private guid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
