import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
      return NextResponse.redirect(redirectUrl);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
