import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const getTeamsForScoringR2 = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(
    `SELECT
       ct.id, ct.team_name, ct.campaign_name,
       COALESCE(i.institute, i.name, '') AS institute_name,
       ct.engagement_score AS admin_engagement_score,
       -- latest original submission
       cs_orig.file_url, cs_orig.file_name, cs_orig.file_size,
       cs_orig.storyboard_url, cs_orig.storyboard_file_name,
       cs_orig.note, cs_orig.created_at AS submitted_at,
       -- latest revised submission
       cs_rev.file_url AS revised_file_url,
       cs_rev.file_name AS revised_file_name,
       cs_rev.storyboard_url AS revised_storyboard_url,
       cs_rev.storyboard_file_name AS revised_storyboard_file_name,
       cs_rev.created_at AS revised_at
     FROM contest_teams ct
     LEFT JOIN institutes_tab i ON i.id = ct.institute_id
     LEFT JOIN (
       SELECT cs.* FROM contest_submissions cs
       INNER JOIN (
         SELECT team_id, MAX(created_at) AS latest
         FROM contest_submissions
         WHERE submission_type = 'original'
         GROUP BY team_id
       ) m ON cs.team_id = m.team_id AND cs.created_at = m.latest
       WHERE cs.submission_type = 'original'
     ) cs_orig ON cs_orig.team_id = ct.id
     LEFT JOIN (
       SELECT cs.* FROM contest_submissions cs
       INNER JOIN (
         SELECT team_id, MAX(created_at) AS latest
         FROM contest_submissions
         WHERE submission_type = 'revised'
         GROUP BY team_id
       ) m ON cs.team_id = m.team_id AND cs.created_at = m.latest
       WHERE cs.submission_type = 'revised'
     ) cs_rev ON cs_rev.team_id = ct.id
     WHERE ct.round1_status = 'approved'
     ORDER BY ct.created_at DESC`
  )
  return rows as {
    id: string; team_name: string; campaign_name: string; institute_name: string
    admin_engagement_score: number | null
    file_url: string | null; file_name: string | null; file_size: number | null
    storyboard_url: string | null; storyboard_file_name: string | null
    note: string | null; submitted_at: string | null
    revised_file_url: string | null; revised_file_name: string | null
    revised_storyboard_url: string | null; revised_storyboard_file_name: string | null
    revised_at: string | null
  }[]
})

const SubmitScoresR2Schema = z.object({
  judge_name: z.string().min(1).max(255),
  judge_email: z.string().email().max(255),
  scores: z.array(z.object({
    team_id: z.string().uuid(),
    stem_score: z.number().min(0).max(30),
    thaiwater_score: z.number().min(0).max(30),
    storytelling_score: z.number().min(0).max(30),
    comment: z.string().max(2000).optional().nullable(),
  })).min(1),
})

export const submitJudgeScoresR2 = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SubmitScoresR2Schema.parse(d))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.judge_email.trim().toLowerCase()

    // Fetch admin-set engagement scores for all teams in one query
    const teamIds = data.scores.map((s) => s.team_id)
    const placeholders = teamIds.map(() => '?').join(',')
    const [engRows] = await pool.query(
      `SELECT id, COALESCE(engagement_score, 0) AS engagement_score FROM contest_teams WHERE id IN (${placeholders})`,
      teamIds
    )
    const engMap = new Map((engRows as any[]).map((r) => [r.id, Number(r.engagement_score)]))

    const conn = await (pool as any).getConnection()
    try {
      await conn.beginTransaction()
      for (const s of data.scores) {
        const engScore = engMap.get(s.team_id) ?? 0
        await conn.query(
          `INSERT INTO contest_scores_r2 (id, team_id, judge_name, judge_email, stem_score, thaiwater_score, storytelling_score, engagement_score, comment, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             judge_name = VALUES(judge_name),
             stem_score = VALUES(stem_score),
             thaiwater_score = VALUES(thaiwater_score),
             storytelling_score = VALUES(storytelling_score),
             engagement_score = VALUES(engagement_score),
             comment = VALUES(comment),
             submitted_at = NOW()`,
          [randomUUID(), s.team_id, data.judge_name.trim(), email,
           s.stem_score, s.thaiwater_score, s.storytelling_score, engScore,
           s.comment?.trim() || null]
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
    return { ok: true }
  })

export const getJudgeExistingScoresR2 = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { judge_email: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.judge_email.trim().toLowerCase()
    const [rows] = await pool.query(
      `SELECT team_id, stem_score, thaiwater_score, storytelling_score, engagement_score, comment
       FROM contest_scores_r2 WHERE judge_email = ?`,
      [email]
    )
    return rows as {
      team_id: string; stem_score: number; thaiwater_score: number
      storytelling_score: number; engagement_score: number; comment: string | null
    }[]
  })

export const getScoringReportR2 = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default

  const [teamRows] = await pool.query(
    `SELECT ct.id, ct.team_name, ct.campaign_name,
            COALESCE(i.institute, i.name, '') AS institute_name,
            COALESCE(ct.engagement_score, 0) AS admin_engagement_score,
            COUNT(sr.id) AS judge_count,
            ROUND(COALESCE(AVG(sr.stem_score), 0), 2) AS avg_stem,
            ROUND(COALESCE(AVG(sr.thaiwater_score), 0), 2) AS avg_thaiwater,
            ROUND(COALESCE(AVG(sr.storytelling_score), 0), 2) AS avg_storytelling,
            ROUND(COALESCE(AVG(sr.stem_score + sr.thaiwater_score + sr.storytelling_score), 0) + COALESCE(ct.engagement_score, 0), 2) AS avg_total
     FROM contest_teams ct
     LEFT JOIN institutes_tab i ON i.id = ct.institute_id
     LEFT JOIN contest_scores_r2 sr ON sr.team_id = ct.id
     WHERE ct.round1_status = 'approved'
     GROUP BY ct.id, ct.team_name, ct.campaign_name, institute_name, ct.engagement_score
     ORDER BY avg_total DESC, ct.created_at ASC`
  )

  const [judgeRows] = await pool.query(
    `SELECT sr.judge_name, sr.judge_email,
            sr.team_id, ct.team_name,
            sr.stem_score, sr.thaiwater_score, sr.storytelling_score,
            sr.engagement_score, sr.total_score, sr.comment, sr.submitted_at
     FROM contest_scores_r2 sr
     JOIN contest_teams ct ON ct.id = sr.team_id
     ORDER BY sr.judge_email, ct.team_name`
  )

  const [judgeListRows] = await pool.query(
    `SELECT judge_name, judge_email,
            COUNT(DISTINCT team_id) AS scored_teams,
            MAX(submitted_at) AS last_submitted
     FROM contest_scores_r2
     GROUP BY judge_email, judge_name
     ORDER BY judge_name`
  )

  return {
    teams: (teamRows as any[]).map((r) => ({
      id: r.id, team_name: r.team_name, campaign_name: r.campaign_name,
      institute_name: r.institute_name,
      admin_engagement_score: Number(r.admin_engagement_score),
      judge_count: Number(r.judge_count),
      avg_stem: Number(r.avg_stem),
      avg_thaiwater: Number(r.avg_thaiwater),
      avg_storytelling: Number(r.avg_storytelling),
      avg_total: Number(r.avg_total),
    })) as {
      id: string; team_name: string; campaign_name: string; institute_name: string
      admin_engagement_score: number
      judge_count: number; avg_stem: number; avg_thaiwater: number
      avg_storytelling: number; avg_total: number
    }[],
    scores: (judgeRows as any[]).map((r) => ({
      ...r,
      stem_score: Number(r.stem_score),
      thaiwater_score: Number(r.thaiwater_score),
      storytelling_score: Number(r.storytelling_score),
      engagement_score: Number(r.engagement_score),
      total_score: Number(r.total_score),
    })) as {
      judge_name: string; judge_email: string; team_id: string; team_name: string
      stem_score: number; thaiwater_score: number; storytelling_score: number
      engagement_score: number; total_score: number; comment: string | null
      submitted_at: string
    }[],
    judges: (judgeListRows as any[]).map((r) => ({
      ...r,
      scored_teams: Number(r.scored_teams),
    })) as {
      judge_name: string; judge_email: string; scored_teams: number; last_submitted: string
    }[],
  }
})

// Admin: set engagement score for a team
const SetEngagementSchema = z.object({
  teamId: z.string().uuid(),
  score: z.number().min(0).max(10).nullable(),
})

export const setTeamEngagementScore = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SetEngagementSchema.parse(d))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    await pool.query(
      `UPDATE contest_teams SET engagement_score = ? WHERE id = ?`,
      [data.score, data.teamId]
    )
    return { ok: true }
  })
