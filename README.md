# Matheus Automóveis — Plataforma de venda de veículos

Plataforma completa para concessionária, construída com **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS 4**, componentes no padrão **shadcn/ui**, **PostgreSQL + Prisma**, **Auth.js v5**, **Zod**, **React Hook Form** e upload de imagens via **Cloudinary** (com fallback local para desenvolvimento).

São duas áreas independentes sobre o mesmo banco de dados:

| Área | Rota | Acesso |
| --- | --- | --- |
| **Loja pública** | `/`, `/veiculos`, `/veiculos/[slug]`, `/orcamento`, `/sobre`, `/contato` | Clientes (aberta) |
| **Painel administrativo** | `/admin/*` | Funcionários autenticados, com permissões por perfil |

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** (testado com Node 24). Não é necessário instalar PostgreSQL nem Docker: o projeto inclui um PostgreSQL embarcado para desenvolvimento.

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env          # ajuste AUTH_SECRET (npx auth secret)

# 3. Banco local (deixe este terminal aberto)
npm run db:local              # sobe PostgreSQL em localhost:5433

# 4. Em outro terminal: estrutura do banco + dados iniciais
npx prisma migrate deploy
npm run db:seed

# 5. Aplicação
npm run dev                   # http://localhost:3000
```

> Já possui um PostgreSQL próprio (local, Docker, Neon, Supabase, RDS…)? Basta apontar `DATABASE_URL` para ele e pular o passo 3.

### Acessos criados pelo seed

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@matheusautomoveis.com.br` | `Admin@12345` (ou `SEED_ADMIN_PASSWORD`) |
| Gerente | `gerente@matheusautomoveis.com.br` | `Gerente@123` |
| Vendedor | `rafael@matheusautomoveis.com.br` | `Vendedor@123` |

**Troque essas senhas antes de qualquer uso real.** O seed cria também marcas, modelos, categorias, veículos de exemplo (com fotos do Unsplash), orçamentos, depoimentos e banners — tudo editável/removível pelo painel. As fotos de exemplo são ilustrativas e não correspondem necessariamente ao modelo exato do veículo.

---

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:local` | PostgreSQL embarcado para desenvolvimento (porta 5433) |
| `npm run db:migrate` | Cria nova migração a partir do `schema.prisma` |
| `npm run db:deploy` | Aplica migrações (produção) |
| `npm run db:seed` | Dados iniciais |
| `npm run db:studio` | Prisma Studio |

---

## Arquitetura

```
prisma/
  schema.prisma            Modelo de dados único (loja + painel)
  seed.ts                  Dados iniciais
src/
  app/
    (store)/               LOJA PÚBLICA — layout, home, catálogo, veículo, orçamento, institucional
    admin/
      login/               Login do painel
      alterar-senha/       Troca de senha (obrigatória no primeiro acesso)
      (panel)/             PAINEL — layout com sidebar + módulos
        veiculos/ estoque/ marcas/ orcamentos/ publicacoes/
        funcionarios/ relatorios/ atividades/ configuracoes/
    api/
      auth/[...nextauth]/  Auth.js
      upload/              Upload de imagens (logos, banners, site)
      relatorios/export/   Exportação CSV de relatórios
    media/[...path]/       Entrega de imagens salvas localmente (fallback)
  auth.ts / auth.config.ts Autenticação (Credentials + JWT)
  middleware.ts            Barreira de sessão em /admin/*
  components/
    ui/                    Componentes base (padrão shadcn/ui)
    store/                 Componentes da loja
    admin/                 Componentes do painel
    shared/                Compartilhados (logo…)
  server/
    auth/                  Sessão e permissões (RBAC)
    actions/               Server actions (backend) por módulo
    services/              Consultas e regras de negócio (catálogo, relatórios, storage, auditoria…)
    action.ts              Padrão de resposta/erro das actions
    rate-limit.ts          Limitador para formulários públicos
  validations/             Schemas Zod compartilhados entre frontend e backend
  lib/                     Utilitários (formatação, rótulos, WhatsApp, Prisma)
```

**Integração painel ↔ loja:** a loja lê os dados reais do banco (somente veículos publicados e não vendidos). Toda alteração feita no painel chama `revalidateStore()`, invalidando o cache das páginas públicas para refletir a mudança imediatamente.

---

## Perfis e permissões

O controle é feito **no backend**: toda página do painel chama `requirePermission()` e toda server action/rota chama `assertPermission()`. Esconder botões na interface é apenas conveniência.

| Permissão | Admin | Gerente | Vendedor |
| --- | :-: | :-: | :-: |
| Dashboard | ✔ | ✔ | ✔ |
| Ver / cadastrar / editar veículos | ✔ | ✔ | ✔ |
| Excluir veículos | ✔ | ✔ | |
| Publicar, destacar, ordenar | ✔ | ✔ | |
| Alterar status do estoque | ✔ | ✔ | |
| Marcas, modelos e categorias | ✔ | | |
| Orçamentos (próprios e sem responsável) | ✔ | ✔ | ✔ |
| Todos os orçamentos / atribuir | ✔ | ✔ | |
| Banners, textos, depoimentos | ✔ | ✔ | |
| Relatórios | ✔ | ✔ | |
| Funcionários, configurações, auditoria | ✔ | | |

O administrador pode **conceder ou revogar permissões individualmente** por funcionário (ex.: impedir um vendedor de editar veículos). Gerenciar funcionários e configurações é exclusivo do perfil Administrador.

---

## Segurança

- Senhas com **bcrypt** (custo 12); política de senha forte; troca obrigatória após criação/redefinição.
- **Bloqueio temporário** após 5 tentativas de login inválidas; resposta com tempo constante para e-mails inexistentes.
- Sessão JWT com expiração de 8 h; **revalidação no banco a cada requisição** (usuário ativo + `sessionVersion`), permitindo encerrar sessões ao desativar usuário ou redefinir senha.
- RBAC no backend em todas as páginas, actions e rotas de API.
- Validação **Zod** no cliente e no servidor com os mesmos schemas.
- **Registro de atividades** (login, falhas, criação/edição/exclusão, publicações, exportações…) com usuário, IP e data.
- Dados privados (placa, observações internas, preço de venda real) nunca são selecionados nas consultas públicas.
- Formulário público com honeypot, rate limit por IP e consentimento LGPD registrado.
- Uploads: validação por **assinatura binária** (magic bytes), tipos JPG/PNG/WEBP/AVIF, limite de 8 MB, nomes aleatórios, armazenamento fora de `/public`, proteção contra path traversal.
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`…) e `noindex` no painel.

---

## Imagens (Cloudinary)

Preencha `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no `.env` para armazenar as imagens no Cloudinary (com otimização automática). Sem essas variáveis, os arquivos são gravados em `./uploads` e servidos por `/media/...` — adequado apenas para desenvolvimento ou servidor com disco persistente.

---

## Deploy (produção)

1. PostgreSQL gerenciado (Neon, Supabase, RDS, Railway…) → `DATABASE_URL`.
2. Configure `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` e as variáveis do Cloudinary.
3. `npm run build` → `npx prisma migrate deploy` → `npm run db:seed` (apenas na primeira vez) → `npm start`.
4. Em múltiplas instâncias, troque o rate limit em memória (`src/server/rate-limit.ts`) por Redis/Upstash.
