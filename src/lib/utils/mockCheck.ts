/**
 * Helper utility to determine if the application is running in Mock Mode.
 * It is true if Supabase environment variables are missing/placeholders OR if the 'src_mock' cookie is set to 'true'.
 */
export function checkIsMock(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: checks environment variables
    // (Middleware has direct access to Request Cookies separately, so it will handle cookie check there)
    return !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
  }

  // Client-side: checks environment variables or the 'src_mock' cookie
  const isMockEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
  const isMockCookie = document.cookie.split('; ').some(row => row.trim().startsWith('src_mock=true'))
  return isMockEnv || isMockCookie
}
