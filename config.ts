export const config = {
  // discord
  token: process.env.DISCORD_TOKEN!,
  prefix: process.env.PREFIX ?? ",",

  // database
  supabase_url: process.env.SUPABASE_URL!,
  supabase_secret_key: process.env.SUPABASE_SECRET_KEY!,
  supabase_public_key: process.env.SUPABASE_PUBLISHABLE_KEY!,
  supabase_jwks_url: process.env.SUPABASE_JWKS_URL!,

  // API keys
};
