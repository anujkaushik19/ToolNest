/* eslint-disable @typescript-eslint/no-explicit-any */
// Meta Graph API responses are untyped JSON; `any` is intentional at these boundaries.
import type {
  ContentFormat,
  ContentTopic,
  CreatorData,
  DaySnapshot,
  Demographics,
  Media,
  MediaType,
} from "./types";

// Instagram Graph API client. Version-pinned; Meta deprecates metrics between
// versions, so every per-metric read is defensive — a missing metric becomes 0
// rather than failing the whole dashboard. Reliable metrics (reach, saved,
// shares, likes, comments) drive the analysis; profile-visit / follow attribution
// per post and long follower history arrive once the DB + daily cron land.

const GRAPH = "https://graph.facebook.com/v21.0";
const DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

export const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export function buildLoginUrl(state: string): string {
  const appId = process.env.META_APP_ID!;
  const redirect = process.env.META_REDIRECT_URI!;
  const url = new URL(DIALOG);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export function isConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);
}

async function gget(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message ?? `Graph error on ${path}`);
  }
  return json;
}

/** Exchange the OAuth code for a long-lived token and discover the IG account. */
export async function exchangeAndDiscover(code: string): Promise<{ token: string; igId: string; pageName?: string }> {
  const appId = process.env.META_APP_ID!;
  const secret = process.env.META_APP_SECRET!;
  const redirect = process.env.META_REDIRECT_URI!;

  const short = await gget("oauth/access_token", {
    client_id: appId,
    client_secret: secret,
    redirect_uri: redirect,
    code,
  });

  const long = await gget("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: secret,
    fb_exchange_token: short.access_token,
  });
  const token: string = long.access_token;

  const pages = await gget("me/accounts", {
    fields: "name,instagram_business_account",
    access_token: token,
  });
  const page = (pages.data ?? []).find((p: any) => p.instagram_business_account?.id);
  if (!page) {
    throw new Error("No Instagram Business account is linked to your Facebook Pages.");
  }
  return { token, igId: page.instagram_business_account.id, pageName: page.name };
}

// ---- data fetch + mapping ----

const TOPIC_KEYWORDS: [ContentTopic, RegExp][] = [
  ["Tutorial", /how to|tutorial|step|guide|build|learn/i],
  ["Tips", /tip|hack|mistake|avoid|do this|don't/i],
  ["Story time", /story|journey|i failed|when i|my first/i],
  ["Behind the scenes", /behind the scenes|bts|day in|vlog|setup/i],
  ["Trend", /trend|viral|challenge|meme/i],
];

function classifyTopic(caption: string): ContentTopic {
  for (const [topic, re] of TOPIC_KEYWORDS) if (re.test(caption)) return topic;
  return "Talking head";
}

const TILE: Record<ContentTopic, string> = {
  Tutorial: "#6366f1",
  Tips: "#0ea5e9",
  "Story time": "#f59e0b",
  "Behind the scenes": "#10b981",
  "Talking head": "#8b5cf6",
  Trend: "#ec4899",
};

function firstLine(caption: string): string {
  const line = (caption ?? "").split("\n")[0].trim();
  return line.length > 80 ? line.slice(0, 77) + "…" : line || "(no caption)";
}

function metricValue(insights: any, name: string): number {
  const item = (insights?.data ?? []).find((d: any) => d.name === name);
  const v = item?.values?.[0]?.value ?? item?.total_value?.value;
  return typeof v === "number" ? v : 0;
}

async function mediaInsights(mediaId: string, isReel: boolean, token: string) {
  const metrics = isReel
    ? "reach,likes,comments,saved,shares,total_interactions,views"
    : "reach,likes,comments,saved,shares,total_interactions";
  try {
    return await gget(`${mediaId}/insights`, { metric: metrics, access_token: token });
  } catch {
    // Retry without the version-fragile `views` metric.
    try {
      return await gget(`${mediaId}/insights`, {
        metric: "reach,likes,comments,saved,shares",
        access_token: token,
      });
    } catch {
      return { data: [] };
    }
  }
}

export async function fetchCreatorData(token: string, igId: string): Promise<CreatorData> {
  const account = await gget(igId, {
    fields: "username,name,biography,followers_count,follows_count,media_count",
    access_token: token,
  });

  const mediaList = await gget(`${igId}/media`, {
    fields: "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url",
    limit: "30",
    access_token: token,
  });

  const media: Media[] = [];
  for (const m of mediaList.data ?? []) {
    const isReel = m.media_product_type === "REELS";
    const ins = await mediaInsights(m.id, isReel, token);
    const caption: string = m.caption ?? "";
    const topic = classifyTopic(caption);
    const date = new Date(m.timestamp);
    const reach = metricValue(ins, "reach");
    const views = metricValue(ins, "views") || reach;
    const mediaType: MediaType = isReel
      ? "REEL"
      : m.media_type === "CAROUSEL_ALBUM"
        ? "CAROUSEL"
        : m.media_type === "VIDEO"
          ? "VIDEO"
          : "IMAGE";
    const format: ContentFormat = mediaType === "REEL" || mediaType === "VIDEO" ? "Reel" : mediaType === "CAROUSEL" ? "Carousel" : "Image";

    media.push({
      id: m.id,
      mediaType,
      format,
      topic,
      caption,
      hook: firstLine(caption),
      timestamp: m.timestamp,
      weekday: date.getUTCDay(),
      hour: date.getUTCHours(),
      durationSec: 0,
      tileColor: TILE[topic],
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url,
      mediaUrl: m.media_url,
      insights: {
        reach,
        views,
        likes: metricValue(ins, "likes") || m.like_count || 0,
        comments: metricValue(ins, "comments") || m.comments_count || 0,
        saved: metricValue(ins, "saved"),
        shares: metricValue(ins, "shares"),
        // Per-post attribution not available from the Graph API; the scoring
        // engine handles these zeros and leans on saves/shares/reach.
        profileVisits: 0,
        follows: 0,
        avgWatchTimeSec: 0,
      },
    });
  }
  media.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const snapshots = await fetchSnapshots(token, igId, account.followers_count ?? 0);
  const demographics = await fetchDemographics(token, igId);

  return {
    account: {
      username: account.username,
      name: account.name ?? account.username,
      biography: account.biography ?? "",
      niche: "",
      followersCount: account.followers_count ?? 0,
      followsCount: account.follows_count ?? 0,
      mediaCount: account.media_count ?? media.length,
    },
    snapshots,
    media,
    demographics,
    isDemo: false,
    asOf: new Date().toISOString().slice(0, 10),
  };
}

// Follower history isn't retrievable in bulk from Meta — only daily going
// forward. Until the cron accumulates it, reconstruct ~30 days from the daily
// `follower_count` (new-follows) metric and the current total. Reach comes from
// the account-level daily reach series.
async function fetchSnapshots(token: string, igId: string, currentFollowers: number): Promise<DaySnapshot[]> {
  const days = 30;
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;
  const common = { period: "day", since: String(since), until: String(until), access_token: token };

  let reachSeries: { t: number; v: number }[] = [];
  let followSeries: { t: number; v: number }[] = [];
  try {
    const r = await gget(`${igId}/insights`, { ...common, metric: "reach" });
    reachSeries = (r.data?.[0]?.values ?? []).map((x: any) => ({ t: Date.parse(x.end_time), v: x.value ?? 0 }));
  } catch {
    /* reach unavailable */
  }
  try {
    const f = await gget(`${igId}/insights`, { ...common, metric: "follower_count" });
    followSeries = (f.data?.[0]?.values ?? []).map((x: any) => ({ t: Date.parse(x.end_time), v: x.value ?? 0 }));
  } catch {
    /* follower_count unavailable */
  }

  if (!reachSeries.length && !followSeries.length) {
    // No series available yet — single honest point at today's total.
    return [{ date: new Date().toISOString().slice(0, 10), followers: currentFollowers, reach: 0, profileViews: 0, accountsEngaged: 0 }];
  }

  // Walk backward from the current total using daily new-follow counts.
  const dates = (reachSeries.length ? reachSeries : followSeries).map((x) => x.t).sort((a, b) => a - b);
  const followByDate = new Map(followSeries.map((x) => [new Date(x.t).toISOString().slice(0, 10), x.v]));
  const reachByDate = new Map(reachSeries.map((x) => [new Date(x.t).toISOString().slice(0, 10), x.v]));

  const totalFollows = followSeries.reduce((s, x) => s + x.v, 0);
  let running = currentFollowers - totalFollows;
  const snaps: DaySnapshot[] = [];
  for (const t of dates) {
    const key = new Date(t).toISOString().slice(0, 10);
    running += followByDate.get(key) ?? 0;
    const reach = reachByDate.get(key) ?? 0;
    snaps.push({
      date: key,
      followers: Math.max(0, Math.round(running)),
      reach,
      profileViews: 0,
      accountsEngaged: 0,
    });
  }
  return snaps.length ? snaps : [{ date: new Date().toISOString().slice(0, 10), followers: currentFollowers, reach: 0, profileViews: 0, accountsEngaged: 0 }];
}

async function fetchDemographics(token: string, igId: string): Promise<Demographics> {
  const empty: Demographics = { age: [], gender: [], cities: [], countries: [] };
  const readBreakdown = async (breakdown: string) => {
    try {
      const r = await gget(`${igId}/insights`, {
        metric: "follower_demographics",
        period: "lifetime",
        metric_type: "total_value",
        breakdown,
        access_token: token,
      });
      const results = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      return results.map((x: any) => ({
        label: (x.dimension_values ?? []).join(" "),
        value: x.value ?? 0,
      })) as { label: string; value: number }[];
    } catch {
      return [] as { label: string; value: number }[];
    }
  };

  const asPct = (arr: { label: string; value: number }[]) => {
    const total = arr.reduce((s, x) => s + x.value, 0) || 1;
    return arr.map((x) => ({ label: x.label, value: Math.round((x.value / total) * 100) }));
  };
  const top = (arr: { label: string; value: number }[], n: number) =>
    [...arr].sort((a, b) => b.value - a.value).slice(0, n);

  try {
    const [age, gender, city, country] = await Promise.all([
      readBreakdown("age"),
      readBreakdown("gender"),
      readBreakdown("city"),
      readBreakdown("country"),
    ]);
    return {
      age: asPct(age),
      gender: asPct(gender),
      cities: asPct(top(city, 5)),
      countries: asPct(top(country, 5)),
    };
  } catch {
    return empty;
  }
}
