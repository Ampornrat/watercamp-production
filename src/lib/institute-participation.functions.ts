import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const DeclineInput = z.object({
  institute_id: z.string().uuid(),
});

const JoinInput = z.object({
  institute_id: z.string().uuid(),
  consent_text: z.string().min(10).max(5000),
});

export const recordInstituteDecline = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => DeclineInput.parse(raw))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    const [instRows] = await pool.query(`SELECT id FROM institutes_tab WHERE id = ? LIMIT 1`, [data.institute_id]);
    if ((instRows as any[]).length === 0) throw new Error('ไม่พบสถาบันที่เลือก');

    const id = randomUUID();
    await pool.query(
      `INSERT INTO institute_participations (id, institute_id, status, created_at) VALUES (?, ?, 'decline', NOW())`,
      [id, data.institute_id]
    );
    return { id };
  });

export const recordInstituteJoinConsent = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => JoinInput.parse(raw))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    const [instRows] = await pool.query(`SELECT id FROM institutes_tab WHERE id = ? LIMIT 1`, [data.institute_id]);
    if ((instRows as any[]).length === 0) throw new Error('ไม่พบสถาบันที่เลือก');

    const id = randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      `INSERT INTO institute_participations (id, institute_id, status, consent_given, consent_text, consent_at, created_at)
       VALUES (?, ?, 'join', 1, ?, ?, NOW())`,
      [id, data.institute_id, data.consent_text, now]
    );
    return { id };
  });
