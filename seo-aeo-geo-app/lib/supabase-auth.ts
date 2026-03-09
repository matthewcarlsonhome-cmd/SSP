import { createBrowserClient } from "@supabase/ssr";

// Browser client for client components — respects auth session from cookies
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
