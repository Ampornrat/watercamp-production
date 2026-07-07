import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Row, Column, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ'
const DEFAULT_SITE = 'https://watercamp.kwunjai.com'

interface RegistrationApprovalResultProps {
  name?: string
  trainingTitle?: string
  startDate?: string
  endDate?: string
  location?: string
  status?: 'approved' | 'rejected'
  totalAdvisors?: number
  approvals?: number
  rejections?: number
  siteUrl?: string
  qrUrl?: string
  appStoreUrl?: string
  googlePlayUrl?: string
}

const RegistrationApprovalResultEmail = ({
  name,
  trainingTitle,
  startDate,
  endDate,
  location,
  status,
  totalAdvisors,
  approvals,
  rejections,
  siteUrl = DEFAULT_SITE,
  qrUrl,
  appStoreUrl,
  googlePlayUrl,
}: RegistrationApprovalResultProps) => {
  const isApproved = status === 'approved'
  const headline = isApproved
    ? 'การลงทะเบียนของท่านได้รับการอนุมัติแล้ว'
    : 'การลงทะเบียนของท่านไม่ได้รับการอนุมัติ'

  const resolvedQrUrl = qrUrl ?? `${siteUrl}/api/email-images/qr-line-openchat.jpg`
  const resolvedAppStoreUrl = appStoreUrl ?? `${siteUrl}/api/email-images/banner-appstore.png`
  const resolvedGooglePlayUrl = googlePlayUrl ?? `${siteUrl}/api/email-images/banner-googleplay.png`

  return (
    <Html lang="th" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `เรียนคุณ ${name}` : 'เรียนผู้สมัคร'}</Heading>
          <Text style={text}>
            ผลการพิจารณาจากคณะอาจารย์ที่ปรึกษาของสถาบันท่าน สำหรับการลงทะเบียนหลักสูตรกับ {SITE_NAME} มีดังนี้
          </Text>

          <Section style={isApproved ? cardOk : cardNo}>
            <Text style={cardLabel}>สถานะ</Text>
            <Text style={cardTitle}>
              {isApproved ? '✓ อนุมัติ' : '✗ ไม่อนุมัติ'}
            </Text>
            {trainingTitle && <Text style={detail}><strong>หลักสูตร:</strong> {trainingTitle}</Text>}
            {startDate && <Text style={detail}><strong>เริ่ม:</strong> {startDate}</Text>}
            {endDate && <Text style={detail}><strong>สิ้นสุด:</strong> {endDate}</Text>}
            {location && <Text style={detail}><strong>สถานที่:</strong> {location}</Text>}
            {typeof totalAdvisors === 'number' && (
              <Text style={detail}>
                <strong>ผลคะแนนอาจารย์:</strong> อนุมัติ {approvals ?? 0} / ไม่อนุมัติ {rejections ?? 0} (ทั้งหมด {totalAdvisors} ท่าน)
              </Text>
            )}
          </Section>

          <Text style={text}>
            {isApproved
              ? 'ขอแสดงความยินดี ท่านสามารถเข้าร่วมหลักสูตรได้ตามวันเวลาที่กำหนด ทีมงานจะติดต่อกลับหากมีรายละเอียดเพิ่มเติม'
              : 'หากท่านมีข้อสงสัยเกี่ยวกับผลการพิจารณา กรุณาติดต่ออาจารย์ที่ปรึกษาของท่านโดยตรง'}
          </Text>

          {isApproved && (
            <>
              <Section style={communityCard}>
                <Text style={communityTitle}>เข้าร่วม Line Open Chat เพื่อแลกเปลี่ยนเรียนรู้</Text>
                <Text style={communityDesc}>สแกน QR Code เพื่อเข้าร่วมกลุ่มแลกเปลี่ยนเรียนรู้</Text>
                <Img
                  src={resolvedQrUrl}
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
                        src={resolvedAppStoreUrl}
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
                        src={resolvedGooglePlayUrl}
                        width="140"
                        height="42"
                        alt="Get it on Google Play"
                        style={appBadgeStyle}
                      />
                    </Link>
                  </Column>
                </Row>
              </Section>
            </>
          )}

          <Text style={footer}>ขอแสดงความนับถือ<br />ทีมงาน {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RegistrationApprovalResultEmail,
  subject: (data: Record<string, any>) =>
    data?.status === 'approved'
      ? '[อนุมัติ] ผลการลงทะเบียนหลักสูตร'
      : '[ไม่อนุมัติ] ผลการลงทะเบียนหลักสูตร',
  displayName: 'แจ้งผลการอนุมัติผู้สมัคร',
  previewData: {
    name: 'สมศรี เรียนดี',
    trainingTitle: 'การวิเคราะห์ข้อมูลน้ำเบื้องต้น',
    startDate: '15 มิถุนายน 2569 09:00 น.',
    endDate: '15 มิถุนายน 2569 16:00 น.',
    location: 'อาคารคลังข้อมูลน้ำแห่งชาติ กรุงเทพฯ',
    status: 'approved',
    totalAdvisors: 3,
    approvals: 3,
    rejections: 0,
    siteUrl: 'http://localhost:3000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Noto Sans Thai", Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const cardOk = {
  backgroundColor: '#ecfdf5',
  borderLeft: '4px solid #10b981',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '20px 0',
}
const cardNo = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '20px 0',
}
const cardLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const }
const cardTitle = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const detail = { fontSize: '13px', color: '#334155', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
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
