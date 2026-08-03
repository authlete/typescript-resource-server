/** Configuration, built from the process environment by `fromEnv()`. */

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
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
  /** RFC 7662 introspection endpoint the RS POSTs tokens to. */
  introspectionEndpoint: string;
  /** Authorization header value the RS presents to the introspection endpoint. */
  rsAuthorization: string;
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

// A bare RS_CREDENTIAL is sent as a Bearer token; a value already carrying a
// scheme (Basic/Bearer) is sent verbatim.
function resolveRsAuthorization(): string {
  const cred = optional("RS_CREDENTIAL", "demo-rs-credential");
  return /^(Bearer|Basic)\s/i.test(cred) ? cred : `Bearer ${cred}`;
}

export function fromEnv(): Config {
  const port = parseInt(optional("PORT", "8090"), 10);
  const asIssuer = optional("AS_ISSUER", "https://authlete-as.vercel.app").replace(/\/+$/, "");
  return {
    asIssuer,
    introspectionEndpoint: optional("INTROSPECTION_ENDPOINT", `${asIssuer}/oauth/introspect`),
    rsAuthorization: resolveRsAuthorization(),
    resourceUrl: resolveResourceUrl(port),
    allowedOrigins: list("ALLOWED_ORIGINS"),
    port,
  };
}
