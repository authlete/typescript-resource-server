/**
 * FAPI 2.0 Resource Response Signing (RFC 9421 HTTP Message Signatures).
 *
 * A response signature covers the triggering request's method, target URI and
 * authorization (each `;req`), the response status, and the response body's
 * Content-Digest — plus the request's dpop and content-digest when present. The
 * signature metadata carries `created`, `keyid`, and `tag="fapi-2-response"`.
 */

import type { JsonWebKey } from "node:crypto";
import {
  createSignature,
  ecdsaP256Sha256Signer,
  type ComponentIdentifier,
  type SignableRequest,
  type SignerFactory,
} from "fetch-message-signatures";

const FAPI_RESPONSE_TAG = "fapi-2-response";

export interface ResponseSigner {
  /** RFC 9530 Content-Digest field value (`sha-256=:…:`) for a response body. */
  contentDigest(body: string): Promise<string>;
  /** The Signature-Input and Signature field values for a response. */
  sign(input: {
    /** The triggering request, used to resolve the `;req` components. */
    request: SignableRequest;
    /** The triggering request's headers, to decide which `;req` components apply. */
    requestHeaders: Headers;
    status: number;
    responseContentDigest: string;
  }): Promise<{ signatureInput: string; signature: string }>;
}

export function createResponseSigner(privateJwk: PrivateJwk): ResponseSigner {
  let signer: Promise<SignerFactory> | undefined;
  const getSigner = () => (signer ??= importSigner(privateJwk));

  return {
    async contentDigest(body) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
      return `sha-256=:${Buffer.from(digest).toString("base64")}:`;
    },

    async sign({ request, requestHeaders, status, responseContentDigest }) {
      const fields = await createSignature(
        { status, headers: { "content-digest": responseContentDigest } },
        {
          request,
          signer: await getSigner(),
          components: coveredComponents(requestHeaders),
          label: "sig",
          parameters: { keyid: privateJwk.kid, tag: FAPI_RESPONSE_TAG },
        },
      );
      return { signatureInput: fields.signatureInput, signature: fields.signatureField };
    },
  };
}

async function importSigner(jwk: PrivateJwk): Promise<SignerFactory> {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return ecdsaP256Sha256Signer(key);
}

// Request-bound components carry `;req`; dpop and the request content-digest are
// covered only when the request actually carries those fields.
function coveredComponents(requestHeaders: Headers): ComponentIdentifier[] {
  const req = (name: string): ComponentIdentifier => ({ name, parameters: { req: true } });
  const components: ComponentIdentifier[] = [
    req("@method"),
    req("@target-uri"),
    req("authorization"),
  ];
  if (requestHeaders.has("dpop")) components.push(req("dpop"));
  if (requestHeaders.has("content-digest")) components.push(req("content-digest"));
  components.push("@status", "content-digest");
  return components;
}

export type PrivateJwk = JsonWebKey & { kid: string };

/** The public half of a signing JWK, for publication in a JWK Set. */
export function toPublicJwk(jwk: PrivateJwk): JsonWebKey {
  const pub: JsonWebKey = { ...jwk };
  delete pub.d;
  return pub;
}
