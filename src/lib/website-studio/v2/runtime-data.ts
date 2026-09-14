import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { z } from "zod";
import { digest, owns, scopeSchema, sha, StudioError, targetSchema, type Job, type Scope } from "./schema";
import { PostgresStore } from "./postgres";

export const projectSchema = z.object({ scope: scopeSchema, target: targetSchema, enabled: z.literal(true),
  isolationEvidenceId: z.string().uuid(), isolationExpiresAt: z.number().int(),
  staticDeployment: z.literal(true), deploymentSecretsIsolated: z.literal(true),
  allowedPaths: z.array(z.string()).min(1).max(100), image: z.string().regex(/@sha256:[a-f0-9]{64}$/),
  templateTreeSha: sha, acceptanceId: z.string().uuid(), teamId: z.string().regex(/^team_[A-Za-z0-9]+$/),
});
export type TestProject = z.infer<typeof projectSchema>;
export class RuntimeData {
  readonly store: PostgresStore;
  constructor(readonly pool: Pool, private readonly key: Buffer) {
    if (key.length !== 32) throw new StudioError("ARTIFACT_KEY_REQUIRED");
    this.store = new PostgresStore(pool);
  }
  async project(scope: Scope): Promise<TestProject> {
    const result = await this.pool.query("SELECT manifest FROM studio_execution_private.projects WHERE id = $1 AND tenant_id = $2", [scope.projectId, scope.tenantId]);
    const project = projectSchema.parse(result.rows[0]?.manifest);
    if (!owns(project.scope, scope) || project.isolationExpiresAt <= Date.now()) throw new StudioError("TEST_ISOLATION_NOT_VERIFIED");
    // The RC control-plane repo is never a generated website target.
    if (project.target.repositoryId === "1314345897") throw new StudioError("CONTROL_REPOSITORY_PROTECTED");
    return project;
  }
  async assertJob(job: Job) {
    const project = await this.project(job.scope);
    if (digest(project.target) !== digest(job.target)) throw new StudioError("PROJECT_TARGET_CHANGED");
    return project;
  }
  async put(scope: Scope, value: unknown): Promise<string> {
    const id = randomUUID(), iv = randomBytes(12), scopeHash = digest(scope);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv); cipher.setAAD(Buffer.from(scopeHash + id));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    const packed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
    await this.pool.query("INSERT INTO studio_execution_private.artifacts (id, scope_hash, ciphertext) VALUES ($1,$2,$3)", [id, scopeHash, packed]);
    return id;
  }
  async get(scope: Scope, id: string): Promise<unknown> {
    z.string().uuid().parse(id);
    const scopeHash = digest(scope);
    const result = await this.pool.query("SELECT ciphertext FROM studio_execution_private.artifacts WHERE id = $1 AND scope_hash = $2", [id, scopeHash]);
    if (!result.rows.length) throw new StudioError("ARTIFACT_ACCESS_DENIED");
    const packed: Buffer = result.rows[0].ciphertext;
    const decipher = createDecipheriv("aes-256-gcm", this.key, packed.subarray(0, 12));
    decipher.setAAD(Buffer.from(scopeHash + id)); decipher.setAuthTag(packed.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8"));
  }
}
let instance: RuntimeData | undefined;
export function runtimeData() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.STUDIO_V2_ENABLED !== "true") throw new StudioError("STUDIO_V2_DISABLED");
  if (!instance) {
    const connectionString = process.env.STUDIO_TEST_DATABASE_URL;
    const key = process.env.STUDIO_ARTIFACT_ENCRYPTION_KEY;
    if (!connectionString) throw new StudioError("STUDIO_TEST_DATABASE_URL_REQUIRED");
    // Do not silently attach the existing customer database.
    if (connectionString.includes("aygawkavujjmybekswrg")) throw new StudioError("CUSTOMER_DATABASE_FORBIDDEN");
    if (!key) throw new StudioError("STUDIO_ARTIFACT_ENCRYPTION_KEY_REQUIRED");
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new StudioError("DATABASE_URL_INVALID");
    if (url.search) throw new StudioError("DATABASE_TLS_OPTIONS_FORBIDDEN");
    instance = new RuntimeData(new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: true } }), Buffer.from(key, "base64"));
  }
  return instance;
}
