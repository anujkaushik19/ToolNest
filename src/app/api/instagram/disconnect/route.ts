import { NextRequest, NextResponse } from "next/server";
import { CONNECTION_COOKIE } from "@/lib/studio/session";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/studio/connect", req.nextUrl.origin));
  res.cookies.delete(CONNECTION_COOKIE);
  return res;
}
