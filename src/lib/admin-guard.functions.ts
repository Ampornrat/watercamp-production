import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Defense-in-depth: verifies the caller is an admin (role check in user_roles).
 * Used by route beforeLoad to refuse rendering the admin shell to non-admins,
 * regardless of client-side state.
 */
export const assertAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', context.userId)
      .eq('role', 'admin')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Forbidden')
    return { ok: true }
  })
