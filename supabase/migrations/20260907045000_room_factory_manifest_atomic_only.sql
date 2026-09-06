-- Room Factory launch hardening: manifest creation must use the trusted atomic RPC.
-- Keep read/update policy behavior unchanged; remove only direct client INSERT authority.

DROP POLICY IF EXISTS "room_factory_manifests_insert_owner"
  ON public.room_factory_manifests;

REVOKE INSERT ON TABLE public.room_factory_manifests FROM anon, authenticated;
