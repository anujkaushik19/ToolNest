import { cache } from "react";
import { buildDemoData } from "./demo";
import { fetchCreatorData } from "./instagram";
import { getConnection } from "./session";
import { getFollowerHistory } from "./history";
import type { CreatorData } from "./types";

// Single source of truth for the Studio. If the user has connected their
// Instagram account, pull live data from the Graph API; otherwise fall back to
// the seeded demo dataset. Any failure degrades gracefully to demo so the
// dashboard is never broken. cache() dedupes the fetch across the layout and
// page within a single request.
export const getStudioData = cache(async (): Promise<CreatorData> => {
  const conn = await getConnection();
  if (conn) {
    try {
      const data = await fetchCreatorData(conn.token, conn.igId);
      // Prefer real day-by-day history collected by the cron over the Graph
      // API's short reconstructed window, once we've banked enough snapshots.
      const history = await getFollowerHistory(conn.igId);
      if (history.length >= 2) data.snapshots = history;
      return data;
    } catch {
      // Token expired or API hiccup — show demo rather than an error page.
      return buildDemoData();
    }
  }
  return buildDemoData();
});

export async function isConnected(): Promise<boolean> {
  return (await getConnection()) !== null;
}

export * from "./types";
export * from "./metrics";
export * from "./brief";