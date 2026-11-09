"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, LockOpen, MoreHorizontal, Pencil, Plus, Power, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Table, TBody, TD, TH, THead, TR, Badge } from "@/components/ui/card";
import { Avatar } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusPill } from "@/components/admin/page-header";
import { formatDateTime, formatPhone, relativeTime } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { resetUserPasswordAction, setUserActiveAction, unlockUserAction } from "@/server/actions/users";
import { UserFormDialog, type EditableUser } from "./user-form-dialog";

export type UserRow = EditableUser & {
  lastLoginAt: string | null;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  openQuotes: number;
};

const ROLE_TONE = { ADMIN: "dark", MANAGER: "brand", SELLER: "default" } as const;

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | undefined>();
  const [toggleFor, setToggleFor] = useState<UserRow | undefined>();
  const [pending, start] = useTransition();

  const now = Date.now();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="brand"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus /> Novo funcionário
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Funcionário</TH>
              <TH>Perfil</TH>
              <TH>Situação</TH>
              <TH className="hidden md:table-cell">Último acesso</TH>
              <TH className="hidden lg:table-cell">Atendimentos abertos</TH>
              <TH className="w-12" />
            </TR>
          </THead>
          <TBody>
            {users.map((u) => {
              const locked = u.lockedUntil && new Date(u.lockedUntil).getTime() > now;
              const customized = u.extraPermissions.length + u.revokedPermissions.length > 0;
              return (
                <TR key={u.id} className={u.active ? "" : "opacity-60"}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {u.name} {u.id === currentUserId && <span className="text-xs font-normal text-muted-foreground">(você)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                          {u.phone ? ` · ${formatPhone(u.phone)}` : ""}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={ROLE_TONE[u.role]}>{roleLabels[u.role]}</Badge>
                      {customized && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ShieldCheck className="size-3" /> Permissões personalizadas
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-col items-start gap-1">
                      {u.active ? (
                        <StatusPill tone="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Ativo</StatusPill>
                      ) : (
                        <StatusPill tone="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inativo</StatusPill>
                      )}
                      {locked && <StatusPill tone="bg-red-50 text-red-700 ring-red-600/20">Bloqueado</StatusPill>}
                      {u.mustChangePassword && <span className="text-[11px] text-muted-foreground">Troca de senha pendente</span>}
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell">
                    {u.lastLoginAt ? (
                      <span title={formatDateTime(u.lastLoginAt)} className="text-sm">
                        {relativeTime(u.lastLoginAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nunca acessou</span>
                    )}
                  </TD>
                  <TD className="hidden text-sm lg:table-cell">{u.openQuotes}</TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${u.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(u);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil /> Editar e permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setResetFor(u)}>
                          <KeyRound /> Redefinir senha
                        </DropdownMenuItem>
                        {locked && (
                          <DropdownMenuItem
                            disabled={pending}
                            onSelect={() =>
                              start(async () => {
                                const res = await unlockUserAction(u.id);
                                if (res.ok) {
                                  toast.success(res.message);
                                  router.refresh();
                                } else toast.error(res.error);
                              })
                            }
                          >
                            <LockOpen /> Desbloquear acesso
                          </DropdownMenuItem>
                        )}
                        {u.id !== currentUserId && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive={u.active} onSelect={() => setToggleFor(u)}>
                              <Power /> {u.active ? "Desativar" : "Reativar"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} isSelf={editing?.id === currentUserId} />
      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(undefined)} />
      <ConfirmDialog
        open={!!toggleFor}
        onOpenChange={(o) => !o && setToggleFor(undefined)}
        title={toggleFor?.active ? `Desativar ${toggleFor?.name}?` : `Reativar ${toggleFor?.name}?`}
        description={
          toggleFor?.active
            ? "O funcionário perderá o acesso imediatamente e todas as sessões abertas serão encerradas. O histórico é mantido."
            : "O funcionário voltará a acessar o painel com a senha atual."
        }
        destructive={!!toggleFor?.active}
        confirmLabel={toggleFor?.active ? "Desativar" : "Reativar"}
        onConfirm={async () => {
          if (!toggleFor) return;
          const res = await setUserActiveAction(toggleFor.id, !toggleFor.active);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        }}
      />
    </>
  );
}

function ResetPasswordDialog({ user, onClose }: { user?: UserRow; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function generate() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const arr = new Uint32Array(10);
    crypto.getRandomValues(arr);
    const base = Array.from(arr, (n) => chars[n % chars.length]).join("");
    setPassword(`${base}A7a`);
  }

  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setPassword("");
          setError(undefined);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha de {user?.name}</DialogTitle>
          <DialogDescription>
            Defina uma senha provisória e repasse ao funcionário por um canal seguro. Ele deverá trocá-la no próximo acesso e as sessões atuais serão encerradas.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) return;
            start(async () => {
              const res = await resetUserPasswordAction({ userId: user.id, password });
              if (res.ok) {
                toast.success(res.message);
                onClose();
                setPassword("");
                router.refresh();
              } else {
                setError(res.fieldErrors?.password?.[0] ?? res.error);
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Senha provisória" htmlFor="reset-pass" error={error} hint="Mín. 8 caracteres com maiúscula, minúscula e número.">
            <div className="flex gap-2">
              <Input id="reset-pass" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="font-mono" />
              <Button type="button" variant="outline" onClick={generate}>
                Gerar
              </Button>
            </div>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={pending} disabled={!password}>
              Redefinir senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
