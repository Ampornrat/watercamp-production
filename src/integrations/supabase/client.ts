// Stub: Supabase removed, app uses MySQL via server functions
export const supabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => {},
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    eq: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
  }),
  rpc: async () => ({ data: 0, error: null }),
} as any;
