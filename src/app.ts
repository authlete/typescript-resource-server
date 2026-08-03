/**
 * OAuth 2.0 protected resource server. `createResourceServer(config)` is the
 * factory; the default export is the standalone server, built lazily on the
 * first request so importing this module reads no env.
 */

import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fromEnv, type Config } from "./config.js";
import { makeIntrospector, type Introspector } from "./introspection.js";
import { wellKnownRoutes } from "./routes/well-known.js";
import { accountsRoutes } from "./routes/accounts.js";
import { transactionsRoutes } from "./routes/transactions.js";
import { paymentsRoutes } from "./routes/payments.js";

export interface Deps {
  config: Config;
  introspect: Introspector;
}

export function createResourceServer(config: Config): Hono {
  const deps: Deps = { config, introspect: makeIntrospector(config) };
  const app = new Hono();

  // CORS spans every endpoint including the well-known document; exposing
  // WWW-Authenticate is what lets a browser client read the challenge.
  if (config.allowedOrigins.length > 0) {
    const allowAll = config.allowedOrigins.includes("*");
    app.use(
      "*",
      cors({
        origin: allowAll
          ? "*"
          : (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Authorization", "Content-Type", "x-fapi-interaction-id"],
        exposeHeaders: ["WWW-Authenticate", "x-fapi-interaction-id"],
        maxAge: 600,
      }),
    );
  }

  // Echo the caller's interaction id, or mint one.
  app.use("/api/*", async (c, next) => {
    c.header("x-fapi-interaction-id", c.req.header("x-fapi-interaction-id") ?? randomUUID());
    await next();
  });

  app.get("/", (c) =>
    c.json({
      name: "typescript-resource-server",
      status: "ok",
      resource: config.resourceUrl,
      authorization_servers: [config.asIssuer],
      protectedResourceMetadata: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
    }),
  );
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route("/", wellKnownRoutes(deps));
  app.route("/", accountsRoutes(deps));
  app.route("/", transactionsRoutes(deps));
  app.route("/", paymentsRoutes(deps));

  return app;
}

export { fromEnv, type Config } from "./config.js";

let standalone: Hono | undefined;
export default {
  fetch(request: Request) {
    standalone ??= createResourceServer(fromEnv());
    return standalone.fetch(request);
  },
};
