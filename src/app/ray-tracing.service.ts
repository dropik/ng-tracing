import { Injectable } from '@angular/core';
import { Albedo } from './albedo.model';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Plane } from './plane.model';
import { Sphere } from './sphere.model';
import { cMax, cMin, cMultiply, cProd, cross, cSum, dot, getUnitVector, vMultiply, vSub, vSum } from './utils';
import { Vector3 } from './vector3.model';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  private readonly BOUNCES = 10;

	private _powersBuffer: Float64Array = new Float64Array();
  private _viewportWidth: number = 0;
  private _viewportHeight: number = 0;

  public setViewport(viewportWidth: number, viewportHeight: number): void {
    this._viewportWidth = viewportWidth;
    this._viewportHeight = viewportHeight;

    this._powersBuffer = new Float64Array(viewportWidth * viewportHeight * 3);
    let id = 0;
    for (let i = 0; i < viewportHeight; i++) {
      for (let j = 0; j < viewportWidth; j++) {
        this._powersBuffer[id] = 0;
        this._powersBuffer[id + 1] = 0;
        this._powersBuffer[id + 2] = 0;
        id += 3;
      }
    }
  }

  public getNewSample(samples: number, components: Components): ImageData {
    const image = new ImageData(this._viewportWidth, this._viewportHeight);
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
    const cameraSamplePdf = camera.aperture / Math.PI / focalLengthM;

    light.lightDir = getUnitVector(vMultiply(light.direction, -1));
    light.angleRadians = light.diskAngle * Math.PI / 180.0;
    light.intensityMap = cMultiply({ r: 1, g: 1, b: 1}, light.intensity / 3 * light.angleRadians);

    const yAxis: Vector3 = { x: 0, y: 1, z: 0 };
    const sensorXDirection = getUnitVector(cross(yAxis, camera.direction));
    const sensorYDirection = getUnitVector(cross(camera.direction, sensorXDirection));

    const cameraXStep = vMultiply(sensorXDirection, sensorWidthM / this._viewportWidth);
    const cameraYStep = vMultiply(sensorYDirection, -sensorHeightM / this._viewportHeight);

    let pixelRowStartPosition = vSum(camera.position, vSum(vMultiply(sensorXDirection, -sensorWidthM / 2), vMultiply(sensorYDirection, sensorHeightM / 2)));
    pixelRowStartPosition = vSum(pixelRowStartPosition, vMultiply(camera.direction, -focalLengthM));
    let dataIndex = this._viewportWidth * this._viewportHeight * 4 - 4;
    let bufIndex = this._viewportWidth * this._viewportHeight * 3 - 3;

    for (let i = this._viewportHeight - 1; i >= 0; i--) {
      let rayOrigin = pixelRowStartPosition;
      for (let j = this._viewportWidth - 1; j >= 0; j--) {
        const focalDirection = getUnitVector(vSub(camera.position, rayOrigin));

        const lensPointSample = this._generateCameraLensPointSample(camera);
        const lensPoint = vSum(camera.position, vSum(vMultiply(sensorXDirection, lensPointSample.x), vMultiply(sensorYDirection, lensPointSample.y)));

        const convergencePoint = vSum(camera.position, vMultiply(focalDirection, camera.focus));
        const rayDirection = getUnitVector(vSub(convergencePoint, lensPoint));

        const samplePower = this._castRay(lensPoint, rayDirection, plane, components.spheres, light, components.albedos);
        const prevPower: Color = { r: this._powersBuffer[bufIndex], g: this._powersBuffer[bufIndex + 1], b: this._powersBuffer[bufIndex + 2] };
				const powerSum = cSum(cMultiply(prevPower, samples - 1), cMultiply(samplePower, cameraSamplePdf));
				const totalPower = cMultiply(powerSum, 1.0 / samples);
        this._powersBuffer[bufIndex] = totalPower.r;
        this._powersBuffer[bufIndex + 1] = totalPower.g;
        this._powersBuffer[bufIndex + 2] = totalPower.b;

        // accepting incoming light by camera
        let acceptedPower = cMultiply(totalPower, camera.lensArea / camera.shutter * camera.iso);
        acceptedPower = cMin(cMax(acceptedPower, 0), 0.001);
        const color = cProd({ r: 255, g: 255, b: 255 }, cMultiply(acceptedPower, 1000));

        data[dataIndex] = color.r;
        data[dataIndex + 1] = color.g;
        data[dataIndex + 2] = color.b;
        data[dataIndex + 3] = 255;

        rayOrigin = vSum(rayOrigin, cameraXStep);
        dataIndex -= 4;
        bufIndex -= 3;
      }
      pixelRowStartPosition = vSum(pixelRowStartPosition, cameraYStep);
    }

    return image;
  }

  // recursively cast rays until bounces limit reached
  private _castRay(
    rayOrigin: Vector3,
    rayDirection: Vector3,
    plane: Plane,
    spheres: Dictionary<Sphere>,
    light: DirectionalLight,
    albedos: Dictionary<Albedo>,
    bounce = 0
  ): Color {
    let result: Color = { r: 0, g: 0, b: 0 };

    const hitResult = this._getHitEntityId(rayOrigin, rayDirection, plane, spheres);
    if (!hitResult) {
      return result;
    }

    const { hitId, hitPoint, normal: hitNormal } = hitResult;
    const diffuse = albedos[hitId].color;
    const lightDirectionSample = this._generateSampleWithinAngle(light.angleRadians);
    const lightDirectionCoordinates = this._getNormalCoordinates(light.direction);
    const ldWorldSample = this._getWorldSample(lightDirectionSample, light.lightDir, lightDirectionCoordinates.nt, lightDirectionCoordinates.nb);
    if (this._checkIsLitByDirectionalLight(hitPoint, ldWorldSample, plane, spheres)) {
      result = cSum(result, this._evaluateBRDF(hitNormal, light.lightDir, light.intensityMap, diffuse));
    }

    if (bounce >= this.BOUNCES) {
      return result;
    }

    // normal is local y axis
    const { nt, nb } = this._getNormalCoordinates(hitNormal);
    let indirectResult: Color = { r: 0, g: 0, b: 0 };
    const sample = this._generateLocalSample();
    const sampleWorld = this._getWorldSample(sample, hitNormal, nt, nb);

    const reflectedIntencity = this._castRay(hitPoint, sampleWorld, plane, spheres, light, albedos, bounce + 1);
    indirectResult = cSum(indirectResult, this._evaluateBRDF(hitNormal, sampleWorld, reflectedIntencity, diffuse));

    result = cSum(result, cMultiply(indirectResult, 2 * Math.PI));
    return result;
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

  private _checkIsLitByDirectionalLight(hitPoint: Vector3, lightDir: Vector3, plane: Plane, spheres: Dictionary<Sphere>): boolean {
    // check hit point is obstacled from being lit by plane
    const planeAsLightObstacleDistance = dot(vSub(plane.center, hitPoint), plane.normal) / dot(lightDir, plane.normal);
    if (planeAsLightObstacleDistance >= 0) {
      return false;
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

    return isLit;
  }

  // BRDF for given incoming light
  private _evaluateBRDF(normal: Vector3, lightDir: Vector3, lightIntensity: Color, diffuse: Color): Color {
    const cosTerm = Math.max(dot(normal, lightDir), 0);
    return cMultiply(cProd(lightIntensity, diffuse), cosTerm);
  }

  private _getNormalCoordinates(normal: Vector3): { nt: Vector3, nb: Vector3 } {
    const nt: Vector3 = getUnitVector(cross({ x: Math.random(), y: Math.random(), z: Math.random() }, normal));
    const nb = cross(nt, normal);
    return { nt, nb };
  }

  private _generateLocalSample(): Vector3 {
    const r1 = Math.random();     // cosTheta
    const r2 = Math.random();
    const sinTheta = Math.sqrt(1 - r1 * r1);
    const phi = 2 * Math.PI * r2;
    const x = sinTheta * Math.cos(phi);
    const z = sinTheta * Math.sin(phi);
    return { x: x, y: r1, z: z };
  }

  private _generateSampleWithinAngle(angleRadians: number): Vector3 {
    const r1 = Math.random();
    const r2 = Math.random();
    const halfAngleCos = Math.cos(angleRadians / 2);
    const y = r1 * (1 - halfAngleCos) + halfAngleCos;
    const sinTheta = Math.sqrt(1 - y * y);
    const phi = (Math.PI - angleRadians) / 2 + r2 * angleRadians;
    const x = sinTheta * Math.cos(phi);
    const z = sinTheta * Math.sin(phi);
    return { x, y, z };
  }

  private _generateCameraLensPointSample(camera: Camera): { x: number, y: number } {
    const r1 = Math.random();
    const r2 = Math.random();
    const r = r1 * camera.focalLength * 0.0005 / camera.aperture;
    const phi = r2 * 2.0 * Math.PI;
    return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
  }

  private _getWorldSample(sample: Vector3, n: Vector3, nt: Vector3, nb: Vector3): Vector3 {
    return {
      x: sample.x * nt.x + sample.y * n.x + sample.z * nb.x,
      y: sample.x * nt.y + sample.y * n.y + sample.z * nb.y,
      z: sample.x * nt.z + sample.y * n.z + sample.z * nb.z,
    };
  }
}
