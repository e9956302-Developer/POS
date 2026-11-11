import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder first, then fallback to current working directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : "change-me-dev-only");

if (!jwtSecret && isProduction) {
  throw new Error("JWT_SECRET is required in production");
}

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  null;

const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || "127.0.0.1";
const isLocalOrPrivateHost =
  dbHost === "127.0.0.1" ||
  dbHost === "localhost" ||
  dbHost.endsWith(".railway.internal");

const dbSsl =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === "true"
    : Boolean(
        databaseUrl &&
          (databaseUrl.includes("ssl-mode=REQUIRED") ||
            databaseUrl.includes("ssl=true") ||
            (isProduction && !databaseUrl.includes(".railway.internal")))
      ) ||
      (isProduction && !isLocalOrPrivateHost && !dbHost.endsWith(".proxy.rlwy.net"));

export const env = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  jwtSecret: jwtSecret || "change-me-dev-only",
  databaseUrl,
  dbHost,
  dbPort: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  dbUser: process.env.DB_USER || process.env.MYSQLUSER || "root",
  dbPassword:
    process.env.DB_PASSWORD !== undefined
      ? process.env.DB_PASSWORD
      : process.env.MYSQLPASSWORD !== undefined
      ? process.env.MYSQLPASSWORD
      : "",
  dbName: process.env.DB_NAME || process.env.MYSQLDATABASE || "mobile_pos",
  dbSsl,
  enforceTopAdminMfa: process.env.ENFORCE_TOP_ADMIN_MFA === "false"
};

