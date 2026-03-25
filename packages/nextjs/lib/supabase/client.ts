import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createSupabaseClient<any>>;

/**
 * Browser-side Supabase client.
 */
export function createClient(): AnySupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

let clientInstance: AnySupabaseClient;

export function getSupabaseClient(): AnySupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
