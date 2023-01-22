import { Component, OnInit } from '@angular/core';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { Sphere } from './sphere.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public readonly CANVAS_WIDTH = 560;
  public readonly CANVAS_HEIGHT = 384;

  public entities: Dictionary<Entity> = {};

  ngOnInit(): void {
    // composing initial scene
    const planeId = this.guid();
    const plane: Plane = { p1: { x: -5, y: 0, z: -5 }, p2: { x: -5, y: 0, z: 5 }, p3: { x: 5, y: 0, z: 5 }}
    const planeColor: Color = { r: 150, g: 150, b: 150 };
    this.entities[planeId] = { name: "Floor", components: [plane, planeColor] };

    const sphere1Id = this.guid();
    const shpere1: Sphere = { center: { x: -3, y: 0.5, z: 1 }, radius: 1 };
    const sphere1Color: Color = { r: 255, g: 0, b: 0 };
    this.entities[sphere1Id] = { name: "Sphere 1", components: [shpere1, sphere1Color] };

    const sphere2Id = this.guid();
    const shpere2: Sphere = { center: { x: 2, y: 1, z: 3 }, radius: 2 };
    const sphere2Color: Color = { r: 0, g: 0, b: 255 };
    this.entities[sphere2Id] = { name: "Sphere 2", components: [shpere2, sphere2Color] };

    const lightId = this.guid();
    const light: DirectionalLight = { direction: { x: 1, y: -1, z: 1 }, intensity: 100 };
    const lightColor: Color = { r: 255, g: 255, b: 255 };
    this.entities[lightId] = { name: "Directional Light", components: [light, lightColor]};

    const cameraId = this.guid();
    const camera: Camera = { position: { x: 0, y: 3, z: -10 }, direction: { x: 0, y: -0.5, z: 1 }, sensorWidth: 0.000035, sensorHeight: 0.00024, focalLength: 0.000035 };
    this.entities[cameraId] = { name: "Main Camera", components: [camera] };
  }

  private guid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
