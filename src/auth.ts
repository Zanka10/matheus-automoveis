import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/server/request";
import { loginSchema } from "@/validations/auth";
import { authConfig } from "./auth.config";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

class LockedError extends CredentialsSignin {
  code = "locked";
}
class InactiveError extends CredentialsSignin {
  code = "inactive";
}

// Hash usado para equalizar o tempo de resposta quando o e-mail não existe (evita enumeração de usuários)
let dummyHash: string | null = null;
async function getDummyHash() {
  dummyHash ??= await bcrypt.hash("dummy-password-for-timing", 12);
  return dummyHash;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = await getClientIp();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await bcrypt.compare(password, await getDummyHash());
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) throw new LockedError();

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lock = attempts >= MAX_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lock ? 0 : attempts,
              lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
            },
          });
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              action: lock ? "auth.locked" : "auth.failed",
              entity: "User",
              entityId: user.id,
              summary: lock ? "Conta bloqueada temporariamente por excesso de tentativas" : "Tentativa de login com senha inválida",
              ip,
            },
          });
          if (lock) throw new LockedError();
          return null;
        }
        if (!user.active) throw new InactiveError();

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
        });
        await prisma.activityLog.create({
          data: { userId: user.id, action: "auth.login", entity: "User", entityId: user.id, summary: "Login realizado", ip },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
