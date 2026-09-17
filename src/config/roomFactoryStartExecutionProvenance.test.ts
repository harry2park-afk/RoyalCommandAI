import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Hosted RoyalCommand migration-history evidence collected READ-ONLY on 2026-09-09.
// This test only narrows the known room_factory_start_execution provenance drift.
// It does not prove the linked apply set and must not authorize migration repair/push.
const evidence = {
  file: '20260829234500_room_factory_start_execution.sql',
  repositoryStructuralSha256:
    '9ffc05d56ace1f8dda54c7cfe01a6682b9cec74624bfcc66820644025377fc92',
  hostedStructuralSha256:
    '4dcf8147f0b4d1396c84d653d83cf7abb97f6f87025ede2722c11c4f9f33363c',
} as const;

function structuralFingerprint(sql: string): string {
  const withoutFullLineComments = sql.replace(/^[\t ]*--[^\n]*(?:\n|$)/gm, '');
  const withoutWhitespace = withoutFullLineComments.replace(/\s+/g, '');
  return createHash('sha256').update(withoutWhitespace, 'utf8').digest('hex');
}

function executableFingerprint(sql: string): {
  sha256: string;
  removedCommentMetadataStatements: number;
} {
  let removedCommentMetadataStatements = 0;
  const withoutCommentMetadata = sql.replace(
    /comment\s+on\s+function[\s\S]*?\)\s+is\s+'(?:''|[^'])*'\s*;\s*/gi,
    () => {
      removedCommentMetadataStatements += 1;
      return '';
    },
  );

  return {
    sha256: structuralFingerprint(withoutCommentMetadata),
    removedCommentMetadataStatements,
  };
}

describe('Room Factory start-execution Hosted provenance', () => {
  it('keeps the original structural mismatch pinned', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', evidence.file),
      'utf8',
    );

    expect(structuralFingerprint(sql)).toBe(evidence.repositoryStructuralSha256);
    expect(structuralFingerprint(sql)).not.toBe(evidence.hostedStructuralSha256);
  });

  it('proves the observed structural drift is limited to COMMENT ON FUNCTION metadata', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', evidence.file),
      'utf8',
    );
    const executable = executableFingerprint(sql);

    expect(executable.removedCommentMetadataStatements).toBe(2);
    expect(executable.sha256).toBe(evidence.hostedStructuralSha256);
  });
});
