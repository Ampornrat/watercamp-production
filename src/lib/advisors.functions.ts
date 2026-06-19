import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const Schema = z.object({
  full_name: z.string().min(1).max(255),
  position: z.string().min(1).max(255),
  faculty: z.string().min(1).max(255),
  institute_id: z.string().uuid(),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  role: z.enum(['main', 'assistant']),
  institute_participation_id: z.string().uuid().optional().nullable(),
  redirect_to: z.string().url().max(500).optional().nullable(),
})

export const registerAdvisor = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const email = data.email.trim().toLowerCase()

    // Enforce role rules: only one 'main' per institute
    if (data.role === 'main') {
      const { data: existingMain } = await supabaseAdmin
        .from('advisors')
        .select('id')
        .eq('institute_id', data.institute_id)
        .eq('role', 'main')
        .maybeSingle()
      if (existingMain) {
        throw new Error('สถาบันนี้มีอาจารย์หลักแล้ว กรุณาเลือกบทบาทเป็นอาจารย์ผู้ช่วย')
      }
    }

    // Check duplicate advisor email
    const { data: dup } = await supabaseAdmin
      .from('advisors')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    if (dup) throw new Error('อีเมลนี้ได้ลงทะเบียนเป็นอาจารย์แล้ว')

    // Create or find auth user
    let userId: string | null = null
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: data.full_name,
        role: 'advisor',
        institute_id: data.institute_id,
      },
      redirectTo: data.redirect_to || undefined,
    })
    if (inviteErr) {
      // If already registered, look up the user id by listing
      const msg = String(inviteErr.message || '')
      if (/already|registered|exists/i.test(msg)) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
        const found = list?.users?.find((u) => (u.email || '').toLowerCase() === email)
        userId = found?.id ?? null
      } else {
        throw new Error(inviteErr.message)
      }
    } else {
      userId = invited?.user?.id ?? null
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('advisors')
      .insert({
        full_name: data.full_name,
        position: data.position,
        faculty: data.faculty,
        institute_id: data.institute_id,
        email,
        phone: data.phone || null,
        address: data.address || null,
        postal_code: data.postal_code || null,
        role: data.role,
        user_id: userId,
        institute_participation_id: data.institute_participation_id || null,
      } as any)
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    // Ensure user has the 'advisor' role
    if (userId) {
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'advisor' }, { onConflict: 'user_id,role' })
    }

    return { id: inserted.id, userId }
  })
