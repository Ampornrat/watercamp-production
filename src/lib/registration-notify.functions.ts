import { createServerFn } from '@tanstack/react-start'

export const notifyRegistration = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as {
    training_ids: string[]
    institute_id: string
    guest_name: string
    guest_email: string
    student_id?: string | null
    wants_sim?: boolean | null
  })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { sendMail } = await import('@/lib/email/mailer.server')

    const placeholders = data.training_ids.map(() => '?').join(',')
    const [trainingRows] = await pool.query(
      `SELECT title, start_date FROM trainings WHERE id IN (${placeholders}) ORDER BY start_date ASC`,
      data.training_ids
    )
    const trainings = trainingRows as { title: string; start_date: string }[]

    const trainingListHtml = trainings.map((t) =>
      `<li><strong>${t.title}</strong> — ${new Date(t.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</li>`
    ).join('')
    const trainingListText = trainings.map((t) =>
      `- ${t.title} (${new Date(t.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' })})`
    ).join('\n')

    const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'
    const profileUrl = `${siteUrl}/student/profile?email=${encodeURIComponent(data.guest_email)}`
    const dashboardUrl = `${siteUrl}/advisor/dashboard`

    // Email to student
    await sendMail({
      to: data.guest_email,
      subject: 'ยืนยันการลงทะเบียน — ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ',
      html: `
        <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#0f172a">เรียนคุณ ${data.guest_name}</h2>
          ${data.student_id ? `<p style="color:#64748b;font-size:13px;margin:0 0 12px">รหัสนักศึกษา: <strong style="color:#0f172a">${data.student_id}</strong></p>` : ''}
          <p style="color:#334155;line-height:1.6">
            ระบบได้รับการลงทะเบียนของท่านเรียบร้อยแล้ว กำลังรอการอนุมัติจากอาจารย์ที่ปรึกษาของสถาบัน
          </p>
          ${data.wants_sim != null ? `<p style="color:#334155;font-size:13px;margin:0 0 16px">SIM Internet แจกฟรี: <strong>${data.wants_sim ? 'ต้องการใช้' : 'ไม่ต้องการ'}</strong></p>` : ''}
          <p style="color:#334155;font-weight:600">หลักสูตรที่ลงทะเบียน:</p>
          <ul style="color:#334155;line-height:1.8">${trainingListHtml}</ul>
          <p style="color:#64748b;font-size:13px;margin-top:24px">
            ท่านจะได้รับอีเมลแจ้งผลการอนุมัติจากอาจารย์ที่ปรึกษาอีกครั้ง
          </p>
          <div style="text-align:center;margin:28px 0">
            <a href="${profileUrl}"
               style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
              ดูประวัติการเรียนของฉัน
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
        </div>
      `,
      text: `เรียนคุณ ${data.guest_name}${data.student_id ? ` (รหัสนักศึกษา: ${data.student_id})` : ''}\n\nระบบได้รับการลงทะเบียนของท่านแล้ว รอการอนุมัติจากอาจารย์ที่ปรึกษา\n${data.wants_sim != null ? `SIM Internet แจกฟรี: ${data.wants_sim ? 'ต้องการใช้' : 'ไม่ต้องการ'}\n` : ''}\nหลักสูตรที่ลงทะเบียน:\n${trainingListText}\n\nดูประวัติการเรียน: ${profileUrl}`,
    })

    // Find advisors for this institute
    const [advisorRows] = await pool.query(
      `SELECT full_name, email FROM advisors WHERE institute_id = ?`,
      [data.institute_id]
    )
    const advisors = advisorRows as { full_name: string; email: string }[]

    await Promise.all(advisors.map((advisor) =>
      sendMail({
        to: advisor.email,
        subject: `มีนักศึกษาลงทะเบียนรอการอนุมัติ — ${trainings[0]?.title ?? 'หลักสูตรฝึกอบรม'}`,
        html: `
          <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#0f172a">เรียนคุณ ${advisor.full_name}</h2>
            <p style="color:#334155;line-height:1.6">
              มีนักศึกษาลงทะเบียนหลักสูตรรอการอนุมัติจากท่าน
            </p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="color:#64748b;padding:4px 0;width:120px">ชื่อนักศึกษา</td><td style="color:#0f172a;font-weight:600">${data.guest_name}</td></tr>
              ${data.student_id ? `<tr><td style="color:#64748b;padding:4px 0">รหัสนักศึกษา</td><td style="color:#0f172a">${data.student_id}</td></tr>` : ''}
              <tr><td style="color:#64748b;padding:4px 0">อีเมล</td><td style="color:#0f172a">${data.guest_email}</td></tr>
              ${data.wants_sim != null ? `<tr><td style="color:#64748b;padding:4px 0">SIM Internet</td><td style="color:#0f172a">${data.wants_sim ? 'ต้องการใช้' : 'ไม่ต้องการ'}</td></tr>` : ''}
            </table>
            <p style="color:#334155;font-weight:600">หลักสูตรที่ลงทะเบียน:</p>
            <ul style="color:#334155;line-height:1.8">${trainingListHtml}</ul>
            <div style="text-align:center;margin:32px 0">
              <a href="${dashboardUrl}"
                 style="background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                ไปยังระบบอนุมัติ
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
          </div>
        `,
        text: `เรียนคุณ ${advisor.full_name}\n\nมีนักศึกษา "${data.guest_name}" (${data.guest_email}) ลงทะเบียนรอการอนุมัติ\n\nกรุณาไปที่: ${dashboardUrl}`,
      }).catch((err) => console.error('Failed to notify advisor', advisor.email, err?.message))
    ))

    return { ok: true }
  })

export const notifyApproval = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { registration_id: string; status: 'approved' | 'rejected' })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { sendMail } = await import('@/lib/email/mailer.server')

    const [rows] = await pool.query(
      `SELECT r.guest_name, r.guest_email, t.title AS training_title, t.start_date
       FROM registrations r
       JOIN trainings t ON t.id = r.training_id
       WHERE r.id = ? LIMIT 1`,
      [data.registration_id]
    )
    const reg = (rows as any[])[0]
    if (!reg) return { ok: false }

    const startDate = new Date(reg.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' })
    const isApproved = data.status === 'approved'

    await sendMail({
      to: reg.guest_email,
      subject: isApproved
        ? `ได้รับการอนุมัติเข้าอบรม — ${reg.training_title}`
        : `ผลการพิจารณาการลงทะเบียน — ${reg.training_title}`,
      html: `
        <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#0f172a">เรียนคุณ ${reg.guest_name}</h2>
          ${isApproved ? `
          <p style="color:#16a34a;font-weight:600;font-size:16px">✅ ได้รับการอนุมัติเข้าร่วมอบรม</p>
          <p style="color:#334155;line-height:1.6">
            ท่านได้รับการอนุมัติเข้าร่วมหลักสูตร <strong>${reg.training_title}</strong>
            วันที่ ${startDate} แล้ว ยินดีต้อนรับ!
          </p>
          ` : `
          <p style="color:#dc2626;font-weight:600;font-size:16px">❌ ไม่ผ่านการอนุมัติ</p>
          <p style="color:#334155;line-height:1.6">
            ขออภัย การลงทะเบียนหลักสูตร <strong>${reg.training_title}</strong> ของท่านยังไม่ได้รับการอนุมัติในขณะนี้
            หากมีข้อสงสัยกรุณาติดต่ออาจารย์ที่ปรึกษาของสถาบัน
          </p>
          `}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
        </div>
      `,
      text: isApproved
        ? `เรียนคุณ ${reg.guest_name}\n\nท่านได้รับการอนุมัติเข้าร่วมหลักสูตร "${reg.training_title}" วันที่ ${startDate} แล้ว`
        : `เรียนคุณ ${reg.guest_name}\n\nขออภัย การลงทะเบียนหลักสูตร "${reg.training_title}" ยังไม่ได้รับการอนุมัติ`,
    })

    return { ok: true }
  })
