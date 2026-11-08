export async function createAuditLog(connection, { userId, actionType, entityType, entityId, details }) {
  await connection.execute(
    `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, actionType, entityType, entityId, JSON.stringify(details || {})]
  );
}

