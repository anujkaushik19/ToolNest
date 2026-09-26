import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";
import type { CreatorData, DaySnapshot } from "./types";

// Real, day-by-day history banked by the daily cron. The Graph API only exposes
// a short rolling window; these tables let growth accumulate over months and
// become the dataset the agency product is eventually built on.

export async function getFollowerHistory(igId: string): Promise<DaySnapshot[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql<
      { date: string; followers: number; reach: number; profile_views: number; accounts_engaged: number }[]
    >`select date, followers, reach, profile_views, accounts_engaged
        from follower_snapshot where ig_id = ${igId} order by date asc`;
    return rows.map((r) => ({
      date: typeof r.date === "string" ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
      followers: r.followers,
      reach: r.reach,
      profileViews: r.profile_views,
      accountsEngaged: r.accounts_engaged,
    }));
  } catch {
    return [];
  }
}

/** Persist today's point for one account. Idempotent per (ig_id, date). */
export async function writeSnapshots(igId: string, data: CreatorData): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);
  const latest = data.snapshots[data.snapshots.length - 1];
  const reach = latest?.reach ?? data.media.reduce((s, m) => s + (m.insights.reach || 0), 0);
  const profileViews = latest?.profileViews ?? 0;
  const accountsEngaged = latest?.accountsEngaged ?? 0;

  await sql`
    insert into follower_snapshot (ig_id, date, followers, reach, profile_views, accounts_engaged)
    values (${igId}, ${today}, ${data.account.followersCount}, ${reach}, ${profileViews}, ${accountsEngaged})
    on conflict (ig_id, date) do update set
      followers = excluded.followers,
      reach = excluded.reach,
      profile_views = excluded.profile_views,
      accounts_engaged = excluded.accounts_engaged`;

  for (const m of data.media) {
    const i = m.insights;
    await sql`
      insert into media_snapshot (ig_id, media_id, captured_on, reach, views, likes, comments, saved, shares)
      values (${igId}, ${m.id}, ${today}, ${i.reach || 0}, ${i.views || 0}, ${i.likes || 0}, ${i.comments || 0}, ${i.saved || 0}, ${i.shares || 0})
      on conflict (media_id, captured_on) do update set
        reach = excluded.reach, views = excluded.views, likes = excluded.likes,
        comments = excluded.comments, saved = excluded.saved, shares = excluded.shares`;
  }
}
