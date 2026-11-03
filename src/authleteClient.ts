/** Builds the Authlete SDK client this RS uses to introspect access tokens. */

import { Authlete } from "@authlete/typescript-sdk";
import type { Config } from "./config.js";

export function makeAuthlete(config: Config): Authlete {
  return new Authlete({
    serverURL: config.authleteBaseUrl,
    bearer: config.authleteApiToken,
  });
}
