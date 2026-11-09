// Sobe um PostgreSQL local (binários oficiais via npm) para desenvolvimento,
// sem precisar instalar Postgres ou Docker. Uso: npm run db:local
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const DB_NAME = "matheus_automoveis";
const dataDir = path.resolve(".pgdata");
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);

// Observação: o cluster usa a codificação padrão do sistema (no Windows, WIN1252), pois o
// initdb em UTF-8 falha quando o caminho do projeto tem acentos. O BANCO da aplicação,
// porém, é criado explicitamente em UTF-8 a partir do template0 — é ele que importa.
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
});

if (!existsSync(path.join(dataDir, "PG_VERSION"))) await pg.initialise();
await pg.start();

const client = pg.getPgClient();
await client.connect();
const { rows } = await client.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1", [DB_NAME]);
if (rows.length === 0) {
  await client.query(`CREATE DATABASE ${DB_NAME} WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
  console.log(`Banco ${DB_NAME} criado (UTF8).`);
} else if (rows[0].enc !== "UTF8") {
  console.warn(
    `⚠ O banco ${DB_NAME} está em ${rows[0].enc}. Textos com emoji/símbolos podem falhar.\n` +
      `  Para recriar em UTF-8: encerre este processo, apague a pasta .pgdata e rode novamente (os dados locais serão perdidos).`,
  );
}
await client.end();

console.log(`\n✔ PostgreSQL local rodando em postgresql://postgres:postgres@localhost:${port}/${DB_NAME}`);
console.log("  Pressione Ctrl+C para encerrar.\n");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
