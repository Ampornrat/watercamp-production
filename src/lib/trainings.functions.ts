import { createServerFn } from '@tanstack/react-start';
import pool from '@/lib/db.server';

export const getPublishedTrainings = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT * FROM trainings ORDER BY trainings.id DESC`);
  return rows as any[];
});

export const getFeaturedTrainings = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT * FROM trainings WHERE is_published = 1 ORDER BY start_date ASC LIMIT 6`);
  return rows as any[];
});

export const getTrainingById = createServerFn({ method: 'GET' })
  .inputValidator((id: unknown) => id as string)
  .handler(async ({ data: id }) => {
    const [rows] = await pool.query(`SELECT * FROM trainings WHERE id = ?`, [id]);
    return (rows as any[])[0] ?? null;
  });

export const getTrainingsCount = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM trainings WHERE is_published = 1`);
  return Number((rows as any[])[0]?.cnt ?? 0);
});

export const getRegistrationsCount = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT COUNT(DISTINCT guest_email) as cnt FROM registrations`);
  return Number((rows as any[])[0]?.cnt ?? 0);
});

export const getInstitutesCount = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM institutes_tab`);
  return Number((rows as any[])[0]?.cnt ?? 0);
});

export const getRegistrationsForTraining = createServerFn({ method: 'GET' })
  .inputValidator((id: unknown) => id as string)
  .handler(async ({ data: id }) => {
    const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM registrations WHERE training_id = ?`, [id]);
    return Number((rows as any[])[0]?.cnt ?? 0);
  });

export const getAllInstitutes = createServerFn({ method: 'GET' }).handler(async () => {
  const [rows] = await pool.query(`SELECT id, COALESCE(institute, name) AS name, region FROM institutes_tab ORDER BY COALESCE(institute, name) ASC`);
  return rows as { id: string; name: string; region: string | null }[];
});

export const getElectiveTrainingsForCore = createServerFn({ method: 'GET' })
  .inputValidator((id: unknown) => id as string)
  .handler(async ({ data: id }) => {
    const [rows] = await pool.query(
      `SELECT id, title, description, start_date, end_date, location, category, prerequisite_training_id
       FROM trainings
       WHERE course_type = 'elective' AND is_published = 1
         AND (prerequisite_training_id = ? OR prerequisite_training_id IS NULL)
       ORDER BY start_date ASC`,
      [id]
    );
    return rows as any[];
  });

export const getCoreTrainingsForElective = createServerFn({ method: 'GET' })
  .inputValidator((prereqId: unknown) => prereqId as string | null)
  .handler(async ({ data: prereqId }) => {
    if (prereqId) {
      const [rows] = await pool.query(
        `SELECT id, title, start_date FROM trainings WHERE course_type = 'core' AND is_published = 1 AND id = ? ORDER BY start_date ASC`,
        [prereqId]
      );
      return rows as any[];
    } else {
      const [rows] = await pool.query(
        `SELECT id, title, start_date FROM trainings WHERE course_type = 'core' AND is_published = 1 ORDER BY start_date ASC`
      );
      return rows as any[];
    }
  });

export const getElectiveSeatsStats = createServerFn({ method: 'GET' })
  .inputValidator((ids: unknown) => ids as string[])
  .handler(async ({ data: ids }) => {
    if (!ids || ids.length === 0) return {} as Record<string, { capacity: number; count: number }>;
    const placeholders = ids.map(() => '?').join(',');
    const [trainRows] = await pool.query(
      `SELECT id, capacity FROM trainings WHERE id IN (${placeholders})`,
      ids
    );
    const [countRows] = await pool.query(
      `SELECT training_id, COUNT(*) as cnt FROM registrations WHERE training_id IN (${placeholders}) GROUP BY training_id`,
      ids
    );
    const capMap: Record<string, number> = {};
    for (const r of trainRows as any[]) capMap[r.id] = r.capacity;
    const cntMap: Record<string, number> = {};
    for (const r of countRows as any[]) cntMap[r.training_id] = Number(r.cnt);
    const result: Record<string, { capacity: number; count: number }> = {};
    for (const id of ids) {
      result[id] = { capacity: capMap[id] ?? 0, count: cntMap[id] ?? 0 };
    }
    return result;
  });
