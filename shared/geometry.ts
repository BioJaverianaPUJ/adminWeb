import type { Coordinate } from "./types";
function cross(a: Coordinate, b: Coordinate, c: Coordinate) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function on(a: Coordinate, b: Coordinate, p: Coordinate) {
  return (
    Math.abs(cross(a, b, p)) < 1e-12 &&
    p[0] >= Math.min(a[0], b[0]) - 1e-12 &&
    p[0] <= Math.max(a[0], b[0]) + 1e-12 &&
    p[1] >= Math.min(a[1], b[1]) - 1e-12 &&
    p[1] <= Math.max(a[1], b[1]) + 1e-12
  );
}
export function inside(p: Coordinate, polygon: Coordinate[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (on(a, b, p)) return true;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return polygon.length >= 3 && result;
}
export function validPolygon(p: Coordinate[]) {
  if (p.length < 3 || new Set(p.map((v) => v.join(","))).size !== p.length)
    return false;
  let area = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    area += a[0] * b[1] - b[0] * a[1];
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      const c = p[j],
        d = p[(j + 1) % p.length];
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0) ||
        on(a, b, c) ||
        on(a, b, d) ||
        on(c, d, a) ||
        on(c, d, b)
      )
        return false;
    }
  }
  return Math.abs(area) > 1e-12;
}
export function contained(p: Coordinate[], boundary: Coordinate[]) {
  if (
    !validPolygon(p) ||
    !validPolygon(boundary) ||
    !p.every((v) => inside(v, boundary))
  )
    return false;
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < boundary.length; j++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        c = boundary[j],
        d = boundary[(j + 1) % boundary.length];
      if (
        cross(a, b, c) * cross(a, b, d) < 0 &&
        cross(c, d, a) * cross(c, d, b) < 0
      )
        return false;
    }
  return true;
}
