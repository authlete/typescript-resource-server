/** RFC 6750 Bearer challenges. Every challenge carries `resource_metadata`. */

import type { Context } from "hono";
import type { Config } from "./config.js";

export const jsonHeaders = { "content-type": "application/json" } as const;

function resourceMetadataUrl(config: Config): string {
  return `${config.resourceUrl}/.well-known/oauth-protected-resource`;
}

/** The RFC 9728 `resource_metadata` auth-param, to append to a WWW-Authenticate. */
export function resourceMetadataParam(config: Config): string {
  return `resource_metadata="${resourceMetadataUrl(config)}"`;
}

// The access token is presented after the scheme: `Bearer` (RFC 6750) or `DPoP`
// (RFC 9449) when the token is sender-constrained. Authlete validates the DPoP
// binding from the forwarded `DPoP` header during introspection.
export function extractAccessToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^(?:Bearer|DPoP)\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || undefined;
}

function bearerChallenge(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([k, v]) => `${k}="${v.replace(/"/g, "'")}"`);
  return parts.length > 0 ? `Bearer ${parts.join(", ")}` : "Bearer";
}

export function challenge(
  c: Context,
  config: Config,
  opts: {
    status: 401 | 403;
    error?: "invalid_token" | "insufficient_scope";
    description?: string;
    scope?: string;
  },
): Response {
  c.header(
    "WWW-Authenticate",
    bearerChallenge({
      error: opts.error,
      error_description: opts.description,
      scope: opts.scope,
      resource_metadata: resourceMetadataUrl(config),
    }),
  );
  const body: { error?: string; error_description?: string } = {};
  if (opts.error) body.error = opts.error;
  if (opts.description) body.error_description = opts.description;
  return c.body(JSON.stringify(body), opts.status, jsonHeaders);
}
