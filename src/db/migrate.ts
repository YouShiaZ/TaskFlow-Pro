import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✓ Drizzle migrations executed successfully");
  } catch (err) {
    console.error("Migration error:", err);
  }
}
