import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const GuestRegistrationsInput = z.object({
  training_ids: z.array(z.string().uuid()).min(1).max(20),
  institute_id: z.string().uuid(),
  guest_name: z.string().trim().min(1).max(255),
  guest_email: z.string().trim().toLowerCase().email().max(255),
  gender: z.string().trim().min(1).max(50),
  age: z.number().int().min(1).max(120),
  education_level: z.string().trim().min(1).max(100),
  education_level_other: z.string().trim().max(255).nullable().optional(),
  field_of_study: z.string().trim().max(255).nullable().optional(),
  participant_status: z.string().trim().min(1).max(100),
  participant_status_other: z.string().trim().max(255).nullable().optional(),
  pdpa_consent_text: z.string().min(10).max(10000),
});

/**
 * Creates guest (unauthenticated) registrations for one or more trainings.
 *
 * Hardening:
 * - Validates the institute exists
 * - Validates every training_id exists (trainings table is the source of truth, not client input)
 * - PDPA timestamp is stamped server-side
 * - Database triggers still enforce capacity and prerequisite rules
 * - advisor_email is intentionally not accepted from client input — guests cannot pre-attach themselves
 *   to an arbitrary advisor (which was the original RLS hole).
 */
export const createGuestRegistrations = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => GuestRegistrationsInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    // Verify institute
    const { data: inst, error: instErr } = await supabaseAdmin
      .from('institutes_tab')
      .select('id')
      .eq('id', data.institute_id)
      .maybeSingle();
    if (instErr) throw new Error(instErr.message);
    if (!inst) throw new Error('ไม่พบสถาบันที่เลือก');

    // Verify all training ids exist
    const { data: foundTrainings, error: tErr } = await supabaseAdmin
      .from('trainings')
      .select('id')
      .in('id', data.training_ids);
    if (tErr) throw new Error(tErr.message);
    const foundSet = new Set((foundTrainings ?? []).map((t) => t.id));
    const missing = data.training_ids.filter((tid) => !foundSet.has(tid));
    if (missing.length > 0) throw new Error('พบรายการหลักสูตรที่ไม่ถูกต้อง');

    // Block duplicate email across institutes — one email may only register under a single institute
    const { data: existing, error: dupErr } = await supabaseAdmin
      .from('registrations')
      .select('institute_id')
      .eq('guest_email', data.guest_email)
      .limit(50);
    if (dupErr) throw new Error(dupErr.message);
    const otherInstitute = (existing ?? []).find((r) => r.institute_id && r.institute_id !== data.institute_id);
    if (otherInstitute) {
      throw new Error('อีเมลนี้ได้ลงทะเบียนกับสถาบันอื่นแล้ว ไม่สามารถลงทะเบียนซ้ำกับสถาบันอื่นได้');
    }

    const stampedAt = new Date().toISOString();
    const rows = data.training_ids.map((tid) => ({
      training_id: tid,
      user_id: null,
      institute_id: data.institute_id,
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      gender: data.gender,
      age: data.age,
      education_level: data.education_level,
      education_level_other: data.education_level_other ?? null,
      field_of_study: data.field_of_study ?? null,
      participant_status: data.participant_status,
      participant_status_other: data.participant_status_other ?? null,
      pdpa_consent: true,
      pdpa_consent_at: stampedAt,
      pdpa_consent_text: data.pdpa_consent_text,
    }));

    const { error } = await supabaseAdmin.from('registrations').insert(rows);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new Error('อีเมลนี้ได้ลงทะเบียนหลักสูตรนี้ไปแล้ว');
      }
      throw new Error(error.message);
    }
    return { ok: true, count: rows.length };
  });
