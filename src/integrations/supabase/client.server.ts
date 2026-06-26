// Stub: Supabase admin client removed. Use MySQL pool from @/lib/db.server instead.
export const supabaseAdmin = {
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
    eq: function() { return this; },
    ilike: function() { return this; },
    in: function() { return this; },
    is: function() { return this; },
    or: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
  }),
  auth: { admin: { inviteUserByEmail: async () => ({ data: null, error: null }), getUserById: async () => ({ data: { user: null }, error: null }), listUsers: async () => ({ data: { users: [] }, error: null }) } },
  storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }), createSignedUploadUrl: async () => ({ data: null, error: new Error('Storage removed') }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
  rpc: async () => ({ data: 0, error: null }),
} as any;
