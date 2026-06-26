import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const getAdminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
           a.institute_id, i.institute AS institute_name
    FROM users u
    LEFT JOIN advisors a ON a.email = u.email
    LEFT JOIN institutes_tab i ON i.id = a.institute_id
    ORDER BY u.created_at DESC
  `);
  return rows as {
    id: string; email: string; full_name: string | null; role: string;
    is_active: number; created_at: string;
    institute_name: string | null;
  }[];
});

export const getAdminTrainings = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(`SELECT * FROM trainings ORDER BY created_at DESC`);
  return rows as any[];
});

export const getAdminRegistrations = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default;
  const [rows] = await pool.query(`
    SELECT r.*, t.title as training_title, i.institute as institute_name
    FROM registrations r
    LEFT JOIN trainings t ON t.id = r.training_id
    LEFT JOIN institutes_tab i ON i.id = r.institute_id
    ORDER BY r.created_at DESC
  `);
  return rows as any[];
});

const TrainingFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  instructor: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  start_date: z.string(),
  end_date: z.string(),
  capacity: z.number().int().min(1).max(10000),
  is_published: z.boolean(),
  cover_image_url: z.string().max(2000).optional(),
  online_url: z.string().max(2000).optional(),
  attachment_1_url: z.string().max(2000).optional(),
  attachment_1_name: z.string().max(255).optional(),
  attachment_2_url: z.string().max(2000).optional(),
  attachment_2_name: z.string().max(255).optional(),
  attachment_3_url: z.string().max(2000).optional(),
  attachment_3_name: z.string().max(255).optional(),
  course_type: z.enum(['core', 'elective']),
  prerequisite_training_id: z.string().optional(),
  required_for_contest: z.boolean().optional(),
}).refine((d) => new Date(d.end_date) > new Date(d.start_date), {
  message: 'วันสิ้นสุดต้องหลังวันเริ่มต้น',
  path: ['end_date'],
});

export const saveAdminTraining = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => TrainingFormSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    const prereqId = (data.course_type === 'elective' && data.prerequisite_training_id) ? data.prerequisite_training_id : null;

    if (data.id) {
      await pool.query(
        `UPDATE trainings SET title=?, description=?, category=?, instructor=?, location=?,
         start_date=?, end_date=?, capacity=?, is_published=?, cover_image_url=?, online_url=?,
         attachment_1_url=?, attachment_1_name=?, attachment_2_url=?, attachment_2_name=?,
         attachment_3_url=?, attachment_3_name=?, course_type=?, prerequisite_training_id=?,
         required_for_contest=?
         WHERE id=?`,
        [
          data.title, data.description || null, data.category || null, data.instructor || null, data.location || null,
          data.start_date, data.end_date, data.capacity, data.is_published ? 1 : 0,
          data.cover_image_url || null, data.online_url || null,
          data.attachment_1_url || null, data.attachment_1_name || null,
          data.attachment_2_url || null, data.attachment_2_name || null,
          data.attachment_3_url || null, data.attachment_3_name || null,
          data.course_type, prereqId, data.required_for_contest ? 1 : 0, data.id,
        ]
      );
      return { id: data.id };
    } else {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO trainings (id, title, description, category, instructor, location,
         start_date, end_date, capacity, is_published, cover_image_url, online_url,
         attachment_1_url, attachment_1_name, attachment_2_url, attachment_2_name,
         attachment_3_url, attachment_3_name, course_type, prerequisite_training_id,
         required_for_contest, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, data.title, data.description || null, data.category || null, data.instructor || null, data.location || null,
          data.start_date, data.end_date, data.capacity, data.is_published ? 1 : 0,
          data.cover_image_url || null, data.online_url || null,
          data.attachment_1_url || null, data.attachment_1_name || null,
          data.attachment_2_url || null, data.attachment_2_name || null,
          data.attachment_3_url || null, data.attachment_3_name || null,
          data.course_type, prereqId, data.required_for_contest ? 1 : 0,
        ]
      );
      return { id };
    }
  });

export const deleteAdminTraining = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => id as string)
  .handler(async ({ data: id }) => {
    const pool = (await import('@/lib/db.server')).default;
    await pool.query(`DELETE FROM trainings WHERE id = ?`, [id]);
    return { ok: true };
  });

export const updateAdminRegStatus = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ id: z.string(), status: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    await pool.query(`UPDATE registrations SET approval_status = ? WHERE id = ?`, [data.status, data.id]);
    return { ok: true };
  });

export const updateAdminCompletion = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ id: z.string(), completion_status: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    await pool.query(`UPDATE registrations SET completion_status = ? WHERE id = ?`, [data.completion_status, data.id]);
    return { ok: true };
  });
