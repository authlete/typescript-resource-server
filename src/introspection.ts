/**
 * Token validation via Authlete's introspection API. The RS forwards the
 * request's HTTP message-signature inputs (headers, target URI, method, DPoP)
 * and the required scope, and returns Authlete's `IntrospectionResponse` as-is:
 * `action` says what to do, `responseContent` is the ready-made challenge
 * (Bearer or DPoP), `dpopNonce` is the nonce to echo, `responseSigningRequired`
 * is the FAPI signing directive. The RS does not re-derive any of it.
 */

import type { Authlete } from "@authlete/typescript-sdk";
import {
  IntrospectionResponseAction,
  type IntrospectionResponse,
} from "@authlete/typescript-sdk/models";
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
  /** Scopes the token must cover; Authlete returns insufficient_scope otherwise. */
  requiredScopes: string[];
}

export type Introspector = (input: IntrospectionInput) => Promise<IntrospectionResponse>;

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
          scopes: input.requiredScopes,
        },
      });
      return result;
    } catch {
      return { action: IntrospectionResponseAction.InternalServerError };
    }
  };
}
