/** /api/accounts + /api/accounts/:id/balance — both require accounts:read. */

import { Hono } from "hono";
import type { Deps } from "../app.js";
import { requireScope } from "../auth/requireScope.js";
import { accounts, balances, findAccount } from "../data.js";

export function accountsRoutes(deps: Deps) {
  const app = new Hono();

  app.get("/api/accounts", requireScope("accounts:read", deps), (c) => c.json({ accounts }));

  app.get("/api/accounts/:id/balance", requireScope("accounts:read", deps), (c) => {
    const id = c.req.param("id");
    if (!findAccount(id)) return c.json({ error: "not_found" }, 404);
    return c.json(balances[id]);
  });

  return app;
}
