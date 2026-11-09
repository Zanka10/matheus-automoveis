// Configuração compatível com Edge (usada pelo middleware). Não importa Prisma nem bcrypt.
import type { NextAuthConfig } from "next-auth";

export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 60 * 15 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLogin = pathname === "/admin/login";
      const loggedIn = !!auth?.user;
      if (pathname.startsWith("/admin")) {
        if (isLogin) return loggedIn ? Response.redirect(new URL("/admin", request.nextUrl)) : true;
        return loggedIn; // false => redireciona para /admin/login
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role?: string }).role;
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
        session.user.sv = token.sv as number;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
