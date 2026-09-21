import { cache } from "react";
import { buildDemoData } from "./demo";
import { fetchCreatorData } from "./instagram";
import { getConnection } from "./session";
import type { CreatorData } from "./types";

// Single source of truth for the Studio. If the user has connected their
// Instagram account, pull live data from the Graph API; otherwise fall back to
// the seeded demo dataset. Any failure degrades gracefully to demo so the
// dashboard is never broken. cache() dedupes the fetch across the layout and
// page within a single request.
export const getStudioData = cache(async (): Promise<CreatorData> => {
  const conn = getConnection();
  if (conn) {
    try {
      return await fetchCreatorData(conn.token, conn.igId);
    } catch {
      // Token expired or API hiccup — show demo rather than an error page.
      return buildDemoData();
    }
  }
  return buildDemoData();
});

export function isConnected(): boolean {
  return getConnection() !== null;
}

export * from "./types";
export * from "./metrics";
