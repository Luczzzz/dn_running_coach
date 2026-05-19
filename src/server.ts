import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { registerCoachRoutes } from "./routes/coachRoutes.js";
import { createDatabase } from "./storage/db.js";
import { createRepositories } from "./storage/repositories.js";

export type BuildServerOptions = {
  databasePath?: string;
};

export function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({ logger: false });
  app.register(sensible);

  const db = createDatabase(options.databasePath ?? process.env.RUNNING_COACH_DB ?? ":memory:");
  const repos = createRepositories(db);

  app.get("/health", async () => {
    return { ok: true, service: "running-coach" };
  });

  app.register(async (child) => {
    await registerCoachRoutes(child, repos);
  });

  return app;
}
