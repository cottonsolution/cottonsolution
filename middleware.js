import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// Coarse-grained gate: any unauthenticated visitor to a dashboard route is
// bounced to /login. Fine-grained role checks (admin/merchant/driver) happen
// client-side in each dashboard page via useUser(), and are enforced
// server-side by Postgres Row Level Security regardless of what the client does.
export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedPrefixes = ["/admin", "/merchant", "/driver", "/onboarding"];
  const isProtected = protectedPrefixes.some((p) => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !session) {
    const redirectUrl = new URL("/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/merchant/:path*", "/driver/:path*", "/onboarding/:path*"],
};
