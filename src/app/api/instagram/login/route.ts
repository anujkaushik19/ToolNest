import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildLoginUrl, isConfigured } from "@/lib/studio/instagram";
import { OAUTH_STATE_COOKIE } from "@/lib/studio/session";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (!isConfigured()) {
    const url = new URL("/studio/connect", req.nextUrl.origin);
    url.searchParams.set("status", "unconfigured");
    return NextResponse.redirect(url);
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildLoginUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
