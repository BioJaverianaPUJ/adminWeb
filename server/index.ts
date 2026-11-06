import "dotenv/config";
import express from "express";
import path from "node:path";
import { createApp } from "./app";
import { createUpstream } from "./upstream";
const production = process.env.NODE_ENV === "production";
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
if (production && !origin.startsWith("https://"))
  throw Error("Configura APP_ORIGIN con HTTPS para producción.");
const port = Number(process.env.PORT ?? 4174);
const app = createApp({
  upstream: createUpstream(
    process.env.BACKEND_URL ??
      "https://biojaveriana.downloadablefox.dev/api/v1",
  ),
  origin,
  production,
  localPort: port,
});
app.use(express.static(path.resolve("dist")));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.resolve("dist/index.html")),
);
app.listen(port, "127.0.0.1", () =>
  console.log(`BioJaveriana Admin: http://localhost:${port}`),
);
