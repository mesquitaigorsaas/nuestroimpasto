import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ADDED_COLUMNS, SCHEMA } from "./schema";

export const DATA_DIR = path.join(process.cwd(), "data");

const globalForDb = globalThis as unknown as { __nuestroDb?: DatabaseSync };

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const database = new DatabaseSync(path.join(DATA_DIR, "nuestro.db"));
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);
  migrate(database);
  return database;
}

function migrate(database: DatabaseSync) {
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  // Status antigo "pending" das solicitações passou a se chamar "pending_review".
  database.exec("UPDATE verification_requests SET status = 'pending_review' WHERE status = 'pending'");
}

export function db(): DatabaseSync {
  globalForDb.__nuestroDb ??= open();
  return globalForDb.__nuestroDb;
}

type Param = SQLInputValue | boolean | undefined;

function normalize(params: Param[]): SQLInputValue[] {
  return params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p));
}

/** node:sqlite devolve objetos sem protótipo; convertemos para objetos simples (serializáveis pelo React). */
export function all<T>(sql: string, ...params: Param[]): T[] {
  return db()
    .prepare(sql)
    .all(...normalize(params))
    .map((row) => ({ ...row }) as T);
}

export function get<T>(sql: string, ...params: Param[]): T | undefined {
  const row = db().prepare(sql).get(...normalize(params));
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: Param[]) {
  return db().prepare(sql).run(...normalize(params));
}

export function transaction<T>(fn: () => T): T {
  const database = db();
  database.exec("BEGIN");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
}

/** Id curto, estilo YouTube (11 caracteres base64url). */
export function newId(size = 8) {
  return randomBytes(size).toString("base64url");
}

export function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
