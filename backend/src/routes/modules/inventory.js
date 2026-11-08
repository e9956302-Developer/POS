import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { query } from "../../db/pool.js";
import { businessScopeCondition, businessScopeParams } from "../../middleware/auth.js";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/units",
  asyncHandler(async (req, res) => {
    const { branchId, status, company, modelId, search } = req.query;
    let sql = `
      SELECT mu.*, mm.company, mm.model_name, mm.variant, mm.color, mm.storage
      FROM mobile_units mu
      JOIN mobile_models mm ON mm.id = mu.model_id
      JOIN branches b ON b.id = mu.branch_id
      WHERE ${businessScopeCondition(req.user, "b")}`;
    const params = businessScopeParams(req.user);

    if (branchId) {
      sql += ` AND mu.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (status) {
      sql += ` AND mu.current_status = :status`;
      params.status = status;
    }
    if (company) {
      sql += ` AND mm.company = :company`;
      params.company = company;
    }
    if (modelId) {
      sql += ` AND mu.model_id = :modelId`;
      params.modelId = modelId;
    }
    if (search) {
      sql += ` AND (mu.imei LIKE :search1 OR mm.model_name LIKE :search2 OR mm.company LIKE :search3)`;
      params.search1 = `%${search}%`;
      params.search2 = `%${search}%`;
      params.search3 = `%${search}%`;
    }

    sql += ` ORDER BY mu.created_at DESC`;
    res.json(await query(sql, params));
  })
);

inventoryRouter.get(
  "/lookup/:imei",
  asyncHandler(async (req, res) => {
    const [unit] = await query(
      `SELECT mu.*, mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
              po.invoice_number AS purchase_invoice,
              po.purchase_date,
              p1.name AS vendor_name,
              so.invoice_number AS sale_invoice,
              so.sale_date,
              p2.name AS customer_name
       FROM mobile_units mu
       JOIN mobile_models mm ON mm.id = mu.model_id
       JOIN purchase_orders po ON po.id = mu.purchase_order_id
       JOIN branches b ON b.id = mu.branch_id
       LEFT JOIN parties p1 ON p1.id = po.vendor_id
       LEFT JOIN sale_orders so ON so.id = mu.sale_order_id
       LEFT JOIN parties p2 ON p2.id = so.customer_id
       WHERE mu.business_id = :businessId
         AND mu.imei = :imei
         AND ${businessScopeCondition(req.user, "b")}`,
      { imei: req.params.imei, ...businessScopeParams(req.user) }
    );

    const payments = unit?.sale_order_id
      ? await query(
          `SELECT * FROM payments WHERE reference_type = 'sale' AND reference_id = :referenceId ORDER BY payment_date`,
          { referenceId: unit.sale_order_id }
        )
      : [];

    res.json({ ...unit, payments });
  })
);

