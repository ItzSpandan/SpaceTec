import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Next.js Fast Refresh (and some bundling edge cases) can cause this module
// to be evaluated more than once, which creates more than one GoTrueClient
// pointed at the same storage key. supabase-js v2 serializes its internal
// auth calls (getSession, refreshSession, ...) through the browser's Web
// Locks API keyed by that storage key — so a second instance's call queues
// behind the first, and if the first was torn down without releasing the
// lock, the queued call can wait indefinitely. That's the intermittent
// "stuck on LOADING SESSION" pattern reported against this app: it's a
// lock, not the network, so it doesn't reproduce the same way every time.
// Caching a single instance avoids creating the duplicate client at all.
const globalForSupabase = globalThis

export const supabase =
  globalForSupabase.__spacetecSupabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey)

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__spacetecSupabaseClient = supabase
}
