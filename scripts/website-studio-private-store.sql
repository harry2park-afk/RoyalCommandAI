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
COMMIT;
