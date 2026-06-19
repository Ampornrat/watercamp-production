DO $$
DECLARE sid uuid;
BEGIN
  SELECT id INTO sid FROM vault.secrets WHERE name='email_queue_service_role_key';
  -- Apply the actual key manually via Supabase dashboard (Vault). Do NOT commit the real secret.
  PERFORM vault.update_secret(sid, '<REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY>', 'email_queue_service_role_key');
END;
$$;
DROP FUNCTION IF EXISTS public._tmp_vault_sha();