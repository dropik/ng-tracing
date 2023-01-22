import { Injectable } from '@angular/core';
import { Camera } from './camera.model';
import { Dictionary } from './dictionary.model';
import { Entity } from './entity.model';
import { cross, getUnitVector, vScalarProduct, vSub, vSum } from './utils';
import { Vector3 } from './vector3.model';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  public generateImage(viewportWidth: number, viewportHeight: number, camera: Camera, entities: Dictionary<Entity>): ImageData {
    const image = new ImageData(viewportWidth, viewportHeight);
    const data = image.data;

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

        rayOrigin = vSum(rayOrigin, cameraXStep);
        data[dataIndex] = 0;
        data[dataIndex + 1] = 0;
        data[dataIndex + 2] = 0;
        data[dataIndex + 3] = 255;
        dataIndex += 4;
      }
      pixelRowStartPosition = vSum(pixelRowStartPosition, cameraYStep);
    }

    return image;
  }
}
