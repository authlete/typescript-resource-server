# typescript-resource-server

An OAuth 2.0 protected resource server built on Hono. Tokens are validated
against the authorization server's RFC 7662 introspection endpoint.

## Endpoints

| Endpoint                                | Method | Scope                 |
| --------------------------------------- | ------ | --------------------- |
| `/api/accounts`                         | GET    | `accounts:read`       |
| `/api/accounts/:id/balance`             | GET    | `accounts:read`       |
| `/api/accounts/:id/transactions`        | GET    | `transactions:read`   |
| `/api/payments`                         | POST   | `payments:write`      |
| `/.well-known/oauth-protected-resource` | GET    | — (RFC 9728 metadata) |
| `/`                                     | GET    | — (Swagger UI)        |
| `/openapi.json`                         | GET    | — (OpenAPI 3 spec)    |

Interactive API docs are served at `/` — use **Authorize** to add a token, then
**Try it out**. Fixed in-memory data for one user ("Sam Smith"). Protected routes return RFC 6750
Bearer challenges — `401` (no/invalid token) and `403 insufficient_scope` naming
the required scope — each carrying a `resource_metadata` parameter. CORS allows
the configured origins and exposes `WWW-Authenticate`.

## Environment

Copy `.env.example` to `.env`.

| Var                      | Meaning                                            | Default                          |
| ------------------------ | -------------------------------------------------- | -------------------------------- |
| `AS_ISSUER`              | Authorization server issuer URL                    | `https://authlete-as.vercel.app` |
| `INTROSPECTION_ENDPOINT` | RFC 7662 endpoint override                         | `${AS_ISSUER}/oauth/introspect`  |
| `RS_CREDENTIAL`          | Credential presented to the introspection endpoint | `demo-rs-credential`             |
| `RESOURCE_URL`           | This RS's own origin (identity + metadata base)    | `http://localhost:$PORT`         |
| `ALLOWED_ORIGINS`        | CORS allowlist, comma-separated (`*` = any)        | —                                |
| `PORT`                   | Local port                                         | `8090`                           |

## Run

```bash
npm install
npm run dev
```

Scripts: `typecheck`, `build`, `start`, `lint`, `format`.
