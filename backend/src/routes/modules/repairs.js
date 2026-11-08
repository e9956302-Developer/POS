import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { query } from "../../db/pool.js";
import {
  assertBranchAccess,
  businessScopeCondition,
  businessScopeParams,
  requirePermission
} from "../../middleware/auth.js";

export const repairsRouter = Router();

function generateTicketNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REP-${dateStr}-${rand}`;
}

repairsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, status, search, from, to } = req.query;
    let sql = `
      SELECT rt.*, b.name AS branch_name
      FROM repair_tickets rt
      JOIN branches b ON b.id = rt.branch_id
      WHERE ${businessScopeCondition(req.user, "b")}
    `;
    const params = businessScopeParams(req.user);

    if (branchId) {
      sql += ` AND rt.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (status && status !== "all") {
      sql += ` AND rt.status = :status`;
      params.status = status;
    }
    if (search) {
      sql += ` AND (
        rt.ticket_number LIKE :search1 OR
        rt.customer_name LIKE :search2 OR
        rt.customer_phone LIKE :search3 OR
        rt.model_name LIKE :search4 OR
        rt.imei LIKE :search5
      )`;
      params.search1 = `%${search}%`;
      params.search2 = `%${search}%`;
      params.search3 = `%${search}%`;
      params.search4 = `%${search}%`;
      params.search5 = `%${search}%`;
    }
    if (from) {
      sql += ` AND rt.received_date >= :from`;
      params.from = from;
    }
    if (to) {
      sql += ` AND rt.received_date <= :to`;
      params.to = to;
    }

    sql += ` ORDER BY rt.received_date DESC, rt.id DESC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

repairsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [ticket] = await query(
      `SELECT rt.*, b.name AS branch_name
       FROM repair_tickets rt
       JOIN branches b ON b.id = rt.branch_id
       WHERE rt.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!ticket) {
      const err = new Error("Repair ticket not found");
      err.status = 404;
      throw err;
    }
    res.json(ticket);
  })
);

repairsRouter.post(
  "/",
  requirePermission("repairs", "create"),
  asyncHandler(async (req, res) => {
    const {
      branchId,
      customerId = null,
      customerName,
      customerPhone = null,
      modelName,
      imei = null,
      serialNumber = null,
      issueDescription,
      estimatedCost = 0,
      advancePaid = 0,
      warrantyDays = 0,
      technicianName = null,
      receivedDate = new Date().toISOString().slice(0, 10)
    } = req.body;

    if (!branchId || !customerName || !modelName || !issueDescription) {
      throw badRequest("branchId, customerName, modelName, and issueDescription are required");
    }

    await assertBranchAccess(req.user, branchId);

    const ticketNumber = generateTicketNumber();

    const result = await query(
      `INSERT INTO repair_tickets (
         business_id, branch_id, ticket_number, customer_id, customer_name,
         customer_phone, model_name, imei, serial_number, issue_description,
         estimated_cost, advance_paid, warranty_days, technician_name,
         received_date, created_by, status
       ) VALUES (
         :businessId, :branchId, :ticketNumber, :customerId, :customerName,
         :customerPhone, :modelName, :imei, :serialNumber, :issueDescription,
         :estimatedCost, :advancePaid, :warrantyDays, :technicianName,
         :receivedDate, :createdBy, 'received'
       )`,
      {
        businessId: req.user.business_id,
        branchId,
        ticketNumber,
        customerId,
        customerName,
        customerPhone,
        modelName,
        imei,
        serialNumber,
        issueDescription,
        estimatedCost: Number(estimatedCost || 0),
        advancePaid: Number(advancePaid || 0),
        warrantyDays: Number(warrantyDays || 0),
        technicianName,
        receivedDate,
        createdBy: req.user.id
      }
    );

    res.status(201).json({
      id: result.insertId,
      ticketNumber,
      message: "Repair ticket created successfully"
    });
  })
);

repairsRouter.put(
  "/:id/status",
  requirePermission("repairs", "edit"),
  asyncHandler(async (req, res) => {
    const {
      status,
      actualCost,
      diagnosisNotes,
      technicianName,
      warrantyDays
    } = req.body;

    const [existing] = await query(
      `SELECT rt.*
       FROM repair_tickets rt
       JOIN branches b ON b.id = rt.branch_id
       WHERE rt.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );

    if (!existing) {
      const err = new Error("Repair ticket not found");
      err.status = 404;
      throw err;
    }

    let deliveredDate = existing.delivered_date;
    let warrantyUntil = existing.warranty_until;
    const finalWarrantyDays = warrantyDays !== undefined ? Number(warrantyDays) : Number(existing.warranty_days);

    if (status === "delivered" && existing.status !== "delivered") {
      deliveredDate = new Date().toISOString().slice(0, 10);
      if (finalWarrantyDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + finalWarrantyDays);
        warrantyUntil = d.toISOString().slice(0, 10);
      }
    }

    await query(
      `UPDATE repair_tickets
       SET status = COALESCE(:status, status),
           actual_cost = COALESCE(:actualCost, actual_cost),
           diagnosis_notes = COALESCE(:diagnosisNotes, diagnosis_notes),
           technician_name = COALESCE(:technicianName, technician_name),
           warranty_days = :warrantyDays,
           warranty_until = :warrantyUntil,
           delivered_date = :deliveredDate
       WHERE id = :id`,
      {
        id: req.params.id,
        status: status || existing.status,
        actualCost: actualCost !== undefined ? Number(actualCost) : existing.actual_cost,
        diagnosisNotes: diagnosisNotes !== undefined ? diagnosisNotes : existing.diagnosis_notes,
        technicianName: technicianName !== undefined ? technicianName : existing.technician_name,
        warrantyDays: finalWarrantyDays,
        warrantyUntil,
        deliveredDate
      }
    );

    res.json({ message: "Repair ticket status updated successfully" });
  })
);

repairsRouter.delete(
  "/:id",
  requirePermission("repairs", "delete"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      `SELECT rt.*
       FROM repair_tickets rt
       JOIN branches b ON b.id = rt.branch_id
       WHERE rt.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );

    if (!existing) {
      const err = new Error("Repair ticket not found");
      err.status = 404;
      throw err;
    }

    await query(`UPDATE repair_tickets SET status = 'cancelled' WHERE id = :id`, { id: req.params.id });
    res.json({ message: "Repair ticket cancelled" });
  })
);
