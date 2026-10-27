// lib/supabase/client.ts
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicKey } from './public-key';

let _client: ReturnType<typeof createBrowserClient> | null = null

export function supabaseBrowser() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()
  )
  return _client
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabasePublicKey(),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
