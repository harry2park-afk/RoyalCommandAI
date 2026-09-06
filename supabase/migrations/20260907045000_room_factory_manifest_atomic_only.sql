-- Room Factory launch hardening: manifest creation must use the trusted atomic RPC.
-- Client roles keep only authenticated SELECT needed for RLS-protected read-back.

DROP POLICY IF EXISTS "room_factory_manifests_insert_owner"
  ON public.room_factory_manifests;

REVOKE ALL PRIVILEGES ON TABLE public.room_factory_manifests FROM anon, authenticated;
GRANT SELECT ON TABLE public.room_factory_manifests TO authenticated;
