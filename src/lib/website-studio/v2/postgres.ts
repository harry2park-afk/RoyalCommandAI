import { StudioError } from "./schema";
import type { Database, Store } from "./store";

type Result = { rows: Array<{ state: Database }> };
export interface SqlClient { query(sql: string, params?: unknown[]): Promise<Result>; release(): void }
export interface SqlPool { connect(): Promise<SqlClient> }
/** Shared durable adapter; inject a server-only, least-privilege SQL pool.
 * Uses one locked row initially to make Job/Outbox/publication-lock atomic.
 * This serializes metadata transactions, not model/runner/network execution.
 * Bootstrap SQL is NOT run by this class or any existing RC route.
 */
export class PostgresStore implements Store {
  constructor(private readonly pool: SqlPool) {}
  async transaction<T>(action: (db: Database) => T): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const result = await client.query("SELECT state FROM studio_execution_private.ledger WHERE id = 1 FOR UPDATE");
      if (result.rows.length !== 1) throw new StudioError("STORE_NOT_INITIALIZED");
      const db = result.rows[0].state;
      const output = action(db);
      await client.query("UPDATE studio_execution_private.ledger SET state = $1::jsonb WHERE id = 1", [JSON.stringify(db)]);
      await client.query("COMMIT");
      return structuredClone(output);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* Never expose SQL client errors. */ }
      if (error instanceof StudioError) throw error;
      throw new StudioError("STORE_TRANSACTION_FAILED");
    } finally { client.release(); }
  }
}
