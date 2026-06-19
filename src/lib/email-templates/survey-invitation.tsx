import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ'

interface SurveyInvitationProps {
  name?: string
  trainingTitle?: string
  surveyUrl?: string
}

const SurveyInvitationEmail = ({ name, trainingTitle, surveyUrl }: SurveyInvitationProps) => (
  <Html lang="th" dir="ltr">
    <Head />
    <Preview>
      {trainingTitle
        ? `ขอเชิญประเมินความพึงพอใจ: ${trainingTitle}`
        : 'ขอเชิญประเมินความพึงพอใจการฝึกอบรม'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `เรียนคุณ ${name}` : 'เรียนผู้เข้าร่วมฝึกอบรม'}</Heading>
        <Text style={text}>
          ขอขอบคุณที่เข้าร่วมการฝึกอบรมกับ {SITE_NAME}
          เพื่อให้เราสามารถพัฒนาหลักสูตรและการให้บริการได้ดียิ่งขึ้น
          ขอความกรุณาท่านสละเวลาประมาณ 3-5 นาที ในการตอบแบบสำรวจความพึงพอใจ
        </Text>

        {trainingTitle && (
          <Section style={card}>
            <Text style={cardLabel}>หลักสูตร</Text>
            <Text style={cardTitle}>{trainingTitle}</Text>
          </Section>
        )}

        {surveyUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={surveyUrl} style={button}>เริ่มทำแบบสำรวจ</Button>
            <Text style={smallText}>หรือคัดลอกลิงก์นี้:<br />{surveyUrl}</Text>
          </Section>
        )}

        <Text style={footer}>ขอแสดงความนับถือ<br />ทีมงาน {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SurveyInvitationEmail,
  subject: (data: Record<string, any>) =>
    data?.trainingTitle
      ? `ขอเชิญประเมินความพึงพอใจ: ${data.trainingTitle}`
      : 'ขอเชิญประเมินความพึงพอใจการฝึกอบรม',
  displayName: 'ขอเชิญทำแบบสำรวจความพึงพอใจ',
  previewData: {
    name: 'สมชาย ใจดี',
    trainingTitle: 'การวิเคราะห์ข้อมูลน้ำเบื้องต้น',
    surveyUrl: 'https://water-data-camp.lovable.app/survey/preview-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Noto Sans Thai", Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', wordBreak: 'break-all' as const }
const card = {
  backgroundColor: '#f1f5f9',
  borderLeft: '4px solid #0ea5e9',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '20px 0',
}
const cardLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const }
const cardTitle = { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0' }
const button = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 'bold',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
