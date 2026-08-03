/** RFC 9728 Protected Resource Metadata — the discovery entry point. */

import { Hono } from "hono";
import type { Deps } from "../app.js";

export function wellKnownRoutes({ config }: Deps) {
  const wellKnown = new Hono();

  wellKnown.get("/.well-known/oauth-protected-resource", (c) =>
    c.json({
      resource: config.resourceUrl,
      authorization_servers: [config.asIssuer],
      scopes_supported: ["accounts:read", "transactions:read", "payments:write"],
      bearer_methods_supported: ["header"],
      resource_name: "Sample API",
      resource_documentation: `${config.resourceUrl}/`,
    }),
  );

  return wellKnown;
}
