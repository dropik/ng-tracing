import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Albedo } from './albedo.model';
import { Camera } from './camera.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { RayTracingService } from './ray-tracing.service';
import { Sphere } from './sphere.model';
import { diffuseMap, getUnitVector } from './utils';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public readonly CANVAS_WIDTH = 560;
  public readonly CANVAS_HEIGHT = 384;
  public readonly SAMPLES_LIMIT = 2000000;

  public entities: Dictionary<Entity> = {};
  public components: Components = {
    cameras: {},
    lights: {},
    planes: {},
    spheres: {},
    colors: {},
    albedos: {},
  };
  public lastSampleTime = 0;
  public lastFps = 0;
  public samples = 0;
  public renderTime = 0;

  private secondStart = performance.now();
  private framesCount = 0;

  @ViewChild('viewport')
  canvas!: ElementRef<HTMLCanvasElement>;

  public constructor(private _rayTracingService: RayTracingService) {}

  ngOnInit(): void {
    // composing initial scene
    const planeId = this.guid();
    const plane: Plane = { entityId: planeId, center: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    const planeColor: Albedo = { entityId: planeId, color: diffuseMap({ r: 180, g: 180, b: 180 }) };
    this.entities[planeId] = { name: "Floor" };
    this.components.planes[planeId] = plane;
    this.components.albedos[planeId] = planeColor;

    const sphere1Id = this.guid();
    const shpere1: Sphere = { entityId: sphere1Id, center: { x: 0.2, y: 0.1, z: 0.1 }, radius: 0.1, r2: 0 };
    const sphere1Color: Albedo = { entityId: sphere1Id, color: diffuseMap({ r: 150, g: 30, b: 20 }) };
    this.entities[sphere1Id] = { name: "Sphere 1" };
    this.components.spheres[sphere1Id] = shpere1;
    this.components.albedos[sphere1Id] = sphere1Color;

    const sphere2Id = this.guid();
    const shpere2: Sphere = { entityId: sphere2Id, center: { x: 2.5, y: 2, z: 30 }, radius: 2, r2: 0 };
    const sphere2Color: Albedo = { entityId: sphere2Id, color: diffuseMap({ r: 30, g: 50, b: 150 }) };
    this.entities[sphere2Id] = { name: "Sphere 2" };
    this.components.spheres[sphere2Id] = shpere2;
    this.components.albedos[sphere2Id] = sphere2Color;

    const sphere3Id = this.guid();
    const shpere3: Sphere = { entityId: sphere3Id, center: { x: -0.3, y: 0.3, z: 0.6 }, radius: 0.3, r2: 0 };
    const sphere3Color: Albedo = { entityId: sphere3Id, color: diffuseMap({ r: 50, g: 150, b: 50 }) };
    this.entities[sphere3Id] = { name: "Sphere 3" };
    this.components.spheres[sphere3Id] = shpere3;
    this.components.albedos[sphere3Id] = sphere3Color;

    const lightId = this.guid();
    const light: DirectionalLight = {
      entityId: lightId,
      direction: { x: 1, y: -1, z: 1 },
      intensity: 1000,
      intensityMap: { r: 0, g: 0, b: 0 },
      lightDir: { x: 0, y: 0, z: 0 },
      diskAngle: 3,
      angleRadians: 0,
      halfAngleCos: 0,
      nt: { x: 0, y: 0, z: 0 },
      nb: { x: 0, y: 0, z: 0 },
    };
    this.entities[lightId] = { name: "Directional Light" };
    this.components.lights[lightId] = light;

    const cameraId = this.guid();
    const camera: Camera = {
      entityId: cameraId,
      position: { x: 0, y: 0.5, z: -1 },
      direction: getUnitVector({ x: 0, y: -0.15, z: 1 }),
      sensorWidth: 35,
      sensorHeight: 24,
      focalLength: 35,
      focus: 1,
      aperture: 1.4,
      shutter: 2000,
      iso: 100,
      lensArea: 0,
      lensRadius: 0,
    };
    this.entities[cameraId] = { name: "Main Camera" };
    this.components.cameras[cameraId] = camera;

    this._rayTracingService.setViewport(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    this.secondStart = performance.now();
    const interval = setInterval(() => {
      if (this.samples >= this.SAMPLES_LIMIT - 1) {
        clearInterval(interval);
      }

      if (!this.canvas.nativeElement) {
        return;
      }

      const ctx = this.canvas.nativeElement.getContext('2d');
      if (!ctx) {
        return;
      }

      const startTime = performance.now();
      const image = this._rayTracingService.getNewSample(this.samples + 1, this.components);
      ctx.putImageData(image, 0, 0);
      const endTime = performance.now();

      this.samples++;
      this.lastSampleTime = endTime - startTime;
      this.renderTime += this.lastSampleTime / 1000;
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
