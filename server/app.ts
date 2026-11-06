import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  loginSchema,
  speciesSchema,
  specimenUpdateSchema,
  userPatchSchema,
} from "../shared/validation";
import type { User, Page, Species, Specimen } from "../shared/types";
import { HttpError, type Upstream } from "./upstream";

interface Session {
  token: string;
  expires: number;
  user: User;
  created: number;
  refresh?: Promise<void>;
}
export interface AppOptions {
  upstream: Upstream;
  origin: string;
  production?: boolean;
  localPort?: number;
}
export function createApp({
  upstream,
  origin,
  production = false,
  localPort = 4174,
}: AppOptions) {
  const app = express(),
    sessions = new Map<string, Session>();
  const allowedOrigins = new Set([origin]);
  if (!production) {
    const configured = new URL(origin);
    if (
      configured.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(configured.hostname)
    ) {
      for (const host of ["localhost", "127.0.0.1"]) {
        for (const port of [configured.port || "80", String(localPort)]) {
          allowedOrigins.add(
            `http://${host}${port === "80" ? "" : ":" + port}`,
          );
        }
      }
    }
  }
  const cookieName = production ? "__Host-bio-admin" : "bio-admin";
  app.disable("x-powered-by");
  app.use(
    helmet({
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",
            "https://tile.openstreetmap.org",
            "https://*.tile.openstreetmap.org",
          ],
          connectSrc: production
            ? ["'self'"]
            : ["'self'", "ws://localhost:5173", "ws://127.0.0.1:5173"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
      strictTransportSecurity: production,
    }),
  );
  app.use(express.json({ limit: "128kb" }));
  app.use("/admin-api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/admin-api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !allowedOrigins.has(req.headers.origin ?? "")
    )
      return res
        .status(403)
        .json({ message: "Origen de la solicitud no permitido." });
    next();
  });
  const sessionId = (req: Request) =>
    req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
  const clear = (req: Request, res: Response) => {
    const id = sessionId(req);
    if (id) sessions.delete(id);
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
    });
  };
  async function authenticate(req: Request, res: Response) {
    const id = sessionId(req),
      session = id ? sessions.get(id) : undefined;
    if (
      !session ||
      session.expires <= Date.now() ||
      Date.now() - session.created > 8 * 60 * 60 * 1000
    ) {
      clear(req, res);
      throw new HttpError(401, "Tu sesión terminó. Inicia sesión de nuevo.");
    }
    try {
      // Fetch the current role for every operation: never trust a stale JWT role.
      session.user = await upstream<User>("/users/me", session.token);
      if (session.user.role !== "ADMIN")
        throw new HttpError(
          403,
          "Esta cuenta no tiene acceso de administrador.",
        );
      if (session.expires - Date.now() < 120000) {
        session.refresh ??= (async () => {
          const r = await upstream<{ token: string; expiresIn: string }>(
            "/auth/refresh-token",
            session.token,
            "POST",
          );
          session.token = r.token;
          session.expires = Date.parse(r.expiresIn);
        })().finally(() => {
          session.refresh = undefined;
        });
        await session.refresh;
      }
      return session;
    } catch (e) {
      if (e instanceof HttpError && [401, 403].includes(e.status)) {
        clear(req, res);
        res.setHeader("X-Session-Ended", "1");
      }
      throw e;
    }
  }
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Demasiados intentos. Espera unos minutos." },
  });
  app.post("/admin-api/login", limit, async (req, res) => {
    const body = loginSchema.parse(req.body);
    const login = await upstream<{ token: string; expiresIn: string }>(
      "/auth/login",
      undefined,
      "POST",
      body,
    );
    const user = await upstream<User>("/users/me", login.token);
    if (user.role !== "ADMIN")
      throw new HttpError(403, "Tu cuenta no tiene el rol de administrador.");
    const expires = Date.parse(login.expiresIn);
    if (!Number.isFinite(expires) || expires <= Date.now())
      throw new HttpError(502, "El servidor entregó una sesión inválida.");
    for (const [id, s] of sessions)
      if (s.expires <= Date.now() || Date.now() - s.created > 28800000)
        sessions.delete(id);
    if (sessions.size >= 1000)
      throw new HttpError(503, "No es posible abrir más sesiones ahora.");
    clear(req, res);
    const id = randomBytes(32).toString("hex");
    sessions.set(id, {
      token: login.token,
      expires,
      user,
      created: Date.now(),
    });
    res
      .cookie(cookieName, id, {
        httpOnly: true,
        secure: production,
        sameSite: "strict",
        path: "/",
      })
      .json({ user });
  });
  app.post("/admin-api/logout", (req, res) => {
    clear(req, res);
    res.sendStatus(204);
  });
  app.get("/admin-api/session", async (req, res) => {
    const session = await authenticate(req, res);
    res.json({ user: session.user });
  });
  app.get("/admin-api/capabilities", async (req, res) => {
    await authenticate(req, res);
    res.json({
      species: true,
      specimens: true,
      users: true,
      specimenLocationWrites: false,
      zones: false,
      gamification: false,
      reports: false,
      reviews: true,
      userState: false,
      adminRemoval: false,
    });
  });
  app.get("/admin-api/observations", async (req, res) => {
    const session = await authenticate(req, res);
    const query = z
      .object({
        page: z.coerce.number().int().min(0).default(0),
        size: z.coerce.number().int().min(1).max(100).default(12),
        revisionRequested: z.enum(["true", "false"]).default("true"),
      })
      .strict()
      .parse(req.query);
    const params = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    );
    res.json(await upstream(`/observations/admin?${params}`, session.token));
  });
  async function all<T>(resource: string, token: string) {
    const items: T[] = [];
    let page = 0,
      total = 1;
    while (page < total) {
      if (page >= 200)
        throw new HttpError(
          422,
          "La búsqueda supera 20.000 registros. El backend necesita filtros para este volumen.",
        );
      const data = await upstream<Page<T>>(
        `/${resource}?page=${page++}&size=100`,
        token,
      );
      items.push(...data.content);
      total = data.pagination.totalPages;
    }
    return items;
  }
  app.get("/admin-api/resources/:resource", async (req, res) => {
    const session = await authenticate(req, res),
      resource = z
        .enum(["species", "specimens", "users"])
        .parse(req.params.resource);
    const q = z
      .object({
        page: z.coerce.number().int().min(0).default(0),
        size: z.coerce.number().int().min(1).max(100).default(12),
        q: z.string().max(180).default(""),
        family: z.string().max(120).default(""),
        speciesId: z.string().default(""),
        role: z.enum(["", "USER", "ADMIN"]).default(""),
      })
      .parse(req.query);
    if (!q.q && !q.family && !q.speciesId && !q.role)
      return res.json(
        await upstream(
          `/${resource}?page=${q.page}&size=${q.size}`,
          session.token,
        ),
      );
    const rows = await all<Species | Specimen | User>(resource, session.token);
    const species =
      resource === "specimens"
        ? await all<Species>("species", session.token)
        : [];
    const filtered = rows.filter((row) => {
      const r = row as unknown as Record<string, unknown>;
      const s = species.find((s) => s.id === r.speciesId);
      const text = [
        r.scientificName,
        r.commonName,
        r.family,
        r.username,
        r.firstName,
        r.lastName,
        r.email,
        s?.commonName,
        s?.scientificName,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        text.includes(q.q.toLocaleLowerCase("es")) &&
        (!q.family || (s?.family ?? r.family) === q.family) &&
        (!q.speciesId || r.speciesId === q.speciesId) &&
        (!q.role || r.role === q.role)
      );
    });
    const totalPages = Math.ceil(filtered.length / q.size);
    res.json({
      content: filtered.slice(q.page * q.size, (q.page + 1) * q.size),
      pagination: {
        page: q.page,
        size: q.size,
        totalElements: filtered.length,
        totalPages,
        first: q.page === 0,
        last: q.page >= totalPages - 1,
      },
    });
  });
  app.get("/admin-api/options/species", async (req, res) => {
    const s = await authenticate(req, res);
    res.json(await all<Species>("species", s.token));
  });
  app.get("/admin-api/resources/:resource/:id", async (req, res) => {
    const s = await authenticate(req, res);
    const resource = z
      .enum(["species", "specimens", "users"])
      .parse(req.params.resource);
    const id = z.uuid().parse(req.params.id);
    res.json(await upstream(`/${resource}/${id}`, s.token));
  });
  app.post("/admin-api/resources/species", async (req, res) => {
    const s = await authenticate(req, res);
    res
      .status(201)
      .json(
        await upstream(
          "/species",
          s.token,
          "POST",
          speciesSchema.parse(req.body),
        ),
      );
  });
  app.patch("/admin-api/resources/species/:id", async (req, res) => {
    const s = await authenticate(req, res);
    const id = z.uuid().parse(req.params.id);
    res.json(
      await upstream(
        `/species/${id}`,
        s.token,
        "PATCH",
        speciesSchema.parse(req.body),
      ),
    );
  });
  app.delete("/admin-api/resources/species/:id", async (req, res) => {
    const s = await authenticate(req, res),
      id = z.uuid().parse(req.params.id);
    const specimens = await all<Specimen>("specimens", s.token);
    if (specimens.some((v) => v.speciesId === id))
      throw new HttpError(
        409,
        "La especie tiene especímenes asociados. La eliminación en cascada aún no está garantizada por el backend.",
      );
    await upstream(`/species/${id}`, s.token, "DELETE");
    res.sendStatus(204);
  });
  app.post("/admin-api/resources/specimens", async (req, res) => {
    await authenticate(req, res);
    throw new HttpError(
      409,
      "El registro requiere el límite oficial del campus y detección atómica de duplicados en el backend.",
    );
  });
  app.patch("/admin-api/resources/specimens/:id", async (req, res) => {
    const s = await authenticate(req, res),
      id = z.uuid().parse(req.params.id),
      body = specimenUpdateSchema.parse(req.body),
      current = await upstream<Specimen>(`/specimens/${id}`, s.token);
    if (
      body.latitude !== current.latitude ||
      body.longitude !== current.longitude
    )
      throw new HttpError(
        409,
        "No es posible cambiar la ubicación hasta disponer del límite oficial del campus.",
      );
    res.json(await upstream(`/specimens/${id}`, s.token, "PATCH", body));
  });
  app.delete("/admin-api/resources/specimens/:id", async (req, res) => {
    const s = await authenticate(req, res),
      id = z.uuid().parse(req.params.id);
    await upstream(`/specimens/${id}`, s.token, "DELETE");
    res.sendStatus(204);
  });
  app.patch("/admin-api/resources/users/:id", async (req, res) => {
    const s = await authenticate(req, res),
      id = z.uuid().parse(req.params.id),
      body = userPatchSchema.parse(req.body),
      target = await upstream<User>(`/users/${id}`, s.token);
    if (target.role === "ADMIN" && body.role === "USER")
      throw new HttpError(
        409,
        "Retirar administradores requiere la protección atómica del último administrador en el backend.",
      );
    if (id === s.user.id && body.enabled === false)
      throw new HttpError(
        409,
        "No puedes suspender tu propia sesión administrativa.",
      );
    res.json(await upstream(`/users/${id}`, s.token, "PATCH", body));
  });
  app.delete("/admin-api/resources/users/:id", async (req, res) => {
    const s = await authenticate(req, res),
      id = z.uuid().parse(req.params.id),
      target = await upstream<User>(`/users/${id}`, s.token);
    if (target.role === "ADMIN")
      throw new HttpError(
        409,
        "No se eliminan administradores hasta que el backend garantice que siempre quede uno.",
      );
    await upstream(`/users/${id}`, s.token, "DELETE");
    res.sendStatus(204);
  });
  app.use("/admin-api", (_req, res) =>
    res.status(404).json({ message: "Esta operación no está disponible." }),
  );
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: "Revisa los campos obligatorios y sus valores." });
    if (err instanceof HttpError)
      return res.status(err.status).json({ message: err.message });
    res
      .status(500)
      .json({ message: "Ocurrió un error. No se confirmó la operación." });
  });
  return app;
}
