/** Hand-written OpenAPI 3 description, served at /openapi.json and rendered at /. */

import type { Config } from "./config.js";

const accountId = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", example: "acc-001" },
} as const;

// Each protected operation declares its scope on the oauth2 scheme (the
// machine-readable form clients like the playground consume); bearerAuth
// stays as an alternative so a pasted token still works in the rendered UI.
const scoped = (scope: string) => [{ oauth2: [scope] }, { bearerAuth: [] }];

// Headers a protected response carries when FAPI 2.0 response signing applies.
const signedResponseHeaders = {
  Signature: {
    schema: { type: "string" },
    description: "RFC 9421 HTTP message signature.",
  },
  "Signature-Input": {
    schema: { type: "string" },
    description: "Covered components and metadata for the Signature.",
  },
  "Content-Digest": {
    schema: { type: "string" },
    description: "RFC 9530 SHA-256 digest of the response body.",
  },
} as const;

export function openApiDocument(config: Config) {
  return {
    openapi: "3.0.3",
    info: {
      title: "TypeScript Resource Server",
      version: "0.1.0",
      description:
        "OAuth 2.0 protected resource server. Protected endpoints need a Bearer " +
        "access token with the listed scope. Click **Authorize** to add one. " +
        "When the token's client requires FAPI 2.0 message signing, successful " +
        "responses carry `Signature`, `Signature-Input`, and `Content-Digest` " +
        "headers; verify them against the keys at `/api/jwks`.",
    },
    servers: [{ url: config.resourceUrl }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "OAuth 2.0 access token" },
        oauth2: {
          type: "oauth2",
          description: "Authorization code flow at the AS this resource trusts",
          flows: {
            authorizationCode: {
              authorizationUrl: `${config.asIssuer}/oauth/authorize`,
              tokenUrl: `${config.asIssuer}/oauth/token`,
              scopes: {
                "accounts:read": "List accounts and read balances",
                "transactions:read": "Read transaction history",
                "payments:write": "Initiate payments",
              },
            },
          },
        },
      },
    },
    paths: {
      "/.well-known/oauth-protected-resource": {
        get: {
          summary: "Protected resource metadata (RFC 9728)",
          responses: { "200": { description: "Metadata document" } },
        },
      },
      "/api/jwks": {
        get: {
          summary: "Response-signing public keys (JWK Set)",
          description:
            "The public keys clients use to verify FAPI 2.0 signed responses. " +
            "Advertised as `jwks_uri` in the protected-resource metadata.",
          responses: { "200": { description: "JWK Set" } },
        },
      },
      "/api/accounts": {
        get: {
          summary: "List accounts",
          description: "Requires scope `accounts:read`.",
          security: scoped("accounts:read"),
          responses: {
            "200": { description: "Accounts", headers: signedResponseHeaders },
            "401": { description: "Missing/invalid token" },
          },
        },
      },
      "/api/accounts/{id}/balance": {
        get: {
          summary: "Get account balance",
          description: "Requires scope `accounts:read`.",
          security: scoped("accounts:read"),
          parameters: [accountId],
          responses: {
            "200": { description: "Balance", headers: signedResponseHeaders },
            "404": { description: "Unknown account" },
          },
        },
      },
      "/api/accounts/{id}/transactions": {
        get: {
          summary: "List account transactions",
          description: "Requires scope `transactions:read`.",
          security: scoped("transactions:read"),
          parameters: [accountId],
          responses: {
            "200": {
              description: "Transactions",
              headers: signedResponseHeaders,
            },
            "403": { description: "Insufficient scope" },
          },
        },
      },
      "/api/payments": {
        post: {
          summary: "Initiate a payment",
          description: "Requires scope `payments:write`. Nothing is persisted.",
          security: scoped("payments:write"),
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fromAccountId", "to", "amount", "currency"],
                  properties: {
                    fromAccountId: { type: "string", example: "acc-001" },
                    to: { type: "string", example: "GB94 NWBK 0000 0000 0000 00" },
                    amount: { type: "number", example: 25.5 },
                    currency: { type: "string", example: "GBP" },
                    reference: { type: "string", example: "Invoice 42" },
                  },
                },
                example: {
                  fromAccountId: "acc-001",
                  to: "GB94 NWBK 0000 0000 0000 00",
                  amount: 25.5,
                  currency: "GBP",
                  reference: "Invoice 42",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Payment accepted",
              headers: signedResponseHeaders,
            },
            "403": { description: "Insufficient scope" },
          },
        },
      },
    },
  };
}
