import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as registrationConfirmation } from './registration-confirmation'
import { template as surveyInvitation } from './survey-invitation'
import { template as advisorApprovalRequest } from './advisor-approval-request'
import { template as registrationApprovalResult } from './registration-approval-result'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'registration-confirmation': registrationConfirmation,
  'survey-invitation': surveyInvitation,
  'advisor-approval-request': advisorApprovalRequest,
  'registration-approval-result': registrationApprovalResult,
}
