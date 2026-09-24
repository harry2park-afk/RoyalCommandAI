-- October launch: narrow Room Factory/Core Room FK index hardening.
--
-- Evidence basis (Hosted Supabase, read-only): the five foreign-key columns below
-- are reported by the Performance Advisor as lacking a covering leading index.
-- This migration is additive only. It does not change RLS, grants, data, Auth,
-- Room Factory behavior, country readiness, payment behavior, or legal state.

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

create index if not exists households_owner_id_idx
  on public.households (owner_id);

create index if not exists rooms_household_id_idx
  on public.rooms (household_id);

create index if not exists rooms_room_owner_id_idx
  on public.rooms (room_owner_id);

create index if not exists room_members_user_id_idx
  on public.room_members (user_id);
