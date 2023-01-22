import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RayTracingService {
  public generateImage(image: ImageData): ImageData {
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = 255;
    }

    return image;
  }
}
