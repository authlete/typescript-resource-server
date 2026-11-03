/**
 * Token validation via Authlete's introspection API. Beyond `{ active, scope }`
 * it forwards the request's HTTP message-signature inputs (headers, target URI,
 * method) so Authlete can verify an inbound request signature and tell the RS
 * whether the response must be signed (FAPI 2.0 Resource Response Signing).
 */

import type { Authlete } from "@authlete/typescript-sdk";
import { IntrospectionResponseAction } from "@authlete/typescript-sdk/models";
import type { Config } from "./config.js";

export interface IntrospectionInput {
  token: string;
  /** HTTP method of the resource request. */
  method: string;
  /** Target URI of the resource request (the RS's public URL, including query). */
  targetUri: string;
  /** Same URL without query — used for DPoP `htu` validation. */
  htu: string;
  /** Every request header, for request-signature verification. */
  headers: Array<{ key: string; value: string }>;
  dpop?: string | undefined;
  requestBodyContained: boolean;
}

export interface Introspection {
  active: boolean;
  /** Space-delimited granted scopes. */
  scope?: string;
  /** Whether the response must carry a FAPI message signature. */
  responseSigningRequired: boolean;
}

export type Introspector = (input: IntrospectionInput) => Promise<Introspection>;

export function makeIntrospector(authlete: Authlete, config: Config): Introspector {
  return async (input) => {
    try {
      const { result } = await authlete.introspection.process({
        serviceId: config.authleteServiceId,
        introspectionRequest: {
          token: input.token,
          htm: input.method,
          htu: input.htu,
          targetUri: input.targetUri,
          headers: input.headers,
          dpop: input.dpop,
          requestBodyContained: input.requestBodyContained,
        },
      });
      return {
        active: result.action === IntrospectionResponseAction.Ok,
        scope: result.scopes?.join(" "),
        responseSigningRequired: result.responseSigningRequired === true,
      };
    } catch {
      return { active: false, responseSigningRequired: false };
    }
  };
}

export function hasScope(scope: string | undefined, required: string): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes(required);
}
