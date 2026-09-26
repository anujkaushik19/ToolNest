import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchCreatorData } from "@/lib/studio/instagram";
import { listConnections, touchSynced } from "@/lib/studio/connectionStore";
import { writeSnapshots } from "@/lib/studio/history";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily snapshot job. Walks every connected account, pulls current metrics from
// the Graph API, and banks one dated row per account (+ per media). Over time
// this becomes the real growth history — and the outcome dataset the agency
// product is built on. Protected by CRON_SECRET; Vercel Cron sends it as a
// Bearer token automatically when the env var is set.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev convenience only
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ skipped: "DATABASE_URL not configured" });
  }

  const started = Date.now();
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  const connections = await listConnections();
  for (const c of connections) {
    try {
      const data = await fetchCreatorData(c.token, c.igId);
      await writeSnapshots(c.igId, data);
      await touchSynced(c.igId);
      ok += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${c.igId}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    connections: connections.length,
    ok,
    failed,
    ms: Date.now() - started,
    ...(errors.length ? { errors } : {}),
  });
}
