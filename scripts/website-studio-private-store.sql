-- UNAPPLIED. Dedicated test database only. No public/customer schema mutations.
-- Run as schema owner; give only the trusted executor role USAGE on this schema
-- and SELECT/UPDATE on ledger separately. Never grant browser/client roles.
BEGIN;
CREATE SCHEMA studio_execution_private;
REVOKE ALL ON SCHEMA studio_execution_private FROM PUBLIC;
CREATE TABLE studio_execution_private.ledger (
  id integer PRIMARY KEY CHECK (id = 1),
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object')
);
REVOKE ALL ON studio_execution_private.ledger FROM PUBLIC;
INSERT INTO studio_execution_private.ledger VALUES
  (1, '{"jobs":{},"outbox":[],"locks":{}}'::jsonb);
CREATE TABLE studio_execution_private.projects (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, manifest jsonb NOT NULL
);
CREATE TABLE studio_execution_private.artifacts (
  id uuid PRIMARY KEY, scope_hash text NOT NULL, ciphertext bytea NOT NULL
);
REVOKE ALL ON studio_execution_private.projects, studio_execution_private.artifacts FROM PUBLIC;
COMMIT;
