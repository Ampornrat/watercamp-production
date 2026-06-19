import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const DeclineInput = z.object({
  institute_id: z.string().uuid(),
});

const JoinInput = z.object({
  institute_id: z.string().uuid(),
  consent_text: z.string().min(10).max(5000),
});

/**
 * Records that an institute declined participation. Public endpoint (used on the advisor-register page
 * before any user is signed in). Validates the institute exists.
 */
export const recordInstituteDecline = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => DeclineInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: inst, error: instErr } = await supabaseAdmin
      .from('institutes_tab')
      .select('id')
      .eq('id', data.institute_id)
      .maybeSingle();
    if (instErr) throw new Error(instErr.message);
    if (!inst) throw new Error('ไม่พบสถาบันที่เลือก');

    const { data: row, error } = await supabaseAdmin
      .from('institute_participations')
      .insert({ institute_id: data.institute_id, status: 'decline' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/**
 * Records that an institute is joining with a signed consent. Public endpoint. Validates the institute
 * exists and stores the consent text/timestamp server-side so the payload cannot be forged client-side.
 */
export const recordInstituteJoinConsent = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => JoinInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: inst, error: instErr } = await supabaseAdmin
      .from('institutes_tab')
      .select('id')
      .eq('id', data.institute_id)
      .maybeSingle();
    if (instErr) throw new Error(instErr.message);
    if (!inst) throw new Error('ไม่พบสถาบันที่เลือก');

    const { data: row, error } = await supabaseAdmin
      .from('institute_participations')
      .insert({
        institute_id: data.institute_id,
        status: 'join',
        consent_given: true,
        consent_text: data.consent_text,
        consent_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });
