import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

/**
 * Banco Postgres (Supabase), acessado só pelo servidor.
 * DATABASE_URL deve apontar para o pooler do Supabase (modo transaction, porta 6543).
 * As consultas usam `?` como no SQLite original; convertemos para `$1, $2…`.
 */

type Sql = postgres.Sql;

const globalForDb = globalThis as unknown as { __nuestroSql?: Sql; __nuestroSqlUrl?: string };

function client(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada (veja .env.example).");
  // Em desenvolvimento o .env.local pode mudar com o servidor rodando: refaz a conexão.
  if (globalForDb.__nuestroSql && globalForDb.__nuestroSqlUrl !== url) {
    void globalForDb.__nuestroSql.end({ timeout: 1 });
    globalForDb.__nuestroSql = undefined;
  }
  if (!globalForDb.__nuestroSql) {
    globalForDb.__nuestroSqlUrl = url;
    globalForDb.__nuestroSql = postgres(url, {
      prepare: false, // o pooler em modo transaction não suporta prepared statements
      max: 5,
      idle_timeout: 20,
      onnotice: () => {},
      // COUNT/SUM devolvem bigint/numeric; o app trabalha com number.
      types: { number: { to: 20, from: [20, 1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
    });
  }
  return globalForDb.__nuestroSql;
}

/** Transação em andamento na chamada atual (todas as consultas dentro dela usam a mesma conexão). */
const txStore = new AsyncLocalStorage<postgres.TransactionSql>();

function conn(): Sql {
  return (txStore.getStore() as unknown as Sql | undefined) ?? client();
}

type Param = string | number | boolean | null | undefined;

/** Troca os `?` (fora de strings) por `$1, $2…`. */
function toPg(sql: string) {
  let n = 0;
  let out = "";
  let inString = false;
  for (const ch of sql) {
    if (ch === "'") inString = !inString;
    out += ch === "?" && !inString ? `$${++n}` : ch;
  }
  return out;
}

function exec(sql: string, params: Param[]) {
  return conn().unsafe(toPg(sql), params.map((p) => (p === undefined ? null : p)) as postgres.ParameterOrJSON<never>[]);
}

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  const rows = await exec(sql, params);
  return rows.map((row) => ({ ...row }) as T);
}

export async function get<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await exec(sql, params);
  return rows[0] ? ({ ...rows[0] } as T) : undefined;
}

export async function run(sql: string, ...params: Param[]) {
  const rows = await exec(sql, params);
  return { changes: rows.count };
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (txStore.getStore()) return fn();
  return (await client().begin((tx) => txStore.run(tx, fn))) as T;
}

/** Id curto, estilo YouTube (11 caracteres base64url). */
export function newId(size = 8) {
  return randomBytes(size).toString("base64url");
}

export function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
