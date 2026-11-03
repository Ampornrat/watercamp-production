import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const getTeamsForScoring = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(
    `SELECT id, team_name, campaign_name FROM contest_teams ORDER BY team_name`
  )
  return rows as { id: string; team_name: string; campaign_name: string }[]
})

const SubmitScoresSchema = z.object({
  judge_name: z.string().min(1).max(255),
  judge_email: z.string().email().max(255),
  scores: z.array(z.object({
    team_id: z.string().uuid(),
    stem_score: z.number().min(0).max(35),
    content_score: z.number().min(0).max(30),
    presentation_score: z.number().min(0).max(35),
  })).min(1),
})

export const submitJudgeScores = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SubmitScoresSchema.parse(d))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.judge_email.trim().toLowerCase()

    const conn = await (pool as any).getConnection()
    try {
      await conn.beginTransaction()
      for (const s of data.scores) {
        await conn.query(
          `INSERT INTO contest_scores (id, team_id, judge_name, judge_email, stem_score, content_score, presentation_score, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             judge_name = VALUES(judge_name),
             stem_score = VALUES(stem_score),
             content_score = VALUES(content_score),
             presentation_score = VALUES(presentation_score),
             submitted_at = NOW()`,
          [randomUUID(), s.team_id, data.judge_name.trim(), email,
           s.stem_score, s.content_score, s.presentation_score]
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

export const getScoringReport = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default

  const [teamRows] = await pool.query(
    `SELECT ct.id, ct.team_name, ct.campaign_name,
            COUNT(cs.id) AS judge_count,
            ROUND(AVG(cs.stem_score), 2) AS avg_stem,
            ROUND(AVG(cs.content_score), 2) AS avg_content,
            ROUND(AVG(cs.presentation_score), 2) AS avg_presentation,
            ROUND(AVG(cs.total_score), 2) AS avg_total,
            MAX(cs.total_score) AS max_total,
            MIN(cs.total_score) AS min_total
     FROM contest_teams ct
     LEFT JOIN contest_scores cs ON cs.team_id = ct.id
     GROUP BY ct.id, ct.team_name, ct.campaign_name
     ORDER BY avg_total DESC`
  )

  const [judgeRows] = await pool.query(
    `SELECT cs.judge_name, cs.judge_email,
            cs.team_id, ct.team_name,
            cs.stem_score, cs.content_score, cs.presentation_score, cs.total_score,
            cs.submitted_at
     FROM contest_scores cs
     JOIN contest_teams ct ON ct.id = cs.team_id
     ORDER BY cs.judge_email, ct.team_name`
  )

  const [judgeListRows] = await pool.query(
    `SELECT DISTINCT judge_name, judge_email, COUNT(DISTINCT team_id) AS scored_teams, MAX(submitted_at) AS last_submitted
     FROM contest_scores
     GROUP BY judge_email, judge_name
     ORDER BY judge_name`
  )

  return {
    teams: teamRows as {
      id: string; team_name: string; campaign_name: string
      judge_count: number; avg_stem: number; avg_content: number
      avg_presentation: number; avg_total: number
      max_total: number; min_total: number
    }[],
    scores: judgeRows as {
      judge_name: string; judge_email: string; team_id: string; team_name: string
      stem_score: number; content_score: number; presentation_score: number
      total_score: number; submitted_at: string
    }[],
    judges: judgeListRows as {
      judge_name: string; judge_email: string; scored_teams: number; last_submitted: string
    }[],
  }
})

export const getJudgeExistingScores = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { judge_email: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.judge_email.trim().toLowerCase()
    const [rows] = await pool.query(
      `SELECT team_id, stem_score, content_score, presentation_score
       FROM contest_scores WHERE judge_email = ?`,
      [email]
    )
    return rows as { team_id: string; stem_score: number; content_score: number; presentation_score: number }[]
  })
