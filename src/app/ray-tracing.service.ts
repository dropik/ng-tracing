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
        const resultColor: Color = { r: 0, g: 0, b: 0 };

        // check for collision with spheres
        for (const sphereId in components.spheres) {
          const sphere = components.spheres[sphereId];
          const center = vSub(sphere.center, rayOrigin);
          const proj = dot(center, rayDirection);
          const distanceToCenter = magnitude(center);
          if (distanceToCenter * distanceToCenter - proj * proj > sphere.radius * sphere.radius) {
            continue;
          }

          resultColor.r = 255;
          resultColor.g = 255;
          resultColor.b = 255;
        }

        rayOrigin = vSum(rayOrigin, cameraXStep);
        data[dataIndex] = resultColor.r;
        data[dataIndex + 1] = resultColor.g;
        data[dataIndex + 2] = resultColor.b;
        data[dataIndex + 3] = 255;
        dataIndex += 4;
      }
      pixelRowStartPosition = vSum(pixelRowStartPosition, cameraYStep);
    }

    return image;
  }
}
