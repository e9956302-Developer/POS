import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "../../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilename = `backup_${timestamp}.sql`;
  const backupFilePath = path.join(backupDir, backupFilename);
  const writeStream = fs.createWriteStream(backupFilePath, { encoding: "utf8" });

  writeStream.write(`-- Mobile POS Database Backup\n`);
  writeStream.write(`-- Generated at: ${new Date().toISOString()}\n\n`);
  writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

  // Fetch all tables
  const tablesResult = await query(`SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'`);
  const tableKey = Object.keys(tablesResult[0] || {})[0];
  const tables = tablesResult.map((row) => row[tableKey]);

  console.log(`Starting backup of ${tables.length} tables...`);

  for (const table of tables) {
    // 1. Table structure
    const [createTableResult] = await query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createTableResult["Create Table"];
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    writeStream.write(`${createSql};\n\n`);

    // 2. Table data
    const rows = await query(`SELECT * FROM \`${table}\``);
    if (rows.length > 0) {
      writeStream.write(`-- Dumping data for table \`${table}\`\n`);
      for (const row of rows) {
        const columns = Object.keys(row).map((k) => `\`${k}\``).join(", ");
        const values = Object.values(row).map((val) => {
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number") return val;
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
          if (typeof val === "boolean") return val ? 1 : 0;
          if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(", ");

        writeStream.write(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`);
      }
      writeStream.write(`\n`);
    }
  }

  writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
  writeStream.end();

  console.log(`✔ Backup successfully created at: ${backupFilePath}`);
  return { filename: backupFilename, path: backupFilePath };
}

if (process.argv[1] && process.argv[1].endsWith("backup.js")) {
  createDatabaseBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backup failed:", err);
      process.exit(1);
    });
}
