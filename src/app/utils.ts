import { Color } from "./color.model";
import { Vector3 } from "./vector3.model";

export function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function magnitude(a: Vector3): number {
  return Math.sqrt(dot(a, a));
}

export function vMultiply(a: Vector3, s: number): Vector3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function cMultiply(a: Color, s: number): Color {
  return { r: a.r * s, g: a.g * s, b: a.b * s };
}

export function vSum(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function vSub(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

export function getUnitVector(a: Vector3): Vector3 {
  const s = 1 / magnitude(a);
  return vMultiply(a, s);
}

export function grayscale(c: Color): number {
  return Math.min(Math.max((0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255, 0), 1);
}
