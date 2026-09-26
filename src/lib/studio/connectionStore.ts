import { ensureSchema, getSql } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import type { Connection } from "./session";

// Server-side store for Meta connections. Tokens are encrypted at rest; the
// browser only ever holds an opaque connection id. Used by the OAuth callback
// (write), the dashboard session (read), and the daily cron (list).

export interface StoredConnection extends Connection {
  id: string;
  username?: string;
  lastSyncedAt?: string | null;
}

export async function upsertConnection(input: {
  igId: string;
  token: string;
  pageName?: string;
  username?: string;
  tokenExpiresAt?: Date;
}): Promise<string> {
  await ensureSchema();
  const sql = getSql();
  const cipher = encrypt(input.token);
  const rows = await sql<{ id: string }[]>`
    insert into ig_connection (ig_id, username, page_name, token_cipher, token_expires_at, updated_at)
    values (${input.igId}, ${input.username ?? null}, ${input.pageName ?? null}, ${cipher}, ${input.tokenExpiresAt ?? null}, now())
    on conflict (ig_id) do update set
      token_cipher = excluded.token_cipher,
      username = coalesce(excluded.username, ig_connection.username),
      page_name = coalesce(excluded.page_name, ig_connection.page_name),
      token_expires_at = excluded.token_expires_at,
      updated_at = now()
    returning id`;
  return rows[0].id;
}

export async function getConnectionById(id: string): Promise<StoredConnection | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<
    { id: string; ig_id: string; page_name: string | null; username: string | null; token_cipher: string; last_synced_at: string | null }[]
  >`select id, ig_id, page_name, username, token_cipher, last_synced_at from ig_connection where id = ${id} limit 1`;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    igId: r.ig_id,
    pageName: r.page_name ?? undefined,
    username: r.username ?? undefined,
    token: decrypt(r.token_cipher),
    lastSyncedAt: r.last_synced_at,
  };
}

export async function deleteConnectionById(id: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`delete from ig_connection where id = ${id}`;
}

export async function listConnections(): Promise<StoredConnection[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<
    { id: string; ig_id: string; page_name: string | null; username: string | null; token_cipher: string; last_synced_at: string | null }[]
  >`select id, ig_id, page_name, username, token_cipher, last_synced_at from ig_connection`;
  return rows.map((r) => ({
    id: r.id,
    igId: r.ig_id,
    pageName: r.page_name ?? undefined,
    username: r.username ?? undefined,
    token: decrypt(r.token_cipher),
    lastSyncedAt: r.last_synced_at,
  }));
}

export async function touchSynced(igId: string): Promise<void> {
  const sql = getSql();
  await sql`update ig_connection set last_synced_at = now() where ig_id = ${igId}`;
}
