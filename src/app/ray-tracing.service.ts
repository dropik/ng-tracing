import { Injectable } from '@angular/core';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Entity } from './entity.model';
import { Plane } from './plane.model';
import { Sphere } from './sphere.model';
import { cross, dot, getUnitVector, magnitude, vScalarProduct, vSub, vSum } from './utils';
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

    const sensorWidthM = camera.sensorWidth / 1000000;
    const sensorHeightM = camera.sensorHeight / 1000000;
    const focalLengthM = camera.focalLength / 1000000;

    const yAxis: Vector3 = { x: 0, y: 1, z: 0 };
    const sensorXDirection = getUnitVector(cross(yAxis, camera.direction));
    const sensorYDirection = getUnitVector(cross(camera.direction, sensorXDirection));
    const focalPosition = vSum(camera.position, vScalarProduct(camera.direction, -focalLengthM));

    const cameraXStep = vScalarProduct(sensorXDirection, sensorWidthM / viewportWidth);
    const cameraYStep = vScalarProduct(sensorYDirection, -sensorHeightM / viewportHeight);

    let pixelRowStartPosition = vSum(camera.position, vSum(vScalarProduct(sensorXDirection, -sensorWidthM / 2), vScalarProduct(sensorYDirection, sensorHeightM / 2)));
    let dataIndex = 0;

    for (let i = 0; i < viewportHeight; i++) {
      let rayOrigin = pixelRowStartPosition;
      for (let j = 0; j < viewportWidth; j++) {
        const rayDirection = getUnitVector(vSub(rayOrigin, focalPosition));

        const color = this._getPixelColor(rayOrigin, rayDirection, plane, components.spheres, light);

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

  private _getPixelColor(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane, spheres: Dictionary<Sphere>, light: DirectionalLight): Color {
    let minHitDistance = Number.MAX_VALUE;
    let hitSomething = false;
    let hitPlane = false;
    let hitPoint: Vector3 = { x: 0, y: 0, z: 0 };

    // check for collision with plane
    const planeDistance = dot(vSub(plane.center, rayOrigin), plane.normal) / dot(rayDirection, plane.normal);
    if (planeDistance > 0) {
      minHitDistance = planeDistance;
      hitSomething = true;
      hitPlane = true;
      hitPoint = vSum(vSum(rayOrigin, vScalarProduct(rayDirection, planeDistance)), vScalarProduct(plane.normal, 0.000001));
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
      hitSomething = true;
      hitPlane = false;
      hitPoint = vSum(rayOrigin, vScalarProduct(rayDirection, t));
      const rDir = getUnitVector(vSub(hitPoint, sphere.center));
      hitPoint = vSum(hitPoint, vScalarProduct(rDir, 0.000001));
    }

    if (!hitSomething) {
      return { r: 0, g: 0, b: 0 };
    }

    const lightDirection = getUnitVector(vScalarProduct(light.direction, -1));

    // check hit point is obstacled from being lit by plane
    const planeAsLightObstacleDistance = dot(vSub(plane.center, hitPoint), plane.normal) / dot(lightDirection, plane.normal);
    if (planeAsLightObstacleDistance >= 0) {
      return { r: 0, g: 0, b: 0 };
    }

    // check if hit point is obstacled from being lit by spheres
    let isLit = true;
    for (const sphereId in spheres) {
      const sphere = spheres[sphereId];

      const center = vSub(sphere.center, hitPoint);
      const proj = dot(center, lightDirection);
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
      return { r: 0, g: 0, b: 0 };
    }

    return hitPlane ? { r: 160, g: 160, b: 160 } : { r: 255, g: 255, b: 255 };
  }
}
