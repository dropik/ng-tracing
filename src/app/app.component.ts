import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Camera } from './camera.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { RayTracingService } from './ray-tracing.service';
import { Material } from './material.model';
import { Sphere } from './sphere.model';
import { diffuseMap as clampColor, normalize } from './utils';

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
    materials: {},
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
    const plane1Id = this.guid();
    const plane1: Plane = {
      entityId: plane1Id,
      v0: { x: -1, y: 0, z: -0.5 },
      v1: { x: -1, y: 0, z: 2 },
      v2: { x: 1, y: 0, z: 2 },
      v3: { x: 0, y: 0, z: 0 },
      area: 0,
      n: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
    };
    const plane1Material: Material = {
      entityId: plane1Id,
      baseColor: clampColor({ r: 160, g: 160, b: 160 }),
      roughness: 0.5,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[plane1Id] = { name: "Bottom" };
    this.components.planes[plane1Id] = plane1;
    this.components.materials[plane1Id] = plane1Material;

    const plane2Id = this.guid();
    const plane2: Plane = {
      entityId: plane2Id,
      v0: { x: -0.8, y: 1.2, z: 2 },
      v1: { x: -0.8, y: 0, z: 2 },
      v2: { x: -0.8, y: 0, z: -0.5 },
      v3: { x: 0, y: 0, z: 0 },
      area: 0,
      n: { x: 0, y: 0, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
    };
    const plane2Material: Material = {
      entityId: plane2Id,
      baseColor: clampColor({ r: 130, g: 10, b: 10 }),
      roughness: 0.5,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[plane2Id] = { name: "Left" };
    this.components.planes[plane2Id] = plane2;
    this.components.materials[plane2Id] = plane2Material;

    const plane3Id = this.guid();
    const plane3: Plane = {
      entityId: plane3Id,
      v0: { x: -1, y: 0, z: 2 },
      v1: { x: -1, y: 1.2, z: 2 },
      v2: { x: 1, y: 1.2, z: 2 },
      v3: { x: 0, y: 0, z: 0 },
      area: 0,
      n: { x: 0, y: 0, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
    };
    const plane3Material: Material = {
      entityId: plane3Id,
      baseColor: clampColor({ r: 150, g: 150, b: 150 }),
      roughness: 0.5,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[plane3Id] = { name: "Back" };
    this.components.planes[plane3Id] = plane3;
    this.components.materials[plane3Id] = plane3Material;

    // const plane4Id = this.guid();
    // const plane4: Plane = {
    //   entityId: plane4Id,
    //   v0: { x: -1, y: 0.8, z: 2 },
    //   v1: { x: -1, y: 0.8, z: -0.5 },
    //   v2: { x: 1, y: 0.8, z: -0.5 },
    //   v3: { x: 0, y: 0, z: 0 },
    //   area: 0,
    //   n: { x: 0, y: 0, z: 0 },
    //   normal: { x: 1, y: 0, z: 0 },
    // };
    // const plane4Material: Material = {
    //   entityId: plane4Id,
    //   baseColor: clampColor({ r: 255, g: 255, b: 255 }),
    //   roughness: 0,
    //   metalness: 0,
    //   alpha: 0,
    //   alphaSquared: 0,
    //   specularF0: { r: 0, g: 0, b: 0 },
    //   shadowedF90: 0,
    //   diffuseReflectance: { r: 0, g: 0, b: 0 },
    // };
    // this.entities[plane4Id] = { name: "Top" };
    // this.components.planes[plane4Id] = plane4;
    // this.components.materials[plane4Id] = plane4Material;

    const plane5Id = this.guid();
    const plane5: Plane = {
      entityId: plane5Id,
      v0: { x: 0.8, y: 0, z: 2 },
      v1: { x: 0.8, y: 1.2, z: 2 },
      v2: { x: 0.8, y: 1.2, z: -0.5 },
      v3: { x: 0, y: 0, z: 0 },
      area: 0,
      n: { x: 0, y: 0, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
    };
    const plane5Material: Material = {
      entityId: plane5Id,
      baseColor: clampColor({ r: 10, g: 210, b: 10 }),
      roughness: 0.5,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[plane5Id] = { name: "Right" };
    this.components.planes[plane5Id] = plane5;
    this.components.materials[plane5Id] = plane5Material;

    const sphere1Id = this.guid();
    const shpere1: Sphere = { entityId: sphere1Id, center: { x: 0, y: 0.2, z: 0.6 }, radius: 0.2, r2: 0 };
    const sphere1Material: Material = {
      entityId: sphere1Id,
      baseColor: clampColor({ r: 180, g: 30, b: 20 }),
      roughness: 0.5,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[sphere1Id] = { name: "Sphere Red" };
    this.components.spheres[sphere1Id] = shpere1;
    this.components.materials[sphere1Id] = sphere1Material;

    const sphere2Id = this.guid();
    const shpere2: Sphere = { entityId: sphere2Id, center: { x: 0.45, y: 0.2, z: 0.6 }, radius: 0.2, r2: 0 };
    const sphere2Material: Material = {
      entityId: sphere2Id,
      baseColor: clampColor({ r: 30, g: 50, b: 150 }),
      roughness: 0,
      metalness: 0,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[sphere2Id] = { name: "Sphere Blue" };
    this.components.spheres[sphere2Id] = shpere2;
    this.components.materials[sphere2Id] = sphere2Material;

    const sphere3Id = this.guid();
    const shpere3: Sphere = { entityId: sphere3Id, center: { x: -0.45, y: 0.2, z: 0.6 }, radius: 0.2, r2: 0 };
    const sphere3Material: Material = {
      entityId: sphere3Id,
      baseColor: clampColor({ r: 180, g: 180, b: 180 }),
      roughness: 0.1,
      metalness: 0.9,
      alpha: 0,
      alphaSquared: 0,
      specularF0: { r: 0, g: 0, b: 0 },
      shadowedF90: 0,
      diffuseReflectance: { r: 0, g: 0, b: 0 },
    };
    this.entities[sphere3Id] = { name: "Sphere Metal" };
    this.components.spheres[sphere3Id] = shpere3;
    this.components.materials[sphere3Id] = sphere3Material;

    const lightId = this.guid();
    const light: DirectionalLight = {
      entityId: lightId,
      direction: { x: 0, y: -1, z: 1 },
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
      position: { x: 0, y: 0.5, z: -1.5 },
      direction: normalize({ x: 0, y: -0.15, z: 1 }),
      sensorWidth: 35,
      sensorHeight: 24,
      focalLength: 50,
      focus: 1.5,
      aperture: 1.4,
      shutter: 2000,
      iso: 200,
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
