import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const SimRequestInput = z.object({
  institute_id: z.string().min(1),
  student_id: z.string().trim().min(1).max(50),
  full_name: z.string().trim().min(1).max(255),
  gender: z.string().trim().min(1).max(20),
  age: z.number().int().min(15).max(80),
  education_level: z.string().trim().min(1).max(100),
  field_of_study: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
});

export const createSimRequest = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => SimRequestInput.parse(raw))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sim_requests (
        id CHAR(36) PRIMARY KEY,
        institute_id CHAR(36) NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        age INT NOT NULL,
        education_level VARCHAR(100) NOT NULL,
        field_of_study VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Duplicate checks
    const [dupEmail] = await pool.query(
      `SELECT id FROM sim_requests WHERE email = ? LIMIT 1`,
      [data.email.toLowerCase()]
    );
    if ((dupEmail as any[]).length > 0) throw new Error('อีเมลนี้ได้ลงทะเบียนขอ SIM ไปแล้ว');

    const [dupStudentId] = await pool.query(
      `SELECT id FROM sim_requests WHERE student_id = ? LIMIT 1`,
      [data.student_id.trim()]
    );
    if ((dupStudentId as any[]).length > 0) throw new Error('รหัสนักศึกษานี้ได้ลงทะเบียนขอ SIM ไปแล้ว');

    const [dupName] = await pool.query(
      `SELECT id FROM sim_requests WHERE full_name = ? LIMIT 1`,
      [data.full_name.trim()]
    );
    if ((dupName as any[]).length > 0) throw new Error('ชื่อ-นามสกุลนี้ได้ลงทะเบียนขอ SIM ไปแล้ว');

    const id = randomUUID();
    await pool.query(
      `INSERT INTO sim_requests (id, institute_id, student_id, full_name, gender, age, education_level, field_of_study, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.institute_id, data.student_id, data.full_name, data.gender, data.age, data.education_level, data.field_of_study, data.email.toLowerCase()]
    );

    return { id };
  });
