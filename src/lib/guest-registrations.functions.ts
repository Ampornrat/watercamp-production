import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const GuestRegistrationsInput = z.object({
  training_ids: z.array(z.string().uuid()).min(1).max(20),
  institute_id: z.string().uuid(),
  guest_name: z.string().trim().min(1).max(255),
  guest_email: z.string().trim().toLowerCase().email().max(255),
  student_id: z.string().trim().max(50).nullable().optional(),
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

    // Block email already used as an advisor
    const [advisorRows] = await pool.query(
      `SELECT id FROM advisors WHERE LOWER(email) = ? LIMIT 1`,
      [data.guest_email]
    );
    if ((advisorRows as any[]).length > 0) {
      throw new Error('อีเมลนี้ถูกใช้ลงทะเบียนเป็นอาจารย์แล้ว ไม่สามารถใช้อีเมลเดียวกันสมัครเป็นนักศึกษาได้');
    }

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

    // Validate prerequisite for elective courses
    const tidPlaceholders = data.training_ids.map(() => '?').join(',');
    const [trainingDetails] = await pool.query(
      `SELECT id, title, course_type, prerequisite_training_id FROM trainings WHERE id IN (${tidPlaceholders})`,
      data.training_ids
    );
    const submittedIds = new Set(data.training_ids);
    for (const t of (trainingDetails as any[])) {
      if (t.course_type === 'elective' && t.prerequisite_training_id) {
        if (submittedIds.has(t.prerequisite_training_id)) continue;
        const [prereqRows] = await pool.query(
          `SELECT id FROM registrations WHERE training_id = ? AND LOWER(guest_email) = ? LIMIT 1`,
          [t.prerequisite_training_id, data.guest_email]
        );
        if ((prereqRows as any[]).length === 0) {
          const [prereqInfo] = await pool.query(
            `SELECT title FROM trainings WHERE id = ? LIMIT 1`,
            [t.prerequisite_training_id]
          );
          const prereqTitle = (prereqInfo as any[])[0]?.title ?? 'หลักสูตรหลัก';
          throw new Error(`กรุณาลงทะเบียน "${prereqTitle}" ก่อนจึงจะสามารถลงทะเบียน "${t.title}" ได้`);
        }
      }
    }

    // Block duplicate registrations (same email + training)
    const [dupRegRows] = await pool.query(
      `SELECT r.training_id, t.title
       FROM registrations r
       JOIN trainings t ON t.id = r.training_id
       WHERE LOWER(r.guest_email) = ? AND r.training_id IN (${tidPlaceholders})`,
      [data.guest_email, ...data.training_ids]
    );
    if ((dupRegRows as any[]).length > 0) {
      const titles = (dupRegRows as any[]).map((r: any) => r.title).join(', ');
      throw new Error(`อีเมลนี้ได้ลงทะเบียนหลักสูตรต่อไปนี้ไปแล้ว: ${titles}`);
    }

    const stampedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const tid of data.training_ids) {
      const id = randomUUID();
      try {
        await pool.query(
          `INSERT INTO registrations (
            id, training_id, institute_id, guest_name, guest_email,
            student_id, gender, age, education_level, education_level_other, field_of_study,
            participant_status, participant_status_other,
            pdpa_consent, pdpa_consent_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            id, tid, data.institute_id, data.guest_name, data.guest_email,
            data.student_id ?? null,
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

    // Upsert student profile
    await pool.query(
      `INSERT INTO student_profiles
         (id, email, full_name, gender, age, education_level, field_of_study, participant_status, institute_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         gender = VALUES(gender),
         age = VALUES(age),
         education_level = VALUES(education_level),
         field_of_study = VALUES(field_of_study),
         participant_status = VALUES(participant_status),
         institute_id = VALUES(institute_id),
         updated_at = NOW()`,
      [
        randomUUID(), data.guest_email, data.guest_name,
        data.gender, data.age, data.education_level,
        data.field_of_study ?? null, data.participant_status, data.institute_id,
      ]
    )

    return { ok: true, count: data.training_ids.length };
  });
