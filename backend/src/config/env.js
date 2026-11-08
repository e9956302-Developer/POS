import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : "change-me-dev-only");

if (!jwtSecret && isProduction) {
  throw new Error("JWT_SECRET is required in production");
}

export const env = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  jwtSecret: jwtSecret || "change-me-dev-only",
  databaseUrl: process.env.DATABASE_URL || process.env.MYSQL_URL || null,
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
  dbName: process.env.DB_NAME || "mobile_pos",
  dbSsl: process.env.DB_SSL === "true" || (isProduction && Boolean(process.env.DATABASE_URL)),
  enforceTopAdminMfa: process.env.ENFORCE_TOP_ADMIN_MFA === "false"
};

