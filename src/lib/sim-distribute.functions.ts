import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';

async function getPool() {
  return (await import('@/lib/db.server')).default;
}

async function addColumnIfMissing(
  pool: Awaited<ReturnType<typeof getPool>>,
  table: string,
  column: string,
  definition: string,
) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if ((rows as any[])[0].cnt === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureTables(pool: Awaited<ReturnType<typeof getPool>>) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sim_distributions (
      id CHAR(36) PRIMARY KEY,
      sim_request_id CHAR(36) NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      institute_id CHAR(36) NOT NULL,
      institute_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      distributed_by VARCHAR(255) NOT NULL,
      distributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT NULL,
      UNIQUE KEY uq_sim_request (sim_request_id)
    )
  `);
  await addColumnIfMissing(pool, 'sim_requests', 'distributed_at', 'DATETIME NULL');
  await addColumnIfMissing(pool, 'sim_requests', 'distributed_phone', 'VARCHAR(20) NULL');
}

async function getCurrentUserLabel(pool: Awaited<ReturnType<typeof getPool>>): Promise<string> {
  const sessionId = getCookie('session');
  if (!sessionId) return 'unknown';
  const [rows] = await pool.query(
    `SELECT u.email, u.full_name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [sessionId],
  );
  const user = (rows as any[])[0];
  if (!user) return 'unknown';
  return user.full_name ?? user.email;
}

export const searchSimRequests = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => (raw as { q: string }))
  .handler(async ({ data }) => {
    const pool = await getPool();
    const q = (data.q ?? '').trim();
    const sql = `
      SELECT r.id, r.full_name, r.student_id, r.institute_id, r.email,
             COALESCE(i.institute, i.name) AS institute_name
      FROM sim_requests r
      JOIN institutes_tab i ON r.institute_id = i.id
      WHERE r.status = 'pending'
        ${q ? `AND r.full_name LIKE CONCAT('%', ?, '%')` : ''}
      ORDER BY r.full_name ASC
      LIMIT 20
    `;
    const params = q ? [q] : [];
    const [rows] = await pool.query(sql, params);
    return rows as { id: string; full_name: string; student_id: string; institute_id: string; email: string; institute_name: string }[];
  });

const DistributeInput = z.object({
  sim_request_id: z.string().min(1),
  phone_number: z.string().regex(/^0\d{9}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0'),
  note: z.string().max(1000).optional(),
});

export const createSimDistribution = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => DistributeInput.parse(raw))
  .handler(async ({ data }) => {
    const pool = await getPool();
    await ensureTables(pool);

    const [reqRows] = await pool.query(
      `SELECT r.id, r.full_name, r.institute_id, COALESCE(i.institute, i.name) AS institute_name
       FROM sim_requests r
       JOIN institutes_tab i ON r.institute_id = i.id
       WHERE r.id = ? AND r.distributed_at IS NULL`,
      [data.sim_request_id],
    );
    const req = (reqRows as any[])[0];
    if (!req) throw new Error('ไม่พบรายการขอ SIM หรือได้รับการแจกไปแล้ว');

    const distributedBy = await getCurrentUserLabel(pool);
    const id = randomUUID();

    await pool.query(
      `INSERT INTO sim_distributions (id, sim_request_id, student_name, institute_id, institute_name, phone_number, distributed_by, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.sim_request_id, req.full_name, req.institute_id, req.institute_name, data.phone_number, distributedBy, data.note ?? null],
    );

    await pool.query(
      `UPDATE sim_requests SET distributed_at = NOW(), distributed_phone = ?, status = 'distributed' WHERE id = ?`,
      [data.phone_number, data.sim_request_id],
    );

    return { ok: true };
  });

export const getSimDistributions = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = await getPool();
  await ensureTables(pool);
  const [rows] = await pool.query(
    `SELECT id, student_name, institute_name, phone_number, distributed_by, distributed_at, note
     FROM sim_distributions
     ORDER BY distributed_at DESC`,
  );
  return rows as {
    id: string;
    student_name: string;
    institute_name: string;
    phone_number: string;
    distributed_by: string;
    distributed_at: string;
    note: string | null;
  }[];
});
