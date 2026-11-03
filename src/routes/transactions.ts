/** /api/accounts/:id/transactions — requires transactions:read. */

import { Hono } from "hono";
import type { Deps } from "../app.js";
import { requireScope } from "../auth/requireScope.js";
import { findAccount, transactions } from "../data.js";

export function transactionsRoutes(deps: Deps) {
  const app = new Hono();

  app.get("/api/accounts/:id/transactions", requireScope("transactions:read", deps), (c) => {
    const id = c.req.param("id");
    if (!findAccount(id)) return c.json({ error: "not_found" }, 404);
    return c.json({ accountId: id, transactions: transactions[id] ?? [] });
  });

  return app;
}
