import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const GuestRegistrationsInput = z.object({
  training_ids: z.array(z.string().uuid()).min(1).max(20),
  institute_id: z.string().uuid(),
  guest_name: z.string().trim().min(1).max(255),
  guest_email: z.string().trim().toLowerCase().email().max(255),
  gender: z.string().trim().min(1).max(50),
  age: z.number().int().min(1).max(120),
  education_level: z.string().trim().min(1).max(100),
  education_level_other: z.string().trim().max(255).nullable().optional(),
  field_of_study: z.string().trim().max(255).nullable().optional(),
  participant_status: z.string().trim().min(1).max(100),
  participant_status_other: z.string().trim().max(255).nullable().optional(),
  pdpa_consent_text: z.string().min(10).max(10000),
});

export const createGuestRegistrations = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => GuestRegistrationsInput.parse(raw))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    // Verify institute exists
    const [instRows] = await pool.query(`SELECT id FROM institutes_tab WHERE id = ?`, [data.institute_id]);
    if ((instRows as any[]).length === 0) throw new Error('ไม่พบสถาบันที่เลือก');

    // Verify all training ids exist
    const placeholders = data.training_ids.map(() => '?').join(',');
    const [foundTrainings] = await pool.query(
      `SELECT id FROM trainings WHERE id IN (${placeholders})`,
      data.training_ids
    );
    const foundSet = new Set((foundTrainings as any[]).map((t) => t.id));
    const missing = data.training_ids.filter((tid) => !foundSet.has(tid));
    if (missing.length > 0) throw new Error('พบรายการหลักสูตรที่ไม่ถูกต้อง');

    // Block duplicate email across institutes
    const [existingRows] = await pool.query(
      `SELECT institute_id FROM registrations WHERE guest_email = ? LIMIT 50`,
      [data.guest_email]
    );
    const otherInstitute = (existingRows as any[]).find(
      (r) => r.institute_id && r.institute_id !== data.institute_id
    );
    if (otherInstitute) {
      throw new Error('อีเมลนี้ได้ลงทะเบียนกับสถาบันอื่นแล้ว ไม่สามารถลงทะเบียนซ้ำกับสถาบันอื่นได้');
    }

    const stampedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const tid of data.training_ids) {
      const id = randomUUID();
      try {
        await pool.query(
          `INSERT INTO registrations (
            id, training_id, institute_id, guest_name, guest_email,
            gender, age, education_level, education_level_other, field_of_study,
            participant_status, participant_status_other,
            pdpa_consent, pdpa_consent_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            id, tid, data.institute_id, data.guest_name, data.guest_email,
            data.gender, data.age, data.education_level, data.education_level_other ?? null,
            data.field_of_study ?? null, data.participant_status,
            data.participant_status_other ?? null, stampedAt, stampedAt,
          ]
        );
      } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY') {
          throw new Error('อีเมลนี้ได้ลงทะเบียนหลักสูตรนี้ไปแล้ว');
        }
        throw new Error(err?.message ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    }

    return { ok: true, count: data.training_ids.length };
  });
