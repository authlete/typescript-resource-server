/** Local development runner: hosts the standalone server in a Node HTTP listener. */

import { serve } from "@hono/node-server";
import app, { fromEnv } from "./app.js";

const { port } = fromEnv();
serve({ fetch: app.fetch, port }, () => {
  console.log(`typescript-resource-server listening on http://localhost:${port}`);
});
