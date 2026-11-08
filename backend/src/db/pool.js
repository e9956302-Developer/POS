import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const poolConfig = env.databaseUrl
  ? {
      uri: env.databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      ...(env.dbSsl ? { ssl: { rejectUnauthorized: false } } : {})
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      ...(env.dbSsl ? { ssl: { rejectUnauthorized: false } } : {})
    };

export const pool = mysql.createPool(poolConfig);

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

