import { cookies } from "next/headers";
import { isDbConfigured } from "@/lib/db";

// Session model has two modes, chosen at runtime by DATABASE_URL:
//   • No DB (local / ₹0 path): the long-lived Meta token + IG id live in an
//     httpOnly cookie. Simple, single account, no persistence.
//   • DB configured: the cookie only holds an opaque connection id; the token
//     is encrypted at rest server-side and daily history can accumulate.

export const CONNECTION_COOKIE = "tn_ig";
export const OAUTH_STATE_COOKIE = "tn_ig_state";

export interface Connection {
  token: string;
  igId: string;
  pageName?: string;
}

export function encodeConnection(c: Connection): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64");
}

export function decodeConnection(raw: string): Connection | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (parsed && typeof parsed.token === "string" && typeof parsed.igId === "string") {
      return parsed as Connection;
    }
    return null;
  } catch {
    return null;
  }
}

/** Read the current connection (server components / route handlers). */
export async function getConnection(): Promise<Connection | null> {
  const raw = cookies().get(CONNECTION_COOKIE)?.value;
  if (!raw) return null;
  if (isDbConfigured()) {
    // Cookie holds an opaque connection id; resolve + decrypt from the DB.
    const { getConnectionById } = await import("./connectionStore");
    try {
      const stored = await getConnectionById(raw);
      return stored ? { token: stored.token, igId: stored.igId, pageName: stored.pageName } : null;
    } catch {
      return null;
    }
  }
  return decodeConnection(raw);
}
