import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev instead of silently returning null data everywhere
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project keys."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
