import { NextRequest, NextResponse } from "next/server";
import { exchangeAndDiscover } from "@/lib/studio/instagram";
import { CONNECTION_COOKIE, OAUTH_STATE_COOKIE, encodeConnection } from "@/lib/studio/session";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const connect = (status: string) => {
    const url = new URL("/studio/connect", origin);
    url.searchParams.set("status", status);
    return NextResponse.redirect(url);
  };

  if (searchParams.get("error")) return connect("denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return connect("error");

  try {
    const { token, igId, pageName } = await exchangeAndDiscover(code);
    const res = connect("ok");
    // With a DB the browser only stores an opaque connection id and the token
    // is encrypted at rest; without one we fall back to the cookie token.
    let cookieValue = encodeConnection({ token, igId, pageName });
    if (isDbConfigured()) {
      try {
        const { upsertConnection } = await import("@/lib/studio/connectionStore");
        cookieValue = await upsertConnection({ igId, token, pageName });
      } catch {
        // DB write failed — keep the inline cookie token so the user still connects.
      }
    }
    res.cookies.set(CONNECTION_COOKIE, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 24 * 3600, // long-lived token lifetime (~60 days)
      path: "/",
    });
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (e) {
    const url = new URL("/studio/connect", origin);
    url.searchParams.set("status", "error");
    url.searchParams.set("message", e instanceof Error ? e.message : "Connection failed");
    return NextResponse.redirect(url);
  }
}
