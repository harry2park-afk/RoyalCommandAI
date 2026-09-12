import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getDomainRuntimeContext } from "@/config/countryResolver";

const HARRY_RC_PREVIEW_HOST = "royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app";

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
  if (process.env.VERCEL_ENV === "preview" && request.nextUrl.hostname !== HARRY_RC_PREVIEW_HOST) {
    const canonicalPreviewUrl = request.nextUrl.clone();
    canonicalPreviewUrl.hostname = HARRY_RC_PREVIEW_HOST;
    canonicalPreviewUrl.protocol = "https:";
    canonicalPreviewUrl.port = "";
    return NextResponse.redirect(canonicalPreviewUrl, 308);
  }
  const domainContext = getDomainRuntimeContext(request.nextUrl.hostname, process.env.VERCEL_ENV);
  if (!domainContext) {
    return new NextResponse("Domain unavailable", {
      status: 404,
      headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" },
    });
  }
  const runtimeHeaders = new Headers(request.headers);
  runtimeHeaders.set("x-rc-runtime-host", domainContext.hostname);
  runtimeHeaders.set("x-rc-runtime-country", domainContext.countryCode);
  runtimeHeaders.set("x-rc-runtime-region", domainContext.regionCode);
  runtimeHeaders.set("x-rc-runtime-locale", domainContext.locale);
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

  const response = await updateSession(request, runtimeHeaders);
  return withRoomNoCache(response, path);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
