import { Injectable } from '@angular/core';
import { Camera } from './camera.model';
import { Color } from './color.model';
import { Components } from './components.model';
import { Dictionary } from './dictionary.model';
import { DirectionalLight } from './directional-light.model';
import { Plane } from './plane.model';
import { Material } from './material.model';
import { Sphere } from './sphere.model';
import { clamp, cLerp, cMax, cMin, cMultiply, cProd, cross, cSum, dot, lerp, luminance, magnitude, normalize, reflect, saturate, vMultiply, vSub, vSum } from './utils';
import { Vector3 } from './vector3.model';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  private readonly BOUNCES = 10;
  private readonly PI_2 = Math.PI * 2;
  private readonly MIN_DIELECTRICS_F0 = 0.04;

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

    const inverseSamples = 1.0 / samples;

		const camera: Camera = components.cameras[Object.keys(components.cameras)[0]];
    const light = components.lights[Object.keys(components.lights)[0]];

    const sensorWidthM = camera.sensorWidth / 1000;
    const sensorHeightM = camera.sensorHeight / 1000;
    const focalLengthM = camera.focalLength / 1000;
    camera.lensArea = Math.PI * Math.pow(focalLengthM / 2.0 / camera.aperture, 2);
    camera.lensRadius = focalLengthM / 2.0 / camera.aperture;
    const cameraSamplePdf = camera.aperture / Math.PI / focalLengthM;
    const cameraAcceptanceCoef = camera.lensArea / camera.shutter * camera.iso;

    light.lightDir = normalize(vMultiply(light.direction, -1));
    light.angleRadians = light.diskAngle * Math.PI / 180.0;
    light.halfAngleCos = Math.cos(light.angleRadians / 2.0);
    light.intensityMap = cMultiply({ r: 1, g: 1, b: 1}, light.intensity / 3 * light.angleRadians);
    const lightDirectionCoordinates = this._getNormalCoordinates(light.direction);
    light.nt = lightDirectionCoordinates.nt;
    light.nb = lightDirectionCoordinates.nb;

    for (const planeId in components.planes) {
      const plane = components.planes[planeId];
      const v0v1 = vSub(plane.v1, plane.v0);
      const v0v2 = vSub(plane.v2, plane.v0);
      plane.v3 = vSum(plane.v0, vSub(plane.v2, plane.v1));
      plane.n = cross(v0v1, v0v2);
      plane.normal = normalize(plane.n);
      plane.area = magnitude(plane.n);
    }

    for (const sphereId in components.spheres) {
      const sphere = components.spheres[sphereId];
      sphere.r2 = sphere.radius * sphere.radius;
    }

    for (const materialId in components.materials) {
      const material = components.materials[materialId];
      material.diffuseReflectance = cMultiply(material.baseColor, 1.0 - material.metalness);
      material.alpha = material.roughness * material.roughness;
      material.alphaSquared = material.alpha * material.alpha;
      material.specularF0 = this._baseColorToSpecularF0(material.baseColor, material.metalness);
      material.shadowedF90 = this._shadowedF90(material.specularF0);
    }

    const yAxis: Vector3 = { x: 0, y: 1, z: 0 };
    const sensorXDirection = normalize(cross(yAxis, camera.direction));
    const sensorYDirection = normalize(cross(camera.direction, sensorXDirection));

    const cameraXStep = vMultiply(sensorXDirection, sensorWidthM / this._viewportWidth);
    const cameraYStep = vMultiply(sensorYDirection, -sensorHeightM / this._viewportHeight);

    let pixelRowStartPosition = vSum(camera.position, vSum(vMultiply(sensorXDirection, -sensorWidthM / 2), vMultiply(sensorYDirection, sensorHeightM / 2)));
    pixelRowStartPosition = vSum(pixelRowStartPosition, vMultiply(camera.direction, -focalLengthM));
    let dataIndex = this._viewportWidth * this._viewportHeight * 4 - 4;
    let bufIndex = this._viewportWidth * this._viewportHeight * 3 - 3;

    for (let i = this._viewportHeight - 1; i >= 0; i--) {
      let rayOrigin = pixelRowStartPosition;
      for (let j = this._viewportWidth - 1; j >= 0; j--) {
        const focalDirection = normalize(vSub(camera.position, rayOrigin));

        const lensPointSample = this._generateCameraLensPointSample(camera);
        const lensPoint = vSum(camera.position, vSum(vMultiply(sensorXDirection, lensPointSample.x), vMultiply(sensorYDirection, lensPointSample.y)));

        const convergencePoint = vSum(camera.position, vMultiply(focalDirection, camera.focus));
        const rayDirection = normalize(vSub(convergencePoint, lensPoint));

        const samplePower = this._castRay(lensPoint, rayDirection, components.planes, components.spheres, light, components.materials);

        let powerSum: Color = { r: this._powersBuffer[bufIndex], g: this._powersBuffer[bufIndex + 1], b: this._powersBuffer[bufIndex + 2] };
				powerSum = cSum(powerSum, cMultiply(samplePower, cameraSamplePdf));
				const totalPower = cMultiply(powerSum, inverseSamples);
        this._powersBuffer[bufIndex] = powerSum.r;
        this._powersBuffer[bufIndex + 1] = powerSum.g;
        this._powersBuffer[bufIndex + 2] = powerSum.b;

        // accepting incoming light by camera
        let acceptedPower = cMultiply(totalPower, cameraAcceptanceCoef);
        acceptedPower = cMin(cMax(acceptedPower, 0), 0.01);
        const color = cProd({ r: 255, g: 255, b: 255 }, cMultiply(acceptedPower, 100));

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
    planes: Dictionary<Plane>,
    spheres: Dictionary<Sphere>,
    light: DirectionalLight,
    materials: Dictionary<Material>,
    bounce = 0
  ): Color {
    let result: Color = { r: 0, g: 0, b: 0 };
    const v = vMultiply(rayDirection, -1);

    const hitResult = this._getHitEntityId(rayOrigin, rayDirection, planes, spheres);
    if (!hitResult) {
      return result;
    }

    const { hitId, hitPoint, normal: hitNormal } = hitResult;

    const NdotV = clamp(dot(hitNormal, v), 0.00001, 1.0);
    const material = materials[hitId];
    const diffuse = material.diffuseReflectance;

    const lightDirectionSample = this._generateLightDirectionSample(light);
    const ldWorldSample = this._getWorldSample(lightDirectionSample, light.lightDir, light.nt, light.nb);
    if (this._checkIsLitByDirectionalLight(hitPoint, ldWorldSample, planes, spheres)) {
      const diffuseTerm = this._evaluateDiffuseBRDF(hitNormal, light.lightDir, light.intensityMap, diffuse);

      const h = normalize(vSum(ldWorldSample, v));
      const NdotL = clamp(dot(hitNormal, ldWorldSample), 0.00001, 1.0);
      const LdotH = saturate(dot(ldWorldSample, h));
      const NdotH = saturate(dot(hitNormal, h));
      const fresnelTerm = this._evaluateFresnelSchlickSphericalGaussian(material.specularF0, material.shadowedF90, LdotH);
      const specularTerm = this._evalMicrofacet(material.alpha, material.alphaSquared, NdotL, NdotH, NdotV, fresnelTerm);

      result = cSum(
        result,
        cSum(
          cProd(
            cSum(
              { r: 1.0, g: 1.0, b: 1.0 },
              cMultiply(fresnelTerm, -1)
            ),
            diffuseTerm
          ),
          cProd(specularTerm, light.intensityMap)
        ));
    }

    if (bounce >= this.BOUNCES) {
      return result;
    }

    // normal is local y axis
    const { nt, nb } = this._getNormalCoordinates(hitNormal);
    const vLocal: Vector3 = {
      x: dot(v, nt),
      y: dot(v, hitNormal),
      z: dot(v, nb)
    }
    const sampleH = this._generateGGXVNDFSample(vLocal, material.alpha);
    const sampleWorldH = this._getWorldSample(sampleH, hitNormal, nt, nb);
    const sampleWorldL = reflect(rayDirection, sampleWorldH);

    const reflectedIntencity = this._castRay(hitPoint, sampleWorldL, planes, spheres, light, materials, bounce + 1);
    const diffuseTerm = this._evaluateDiffuseBRDF(hitNormal, sampleWorldL, reflectedIntencity, diffuse);
    const NdotL = clamp(dot(hitNormal, sampleWorldL), 0.00001, 1.0);
    const LdotH = saturate(dot(sampleWorldL, sampleWorldH));
    const fresnelTerm = this._evaluateFresnelSchlickSphericalGaussian(material.specularF0, material.shadowedF90, LdotH);
    const specularTerm = cMultiply(fresnelTerm, this._SmithG2OverG1HeightCorrelated(material.alpha, material.alphaSquared, NdotL, NdotV));

    const indirectResult = cSum(
      cProd(
        cSum(
          { r: 1.0, g: 1.0, b: 1.0 },
          cMultiply(fresnelTerm, -1)
        ),
        diffuseTerm
      ),
      cProd(specularTerm, reflectedIntencity));

    result = cSum(result, indirectResult);
    return result;
  }

  private _getHitEntityId(rayOrigin: Vector3, rayDirection: Vector3, planes: Dictionary<Plane>, spheres: Dictionary<Sphere>): { hitId: string, hitPoint: Vector3, normal: Vector3 } | undefined {
    let minHitDistance = Number.MAX_VALUE;
    let hitPoint: Vector3 = { x: 0, y: 0, z: 0 };
    let hitId: string | undefined = undefined;
    let normal: Vector3 = { x: 0, y: 0, z: 0 };

    // check for collision with planes
    for (const planeId in planes) {
      const plane = planes[planeId];
      const planeHitResult = this._rayPlaneIntersect(rayOrigin, rayDirection, plane);
      if (!planeHitResult || planeHitResult.hitDistance >= minHitDistance) {
        continue;
      }
      minHitDistance = planeHitResult.hitDistance;
      hitPoint = planeHitResult.hitPoint;
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
      const t = proj - Math.sqrt(sphere.r2 - d2);
      if (t < 0 || t > minHitDistance) {
        continue;
      }

      minHitDistance = t;
      hitPoint = vSum(rayOrigin, vMultiply(rayDirection, t));
      const rDir = normalize(vSub(hitPoint, sphere.center));
      normal = rDir;
      hitPoint = vSum(hitPoint, vMultiply(rDir, 0.000001));
      hitId = sphere.entityId;
    }

    if (!hitId) {
      return undefined;
    }

    return  { hitId, hitPoint, normal };
  }

  private _checkIsLitByDirectionalLight(hitPoint: Vector3, lightDir: Vector3, planes: Dictionary<Plane>, spheres: Dictionary<Sphere>): boolean {
    // check hit point is obstacled from being lit by plane
    for (const planeId in planes) {
      const plane = planes[planeId];
      if (this._rayPlaneIntersect(hitPoint, lightDir, plane)) {
        return false;
      }
    }

    // check if hit point is obstacled from being lit by spheres
    for (const sphereId in spheres) {
      const sphere = spheres[sphereId];

      const center = vSub(sphere.center, hitPoint);
      const proj = dot(center, lightDir);
      const d2 = dot(center, center) - proj * proj;
      const d = Math.sqrt(d2);
      if (d > sphere.radius) {
        continue;
      }
      const thc = Math.sqrt(sphere.r2 - d2);
      const t0 = proj - thc;
      const t1 = proj + thc;
      if (t0 > 0 || t1 > 0) {
        return false;
      }
    }

    return true;
  }

  // BRDF for given incoming light
  private _evaluateDiffuseBRDF(normal: Vector3, lightDir: Vector3, lightIntensity: Color, diffuse: Color): Color {
    const cosTerm = Math.max(dot(normal, lightDir), 0);
    return cMultiply(cProd(lightIntensity, diffuse), cosTerm);
  }

  private _getNormalCoordinates(normal: Vector3): { nt: Vector3, nb: Vector3 } {
    const nt: Vector3 = normalize(cross({ x: Math.random(), y: Math.random(), z: Math.random() }, normal));
    const nb = cross(nt, normal);
    return { nt, nb };
  }

  private _generateDiffuseSample(): Vector3 {
    const r1 = Math.random();     // cosTheta
    const r2 = Math.random();
    const sinTheta = Math.sqrt(1 - r1 * r1);
    const phi = this.PI_2 * r2;
    const x = sinTheta * Math.cos(phi);
    const z = sinTheta * Math.sin(phi);
    return { x: x, y: r1, z: z };
  }

  private _generateGGXVNDFSample(Ve: Vector3, alpha: number): Vector3 {
    const r1 = Math.random();
    const r2 = Math.random();

    const Vh = normalize({ x: alpha * Ve.x, y: Ve.y, z: alpha * Ve.z });

    const lensq = Vh.x * Vh.x + Vh.y * Vh.y;
    const T1: Vector3 = lensq > 0.0 ? vMultiply({ x: -Vh.y, y: 0.0, z: Vh.x }, Math.sqrt(lensq)) : { x: 1.0, y: 0.0, z: 0.0 };
    const T2 = cross(T1, Vh);

    const r = Math.sqrt(r1);
    const phi = this.PI_2 * r2;
    const t1 = r * Math.cos(phi);
    let t2 = r * Math.sin(phi);
    const s = 0.5 * (1.0 + Vh.y);
    t2 = lerp(Math.sqrt(1.0 - t1 * t1), t2, s);

    const Nh = vSum(
      vSum(
        vMultiply(T1, t1),
        vMultiply(T2, t2)),
      vMultiply(Vh, Math.sqrt(Math.max(0.0, 1.0 - t1 * t1 - t2 * t2))));

    // Section 3.4: transforming the normal back to the ellipsoid configuration
    return normalize({ x: alpha * Nh.x, y: Math.max(0.0, Nh.y), z: alpha * Nh.z });
  }

  private _evaluateFresnelSchlickSphericalGaussian(f0: Color, f90: number, NdotV: number): Color {
    return cSum(
      f0,
      cMultiply(
        cSum(cMultiply(f0, -1), { r: f90, g: f90, b: f90 }),
        Math.pow(2, (-5.55473 * NdotV - 6.983146) * NdotV)));
  }

  private _baseColorToSpecularF0(baseColor: Color, metalness: number): Color {
    return cLerp({ r: this.MIN_DIELECTRICS_F0, g: this.MIN_DIELECTRICS_F0, b: this.MIN_DIELECTRICS_F0 }, baseColor, metalness);
  }

  private _shadowedF90(F0: Color): number {
    const t = (1.0 / this.MIN_DIELECTRICS_F0);
    return Math.min(1.0, t * luminance(F0));
  }

  private _evalMicrofacet(alpha: number, alphaSquared: number, NdotL: number, NdotH: number, NdotV: number, F: Color): Color {
    const D = this._GGXD(Math.max(0.00001, alphaSquared), NdotH);
    const G2 = this._SmithG2HeightCorrelatedGGXLagarde(alphaSquared, NdotL, NdotV);
    return cMultiply(F, (G2 * D * NdotL));
  }

  private _GGXD(alphaSquared: number, NdotH: number): number {
    const b = ((alphaSquared - 1.0) * NdotH * NdotH + 1.0);
    return Math.min(alphaSquared / (Math.PI * b * b), 10.0);
  }

  private _SmithG2HeightCorrelatedGGXLagarde(alphaSquared: number, NdotL: number, NdotV: number): number {
    const a = NdotV * Math.sqrt(alphaSquared + NdotL * (NdotL - alphaSquared * NdotL));
    const b = NdotL * Math.sqrt(alphaSquared + NdotV * (NdotV - alphaSquared * NdotV));
    return 0.5 / (a + b);
  }

  private _SmithG2OverG1HeightCorrelated(alpha: number, alphaSquared: number, NdotL: number, NdotV: number): number {
    const G1V = this._SmithG1GGX(alpha, NdotV, alphaSquared, NdotV * NdotV);
    const G1L = this._SmithG1GGX(alpha, NdotL, alphaSquared, NdotL * NdotL);
    return G1L / (G1V + G1L - G1V * G1L);
  }

  private _SmithG1GGX(alpha: number, NdotS: number, alphaSquared: number, NdotSSquared: number): number {
    return 2.0 / (Math.sqrt(((alphaSquared * (1.0 - NdotSSquared)) + NdotSSquared) / NdotSSquared) + 1.0);
  }

  private _generateLightDirectionSample(light: DirectionalLight): Vector3 {
    const r1 = Math.random();
    const r2 = Math.random();
    const y = r1 * (1 - light.halfAngleCos) + light.halfAngleCos;
    const sinTheta = Math.sqrt(1 - y * y);
    const phi = (Math.PI - light.angleRadians) / 2 + r2 * light.angleRadians;
    const x = sinTheta * Math.cos(phi);
    const z = sinTheta * Math.sin(phi);
    return { x, y, z };
  }

  private _generateCameraLensPointSample(camera: Camera): { x: number, y: number } {
    const r1 = Math.random();
    const r2 = Math.random();
    const r = r1 * camera.lensRadius;
    const phi = r2 * this.PI_2;
    return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
  }

  private _getWorldSample(sample: Vector3, n: Vector3, nt: Vector3, nb: Vector3): Vector3 {
    return {
      x: sample.x * nt.x + sample.y * n.x + sample.z * nb.x,
      y: sample.x * nt.y + sample.y * n.y + sample.z * nb.y,
      z: sample.x * nt.z + sample.y * n.z + sample.z * nb.z,
    };
  }

  private _rayPlaneIntersect(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane): { hitPoint: Vector3, hitDistance: number } | undefined {
    // Step 1: finding P

    // check if the ray and plane are parallel.
    const NdotRayDirection = dot(plane.n, rayDirection);
    if (Math.abs(NdotRayDirection) < 0.000001) { // almost 0
        return undefined; // they are parallel, so they don't intersect!
    }

    // compute d parameter using equation 2
    const minusN = vMultiply(plane.n, -1);
    const d = dot(minusN, plane.v0);

    // compute t (equation 3)
    const t = -(dot(plane.n, rayOrigin) + d) / NdotRayDirection;

    // check if the triangle is behind the ray
    if (t < 0) return undefined; // the triangle is behind

    // compute the intersection point using equation 1
    const P = vSum(rayOrigin, vMultiply(rayDirection, t));


    // Step 2: inside-outside test
    if (!this._checkPointIsInsideTriangle(plane.v0, plane.v1, plane.v2, plane.n, P)
      && !this._checkPointIsInsideTriangle(plane.v0, plane.v2, plane.v3, plane.n, P)) {
        return undefined;
      }

    return { hitPoint: vSum(P, vMultiply(plane.normal, 0.00001)), hitDistance: t }; // this ray hits the triangle
  }

  private _checkPointIsInsideTriangle(v0: Vector3, v1: Vector3, v2: Vector3, n: Vector3, P: Vector3): boolean {
    // edge 0
    let C: Vector3; // vector perpendicular to triangle's plane
    const edge0 = vSub(v1, v0);
    const vp0 = vSub(P, v0);
    C = cross(edge0, vp0);
    if (dot(n, C) < 0) return false; // P is on the right side

    // edge 1
    const edge1 = vSub(v2, v1);
    const vp1 = vSub(P, v1);
    C = cross(edge1, vp1);
    if (dot(n, C) < 0)  return false; // P is on the right side

    // edge 2
    const edge2 = vSub(v0, v2);
    const vp2 = vSub(P, v2);
    C = cross(edge2, vp2);
    if (dot(n, C) < 0) return false; // P is on the right side;

    return true;
  }
}
