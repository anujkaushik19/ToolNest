import { cookies } from "next/headers";

// MVP session: the long-lived Meta token + IG business account id are kept in an
// httpOnly cookie. This is fine for local Dev Mode and a single connected
// account. The next step (DB + daily cron) moves this to encrypted server-side
// storage so tokens never live in the browser and history can accumulate.

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

/** Read the current connection from cookies (server components / route handlers). */
export function getConnection(): Connection | null {
  const raw = cookies().get(CONNECTION_COOKIE)?.value;
  return raw ? decodeConnection(raw) : null;
}
