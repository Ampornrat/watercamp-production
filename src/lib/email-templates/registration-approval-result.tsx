import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ'

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
}: RegistrationApprovalResultProps) => {
  const isApproved = status === 'approved'
  const headline = isApproved
    ? 'การลงทะเบียนของท่านได้รับการอนุมัติแล้ว'
    : 'การลงทะเบียนของท่านไม่ได้รับการอนุมัติ'
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
