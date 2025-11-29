import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// --- USER TABLE ---
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .$defaultFn(() => false),

  image: text("image"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),
});

// --- SESSION TABLE ---
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),

  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// --- ACCOUNT TABLE ---
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),

  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),

  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),

  scope: text("scope"),
  password: text("password"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- VERIFICATION TABLE ---
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),

  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- TASKS TABLE ---
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),

  priority: text("priority").notNull().default("medium"),
  startDate: text("start_date"),
  dueDate: text("due_date").notNull(),
  category: text("category").notNull().default("personal"),
  status: text("status").notNull().default("upcoming"),

  archived: integer("archived", { mode: "boolean" })
    .notNull()
    .$defaultFn(() => false),

  googleCalendarEventId: text("google_calendar_event_id"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
