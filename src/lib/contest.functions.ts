import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Public list — returns only what the submit page needs to populate the picker.
export const listContestTeams = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(`SELECT id, team_name, campaign_name FROM contest_teams ORDER BY created_at DESC`);
  return (rows as any[]) ?? [];
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
    const pool = (await import('@/lib/db.server')).default;

    const allRegIds = [data.leaderRegistrationId, ...data.memberRegistrationIds];
    const placeholders = allRegIds.map(() => '?').join(',');
    const [regs] = await pool.query(
      `SELECT id, guest_name, guest_email, institute_id, completion_status FROM registrations WHERE id IN (${placeholders})`,
      allRegIds
    );

    const byId = new Map((regs as any[]).map((r) => [r.id, r]));
    for (const rid of allRegIds) {
      const r = byId.get(rid);
      if (!r) throw new Error('ไม่พบใบสมัครบางรายการ');
      if (r.institute_id !== data.instituteId) throw new Error('สมาชิกบางคนไม่ได้สังกัดสถาบันนี้');
      if (r.completion_status !== 'completed') throw new Error('สมาชิกบางคนยังไม่ผ่านการอบรม');
    }

    const leader = byId.get(data.leaderRegistrationId)!;
    const teamId = randomUUID();
    await pool.query(
      `INSERT INTO contest_teams (id, team_name, institute_id, leader_registration_id, leader_name, leader_email, campaign_name, concept, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        teamId, data.teamName.trim(), data.instituteId, leader.id,
        leader.guest_name ?? '', (leader.guest_email ?? '').toLowerCase(),
        data.campaignName.trim(), data.concept.trim(),
      ]
    );

    for (const mid of data.memberRegistrationIds) {
      const m = byId.get(mid)!;
      const memberId = randomUUID();
      await pool.query(
        `INSERT INTO contest_team_members (id, team_id, registration_id, member_name, member_email) VALUES (?, ?, ?, ?, ?)`,
        [memberId, teamId, m.id, m.guest_name ?? '', (m.guest_email ?? '').toLowerCase()]
      );
    }

    return { id: teamId };
  })

const UploadUrlSchema = z.object({
  teamId: z.string().uuid(),
  filename: z.string().min(1).max(255).regex(/^[\w.\- ]+$/),
})

export const createContestUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => UploadUrlSchema.parse(input))
  .handler(async ({ data }) => {
    // Storage upload via Supabase removed.
    // Return a stub — caller should handle this gracefully.
    throw new Error('ระบบอัปโหลดไฟล์ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
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
    const pool = (await import('@/lib/db.server')).default;
    const [teamRows] = await pool.query(`SELECT id, leader_email FROM contest_teams WHERE id = ? LIMIT 1`, [data.teamId]);
    const team = (teamRows as any[])[0];
    if (!team) throw new Error('ไม่พบทีม');

    const id = randomUUID();
    await pool.query(
      `INSERT INTO contest_submissions (id, team_id, campaign_name, file_url, file_name, file_size, note, submitted_by_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id, data.teamId, data.campaignName.trim(), data.path, data.fileName,
        data.fileSize, data.note?.trim() || null,
        data.submitterEmail?.trim().toLowerCase() || team.leader_email || 'unknown',
      ]
    );
    return { ok: true };
  })
