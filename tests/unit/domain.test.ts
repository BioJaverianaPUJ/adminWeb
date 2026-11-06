import { describe, it, expect } from "vitest";
import {
  speciesSchema,
  specimenSchema,
  draftSchema,
} from "../../shared/validation";
import { inside, validPolygon, contained } from "../../shared/geometry";
import type { Draft } from "../../shared/types";
const draft: Draft = {
  id: "d",
  kind: "mission",
  title: "Explora",
  description: "Visita el campus",
  color: "#aabbcc",
  points: [],
  xp: 5,
  period: "DAILY",
  target: 1,
  objective: "Visitar una zona",
  zoneId: "",
  startsAt: "",
  endsAt: "",
  images: [],
  updatedAt: new Date().toISOString(),
};
describe("Validaciones del SRS", () => {
  it("rechaza recompensas fuera de 5, 10, 15 y 20", () => {
    for (const xp of [0, 6, 21, 100])
      expect(draftSchema.safeParse({ ...draft, xp }).success).toBe(false);
    for (const xp of [5, 10, 15, 20])
      expect(draftSchema.safeParse({ ...draft, xp }).success).toBe(true);
  });
  it("exige fechas ordenadas para eventos", () => {
    expect(draftSchema.safeParse({ ...draft, period: "EVENT" }).success).toBe(
      false,
    );
    expect(
      draftSchema.safeParse({
        ...draft,
        period: "EVENT",
        startsAt: "2026-11-10T10:00",
        endsAt: "2026-11-09T10:00",
      }).success,
    ).toBe(false);
  });
  it("rechaza más de cinco imágenes", () =>
    expect(
      draftSchema.safeParse({
        ...draft,
        kind: "curiosity",
        images: Array(6).fill("data:image/png;base64,a"),
      }).success,
    ).toBe(false));
  it("rechaza especie vacía y densidad negativa", () => {
    expect(
      speciesSchema.safeParse({
        scientificName: " ",
        commonName: "Roble",
        family: "Fagaceae",
        woodDensity: 0.6,
      }).success,
    ).toBe(false);
    expect(
      speciesSchema.safeParse({
        scientificName: "Quercus",
        commonName: "Roble",
        family: "Fagaceae",
        woodDensity: -1,
      }).success,
    ).toBe(false);
  });
  it("rechaza coordenadas inválidas y campos no admitidos", () =>
    expect(
      specimenSchema.safeParse({
        speciesId: "x",
        latitude: 91,
        longitude: -181,
        notes: "",
        extra: true,
      }).success,
    ).toBe(false));
});
describe("Geometría", () => {
  const b: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];
  it("admite borde e interior, rechaza exterior", () => {
    expect(inside([0, 5], b)).toBe(true);
    expect(inside([5, 5], b)).toBe(true);
    expect(inside([11, 5], b)).toBe(false);
  });
  it("rechaza polígonos cruzados o degenerados", () => {
    expect(
      validPolygon([
        [0, 0],
        [10, 10],
        [0, 10],
        [10, 0],
      ]),
    ).toBe(false);
    expect(
      validPolygon([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    ).toBe(false);
    expect(validPolygon(b)).toBe(true);
  });
  it("valida contención", () => {
    expect(
      contained(
        [
          [1, 1],
          [1, 2],
          [2, 2],
          [2, 1],
        ],
        b,
      ),
    ).toBe(true);
    expect(
      contained(
        [
          [1, 1],
          [1, 20],
          [2, 20],
        ],
        b,
      ),
    ).toBe(false);
  });
  it("detecta un lado que sale de un límite cóncavo", () => {
    const boundary: [number, number][] = [
      [0, 0],
      [0, 5],
      [5, 5],
      [5, 4],
      [1, 4],
      [1, 1],
      [5, 1],
      [5, 0],
    ];
    expect(
      contained(
        [
          [4, 0.5],
          [4, 4.5],
          [0.5, 2.5],
        ],
        boundary,
      ),
    ).toBe(false);
  });
});
