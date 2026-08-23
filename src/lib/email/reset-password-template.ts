export function buildResetPasswordEmail(opts: { fullName: string | null; resetUrl: string }): string {
  const name = opts.fullName ?? 'ผู้ใช้งาน'
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>รีเซ็ตรหัสผ่าน</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f7ff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f7ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(14,99,177,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0e63b1 0%,#0ea5e9 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:48px;height:48px;background:rgba(255,255,255,0.18);border-radius:12px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:48px;">💧</span>
                  </td>
                  <td style="padding-left:12px;text-align:left;">
                    <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">ThaiWater Challenge</p>
                    <p style="margin:2px 0 0;color:#ffffff;font-size:16px;font-weight:700;">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0e1f3a;">รีเซ็ตรหัสผ่านของคุณ</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                สวัสดี <strong>${name}</strong>,<br />
                เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#0e63b1 0%,#0ea5e9 100%);">
                    <a href="${opts.resetUrl}" target="_blank"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ตั้งรหัสผ่านใหม่ &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;width:100%;">
                <tr>
                  <td style="font-size:13px;color:#0369a1;line-height:1.6;">
                    <strong>หมายเหตุด้านความปลอดภัย:</strong><br />
                    • ลิงก์นี้จะหมดอายุภายใน <strong>20 นาที</strong><br />
                    • ใช้ได้เพียง <strong>ครั้งเดียว</strong> เท่านั้น<br />
                    • หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                หากปุ่มด้านบนไม่ทำงาน ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br />
                <a href="${opts.resetUrl}" style="color:#0ea5e9;word-break:break-all;">${opts.resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ<br />
                &copy; ${new Date().getFullYear()} ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
