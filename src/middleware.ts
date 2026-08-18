import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function withRoomNoCache(response: NextResponse, path: string) {
  if (path.startsWith("/rooms")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/rooms") ||
    path.startsWith("/settings");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configured =
    Boolean(url) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !url?.includes("your-project");

  if (!configured && isProtected) {
    const session = request.cookies.get("rc_session")?.value;
    if (!session) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", path);
      return withRoomNoCache(NextResponse.redirect(redirectUrl), path);
    }
  }

  const response = await updateSession(request);
  return withRoomNoCache(response, path);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
