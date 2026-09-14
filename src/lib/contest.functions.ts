import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const listContestTeams = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(`SELECT id, team_name, campaign_name FROM contest_teams ORDER BY created_at DESC`);
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
  .handler(async () => {
    throw new Error('ระบบอัปโหลดไฟล์ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  })

const StoryboardUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[\w.\- ]+$/),
})

export const createStoryboardUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => StoryboardUploadUrlSchema.parse(input))
  .handler(async () => {
    throw new Error('ระบบอัปโหลดไฟล์ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
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
    const [teamRows] = await pool.query(`SELECT id, leader_email FROM contest_teams WHERE id = ? LIMIT 1`, [data.teamId]);
    const team = (teamRows as any[])[0];
    if (!team) throw new Error('ไม่พบทีม');

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
