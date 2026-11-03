// Generates an ES256 response-signing JWK and prints a ready-to-paste
// RESPONSE_SIGNING_JWK=... line (kid = RFC 7638 thumbprint). Run: npm run gen:key
import { webcrypto as crypto } from "node:crypto";

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const priv = await crypto.subtle.exportKey("jwk", privateKey);
const pub = await crypto.subtle.exportKey("jwk", publicKey);
const thumbprintInput = JSON.stringify({ crv: pub.crv, kty: pub.kty, x: pub.x, y: pub.y });
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(thumbprintInput));
const kid = Buffer.from(digest).toString("base64url");

const jwk = {
  alg: "ES256",
  use: "sig",
  kid,
  kty: priv.kty,
  crv: priv.crv,
  x: priv.x,
  y: priv.y,
  d: priv.d,
};
console.log(`RESPONSE_SIGNING_JWK=${JSON.stringify(jwk)}`);
