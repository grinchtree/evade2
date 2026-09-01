export const config = {
  // discord
  token: process.env.DISCORD_TOKEN!,
  prefix: process.env.PREFIX ?? ",",

  // database
  supabase_url: process.env.SUPABASE_URL!,
  supabase_secret_key: process.env.SUPABASE_SECRET_KEY!,

  // API keys
};
