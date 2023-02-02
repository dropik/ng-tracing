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

export function cSum(a: Color, b: Color): Color {
  return { r: a.r + b.r, g: a.g + b.g, b: a.b + b.b };
}

export function cProd(a: Color, b: Color): Color {
  return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
}

export function cMax(c: Color, s: number): Color {
  return { r: Math.max(c.r, s), g: Math.max(c.g, s), b: Math.max(c.b, s) };
}

export function cMin(c: Color, s: number): Color {
  return { r: Math.min(c.r, s), g: Math.min(c.g, s), b: Math.min(c.b, s) };
}

export function cDot(a: Color, b: Color): number {
  return a.r * b.r + a.g * b.g + a.b * b.b;
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

export function normalize(a: Vector3): Vector3 {
  const s = 1 / magnitude(a);
  return vMultiply(a, s);
}

export function grayscale(c: Color): number {
  return Math.min(Math.max((0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255, 0), 1);
}

export function diffuseMap(c: Color): Color {
  return cMultiply(c, 0.003922);
}

export function lerp(v0: number, v1: number, t: number): number {
  return (1 - t) * v0 + t * v1;
}

export function cLerp(c0: Color, c1: Color, t: number): Color {
  return cSum(cMultiply(c0, 1 - t), cMultiply(c1, t));
}

export function luminance(rgb: Color): number {
	return cDot(rgb, { r: 0.2126, g: 0.7152, b: 0.0722 });
}

export function reflect(d: Vector3, n: Vector3): Vector3 {
  return vSub(d, vMultiply(n, 2 * dot(d, n)));
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(n, b));
}

export function saturate(n: number): number {
  return clamp(n, 0.0, 1.0);
}
