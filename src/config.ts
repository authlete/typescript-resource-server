/** Configuration, built from the process environment by `fromEnv()`. */

import type { PrivateJwk } from "./signing.js";

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function list(name: string): string[] {
  const v = process.env[name];
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Config {
  /** Issuer URL of the OAuth 2.0 authorization server this RS trusts. */
  asIssuer: string;
  /** Base URL of the Authlete API server this RS introspects tokens against. */
  authleteBaseUrl: string;
  /** Authlete service id that owns the tokens this RS accepts. */
  authleteServiceId: string;
  /** Bearer credential for the Authlete API. */
  authleteApiToken: string;
  /** Private JWK (ES256) used to sign resource responses; its public half is published at /api/jwks. */
  signingKey: PrivateJwk;
  /** This server's own canonical origin — its identity and metadata base. No trailing slash. */
  resourceUrl: string;
  allowedOrigins: string[];
  port: number;
}

// Prefer explicit RESOURCE_URL; on Vercel fall back to VERCEL_URL; else local dev.
function resolveResourceUrl(port: number): string {
  const explicit = process.env.RESOURCE_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.length > 0) return `https://${vercelUrl}`;
  return `http://localhost:${port}`;
}

// The response-signing key comes from RESPONSE_SIGNING_JWK (a private JWK).
function resolveSigningKey(): PrivateJwk {
  const jwk = JSON.parse(required("RESPONSE_SIGNING_JWK")) as PrivateJwk;
  if (!jwk.kid) throw new Error("RESPONSE_SIGNING_JWK must include a 'kid'.");
  if (!jwk.d) throw new Error("RESPONSE_SIGNING_JWK must be a private JWK (missing 'd').");
  return jwk;
}

export function fromEnv(): Config {
  const port = parseInt(optional("PORT", "8090"), 10);
  const asIssuer = optional("AS_ISSUER", "https://authlete-as.vercel.app").replace(/\/+$/, "");
  return {
    asIssuer,
    authleteBaseUrl: optional("AUTHLETE_BASE_URL", "https://us.authlete.com").replace(/\/+$/, ""),
    authleteServiceId: required("AUTHLETE_SERVICE_ID"),
    authleteApiToken: required("AUTHLETE_API_TOKEN"),
    signingKey: resolveSigningKey(),
    resourceUrl: resolveResourceUrl(port),
    allowedOrigins: list("ALLOWED_ORIGINS"),
    port,
  };
}
