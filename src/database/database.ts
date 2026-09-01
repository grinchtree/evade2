import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config";
import { logging } from "../utils/logging";

// initialize the standard supabase client
export const supabase: SupabaseClient = createClient(
  config.supabase_url,
  config.supabase_secret_key,
  {
    auth: {
      // bots don't have browser sessions, so we disable this to prevent warnings
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

// ping the database on startup to ensure we actually have a connection
export async function verifyDatabaseConnection() {
  const startTime = performance.now();
  logging.info("verifying database connection...");

  // do a tiny, lightweight query just to see if the database responds
  const { error } = await supabase.from("users").select("id").limit(1);

  // 42P01 means "relation does not exist", which still proves the connection works
  if (error && error.code !== "42P01") {
    logging.error(`connection failed @ ${error.message}`);
  } else {
    const milliseconds = Math.round(performance.now() - startTime);
    logging.info(
      `connected to database successfully - (took ${milliseconds}ms)`,
    );
  }
}
