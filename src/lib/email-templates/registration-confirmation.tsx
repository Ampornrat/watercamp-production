import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ'

interface RegistrationConfirmationProps {
  name?: string
  studentId?: string
  trainingTitle?: string
  startDate?: string
  endDate?: string
  location?: string
  electivesCount?: number
}

const RegistrationConfirmationEmail = ({
  name,
  studentId,
  trainingTitle,
  startDate,
  endDate,
  location,
  electivesCount,
}: RegistrationConfirmationProps) => (
  <Html lang="th" dir="ltr">
    <Head />
    <Preview>
      {trainingTitle
        ? `ยืนยันการลงทะเบียน: ${trainingTitle}`
        : 'ยืนยันการลงทะเบียนหลักสูตรฝึกอบรม'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `เรียนคุณ ${name}` : 'เรียนผู้ลงทะเบียน'}
        </Heading>
        {studentId && (
          <Text style={studentIdStyle}>รหัสนักศึกษา: <strong>{studentId}</strong></Text>
        )}
        <Text style={text}>
          ขอบคุณที่ลงทะเบียนเข้าร่วมหลักสูตรกับ {SITE_NAME} ระบบได้รับการลงทะเบียนของท่านเรียบร้อยแล้ว
          และอยู่ระหว่างรอการยืนยันจากผู้ดูแล
        </Text>

        {trainingTitle && (
          <Section style={card}>
            <Text style={cardLabel}>หลักสูตรที่ลงทะเบียน</Text>
            <Text style={cardTitle}>{trainingTitle}</Text>
            {startDate && (
              <Text style={detail}>
                <strong>เริ่ม:</strong> {startDate}
              </Text>
            )}
            {endDate && (
              <Text style={detail}>
                <strong>สิ้นสุด:</strong> {endDate}
              </Text>
            )}
            {location && (
              <Text style={detail}>
                <strong>สถานที่:</strong> {location}
              </Text>
            )}
            {typeof electivesCount === 'number' && electivesCount > 0 && (
              <Text style={detail}>
                <strong>หลักสูตรเสริมทักษะที่ลงพร้อมกัน:</strong> {electivesCount} หลักสูตร
              </Text>
            )}
          </Section>
        )}

        <Text style={text}>
          ทีมงานจะติดต่อกลับเพื่อยืนยันการเข้าร่วมและแจ้งรายละเอียดเพิ่มเติมทางอีเมลนี้
        </Text>
        <Text style={footer}>ขอแสดงความนับถือ<br />ทีมงาน {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RegistrationConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.trainingTitle
      ? `ยืนยันการลงทะเบียน: ${data.trainingTitle}`
      : 'ยืนยันการลงทะเบียนหลักสูตรฝึกอบรม',
  displayName: 'ยืนยันการลงทะเบียนหลักสูตร',
  previewData: {
    name: 'สมชาย ใจดี',
    studentId: '6401234567',
    trainingTitle: 'การวิเคราะห์ข้อมูลน้ำเบื้องต้น',
    startDate: '15 มิถุนายน 2569 09:00 น.',
    endDate: '15 มิถุนายน 2569 16:00 น.',
    location: 'อาคารคลังข้อมูลน้ำแห่งชาติ กรุงเทพฯ',
    electivesCount: 2,
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
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
const studentIdStyle = { fontSize: '13px', color: '#64748b', margin: '0 0 12px' }
