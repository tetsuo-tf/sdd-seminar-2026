import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ルートは除外
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.next();
  }

  // 保護ルート: /inquiries/* と /admin/*
  const isProtectedRoute =
    pathname.startsWith("/inquiries") || pathname.startsWith("/admin");

  if (isProtectedRoute) {
    // Better Auth のセッション Cookie が存在するか判定
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      // 未ログインなら /login へリダイレクト
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}
