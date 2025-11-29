import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  try {
    const token =
      request.cookies.get("bearer_token")?.value ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const headers = new Headers(request.headers);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const session = await auth.api.getSession({ headers });
    if (!session?.user) {
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth check failed:", error);
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/focus/:path*", "/settings/:path*", "/archive/:path*"],
};
