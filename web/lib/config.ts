export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://bunwnclmywyqvvacryji.supabase.co',
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'sb_publishable_ipGwQ-Hip9J5_aTlllEJgA_YGJkG5UF',
};
