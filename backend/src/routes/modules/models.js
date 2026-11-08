import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { query } from "../../db/pool.js";
import { requirePermission } from "../../middleware/auth.js";

export const modelsRouter = Router();

modelsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT *
       FROM mobile_models
       WHERE business_id = :businessId
       ORDER BY company, model_name`,
      { businessId: req.user.business_id }
    );
    res.json(rows);
  })
);

modelsRouter.post(
  "/",
  requirePermission("models", "create"),
  asyncHandler(async (req, res) => {
    const { company, modelName, variant, color, storage } = req.body;
    if (!company || !modelName) {
      throw badRequest("Company and modelName are required");
    }

    const result = await query(
      `INSERT INTO mobile_models (business_id, company, model_name, variant, color, storage)
       VALUES (:businessId, :company, :modelName, :variant, :color, :storage)`,
      { businessId: req.user.business_id, company, modelName, variant, color, storage }
    );

    const rows = await query(
      `SELECT * FROM mobile_models WHERE id = :id AND business_id = :businessId`,
      { id: result.insertId, businessId: req.user.business_id }
    );
    res.status(201).json(rows[0]);
  })
);

modelsRouter.put(
  "/:id",
  requirePermission("models", "edit"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id FROM mobile_models WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (!existing) {
      throw badRequest("Model not found");
    }

    const { company, modelName, variant, color, storage } = req.body;
    const updates = [];
    const params = { id: req.params.id, businessId: req.user.business_id };

    if (company !== undefined) {
      updates.push("company = :company");
      params.company = company;
    }
    if (modelName !== undefined) {
      updates.push("model_name = :modelName");
      params.modelName = modelName;
    }
    if (variant !== undefined) {
      updates.push("variant = :variant");
      params.variant = variant || null;
    }
    if (color !== undefined) {
      updates.push("color = :color");
      params.color = color || null;
    }
    if (storage !== undefined) {
      updates.push("storage = :storage");
      params.storage = storage || null;
    }

    if (updates.length > 0) {
      await query(
        `UPDATE mobile_models SET ${updates.join(", ")} WHERE id = :id AND business_id = :businessId`,
        params
      );
    }

    const [updated] = await query(
      "SELECT * FROM mobile_models WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    res.json(updated);
  })
);

modelsRouter.delete(
  "/:id",
  requirePermission("models", "delete"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id FROM mobile_models WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (!existing) {
      throw badRequest("Model not found");
    }

    const [units] = await query(
      "SELECT COUNT(*) AS count FROM mobile_units WHERE model_id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (units && units.count > 0) {
      throw badRequest("Cannot delete mobile model with associated IMEI handset units.");
    }

    await query(
      "DELETE FROM mobile_models WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );

    res.json({ success: true, message: "Model deleted successfully" });
  })
);

