import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Public list — returns only what the submit page needs to populate the picker.
export const listContestTeams = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin
    .from('contest_teams')
    .select('id, team_name, campaign_name')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
})

const RegisterTeamSchema = z.object({
  teamName: z.string().min(1).max(120),
  instituteId: z.string().uuid(),
  leaderRegistrationId: z.string().uuid(),
  memberRegistrationIds: z.array(z.string().uuid()).min(1).max(20),
  campaignName: z.string().min(1).max(200),
  concept: z.string().min(1).max(1500),
})

export const registerContestTeam = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => RegisterTeamSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const allRegIds = [data.leaderRegistrationId, ...data.memberRegistrationIds]
    const { data: regs, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('id, guest_name, guest_email, institute_id, completion_status')
      .in('id', allRegIds)
    if (regErr) throw new Error(regErr.message)

    const byId = new Map((regs ?? []).map((r) => [r.id, r]))
    for (const rid of allRegIds) {
      const r = byId.get(rid)
      if (!r) throw new Error('ไม่พบใบสมัครบางรายการ')
      if (r.institute_id !== data.instituteId) throw new Error('สมาชิกบางคนไม่ได้สังกัดสถาบันนี้')
      if (r.completion_status !== 'completed') throw new Error('สมาชิกบางคนยังไม่ผ่านการอบรม')
    }

    const leader = byId.get(data.leaderRegistrationId)!
    const { data: team, error: insErr } = await supabaseAdmin
      .from('contest_teams')
      .insert({
        team_name: data.teamName.trim(),
        institute_id: data.instituteId,
        leader_registration_id: leader.id,
        leader_name: leader.guest_name ?? '',
        leader_email: (leader.guest_email ?? '').toLowerCase(),
        campaign_name: data.campaignName.trim(),
        concept: data.concept.trim(),
      })
      .select('id')
      .single()
    if (insErr) throw new Error(insErr.message)

    const members = data.memberRegistrationIds.map((id) => {
      const m = byId.get(id)!
      return {
        team_id: team.id,
        registration_id: m.id,
        member_name: m.guest_name ?? '',
        member_email: (m.guest_email ?? '').toLowerCase(),
      }
    })
    if (members.length) {
      const { error: mErr } = await supabaseAdmin.from('contest_team_members').insert(members)
      if (mErr) throw new Error(mErr.message)
    }

    return { id: team.id }
  })

const UploadUrlSchema = z.object({
  teamId: z.string().uuid(),
  filename: z.string().min(1).max(255).regex(/^[\w.\- ]+$/),
})

export const createContestUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => UploadUrlSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: team } = await supabaseAdmin
      .from('contest_teams')
      .select('id')
      .eq('id', data.teamId)
      .maybeSingle()
    if (!team) throw new Error('ไม่พบทีม')

    const ext = data.filename.includes('.') ? data.filename.split('.').pop()!.slice(0, 10) : 'bin'
    const path = `${data.teamId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { data: signed, error } = await supabaseAdmin.storage
      .from('contest-submissions')
      .createSignedUploadUrl(path)
    if (error || !signed) throw new Error(error?.message ?? 'สร้างลิงก์อัปโหลดไม่สำเร็จ')
    return { path, token: signed.token, signedUrl: signed.signedUrl }
  })

const SubmitEntrySchema = z.object({
  teamId: z.string().uuid(),
  campaignName: z.string().min(1).max(200),
  path: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(500 * 1024 * 1024),
  note: z.string().max(2000).optional().nullable(),
  submitterEmail: z.string().email().max(255).optional().nullable(),
})

export const submitContestEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SubmitEntrySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: team } = await supabaseAdmin
      .from('contest_teams')
      .select('id, leader_email')
      .eq('id', data.teamId)
      .maybeSingle()
    if (!team) throw new Error('ไม่พบทีม')

    // Verify the file actually exists in storage at the given path.
    const folder = data.path.split('/')[0]
    if (folder !== data.teamId) throw new Error('เส้นทางไฟล์ไม่ถูกต้อง')
    const { data: list } = await supabaseAdmin.storage
      .from('contest-submissions')
      .list(data.teamId, { search: data.path.split('/').slice(1).join('/') })
    if (!list || list.length === 0) throw new Error('ไม่พบไฟล์ที่อัปโหลด')

    const { data: signed } = await supabaseAdmin.storage
      .from('contest-submissions')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365)

    const { error } = await supabaseAdmin.from('contest_submissions').insert({
      team_id: data.teamId,
      campaign_name: data.campaignName.trim(),
      file_url: signed?.signedUrl ?? data.path,
      file_name: data.fileName,
      file_size: data.fileSize,
      note: data.note?.trim() || null,
      submitted_by_email:
        data.submitterEmail?.trim().toLowerCase() || team.leader_email || 'unknown',
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })
