# typescript-resource-server

An OAuth 2.0 protected resource server built on Hono. Access tokens are
validated against Authlete's introspection API, which also drives FAPI 2.0
message signing.

## Endpoints

| Endpoint                                | Method | Scope                            |
| --------------------------------------- | ------ | -------------------------------- |
| `/api/accounts`                         | GET    | `accounts:read`                  |
| `/api/accounts/:id/balance`             | GET    | `accounts:read`                  |
| `/api/accounts/:id/transactions`        | GET    | `transactions:read`              |
| `/api/payments`                         | POST   | `payments:write`                 |
| `/api/jwks`                             | GET    | — (response-signing public keys) |
| `/.well-known/oauth-protected-resource` | GET    | — (RFC 9728 metadata)            |
| `/`                                     | GET    | — (Swagger UI)                   |
| `/openapi.json`                         | GET    | — (OpenAPI 3 spec)               |

Interactive API docs are served at `/`. Fixed in-memory data for one user
("Sam Smith"). Protected routes return RFC 6750 Bearer challenges — `401`
(no/invalid token) and `403 insufficient_scope` naming the required scope — each
carrying a `resource_metadata` parameter. CORS allows the configured origins and
exposes the challenge and signature headers.

## FAPI 2.0 Message Signing (RFC 9421)

The server introspects each access token against Authlete directly, forwarding
the request's headers and target URI. Authlete verifies an inbound request
signature (when the client sent one) and returns whether the response must be
signed.

When signing is required, the server signs the successful response per
[FAPI 2.0 Message Signing](https://openid.bitbucket.io/fapi/fapi-2_0-message-signing.html):

- `Content-Digest` — SHA-256 of the body ([RFC 9530](https://www.rfc-editor.org/rfc/rfc9530)).
- `Signature-Input` / `Signature` — cover `@method;req`, `@target-uri;req`,
  `authorization;req` (plus `dpop;req` / `content-digest;req` when present),
  `@status`, and `content-digest`, with `created`, `keyid`, and
  `tag="fapi-2-response"`.

Responses are signed with the private key in `RESPONSE_SIGNING_JWK` (ES256). Its
public half is published at `/api/jwks` and advertised as `jwks_uri` in the
protected-resource metadata, so clients can verify.

Generate a signing key:

```bash
npm run gen:key   # prints a RESPONSE_SIGNING_JWK=... line to paste into .env
```

## Environment

Copy `.env.example` to `.env`.

| Var                    | Meaning                                                   | Default                   |
| ---------------------- | --------------------------------------------------------- | ------------------------- |
| `AS_ISSUER`            | Authorization server issuer URL (advertised in metadata)  | `http://localhost:3000`   |
| `AUTHLETE_BASE_URL`    | Authlete API base URL                                     | `https://us.authlete.com` |
| `AUTHLETE_SERVICE_ID`  | **Required.** Authlete service that owns the tokens       | —                         |
| `AUTHLETE_API_TOKEN`   | **Required.** Authlete API token with `USE_INTROSPECTION` | —                         |
| `RESPONSE_SIGNING_JWK` | **Required.** Private ES256 JWK for signing responses     | —                         |
| `RESOURCE_URL`         | This RS's own origin (identity + metadata base)           | `http://localhost:$PORT`  |
| `ALLOWED_ORIGINS`      | CORS allowlist, comma-separated (`*` = any)               | —                         |
| `PORT`                 | Local port                                                | `8090`                    |

## Run

```bash
npm install
npm run gen:key   # paste the output into .env as RESPONSE_SIGNING_JWK
npm run dev
```

Scripts: `gen:key`, `typecheck`, `build`, `start`, `lint`, `format`.
