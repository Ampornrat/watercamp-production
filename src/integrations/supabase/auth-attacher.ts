// Auth removed — stub middleware that passes through without attaching any token.
import { createMiddleware } from '@tanstack/react-start'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    return next({ headers: {} })
  },
)
