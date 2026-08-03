/**
 * Token validation via RFC 7662 OAuth 2.0 Token Introspection: POST the token
 * to the AS's introspection endpoint with the RS's own credential. Any non-2xx
 * or transport failure is treated as inactive.
 */

import type { Config } from "./config.js";

export interface Introspection {
  active: boolean;
  /** Space-delimited granted scopes. */
  scope?: string;
}

export type Introspector = (token: string) => Promise<Introspection>;

export function makeIntrospector(config: Config): Introspector {
  return async (token) => {
    const body = new URLSearchParams({ token, token_type_hint: "access_token" });
    try {
      const res = await fetch(config.introspectionEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          authorization: config.rsAuthorization,
        },
        body: body.toString(),
      });
      if (!res.ok) return { active: false };
      const json = (await res.json()) as Introspection;
      return { active: json.active === true, scope: json.scope };
    } catch {
      return { active: false };
    }
  };
}

export function hasScope(scope: string | undefined, required: string): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes(required);
}
