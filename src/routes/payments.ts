/** /api/payments — requires payments:write. Nothing is persisted. */

import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { Deps } from "../app.js";
import { requireScope } from "../auth/requireScope.js";
import { findAccount } from "../data.js";

interface PaymentRequest {
  fromAccountId?: string;
  to?: string;
  amount?: number;
  currency?: string;
  reference?: string;
}

export function paymentsRoutes(deps: Deps) {
  const app = new Hono();

  app.post("/api/payments", requireScope("payments:write", deps), async (c) => {
    let body: PaymentRequest;
    try {
      body = await c.req.json<PaymentRequest>();
    } catch {
      return c.json({ error: "invalid_request", error_description: "Body must be JSON." }, 400);
    }

    const { fromAccountId, to, amount, currency } = body;
    if (!fromAccountId || !to || typeof amount !== "number" || !currency) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "fromAccountId, to, amount and currency are required.",
        },
        400,
      );
    }
    if (!findAccount(fromAccountId)) return c.json({ error: "not_found" }, 404);

    return c.json({ paymentId: randomUUID(), status: "accepted" }, 201);
  });

  return app;
}
