export function getSupabasePublicKey() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = publishableKey || legacyAnonKey;

  if (!key) {
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return key;
}
