import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// These SHA-256 values were observed from Hosted RoyalCommand migration-history
// statement text using a READ-ONLY query on 2026-09-09. They are evidence for
// structural reconciliation only. Matching these fingerprints does NOT prove an
// exact linked migration apply set and does not authorize migration repair/push.
const roomFactoryHostedFingerprints = [
  {
    name: 'room_factory_manifests',
    file: '20260829211500_room_factory_manifests.sql',
    hostedSha256: 'da7df1d7b16c018b6ca77fe05461776e03a244a2d95ab7866f9326d24a60e719',
  },
  {
    name: 'room_factory_prepare_work_plan',
    file: '20260829220000_room_factory_prepare_work_plan.sql',
    hostedSha256: '93e8259f68aa4bb660f7ddacc819a792b0707dbcf1edff74af8bc5188c48e6f6',
  },
  {
    name: 'revoke_anon_room_factory_prepare',
    file: '20260829220500_revoke_anon_room_factory_prepare.sql',
    hostedSha256: '1aa3a4b55cd532aa85034cbba38534823e27ec8bb15c729273cca747b9b9c06a',
  },
  {
    name: 'room_factory_active_locks',
    file: '20260829223000_room_factory_active_locks.sql',
    hostedSha256: 'efeebf3c4d2fec2cd0d27f24195711218bc0c8f40f3a332e55076936b8a83b20',
  },
  {
    name: 'room_factory_evidence_review',
    file: '20260829231500_room_factory_evidence_review.sql',
    hostedSha256: '4cc23fb3e7e0ecd730643a1a1438926008c03bb45fced2501d7ed36ef2781150',
  },
  {
    name: 'room_factory_start_execution',
    file: '20260829234500_room_factory_start_execution.sql',
    hostedSha256: '4dcf8147f0b4d1396c84d653d83cf7abb97f6f87025ede2722c11c4f9f33363c',
  },
  {
    name: 'harden_prepare_room_factory_rpc_wrapper',
    file: '20260830075000_harden_prepare_room_factory_rpc_wrapper.sql',
    hostedSha256: '9f1e47a8017e35f694209ab1c20fc40faaca24de19e6e2af960d826d6efb90ad',
  },
  {
    name: 'revoke_anon_prepare_room_factory_wrapper',
    file: '20260830080500_revoke_anon_prepare_room_factory_wrapper.sql',
    hostedSha256: '1f88589a99892e3e4035efbf57a3874b86bf2b0c116b7dd51c5c4c6c371275b3',
  },
  {
    name: 'harden_acquire_room_factory_rpc_wrapper',
    file: '20260830084700_harden_acquire_room_factory_rpc_wrapper.sql',
    hostedSha256: 'eb6f8d574e091e954cee9e39c70c7d57e0b79bf2fa0b6ce48a45c2e996438a9f',
  },
  {
    name: 'harden_release_room_factory_rpc_wrapper',
    file: '20260830095500_harden_release_room_factory_rpc_wrapper.sql',
    hostedSha256: '187174c2342c90c2a492b1ef9c36fe2acd3ae7c2a190bc2134314b449316aa70',
  },
  {
    name: 'harden_fail_room_factory_rpc_wrapper',
    file: '20260830105200_harden_fail_room_factory_rpc_wrapper.sql',
    hostedSha256: '57282ae224386c1ae690b2ff780948f9d966131e2ce13cf19263a636d5f7768e',
  },
  {
    name: 'harden_submit_room_factory_evidence_rpc_wrapper',
    file: '20260830115000_harden_submit_room_factory_evidence_rpc_wrapper.sql',
    hostedSha256: 'b451eae8fdf3c747c3c3b42e44fc3fce019c3b47115642f5238d01c00367bce0',
  },
  {
    name: 'harden_review_room_factory_rpc_wrapper',
    file: '20260830125000_harden_review_room_factory_rpc_wrapper.sql',
    hostedSha256: 'fb548111e9adc2b2646f1113643f122f18964d985b12670f5c6bc70455200e24',
  },
  {
    name: 'harden_start_room_factory_lane_rpc_wrapper',
    file: '20260830135500_harden_start_room_factory_lane_rpc_wrapper.sql',
    hostedSha256: 'a160d3249d4e73a6035391a7c4f27b626d8777c050186fc2bb2d166833b3eb2b',
  },
  {
    name: 'atomic_room_factory_encounter_creation',
    file: '20260831084700_atomic_room_factory_encounter_creation.sql',
    hostedSha256: '9b757aa05b2283a5b3f8f89a31b668ee34b90ee315110a3037f9d82c674b354d',
  },
  {
    name: 'harden_room_factory_atomic_invoker',
    file: '20260901022500_harden_room_factory_atomic_invoker.sql',
    hostedSha256: 'f0079bcaa1572bb71a88987812931e6299171fe6666436245f19ed1115696969',
  },
] as const;

function canonicalStructuralFingerprint(sql: string): string {
  // Use multiline anchoring so every full-line SQL comment is removed,
  // including adjacent comment lines. Do not consume the preceding newline;
  // doing so makes a global regexp skip the next consecutive comment line.
  const withoutFullLineComments = sql.replace(/^[\t ]*--[^\n]*(?:\n|$)/gm, '');
  const withoutWhitespace = withoutFullLineComments.replace(/\s+/g, '');
  return createHash('sha256').update(withoutWhitespace, 'utf8').digest('hex');
}

describe('Room Factory migration Hosted structural provenance', () => {
  it('normalizes consecutive full-line comments deterministically', () => {
    const withComments = '-- one\n-- two\nselect 1;\n-- three\n';
    const withoutComments = 'select 1;\n';
    expect(canonicalStructuralFingerprint(withComments)).toBe(
      canonicalStructuralFingerprint(withoutComments),
    );
  });

  it('tracks the complete 16-migration Room Factory Hosted inventory', () => {
    expect(roomFactoryHostedFingerprints).toHaveLength(16);
  });

  it.each(roomFactoryHostedFingerprints)(
    '$name repository source structurally matches the observed Hosted statement',
    ({ file, hostedSha256 }) => {
      const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', file), 'utf8');
      expect(canonicalStructuralFingerprint(sql)).toBe(hostedSha256);
    },
  );
});
