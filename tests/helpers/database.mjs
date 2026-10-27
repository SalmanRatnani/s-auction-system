import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

export async function createTestDatabase({ skip = [] } = {}) {
  let db;
  if (process.env.PG_TEST_URL) {
    const url = new URL(process.env.PG_TEST_URL);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.endsWith("_test")
    )
      throw new Error("Native tests require an isolated local test database");
    const { default: pg } = await import("pg");
    pg.types.setTypeParser(20, Number);
    async function connect() {
      const client = new pg.Client({
        connectionString: process.env.PG_TEST_URL,
      });
      await client.connect();
      return {
        query: (sql, args) => client.query(sql, args),
        exec: (sql) => client.query(sql),
        close: () => client.end(),
        connectPeer: connect,
      };
    }
    db = await connect();
  } else db = new PGlite();
  await db.exec(
    await readFile(new URL("../sql/platform.sql", import.meta.url), "utf8"),
  );
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory))
    .filter((n) => n.endsWith(".sql") && !skip.includes(n))
    .sort()) {
    // PostgreSQL's built-in gen_random_uuid is sufficient for the test fixture.
    // The native Postgres CI job also applies the actual pgcrypto extension DDL.
    let sql = await readFile(new URL(name, directory), "utf8");
    if (!process.env.PG_TEST_URL)
      sql = sql.replace(/create extension if not exists "pgcrypto";/i, "");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${name}: ${error.message}`, { cause: error });
    }
  }
  return db;
}

export async function asRole(db, role, id, fn) {
  if (!["anon", "authenticated", "service_role"].includes(role))
    throw new Error("Invalid test role");
  await db.exec("begin; set local role " + role);
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",
    [id ?? "", role],
  );
  try {
    const result = await fn();
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}
