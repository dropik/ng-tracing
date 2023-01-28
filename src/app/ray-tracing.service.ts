import { Injectable } from '@angular/core';
import { Albedo } from './albedo.model';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Plane } from './plane.model';
import { Sphere } from './sphere.model';
import { cMax, cMin, cMultiply, cProd, cross, cSum, dot, getUnitVector, magnitude, vMultiply, vSub, vSum } from './utils';
import { Vector3 } from './vector3.model';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  private readonly INDIRECT_RAYS = 1000;

  public generateImage(viewportWidth: number, viewportHeight: number, components: Components): ImageData {
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

    light.lightDir = getUnitVector(vMultiply(light.direction, -1));
    light.intensityMap = cMultiply({ r: 1, g: 1, b: 1}, light.intensity / 3);

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

        let totalIncomingPower: Color = { r: 0, g: 0, b: 0 };

        const hitResult = this._getHitEntityId(rayOrigin, rayDirection, plane, components.spheres);
        if (hitResult) {
          const { hitId, hitPoint, normal } = hitResult;
          const isLitByDirectionalLight = this._checkIsLitByDirectionalLight(hitPoint, light, plane, components.spheres);
          if (isLitByDirectionalLight) {
            totalIncomingPower = cSum(totalIncomingPower, this._evaluateBRDF(normal, light.lightDir, light.intensityMap, components.albedos[hitId].color));
          }
          totalIncomingPower = cSum(totalIncomingPower, this._evaluateIndirectLight(hitPoint, normal, components.albedos[hitId].color, plane, components.spheres, light, components.albedos));
        }

        // accepting incoming light by camera
        let acceptedPower = cMultiply(totalIncomingPower, camera.lensArea / camera.shutter * camera.iso);
        acceptedPower = cMin(cMax(acceptedPower, 0), 0.0001);
        const color = cProd({ r: 255, g: 255, b: 255 }, cMultiply(acceptedPower, 10000));

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

  private _getHitEntityId(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane, spheres: Dictionary<Sphere>): { hitId: string, hitPoint: Vector3, normal: Vector3 } | undefined {
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

    return  { hitId, hitPoint, normal };
  }

  private _checkIsLitByDirectionalLight(hitPoint: Vector3, light: DirectionalLight, plane: Plane, spheres: Dictionary<Sphere>): boolean {
    // check hit point is obstacled from being lit by plane
    const planeAsLightObstacleDistance = dot(vSub(plane.center, hitPoint), plane.normal) / dot(light.lightDir, plane.normal);
    if (planeAsLightObstacleDistance >= 0) {
      return false;
    }

    // check if hit point is obstacled from being lit by spheres
    let isLit = true;
    for (const sphereId in spheres) {
      const sphere = spheres[sphereId];

      const center = vSub(sphere.center, hitPoint);
      const proj = dot(center, light.lightDir);
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

    return isLit;
  }

  // BRDF for given incoming light
  private _evaluateBRDF(normal: Vector3, lightDir: Vector3, lightIntensity: Color, diffuse: Color): Color {
    const cosTerm = Math.max(dot(normal, lightDir), 0);
    return cMultiply(cProd(lightIntensity, diffuse), cosTerm);
  }

  private _evaluateIndirectLight(
    point: Vector3,
    normal: Vector3,
    diffuse: Color,
    plane: Plane,
    spheres: Dictionary<Sphere>,
    light: DirectionalLight,
    albedos: Dictionary<Albedo>
  ): Color {
    let result: Color = { r: 0, g: 0, b: 0 };

    // normal is local y axis
    const xAxis = getUnitVector(cross({ x: 0.00001, y: 1, z: -0.000001 }, normal));
    const zAxis = getUnitVector(cross(xAxis, normal));

    for (let i = 0; i < this.INDIRECT_RAYS; i++) {
      const randomRadius = Math.random();
      const randomSin = Math.random() * 2 - 1;
      const randomCos = Math.random() * 2 - 1;

      const randomX = randomCos * randomRadius;
      const randomZ = randomSin * randomRadius;
      const randomY = Math.sqrt(1 - randomRadius * randomRadius);

      const direction = vSum(vSum(vMultiply(xAxis, randomX), vMultiply(normal, randomY)), vMultiply(zAxis, randomZ));
      const hitResult = this._getHitEntityId(point, direction, plane, spheres);
      if (hitResult) {
        const { hitId, hitPoint, normal: hitNormal } = hitResult;
        const isLitByDirectionalLight = this._checkIsLitByDirectionalLight(hitPoint, light, plane, spheres);
        if (isLitByDirectionalLight) {
          const reflectedIntencity = this._evaluateBRDF(hitNormal, light.lightDir, light.intensityMap, albedos[hitId].color);
          result = cSum(result, this._evaluateBRDF(normal, direction, reflectedIntencity, diffuse));
        }
      }
    }

    result = cMultiply(result, 1.0 / this.INDIRECT_RAYS);
    return result;
  }
}
