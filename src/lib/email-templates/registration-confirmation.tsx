import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Row, Column, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EMAIL_ASSETS } from './email-assets'

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

        <Section style={communityCard}>
          <Text style={communityTitle}>เข้าร่วม Line Open Chat เพื่อแลกเปลี่ยนเรียนรู้</Text>
          <Text style={communityDesc}>สแกน QR Code เพื่อเข้าร่วมกลุ่มแลกเปลี่ยนเรียนรู้</Text>
          <Img
            src={EMAIL_ASSETS.qrLineOpenChat}
            width="180"
            height="180"
            alt="QR Code Line Open Chat"
            style={qrStyle}
          />
        </Section>

        <Section style={appSection}>
          <Text style={communityTitle}>ดาวน์โหลดแอปพลิเคชัน ThaiWater</Text>
          <Row>
            <Column align="center">
              <Link href="https://apps.apple.com/th/app/thaiwater/id1097487200?l=th">
                <Img
                  src={EMAIL_ASSETS.bannerAppStore}
                  width="140"
                  height="42"
                  alt="Download on the App Store"
                  style={appBadgeStyle}
                />
              </Link>
            </Column>
            <Column align="center">
              <Link href="https://play.google.com/store/apps/details?id=mobile.nhc.thaiwater&hl=th">
                <Img
                  src={EMAIL_ASSETS.bannerGooglePlay}
                  width="140"
                  height="42"
                  alt="Get it on Google Play"
                  style={appBadgeStyle}
                />
              </Link>
            </Column>
          </Row>
        </Section>

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
const communityCard = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
  textAlign: 'center' as const,
}
const appSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}
const communityTitle = { fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const communityDesc = { fontSize: '13px', color: '#475569', margin: '0 0 12px' }
const qrStyle = { display: 'block', margin: '0 auto', borderRadius: '8px' }
const appBadgeStyle = { display: 'block', margin: '4px auto' }
