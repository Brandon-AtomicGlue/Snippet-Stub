import { defineConfig } from "drizzle-kit";

// Only "push"/"migrate"/"studio" need a live connection; "generate" just diffs
// the schema against existing migration files, so a placeholder is fine here.
const connectionString = process.env.DATABASE_URL ?? "postgres://placeholder/placeholder";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});
