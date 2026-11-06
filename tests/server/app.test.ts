import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../server/app";
import type { Upstream } from "../../server/upstream";
import type { User } from "../../shared/types";
const id = "943e5eda-be65-40bc-b896-a4daad3f3d85",
  other = "843e5eda-be65-40bc-b896-a4daad3f3d85";
const admin: User = {
  id,
  firstName: "Admin",
  lastName: "Prueba",
  username: "admin",
  email: "admin@example.test",
  role: "ADMIN",
  gender: "OTHER",
};
function setup() {
  let current = admin;
  const calls = vi.fn(
    async (path: string, _token?: string, method = "GET", body?: unknown) => {
      if (path === "/auth/login")
        return {
          token: "never-expose-this",
          expiresIn: new Date(Date.now() + 3600000).toISOString(),
        };
      if (path === "/users/me") return current;
      if (path === `/users/${other}`) return { ...admin, id: other };
      if (path.startsWith("/specimens?"))
        return { content: [], pagination: { totalPages: 0 } };
      if (path.startsWith("/species"))
        return method === "GET"
          ? { content: [], pagination: { totalElements: 0, totalPages: 0 } }
          : { id: other, ...(body as object) };
      return {};
    },
  );
  const app = createApp({
    upstream: calls as Upstream,
    origin: "http://localhost:5173",
  });
  return {
    app,
    calls,
    setUser: (u: User) => {
      current = u;
    },
  };
}
async function login(agent: ReturnType<typeof request.agent>) {
  return agent
    .post("/admin-api/login")
    .set("Origin", "http://localhost:5173")
    .send({ email: "admin@example.test", password: "test-only" });
}
describe("Acceso administrativo y protección del proxy", () => {
  it("no permite leer sin sesión", async () => {
    const { app, calls } = setup();
    expect((await request(app).get("/admin-api/resources/users")).status).toBe(
      401,
    );
    expect(calls).not.toHaveBeenCalled();
  });
  it("rechaza solicitudes de otro origen", async () => {
    const { app, calls } = setup();
    expect(
      (
        await request(app)
          .post("/admin-api/login")
          .set("Origin", "https://evil.example")
          .send({})
      ).status,
    ).toBe(403);
    expect(calls).not.toHaveBeenCalled();
  });
  it("nunca devuelve el token al navegador y usa cookie HttpOnly", async () => {
    const { app } = setup();
    const response = await login(request.agent(app));
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain("never-expose");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Strict");
  });
  it("impide iniciar sesión con rol USER", async () => {
    const s = setup();
    s.setUser({ ...admin, role: "USER" });
    expect((await login(request.agent(s.app))).status).toBe(403);
  });
  it("revalida el rol en cada operación", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    s.setUser({ ...admin, role: "USER" });
    expect((await agent.get("/admin-api/resources/species")).status).toBe(403);
    expect((await agent.get("/admin-api/session")).status).toBe(401);
  });
  it("rechaza retirar el rol o eliminar administradores", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    expect(
      (
        await agent
          .patch(`/admin-api/resources/users/${other}`)
          .set("Origin", "http://localhost:5173")
          .send({ role: "USER" })
      ).status,
    ).toBe(409);
    expect(
      (
        await agent
          .delete(`/admin-api/resources/users/${other}`)
          .set("Origin", "http://localhost:5173")
      ).status,
    ).toBe(409);
    expect(s.calls.mock.calls.some((c) => c[2] === "DELETE")).toBe(false);
  });
  it("no permite crear especímenes sin límite oficial", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    expect(
      (
        await agent
          .post("/admin-api/resources/specimens")
          .set("Origin", "http://localhost:5173")
          .send({})
      ).status,
    ).toBe(409);
  });
  it("valida datos y envía el DTO de especies al endpoint real", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    const body = {
      scientificName: "Quercus humboldtii",
      commonName: "Roble",
      family: "Fagaceae",
      woodDensity: 0.65,
    };
    expect(
      (
        await agent
          .post("/admin-api/resources/species")
          .set("Origin", "http://localhost:5173")
          .send(body)
      ).status,
    ).toBe(201);
    expect(s.calls).toHaveBeenCalledWith(
      "/species",
      "never-expose-this",
      "POST",
      body,
    );
    expect(
      (
        await agent
          .post("/admin-api/resources/species")
          .set("Origin", "http://localhost:5173")
          .send({ ...body, woodDensity: -1 })
      ).status,
    ).toBe(400);
  });
  it("no expone rutas arbitrarias del backend", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    expect((await agent.get("/admin-api/resources/auth")).status).toBe(400);
    expect((await agent.post("/admin-api/arbitrary")).status).toBe(403);
  });
  it("cierra la sesión local", async () => {
    const s = setup(),
      agent = request.agent(s.app);
    await login(agent);
    expect(
      (
        await agent
          .post("/admin-api/logout")
          .set("Origin", "http://localhost:5173")
      ).status,
    ).toBe(204);
    expect((await agent.get("/admin-api/session")).status).toBe(401);
  });
});

describe("Observaciones del backend actualizado", () => {
  it("exige sesión y conserva el filtro de solicitudes en la ruta ADMIN", async () => {
    const { app, calls } = setup();
    expect((await request(app).get("/admin-api/observations")).status).toBe(
      401,
    );
    const agent = request.agent(app);
    await login(agent);
    expect(
      (
        await agent.get(
          "/admin-api/observations?page=2&size=12&revisionRequested=true",
        )
      ).status,
    ).toBe(200);
    expect(calls).toHaveBeenCalledWith(
      "/observations/admin?page=2&size=12&revisionRequested=true",
      "never-expose-this",
    );
    expect((await agent.get("/admin-api/observations?size=101")).status).toBe(
      400,
    );
    expect(
      (await agent.get("/admin-api/observations?revisionRequested=maybe"))
        .status,
    ).toBe(400);
  });
});

describe("Orígenes locales del administrador", () => {
  it("permite localhost y 127.0.0.1 en los puertos configurados", async () => {
    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4174",
      "http://127.0.0.1:4174",
    ]) {
      const { app } = setup();
      const result = await request(app)
        .post("/admin-api/login")
        .set("Origin", origin)
        .send({ email: "admin@example.test", password: "test-only" });
      expect(result.status).toBe(200);
    }
  });
  it("rechaza origen ausente, puertos ajenos y dominios que aparentan ser locales", async () => {
    const { app } = setup();
    for (const origin of [
      "null",
      "http://localhost:9999",
      "http://localhost.evil.test:5173",
      "https://evil.test",
    ]) {
      expect(
        (
          await request(app)
            .post("/admin-api/login")
            .set("Origin", origin)
            .send({})
        ).status,
      ).toBe(403);
    }
    expect((await request(app).post("/admin-api/login").send({})).status).toBe(
      403,
    );
  });
  it("en producción no habilita excepciones locales", async () => {
    const upstream = vi.fn();
    const app = createApp({
      upstream: upstream as Upstream,
      origin: "https://admin.example.test",
      production: true,
    });
    expect(
      (
        await request(app)
          .post("/admin-api/login")
          .set("Origin", "http://localhost:5173")
          .send({})
      ).status,
    ).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
});

it("envía una política de referencia compatible con los mapas", async () => {
  const { app } = setup();
  const response = await request(app).get("/admin-api/session");
  expect(response.headers["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
});
