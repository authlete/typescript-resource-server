/** `requireScope(scope)` — pull the access token (Bearer or DPoP), have Authlete introspect it, and challenge on failure. */

import type { MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { IntrospectionResponseAction } from "@authlete/typescript-sdk/models";
import type { Deps } from "../app.js";
import { challenge, extractAccessToken, jsonHeaders, resourceMetadataParam } from "../http.js";
import { markResponseSigning } from "./signingState.js";

// Authlete returns an `action`, not an HTTP status; translate it here.
// Anything not listed is 401.
const STATUS: Partial<Record<IntrospectionResponseAction, ContentfulStatusCode>> = {
  [IntrospectionResponseAction.Forbidden]: 403,
  [IntrospectionResponseAction.BadRequest]: 400,
  [IntrospectionResponseAction.InternalServerError]: 500,
};

export function requireScope(scope: string, { config, introspect }: Deps): MiddlewareHandler {
  return async (c, next) => {
    const token = extractAccessToken(c.req.header("authorization"));
    if (!token) {
      // No token means no introspection to run; return the missing-token challenge.
      return challenge(c, config, {
        status: 401,
        error: "invalid_token",
        description: "An access token is missing.",
      });
    }

    // The RS's public origin is authoritative for the signed @target-uri/htu,
    // independent of any proxy's view of the request URL.
    const url = new URL(c.req.url);
    const targetUri = `${config.resourceUrl}${url.pathname}${url.search}`;

    const result = await introspect({
      token,
      method: c.req.method,
      targetUri,
      htu: `${config.resourceUrl}${url.pathname}`,
      headers: [...c.req.raw.headers].map(([key, value]) => ({ key, value })),
      dpop: c.req.header("dpop"),
      requestBodyContained: !["GET", "HEAD"].includes(c.req.method),
      requiredScopes: [scope],
    });

    if (result.action !== IntrospectionResponseAction.Ok) {
      // Echo Authlete's challenge as-is — it already carries the right scheme,
      // error, and algs — only appending the RFC 9728 pointer it omits.
      if (result.dpopNonce) c.header("DPoP-Nonce", result.dpopNonce);
      if (result.responseContent) {
        c.header("WWW-Authenticate", `${result.responseContent}, ${resourceMetadataParam(config)}`);
      }
      return c.body("{}", (result.action && STATUS[result.action]) ?? 401, jsonHeaders);
    }

    if (result.responseSigningRequired) markResponseSigning(c.req.raw, targetUri);
    return next();
  };
}
