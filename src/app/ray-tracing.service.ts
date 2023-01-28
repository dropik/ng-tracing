import { Injectable } from '@angular/core';
import { Albedo } from './albedo.model';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { Sphere } from './sphere.model';
import { cMax, cMin, cMultiply, cProd, cross, dot, getUnitVector, vMultiply, vSub, vSum } from './utils';
import { Vector3 } from './vector3.model';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  public generateImage(viewportWidth: number, viewportHeight: number, entities: Dictionary<Entity>, components: Components): ImageData {
    const image = new ImageData(viewportWidth, viewportHeight);
    const data = image.data;

    if (Object.keys(components.lights).length === 0) {
      return image;
    }
    if (Object.keys(components.cameras).length === 0) {
      return image;
    }

		const camera: Camera = components.cameras[Object.keys(components.cameras)[0]];
    const light = components.lights[Object.keys(components.lights)[0]];
    const plane = components.planes[Object.keys(components.planes)[0]];

    const sensorWidthM = camera.sensorWidth / 1000;
    const sensorHeightM = camera.sensorHeight / 1000;
    const focalLengthM = camera.focalLength / 1000;
    camera.lensArea = Math.PI * Math.pow(focalLengthM / 2.0 / camera.aperture, 2);

    const yAxis: Vector3 = { x: 0, y: 1, z: 0 };
    const sensorXDirection = getUnitVector(cross(yAxis, camera.direction));
    const sensorYDirection = getUnitVector(cross(camera.direction, sensorXDirection));
    const focalPosition = vSum(camera.position, vMultiply(camera.direction, -focalLengthM));

    const cameraXStep = vMultiply(sensorXDirection, sensorWidthM / viewportWidth);
    const cameraYStep = vMultiply(sensorYDirection, -sensorHeightM / viewportHeight);

    let pixelRowStartPosition = vSum(camera.position, vSum(vMultiply(sensorXDirection, -sensorWidthM / 2), vMultiply(sensorYDirection, sensorHeightM / 2)));
    let dataIndex = 0;

    for (let i = 0; i < viewportHeight; i++) {
      let rayOrigin = pixelRowStartPosition;
      for (let j = 0; j < viewportWidth; j++) {
        const rayDirection = getUnitVector(vSub(rayOrigin, focalPosition));

        const hitResult = this._getHitEntityId(rayOrigin, rayDirection, plane, components.spheres, light);
        const color = this._getPixelColor(hitResult, components.albedos, light.intensity, camera);

        rayOrigin = vSum(rayOrigin, cameraXStep);
        data[dataIndex] = color.r;
        data[dataIndex + 1] = color.g;
        data[dataIndex + 2] = color.b;
        data[dataIndex + 3] = 255;
        dataIndex += 4;
      }
      pixelRowStartPosition = vSum(pixelRowStartPosition, cameraYStep);
    }

    return image;
  }

  private _getHitEntityId(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane, spheres: Dictionary<Sphere>, light: DirectionalLight): { hitId: string , normal: Vector3, lightDir: Vector3 } | undefined {
    let minHitDistance = Number.MAX_VALUE;
    let hitPoint: Vector3 = { x: 0, y: 0, z: 0 };
    let hitId: string | undefined = undefined;
    let normal: Vector3 = { x: 0, y: 0, z: 0 };

    // check for collision with plane
    const planeDistance = dot(vSub(plane.center, rayOrigin), plane.normal) / dot(rayDirection, plane.normal);
    if (planeDistance > 0) {
      minHitDistance = planeDistance;
      hitPoint = vSum(vSum(rayOrigin, vMultiply(rayDirection, planeDistance)), vMultiply(plane.normal, 0.000001));
      hitId = plane.entityId;
      normal = plane.normal;
    }

    // check for collision with spheres
    for (const sphereId in spheres) {
      const sphere = spheres[sphereId];

      const center = vSub(sphere.center, rayOrigin);
      const proj = dot(center, rayDirection);
      const d2 = dot(center, center) - proj * proj;
      const d = Math.sqrt(d2);
      if (d > sphere.radius) {
        continue;
      }
      const t = proj - Math.sqrt(sphere.radius * sphere.radius - d2);
      if (t < 0 || t > minHitDistance) {
        continue;
      }

      minHitDistance = t;
      hitPoint = vSum(rayOrigin, vMultiply(rayDirection, t));
      const rDir = getUnitVector(vSub(hitPoint, sphere.center));
      normal = rDir;
      hitPoint = vSum(hitPoint, vMultiply(rDir, 0.000001));
      hitId = sphere.entityId;
    }

    if (!hitId) {
      return undefined;
    }

    const lightDir = getUnitVector(vMultiply(light.direction, -1));

    // check hit point is obstacled from being lit by plane
    const planeAsLightObstacleDistance = dot(vSub(plane.center, hitPoint), plane.normal) / dot(lightDir, plane.normal);
    if (planeAsLightObstacleDistance >= 0) {
      return undefined;
    }

    // check if hit point is obstacled from being lit by spheres
    let isLit = true;
    for (const sphereId in spheres) {
      const sphere = spheres[sphereId];

      const center = vSub(sphere.center, hitPoint);
      const proj = dot(center, lightDir);
      const d2 = dot(center, center) - proj * proj;
      const d = Math.sqrt(d2);
      if (d > sphere.radius) {
        continue;
      }
      const thc = Math.sqrt(sphere.radius * sphere.radius - d2);
      const t0 = proj - thc;
      const t1 = proj + thc;
      if (t0 > 0 || t1 > 0) {
        isLit = false;
        break;
      }
    }

    if (!isLit) {
      return undefined;
    }

    return  { hitId, normal, lightDir };
  }

  private _getPixelColor(hitResult: { hitId: string, normal: Vector3, lightDir: Vector3 } | undefined, albedos: Dictionary<Albedo>, lightIntencity: number, camera: Camera): Color {
    if (!hitResult) {
      return { r: 0, g: 0, b: 0 };
    }

    const { hitId, normal, lightDir } = hitResult;

    const diffuse = albedos[hitId];
    if (!diffuse) {
      return { r: 0, g: 0, b: 0 };
    }

    const cosTerm = Math.max(dot(normal, lightDir), 0);
    const lights: Color = cMultiply({ r: 1, g: 1, b: 1 }, lightIntencity / 3);
    let incomingPower = cMultiply(cProd(lights, diffuse.color), cosTerm * camera.lensArea / camera.shutter * camera.iso);
    incomingPower = cMin(cMax(incomingPower, 0), 0.0001);
    return cProd({ r: 255, g: 255, b: 255 }, cMultiply(incomingPower, 10000));
  }
}
