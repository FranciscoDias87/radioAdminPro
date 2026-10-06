// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", { id: text("id").primaryKey(), kind: text("kind").notNull(), data: text("data").notNull() }, table=>[index("records_kind_idx").on(table.kind)]);
