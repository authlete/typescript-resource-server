/**
 * OAuth 2.0 protected resource server. `createResourceServer(config)` is the
 * factory; the default export is the standalone server, built lazily on the
 * first request so importing this module reads no env.
 */

import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { swaggerUI } from "@hono/swagger-ui";
import type { SignableRequest } from "fetch-message-signatures";
import { makeAuthlete } from "./authleteClient.js";
import { fromEnv, type Config } from "./config.js";
import { makeIntrospector, type Introspector } from "./introspection.js";
import { openApiDocument } from "./openapi.js";
import { createResponseSigner, type ResponseSigner } from "./signing.js";
import { responseSigningFor } from "./auth/signingState.js";
import { wellKnownRoutes } from "./routes/well-known.js";
import { jwksRoutes } from "./routes/jwks.js";
import { accountsRoutes } from "./routes/accounts.js";
import { transactionsRoutes } from "./routes/transactions.js";
import { paymentsRoutes } from "./routes/payments.js";

export interface Deps {
  config: Config;
  introspect: Introspector;
  signer: ResponseSigner;
}

export function createResourceServer(config: Config): Hono {
  const authlete = makeAuthlete(config);
  const deps: Deps = {
    config,
    introspect: makeIntrospector(authlete, config),
    signer: createResponseSigner(config.signingKey),
  };
  const app = new Hono();

  // Surface server-side failures (a thrown introspection carries Authlete's own
  // error, e.g. an invalid service id or token) instead of an empty 500.
  app.onError((err, c) => {
    console.error("resource server error:", err);
    return c.json({ error: "server_error", error_description: err.message }, 500);
  });

  // CORS spans every endpoint. Exposing WWW-Authenticate lets a browser client
  // read the challenge; the signature fields let it verify a signed response.
  if (config.allowedOrigins.length > 0) {
    const allowAll = config.allowedOrigins.includes("*");
    app.use(
      "*",
      cors({
        origin: allowAll
          ? "*"
          : (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: [
          "Authorization",
          "Content-Type",
          "Content-Digest",
          "Signature",
          "Signature-Input",
          "DPoP",
          "x-fapi-interaction-id",
        ],
        exposeHeaders: [
          "WWW-Authenticate",
          "Content-Digest",
          "Signature",
          "Signature-Input",
          "x-fapi-interaction-id",
        ],
        maxAge: 600,
      }),
    );
  }

  // Echo the caller's interaction id, or mint one.
  app.use("/api/*", async (c, next) => {
    c.header("x-fapi-interaction-id", c.req.header("x-fapi-interaction-id") ?? randomUUID());
    await next();
  });

  // FAPI 2.0 Resource Response Signing: when introspection flagged the token,
  // digest and sign the successful response on the way out.
  app.use("/api/*", async (c, next) => {
    await next();
    const signing = responseSigningFor(c.req.raw);
    if (!signing) return;
    const res = c.res;
    if (res.status < 200 || res.status >= 300) return;

    const body = await res.clone().text();
    const contentDigest = await deps.signer.contentDigest(body);
    const request: SignableRequest = {
      method: c.req.method,
      url: signing.targetUri,
      headers: c.req.raw.headers,
    };
    const { signatureInput, signature } = await deps.signer.sign({
      request,
      requestHeaders: c.req.raw.headers,
      status: res.status,
      responseContentDigest: contentDigest,
    });

    const headers = new Headers(res.headers);
    headers.set("Content-Digest", contentDigest);
    headers.set("Signature-Input", signatureInput);
    headers.set("Signature", signature);
    c.res = new Response(body, { status: res.status, statusText: res.statusText, headers });
  });

  // Interactive API docs at the root; the raw spec next to it.
  app.get("/openapi.json", (c) => c.json(openApiDocument(config)));
  app.get("/", swaggerUI({ url: "/openapi.json" }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route("/", wellKnownRoutes(deps));
  app.route("/", jwksRoutes(deps));
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
