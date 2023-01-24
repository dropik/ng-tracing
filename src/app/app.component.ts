import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { RayTracingService } from './ray-tracing.service';
import { Sphere } from './sphere.model';
import { getUnitVector } from './utils';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public readonly CANVAS_WIDTH = 560;
  public readonly CANVAS_HEIGHT = 384;

  public entities: Dictionary<Entity> = {};
  public components: Components = {
    cameras: {},
    lights: {},
    planes: {},
    spheres: {},
    colors: {},
  };
  public lastFrameTime = 0;
  public lastFps = 0;

  private secondStart = performance.now();
  private framesCount = 0;

  @ViewChild('viewport')
  canvas!: ElementRef<HTMLCanvasElement>;

  public constructor(private _rayTracingService: RayTracingService) {}

  ngOnInit(): void {
    // composing initial scene
    const planeId = this.guid();
    const plane: Plane = { center: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    const planeColor: Color = { r: 150, g: 150, b: 150 };
    this.entities[planeId] = { name: "Floor" };
    this.components.planes[planeId] = plane;
    this.components.colors[planeId] = planeColor;

    const sphere1Id = this.guid();
    const shpere1: Sphere = { center: { x: -3, y: 2, z: -1 }, radius: 1 };
    const sphere1Color: Color = { r: 255, g: 0, b: 0 };
    this.entities[sphere1Id] = { name: "Sphere 1" };
    this.components.spheres[sphere1Id] = shpere1;
    this.components.colors[sphere1Id] = sphere1Color;

    const sphere2Id = this.guid();
    const shpere2: Sphere = { center: { x: 2, y: 2, z: 3 }, radius: 2 };
    const sphere2Color: Color = { r: 0, g: 0, b: 255 };
    this.entities[sphere2Id] = { name: "Sphere 2" };
    this.components.spheres[sphere2Id] = shpere2;
    this.components.colors[sphere2Id] = sphere2Color;

    const lightId = this.guid();
    const light: DirectionalLight = { direction: { x: 1, y: -0.5, z: 1 }, intensity: 100 };
    const lightColor: Color = { r: 255, g: 255, b: 255 };
    this.entities[lightId] = { name: "Directional Light" };
    this.components.lights[lightId] = light;
    this.components.colors[lightId] = lightColor;

    const cameraId = this.guid();
    const camera: Camera = { position: { x: 0, y: 4, z: -12 }, direction: getUnitVector({ x: 0, y: -0.2, z: 1 }), sensorWidth: 35, sensorHeight: 24, focalLength: 35 };
    this.entities[cameraId] = { name: "Main Camera" };
    this.components.cameras[cameraId] = camera;

    this.secondStart = performance.now();
    setInterval(() => {
      if (!this.canvas.nativeElement) {
        return;
      }

      const ctx = this.canvas.nativeElement.getContext('2d');
      if (!ctx) {
        return;
      }

      const startTime = performance.now();
      const image = this._rayTracingService.generateImage(this.CANVAS_WIDTH, this.CANVAS_HEIGHT, this.entities, this.components);
      ctx.putImageData(image, 0, 0);
      const endTime = performance.now();

      this.lastFrameTime = endTime - startTime;
      this.framesCount++;
      if (endTime - this.secondStart >= 1000) {
        this.lastFps = this.framesCount;
        this.framesCount = 0;
        this.secondStart = endTime;
      }
    }, 0);
  }

  private guid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
