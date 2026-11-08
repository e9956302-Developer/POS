import { app } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";

try {
  await runMigrations();
} catch (error) {
  console.error("Database migration warning:", error.message);
}

app.listen(env.port, () => {
  startReminderScheduler();
  console.log(`DigitalMarkaz360 API listening on port ${env.port}`);
});
