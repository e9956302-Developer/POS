import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { query } from "../../db/pool.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams } from "../../middleware/auth.js";

export const notificationsRouter = Router();

const sseClients = new Set();

export function broadcastNotification({ businessId, branchId = null, notification }) {
  for (const client of sseClients) {
    if (
      client.businessId === businessId &&
      (!branchId || !client.branchId || Number(client.branchId) === Number(branchId))
    ) {
      try {
        client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
      } catch {
        // ignore broken sockets
      }
    }
  }
}

notificationsRouter.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  const client = {
    res,
    businessId: req.user.business_id,
    branchId: req.user.branch_id,
    userId: req.user.id
  };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);

  req.on("close", () => {
    sseClients.delete(client);
  });
});

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = req.query.branchId;
    if (branchId) {
      await assertBranchAccess(req.user, branchId);
    }
    const rows = await query(
      `SELECT n.*, b.name AS branch_name, b.code AS branch_code
       FROM notifications n
       JOIN branches b ON b.id = n.branch_id
       WHERE ${businessScopeCondition(req.user, "b")}
         ${branchId ? "AND n.branch_id = :branchId" : ""}
       ORDER BY n.created_at DESC`,
      { ...businessScopeParams(req.user), ...(branchId ? { branchId } : {}) }
    );
    res.json(rows);
  })
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE notifications n
       JOIN branches b ON b.id = n.branch_id
       SET n.is_read = 1
       WHERE n.id = :id
         AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    res.json({ success: true });
  })
);
