import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  MENU_SESSION_COOKIE,
  MENU_SESSION_DURATION_MS,
  MENU_SESSION_DURATION_SECONDS,
  createMenuSessionToken,
} from "@/lib/menu-session";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (export `proxy` / `proxyConfig`).
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Public diner menu (/r/[slug]). A fresh scan arrives as /r/{slug}?table=N:
  // open a 20-minute session and redirect to the clean URL so a page refresh
  // doesn't reset the timer (re-scanning at the table does). Other /r/* requests
  // are public — skip the Supabase auth refresh; the page validates the session.
  if (pathname.startsWith("/r/")) {
    const tableParam = searchParams.get("table");
    if (tableParam !== null) {
      const slug = pathname.slice("/r/".length).split("/")[0];
      const table = Number(tableParam);
      const url = request.nextUrl.clone();
      url.search = "";
      const response = NextResponse.redirect(url);

      if (slug && Number.isInteger(table) && table > 0) {
        const token = await createMenuSessionToken({
          slug,
          table,
          exp: Date.now() + MENU_SESSION_DURATION_MS,
        });
        response.cookies.set(MENU_SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: MENU_SESSION_DURATION_SECONDS,
          path: "/",
        });
      }
      return response;
    }
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

export const proxyConfig = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image/video asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
