import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { GoJudgeClient } from "@/server/judge";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    getDb().get(sql`select 1`);
    let judge = "unavailable";
    try {
      await new GoJudgeClient().health();
      judge = "ready";
    } catch {
      /* Web remains available for records and hints. */
    }
    return Response.json(
      { status: "ok", service: "codestartrail", database: "ready", judge },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", service: "codestartrail", database: "unavailable" },
      { status: 503 },
    );
  }
}
