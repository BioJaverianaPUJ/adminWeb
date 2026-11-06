import { z } from "zod";
export const speciesSchema = z
  .object({
    scientificName: z.string().trim().min(1).max(180),
    commonName: z.string().trim().min(1).max(180),
    family: z.string().trim().min(1).max(120),
    woodDensity: z.number().finite().min(0).nullable(),
  })
  .strict();
export const specimenSchema = z
  .object({
    speciesId: z.uuid(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    circumference: z.number().finite().min(0).nullable(),
    height: z.number().finite().min(0).nullable(),
    healthStatus: z.enum(["WELL", "FAIR", "POOR", "DEAD"]),
    notes: z.string().trim().min(1).max(5000),
    observationDate: z.iso.datetime(),
  })
  .strict();
export const specimenUpdateSchema = specimenSchema.omit({ speciesId: true });
export const userPatchSchema = z
  .object({
    username: z.string().trim().min(3).max(25).optional(),
    gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
export const loginSchema = z
  .object({ email: z.email(), password: z.string().min(1).max(200) })
  .strict();
export const draftSchema = z
  .object({
    id: z.string(),
    kind: z.enum([
      "green",
      "interest",
      "boundary",
      "mission",
      "achievement",
      "curiosity",
    ]),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(5000),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    points: z.array(
      z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
    ),
    xp: z.number().refine((n) => [5, 10, 15, 20].includes(n)),
    period: z.enum(["DAILY", "WEEKLY", "EVENT"]),
    target: z.number().int().min(1),
    objective: z.string().max(1000),
    zoneId: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    images: z.array(z.string().max(1500000)).max(5),
    updatedAt: z.string(),
  })
  .superRefine((d, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (
      ["green", "interest", "boundary"].includes(d.kind) &&
      d.points.length < 3
    )
      issue("points", "Dibuja al menos tres vértices.");
    if (["mission", "achievement"].includes(d.kind) && !d.objective.trim())
      issue("objective", "Define el objetivo o condición.");
    if (
      d.kind === "mission" &&
      d.period === "EVENT" &&
      (!d.startsAt ||
        !d.endsAt ||
        !Number.isFinite(Date.parse(d.startsAt)) ||
        !Number.isFinite(Date.parse(d.endsAt)) ||
        Date.parse(d.endsAt) <= Date.parse(d.startsAt))
    )
      issue("endsAt", "El fin del evento debe ser posterior al inicio.");
  });
