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

export function openApiDocument(config: Config) {
  return {
    openapi: "3.0.3",
    info: {
      title: "TypeScript Resource Server",
      version: "0.1.0",
      description:
        "OAuth 2.0 protected resource server. Protected endpoints need a Bearer " +
        "access token with the listed scope. Click **Authorize** to add one.",
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
      "/api/accounts": {
        get: {
          summary: "List accounts",
          description: "Requires scope `accounts:read`.",
          security: scoped("accounts:read"),
          responses: {
            "200": { description: "Accounts" },
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
            "200": { description: "Balance" },
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
            "200": { description: "Transactions" },
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
            "201": { description: "Payment accepted" },
            "403": { description: "Insufficient scope" },
          },
        },
      },
    },
  };
}
