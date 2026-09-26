import { NextRequest, NextResponse } from "next/server";
import { CONNECTION_COOKIE } from "@/lib/studio/session";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/studio/connect", req.nextUrl.origin));
  if (isDbConfigured()) {
    const id = req.cookies.get(CONNECTION_COOKIE)?.value;
    if (id) {
      try {
        const { deleteConnectionById } = await import("@/lib/studio/connectionStore");
        await deleteConnectionById(id);
      } catch {
        // Best-effort; still clear the cookie below.
      }
    }
  }
  res.cookies.delete(CONNECTION_COOKIE);
  return res;
}
