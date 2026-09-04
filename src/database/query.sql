-- drop the entire public schema and everything inside it (tables, functions, indexes, views)
DROP SCHEMA public CASCADE;

-- recreate a fresh, empty public schema
CREATE SCHEMA public;

-- restore the default supabase permissions so your api and database roles can access it again
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 1. base tables (these must be created first so others can reference them)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  premium BOOLEAN DEFAULT FALSE,
  personal_prefix TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  premium BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- 2. relational tables (tied to users and guilds)

CREATE TABLE IF NOT EXISTS members (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  guild_id TEXT REFERENCES guilds(id) ON DELETE CASCADE,
  forced_nickname TEXT DEFAULT NULL,
  sticky_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  mod_id TEXT NOT NULL,
  reason TEXT DEFAULT 'Reason not provided.',
  amount INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE, -- essential for fetching a server's mod logs
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  mod_id TEXT,
  action_type TEXT NOT NULL, -- e.g., 'ban', 'kick', 'mute'
  information JSONB DEFAULT '{}'::jsonb, -- store extra stuff here (like message content)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS hardbans (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS tempbans (
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, guild_id) -- prevents duplicate active tempbans for the same person
);

CREATE TABLE IF NOT EXISTS antinuke (
  guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  admins TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS disabled_commands (
  guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  command_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS autoroles (
  guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS voicemaster (
  guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  configuration JSONB DEFAULT '{}'::jsonb,
  active_channels JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
)

-- 3. performance indexes (speeds up the bot's background tasks)

CREATE INDEX IF NOT EXISTS idx_tempbans_expires_at ON tempbans(expires_at);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cases_guild ON cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_disabled_commands ON disabled_commands(guild_id);
CREATE INDEX IF NOT EXISTS idx_autoroles ON autoroles(guild_id)
CREATE INDEX IF NOT EXISTS idx_voicemaster ON voicemaster(guild_id)

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE antinuke ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardbans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE disabled_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoroles ENABLE ROW LEVEL SECURITY;

-- grant access to all current tables and sequences
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

-- ensure any future tables you create automatically get these permissions too
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
