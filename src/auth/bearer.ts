/** `requireScope(scope)` — extract the Bearer token, introspect it, and challenge on failure. */

import type { MiddlewareHandler } from "hono";
import type { Deps } from "../app.js";
import { challenge, extractBearer } from "../http.js";
import { hasScope } from "../introspection.js";
import { markResponseSigning } from "./signingState.js";

export function requireScope(scope: string, { config, introspect }: Deps): MiddlewareHandler {
  return async (c, next) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) return challenge(c, config, { status: 401 });

    // The RS's public origin is authoritative for the signed @target-uri/htu,
    // independent of any proxy's view of the request URL.
    const url = new URL(c.req.url);
    const targetUri = `${config.resourceUrl}${url.pathname}${url.search}`;
    const htu = `${config.resourceUrl}${url.pathname}`;
    const headers = [...c.req.raw.headers].map(([key, value]) => ({ key, value }));

    const result = await introspect({
      token,
      method: c.req.method,
      targetUri,
      htu,
      headers,
      dpop: c.req.header("dpop"),
      requestBodyContained: !["GET", "HEAD"].includes(c.req.method),
    });

    if (!result.active) {
      return challenge(c, config, {
        status: 401,
        error: "invalid_token",
        description: "The access token is invalid, expired, or revoked.",
      });
    }
    if (!hasScope(result.scope, scope)) {
      return challenge(c, config, {
        status: 403,
        error: "insufficient_scope",
        scope,
        description: `The access token needs the ${scope} scope.`,
      });
    }

    if (result.responseSigningRequired) markResponseSigning(c.req.raw, targetUri);
    return next();
  };
}
