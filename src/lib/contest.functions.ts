import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const listContestTeams = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(
    `SELECT id, team_name, campaign_name, leader_email, round1_status FROM contest_teams ORDER BY created_at DESC`
  );
  return (rows as any[]) ?? [];
})

export const getContestEligibleMembers = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { institute_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    const [reqRows] = await pool.query(
      `SELECT id FROM trainings WHERE required_for_contest = 1 LIMIT 1`
    )
    const hasRequirements = (reqRows as any[]).length > 0

    let rows: any[]
    if (hasRequirements) {
      const [r] = await pool.query(
        `SELECT DISTINCT r.guest_name, r.guest_email, r.id AS registration_id
         FROM registrations r
         JOIN trainings t ON t.id = r.training_id
         WHERE r.institute_id = ?
           AND r.completion_status = 'completed'
           AND t.required_for_contest = 1
         ORDER BY r.guest_name`,
        [data.institute_id]
      )
      rows = r as any[]
    } else {
      const [r] = await pool.query(
        `SELECT DISTINCT r.guest_name, r.guest_email, r.id AS registration_id
         FROM registrations r
         WHERE r.institute_id = ?
           AND r.approval_status = 'approved'
         ORDER BY r.guest_name`,
        [data.institute_id]
      )
      rows = r as any[]
    }

    const seen = new Set<string>()
    const result: { name: string; email: string; registration_id: string }[] = []
    for (const row of rows) {
      const email = String(row.guest_email ?? '').toLowerCase()
      if (!seen.has(email)) {
        seen.add(email)
        result.push({ name: row.guest_name ?? email, email, registration_id: row.registration_id })
      }
    }
    return result
  })

const RegisterTeamSchema = z.object({
  teamName: z.string().min(1).max(120),
  instituteId: z.string().uuid(),
  leaderEmail: z.string().email().max(255),
  memberEmails: z.array(z.string().email()).min(4).max(20),
  campaignName: z.string().min(1).max(200),
  concept: z.string().min(1).max(1500),
  storyboardPath: z.string().min(1).max(500),
  storyboardFileName: z.string().min(1).max(255),
  storyboardFileSize: z.number().int().min(1).max(100 * 1024 * 1024),
})

export const registerContestTeam = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => RegisterTeamSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    const allEmails = [...new Set([data.leaderEmail, ...data.memberEmails].map((e) => e.toLowerCase()))]

    // Verify all members belong to the same institute
    const emailPlaceholders = allEmails.map(() => '?').join(',')
    const [memberRegs] = await pool.query(
      `SELECT LOWER(guest_email) AS email, MAX(guest_name) AS name, MAX(institute_id) AS institute_id
       FROM registrations
       WHERE LOWER(guest_email) IN (${emailPlaceholders})
       GROUP BY LOWER(guest_email)`,
      allEmails
    )
    const byEmail = new Map((memberRegs as any[]).map((r) => [r.email, r]))

    for (const email of allEmails) {
      if (!byEmail.has(email)) throw new Error(`ไม่พบข้อมูลการลงทะเบียนสำหรับ ${email}`)
      if (byEmail.get(email)?.institute_id !== data.instituteId)
        throw new Error(`${email} ไม่ได้สังกัดสถาบันที่เลือก`)
    }

    // Verify no member is already in another team
    const [existingRows] = await pool.query(
      `SELECT email FROM (
         SELECT LOWER(leader_email) AS email FROM contest_teams
         UNION ALL
         SELECT LOWER(member_email) AS email FROM contest_team_members
       ) AS all_members
       WHERE email IN (${emailPlaceholders})`,
      allEmails
    )
    const alreadyInTeam = (existingRows as any[]).map((r) => r.email)
    if (alreadyInTeam.length > 0) {
      const names = alreadyInTeam.map((email: string) => byEmail.get(email)?.name ?? email)
      throw new Error(`สมาชิกต่อไปนี้อยู่ในทีมอื่นแล้ว: ${names.join(', ')}`)
    }

    // Validate required_for_contest completion
    const [reqRows] = await pool.query(`SELECT id FROM trainings WHERE required_for_contest = 1`)
    const reqIds = (reqRows as any[]).map((r: any) => r.id)

    if (reqIds.length > 0) {
      const reqPlaceholders = reqIds.map(() => '?').join(',')
      const [completedRows] = await pool.query(
        `SELECT LOWER(guest_email) AS email
         FROM registrations
         WHERE LOWER(guest_email) IN (${emailPlaceholders})
           AND training_id IN (${reqPlaceholders})
           AND completion_status = 'completed'
         GROUP BY LOWER(guest_email)`,
        [...allEmails, ...reqIds]
      )
      const completedEmails = new Set((completedRows as any[]).map((r) => r.email))
      for (const email of allEmails) {
        if (!completedEmails.has(email)) {
          const name = byEmail.get(email)?.name ?? email
          throw new Error(`"${name}" ยังไม่ผ่านหลักสูตรที่กำหนดสำหรับการประกวด`)
        }
      }
    }

    const leader = byEmail.get(data.leaderEmail.toLowerCase())!
    const teamId = randomUUID()
    await pool.query(
      `INSERT INTO contest_teams (id, team_name, institute_id, leader_name, leader_email, campaign_name, concept, storyboard_url, storyboard_file_name, storyboard_file_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [teamId, data.teamName.trim(), data.instituteId, leader.name ?? '', data.leaderEmail.toLowerCase(),
       data.campaignName.trim(), data.concept.trim(),
       data.storyboardPath, data.storyboardFileName, data.storyboardFileSize]
    )

    for (const email of data.memberEmails.map((e) => e.toLowerCase())) {
      const m = byEmail.get(email)
      await pool.query(
        `INSERT INTO contest_team_members (id, team_id, member_name, member_email) VALUES (?, ?, ?, ?)`,
        [randomUUID(), teamId, m?.name ?? '', email]
      )
    }

    return { id: teamId }
  })

export const getContestTeamsReport = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;

  const [teamRows] = await pool.query(
    `SELECT
       ct.id, ct.team_name, ct.leader_name, ct.leader_email,
       ct.campaign_name, ct.concept,
       ct.storyboard_url, ct.storyboard_file_name, ct.storyboard_file_size,
       ct.created_at,
       ct.score, ct.round1_status, ct.round1_approved_at, ct.round1_notes,
       COALESCE(i.name, '') AS institute_name,
       GROUP_CONCAT(
         DISTINCT CONCAT_WS('||', ctm.member_name, ctm.member_email)
         ORDER BY ctm.member_name
         SEPARATOR ';;'
       ) AS members_raw
     FROM contest_teams ct
     LEFT JOIN institutes_tab i ON i.id = ct.institute_id
     LEFT JOIN contest_team_members ctm ON ctm.team_id = ct.id
     GROUP BY ct.id
     ORDER BY ct.created_at DESC`
  )

  const [subRows] = await pool.query(
    `SELECT team_id, id, campaign_name, file_url, file_name, file_size,
            storyboard_url, storyboard_file_name, note, submitted_by_email, created_at
     FROM contest_submissions
     ORDER BY created_at DESC`
  )

  const subsByTeam = new Map<string, any[]>()
  for (const s of subRows as any[]) {
    if (!subsByTeam.has(s.team_id)) subsByTeam.set(s.team_id, [])
    subsByTeam.get(s.team_id)!.push(s)
  }

  return (teamRows as any[]).map((t) => ({
    id: t.id as string,
    team_name: t.team_name as string,
    leader_name: t.leader_name as string,
    leader_email: t.leader_email as string,
    campaign_name: t.campaign_name as string,
    concept: t.concept as string,
    storyboard_url: t.storyboard_url as string | null,
    storyboard_file_name: t.storyboard_file_name as string | null,
    storyboard_file_size: t.storyboard_file_size as number | null,
    created_at: t.created_at as string,
    score: t.score as number | null,
    round1_status: (t.round1_status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    round1_approved_at: t.round1_approved_at as string | null,
    round1_notes: t.round1_notes as string | null,
    institute_name: t.institute_name as string,
    members: (t.members_raw as string | null)
      ? (t.members_raw as string).split(';;').map((m: string) => {
          const [name, email] = m.split('||')
          return { name: name ?? '', email: email ?? '' }
        })
      : [],
    submissions: subsByTeam.get(t.id) ?? [],
  }))
})

const UploadUrlSchema = z.object({
  teamId: z.string().uuid(),
  filename: z.string().min(1).max(255).regex(/^[\w.\- ]+$/),
})

export const createContestUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => UploadUrlSchema.parse(input))
  .handler(async ({ data }) => {
    const { createHmac } = await import('crypto')
    const expires = Date.now() + 10 * 60 * 1000
    const storagePath = `contest/${data.teamId}/${Date.now()}-${data.filename}`
    const secret = process.env.DB_PASSWORD ?? 'watercamp-upload'
    const sig = createHmac('sha256', secret).update(`${storagePath}:${expires}`).digest('hex')
    const signedUrl = `/api/contest/upload?path=${encodeURIComponent(storagePath)}&expires=${expires}&sig=${sig}`
    return { path: `/uploads/${storagePath}`, signedUrl }
  })

const StoryboardUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[\w.\- ]+$/),
})

export const createStoryboardUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => StoryboardUploadUrlSchema.parse(input))
  .handler(async ({ data }) => {
    const { createHmac } = await import('crypto')
    const expires = Date.now() + 10 * 60 * 1000
    const storagePath = `contest/storyboard/${Date.now()}-${data.filename}`
    const secret = process.env.DB_PASSWORD ?? 'watercamp-upload'
    const sig = createHmac('sha256', secret).update(`${storagePath}:${expires}`).digest('hex')
    const signedUrl = `/api/contest/upload?path=${encodeURIComponent(storagePath)}&expires=${expires}&sig=${sig}`
    return { path: `/uploads/${storagePath}`, signedUrl }
  })

const SubmitEntrySchema = z.object({
  teamId: z.string().uuid(),
  campaignName: z.string().min(1).max(200),
  path: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(500 * 1024 * 1024),
  storyboardPath: z.string().min(1).max(500),
  storyboardFileName: z.string().min(1).max(255),
  storyboardFileSize: z.number().int().min(1).max(100 * 1024 * 1024),
  note: z.string().max(2000).optional().nullable(),
  submitterEmail: z.string().email().max(255).optional().nullable(),
})

export const submitContestEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SubmitEntrySchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    const [teamRows] = await pool.query(
      `SELECT id, leader_email, round1_status FROM contest_teams WHERE id = ? LIMIT 1`,
      [data.teamId]
    );
    const team = (teamRows as any[])[0];
    if (!team) throw new Error('ไม่พบทีม');
    if (team.round1_status !== 'approved') throw new Error('ทีมยังไม่ผ่านการคัดเลือกรอบที่ 1');

    const id = randomUUID();
    await pool.query(
      `INSERT INTO contest_submissions
         (id, team_id, campaign_name, file_url, file_name, file_size, storyboard_url, storyboard_file_name, storyboard_file_size, note, submitted_by_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, data.teamId, data.campaignName.trim(), data.path, data.fileName, data.fileSize,
       data.storyboardPath, data.storyboardFileName, data.storyboardFileSize,
       data.note?.trim() || null, data.submitterEmail?.trim().toLowerCase() || team.leader_email || 'unknown']
    );
    return { ok: true };
  })

// ─── Round 1 scoring & approval ───────────────────────────────────────────────

const SetTeamScoreSchema = z.object({
  teamId: z.string().uuid(),
  score: z.number().min(0).max(100).nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const setTeamScore = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SetTeamScoreSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    await pool.query(
      `UPDATE contest_teams SET score = ?, round1_notes = ? WHERE id = ?`,
      [data.score, data.notes?.trim() || null, data.teamId]
    );
    return { ok: true };
  })

const ApproveRound1Schema = z.object({
  teamId: z.string().uuid(),
  approve: z.boolean(),
})

export const approveTeamRound1 = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => ApproveRound1Schema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    const status = data.approve ? 'approved' : 'rejected';
    await pool.query(
      `UPDATE contest_teams SET round1_status = ?, round1_approved_at = ? WHERE id = ?`,
      [status, data.approve ? new Date() : null, data.teamId]
    );

    if (data.approve) {
      const [teamRows] = await pool.query(
        `SELECT team_name, leader_name, leader_email FROM contest_teams WHERE id = ? LIMIT 1`,
        [data.teamId]
      );
      const team = (teamRows as any[])[0];
      if (!team) return { ok: true };

      const [memberRows] = await pool.query(
        `SELECT member_name, member_email FROM contest_team_members WHERE team_id = ?`,
        [data.teamId]
      );
      const recipients = [
        { name: team.leader_name as string, email: team.leader_email as string },
        ...(memberRows as any[]).map((m) => ({ name: m.member_name as string, email: m.member_email as string })),
      ];

      const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
      const { sendMail } = await import('@/lib/email/mailer.server');
      await Promise.allSettled(
        recipients.map((r) =>
          sendMail({
            to: r.email,
            subject: `🎉 ยินดีด้วย! ทีม ${team.team_name} ผ่านการคัดเลือกรอบที่ 1 – ThaiWater Challenge`,
            html: buildRound1ApprovalEmail(r.name, team.team_name as string, `${siteUrl}/contest/submit`),
          })
        )
      );
    }

    return { ok: true };
  })

function buildRound1ApprovalEmail(name: string, teamName: string, submitUrl: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Sarabun,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;">
        <tr><td style="background:linear-gradient(135deg,#0f4c81,#0d9488);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">ThaiWater Challenge</h1>
          <p style="margin:8px 0 0;color:#b2f5ea;font-size:14px;">โครงการอบรมแลกเปลี่ยนเรียนรู้และการประยุกต์</p>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">เรียน <strong>${name || 'สมาชิก'}</strong>,</p>
          <div style="background:#ecfdf5;border-left:4px solid #10b981;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#065f46;">🎉 ยินดีด้วย! ทีมของท่านผ่านการคัดเลือกรอบที่ 1</p>
          </div>
          <p style="margin:0 0 12px;font-size:15px;color:#374151;">ทีม <strong style="color:#0f4c81;">${teamName}</strong> ผ่านการพิจารณา Story Board รอบที่ 1 ของ <strong>ThaiWater Challenge</strong> เรียบร้อยแล้ว</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">ขอเชิญท่านส่งผลงานรอบที่ 2 โดยอัปโหลดไฟล์ดังต่อไปนี้:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:12px 16px;background:#f0f9ff;border-radius:8px;">
              <span style="font-size:20px;">🎬</span>
              <strong style="font-size:15px;color:#1e40af;"> VDO Clip</strong>
              <span style="font-size:14px;color:#6b7280;"> — ไฟล์ .mp4 ขนาดไม่เกิน 500MB</span>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:#fefce8;border-radius:8px;">
              <span style="font-size:20px;">📋</span>
              <strong style="font-size:15px;color:#92400e;"> Story Board ที่ปรับปรุงแล้ว</strong>
              <span style="font-size:14px;color:#6b7280;"> — ไฟล์ PDF ขนาดไม่เกิน 100MB</span>
            </td></tr>
          </table>
          <div style="text-align:center;margin:32px 0;">
            <a href="${submitUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">ส่งผลงานรอบที่ 2</a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">หากมีข้อสงสัยกรุณาติดต่อ <a href="mailto:thaiwaterchallenge@gmail.com" style="color:#0d9488;">thaiwaterchallenge@gmail.com</a></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 ThaiWater Challenge · สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
