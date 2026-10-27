import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingConfiguration =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder') ||
  supabaseAnonKey === '******'

if (missingConfiguration && import.meta.env.DEV) {
  console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart Vite.')
}

export const supabase = createClient(
  missingConfiguration ? 'https://placeholder.supabase.co' : supabaseUrl,
  missingConfiguration ? 'placeholder' : supabaseAnonKey,
)
