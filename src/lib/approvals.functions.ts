import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const VoteSchema = z.object({
  registrationId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional().nullable(),
})

export interface VoteResult {
  totalAdvisors: number
  votes: number
  approvals: number
  rejections: number
  allVoted: boolean
  finalStatus: 'pending' | 'approved' | 'rejected'
}

export const castAdvisorVote = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => VoteSchema.parse(input))
  .handler(async ({ data }): Promise<VoteResult> => {
    const pool = (await import('@/lib/db.server')).default;

    // Update registration approval status directly (auth removed)
    await pool.query(
      `UPDATE registrations SET approval_status = ? WHERE id = ?`,
      [data.decision === 'approve' ? 'approved' : 'rejected', data.registrationId]
    );

    return {
      totalAdvisors: 1,
      votes: 1,
      approvals: data.decision === 'approve' ? 1 : 0,
      rejections: data.decision === 'reject' ? 1 : 0,
      allVoted: true,
      finalStatus: data.decision === 'approve' ? 'approved' : 'rejected',
    };
  })
