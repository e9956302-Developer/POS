import mysql from "mysql2/promise";
import { env } from "../config/env.js";

function buildPoolConfig() {
  if (env.databaseUrl) {
    try {
      const parsed = new URL(env.databaseUrl);
      const sslMode = parsed.searchParams.get("ssl-mode") || parsed.searchParams.get("ssl");
      const requiresSsl =
        env.dbSsl ||
        sslMode === "REQUIRED" ||
        sslMode === "true";
      const useSsl =
        process.env.DB_SSL === "false"
          ? false
          : parsed.hostname.endsWith(".railway.internal")
          ? process.env.DB_SSL === "true"
          : requiresSsl;

      return {
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ""),
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
      };
    } catch {
      return {
        uri: env.databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        ...(env.dbSsl ? { ssl: { rejectUnauthorized: false } } : {})
      };
    }
  }

  return {
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
}

export const pool = mysql.createPool(buildPoolConfig());

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

