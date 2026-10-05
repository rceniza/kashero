import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/data/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
});
