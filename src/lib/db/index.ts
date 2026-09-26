import postgres from "postgres";

// Lazily-created Postgres client. Everything is gated on DATABASE_URL: when it's
// absent the whole studio degrades gracefully to cookie sessions + demo data,
// so local dev and the ₹0 path keep working with no database at all.

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type Sql = ReturnType<typeof postgres>;
let client: Sql | null = null;

export function getSql(): Sql {
  if (!isDbConfigured()) throw new Error("DATABASE_URL is not set");
  if (!client) {
    const url = process.env.DATABASE_URL!;
    const local = url.includes("localhost") || url.includes("127.0.0.1");
    client = postgres(url, {
      ssl: local ? false : "require",
      max: 3,
      idle_timeout: 20,
      prepare: false, // safe with connection poolers (Neon/Supabase pgBouncer)
    });
  }
  return client;
}

// Idempotent schema. Run on demand (cron / first write); safe to call repeatedly.
const DDL: string[] = [
  `create table if not exists ig_connection (
     id uuid primary key default gen_random_uuid(),
     ig_id text unique not null,
     username text,
     page_name text,
     token_cipher text not null,
     token_expires_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now(),
     last_synced_at timestamptz
   )`,
  `create table if not exists follower_snapshot (
     ig_id text not null,
     date date not null,
     followers integer not null default 0,
     reach integer not null default 0,
     profile_views integer not null default 0,
     accounts_engaged integer not null default 0,
     primary key (ig_id, date)
   )`,
  `create table if not exists media_snapshot (
     ig_id text not null,
     media_id text not null,
     captured_on date not null,
     reach integer not null default 0,
     views integer not null default 0,
     likes integer not null default 0,
     comments integer not null default 0,
     saved integer not null default 0,
     shares integer not null default 0,
     primary key (media_id, captured_on)
   )`,
  `create index if not exists follower_snapshot_ig_idx on follower_snapshot (ig_id, date)`,
  `create index if not exists media_snapshot_ig_idx on media_snapshot (ig_id, captured_on)`,
];

let ensured = false;
export async function ensureSchema(): Promise<void> {
  if (ensured) return;
  const sql = getSql();
  for (const stmt of DDL) await sql.unsafe(stmt);
  ensured = true;
}
