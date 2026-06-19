import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ'

interface AdvisorApprovalRequestProps {
  advisorName?: string
  studentName?: string
  studentEmail?: string
  trainingTitle?: string
  startDate?: string
  endDate?: string
  location?: string
  approvalUrl?: string
}

const AdvisorApprovalRequestEmail = ({
  advisorName,
  studentName,
  studentEmail,
  trainingTitle,
  startDate,
  endDate,
  location,
  approvalUrl,
}: AdvisorApprovalRequestProps) => (
  <Html lang="th" dir="ltr">
    <Head />
    <Preview>มีนักศึกษาในความดูแลของท่านลงทะเบียนหลักสูตร — รออนุมัติ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{advisorName ? `เรียนอาจารย์ ${advisorName}` : 'เรียนอาจารย์ที่ปรึกษา'}</Heading>
        <Text style={text}>
          มีนักศึกษาในความดูแลของท่านได้ลงทะเบียนหลักสูตรกับ {SITE_NAME} และกำลังรอการอนุมัติจากท่าน
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>นักศึกษา</Text>
          <Text style={cardTitle}>{studentName || '—'}</Text>
          {studentEmail && <Text style={detail}><strong>อีเมล:</strong> {studentEmail}</Text>}
          {trainingTitle && <Text style={detail}><strong>หลักสูตร:</strong> {trainingTitle}</Text>}
          {startDate && <Text style={detail}><strong>เริ่ม:</strong> {startDate}</Text>}
          {endDate && <Text style={detail}><strong>สิ้นสุด:</strong> {endDate}</Text>}
          {location && <Text style={detail}><strong>สถานที่:</strong> {location}</Text>}
        </Section>

        {approvalUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={approvalUrl} style={btn}>เข้าระบบเพื่ออนุมัติ</Button>
          </Section>
        )}

        <Text style={text}>
          กรุณาเข้าระบบเพื่อพิจารณาอนุมัติ หรือปฏิเสธการลงทะเบียนของนักศึกษาตามดุลพินิจของท่าน
        </Text>
        <Text style={footer}>ขอแสดงความนับถือ<br />ทีมงาน {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdvisorApprovalRequestEmail,
  subject: (data: Record<string, any>) =>
    data?.studentName
      ? `[รออนุมัติ] ${data.studentName} ลงทะเบียนหลักสูตร`
      : 'มีนักศึกษารอการอนุมัติลงทะเบียนหลักสูตร',
  displayName: 'แจ้งอาจารย์ที่ปรึกษาเพื่ออนุมัติ',
  previewData: {
    advisorName: 'ดร. สมชาย ใจดี',
    studentName: 'สมศรี เรียนดี',
    studentEmail: 'somsri@example.ac.th',
    trainingTitle: 'การวิเคราะห์ข้อมูลน้ำเบื้องต้น',
    startDate: '15 มิถุนายน 2569 09:00 น.',
    endDate: '15 มิถุนายน 2569 16:00 น.',
    location: 'อาคารคลังข้อมูลน้ำแห่งชาติ กรุงเทพฯ',
    approvalUrl: 'https://water-data-camp.lovable.app/advisor/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Noto Sans Thai", Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f1f5f9',
  borderLeft: '4px solid #0ea5e9',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '20px 0',
}
const cardLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const }
const cardTitle = { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const detail = { fontSize: '13px', color: '#334155', margin: '4px 0' }
const btn = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontWeight: 'bold',
  textDecoration: 'none',
  fontSize: '14px',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
