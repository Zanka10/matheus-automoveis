// Primeira barreira: exige sessão válida em /admin/*.
// A autorização real (usuário ativo, versão de sessão, permissões) é verificada no servidor
// em cada página e server action via requireUser/requirePermission.
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*"],
};
