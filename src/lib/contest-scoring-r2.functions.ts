import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const getTeamsForScoringR2 = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(
    `SELECT
       ct.id, ct.team_name, ct.campaign_name,
       COALESCE(i.institute, i.name, '') AS institute_name,
       cs.file_url, cs.file_name, cs.file_size,
       cs.storyboard_url, cs.storyboard_file_name,
       cs.note, cs.created_at AS submitted_at
     FROM contest_teams ct
     LEFT JOIN institutes_tab i ON i.id = ct.institute_id
     INNER JOIN contest_submissions cs ON cs.team_id = ct.id
     INNER JOIN (
       SELECT team_id, MAX(created_at) AS latest
       FROM contest_submissions
       GROUP BY team_id
     ) latest_sub ON latest_sub.team_id = ct.id AND latest_sub.latest = cs.created_at
     WHERE ct.round1_status = 'approved'
     ORDER BY ct.created_at DESC`
  )
  return rows as {
    id: string; team_name: string; campaign_name: string; institute_name: string
    file_url: string | null; file_name: string | null; file_size: number | null
    storyboard_url: string | null; storyboard_file_name: string | null
    note: string | null; submitted_at: string
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
    engagement_score: z.number().min(0).max(10),
  })).min(1),
})

export const submitJudgeScoresR2 = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SubmitScoresR2Schema.parse(d))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.judge_email.trim().toLowerCase()
    const conn = await (pool as any).getConnection()
    try {
      await conn.beginTransaction()
      for (const s of data.scores) {
        await conn.query(
          `INSERT INTO contest_scores_r2 (id, team_id, judge_name, judge_email, stem_score, thaiwater_score, storytelling_score, engagement_score, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             judge_name = VALUES(judge_name),
             stem_score = VALUES(stem_score),
             thaiwater_score = VALUES(thaiwater_score),
             storytelling_score = VALUES(storytelling_score),
             engagement_score = VALUES(engagement_score),
             submitted_at = NOW()`,
          [randomUUID(), s.team_id, data.judge_name.trim(), email,
           s.stem_score, s.thaiwater_score, s.storytelling_score, s.engagement_score]
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
      `SELECT team_id, stem_score, thaiwater_score, storytelling_score, engagement_score
       FROM contest_scores_r2 WHERE judge_email = ?`,
      [email]
    )
    return rows as {
      team_id: string; stem_score: number; thaiwater_score: number
      storytelling_score: number; engagement_score: number
    }[]
  })

export const getScoringReportR2 = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [teamRows] = await pool.query(
    `SELECT ct.id, ct.team_name, ct.campaign_name,
            COALESCE(i.institute, i.name, '') AS institute_name,
            COUNT(sr.id) AS judge_count,
            ROUND(AVG(sr.stem_score), 2) AS avg_stem,
            ROUND(AVG(sr.thaiwater_score), 2) AS avg_thaiwater,
            ROUND(AVG(sr.storytelling_score), 2) AS avg_storytelling,
            ROUND(AVG(sr.engagement_score), 2) AS avg_engagement,
            ROUND(AVG(sr.total_score), 2) AS avg_total
     FROM contest_teams ct
     LEFT JOIN institutes_tab i ON i.id = ct.institute_id
     LEFT JOIN contest_scores_r2 sr ON sr.team_id = ct.id
     WHERE ct.round1_status = 'approved'
     GROUP BY ct.id, ct.team_name, ct.campaign_name, institute_name
     ORDER BY avg_total DESC`
  )
  return teamRows as {
    id: string; team_name: string; campaign_name: string; institute_name: string
    judge_count: number; avg_stem: number; avg_thaiwater: number
    avg_storytelling: number; avg_engagement: number; avg_total: number
  }[]
})
