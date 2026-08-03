/** `requireScope(scope)` — extract the Bearer token, introspect it, and challenge on failure. */

import type { MiddlewareHandler } from "hono";
import type { Deps } from "../app.js";
import { challenge, extractBearer } from "../http.js";
import { hasScope } from "../introspection.js";

export function requireScope(scope: string, { config, introspect }: Deps): MiddlewareHandler {
  return async (c, next) => {
    const token = extractBearer(c.req.header("authorization"));
    if (!token) return challenge(c, config, { status: 401 });

    const result = await introspect(token);
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

    return next();
  };
}
