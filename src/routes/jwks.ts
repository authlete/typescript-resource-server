/** /api/jwks — the public key clients use to verify signed responses. */

import { Hono } from "hono";
import type { Deps } from "../app.js";
import { toPublicJwk } from "../signing.js";

export function jwksRoutes({ config }: Deps) {
  const app = new Hono();

  app.get("/api/jwks", (c) => {
    c.header("content-type", "application/jwk-set+json");
    return c.body(JSON.stringify({ keys: [toPublicJwk(config.signingKey)] }));
  });

  return app;
}
