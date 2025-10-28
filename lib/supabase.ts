import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Type for auth user
export type User = {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

// Type for auth errors
export type AuthError = {
  message: string
  status?: number
}