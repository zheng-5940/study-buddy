-- Study Buddy Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  intimacy TEXT DEFAULT 'normal' CHECK (intimacy IN ('normal', 'intimate')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they're part of
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can insert friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 3. Study Sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  note TEXT,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Own sessions: full access
CREATE POLICY "Users can view own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. View: friends can see aggregated daily stats (for normal friends)
CREATE VIEW friend_daily_stats AS
SELECT
  fs.requester_id AS viewer_id,
  fs.addressee_id AS target_id,
  ss.study_date,
  SUM(ss.duration_minutes) AS total_minutes
FROM friendships fs
JOIN study_sessions ss ON ss.user_id = fs.addressee_id
WHERE fs.status = 'accepted'
GROUP BY fs.requester_id, fs.addressee_id, ss.study_date;

-- 5. Function: check intimacy level between two users
CREATE OR REPLACE FUNCTION get_friendship_intimacy(user_a UUID, user_b UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT intimacy FROM friendships
  WHERE status = 'accepted'
    AND ((requester_id = user_a AND addressee_id = user_b)
      OR (requester_id = user_b AND addressee_id = user_a))
  LIMIT 1;
$$;

-- 6. Function: get friend's detailed sessions (only if intimate)
CREATE OR REPLACE FUNCTION get_intimate_sessions(friend_id UUID)
RETURNS SETOF study_sessions
LANGUAGE SQL
STABLE
AS $$
  SELECT ss.* FROM study_sessions ss
  WHERE ss.user_id = friend_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND f.intimacy = 'intimate'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = friend_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = friend_id))
    );
$$;

-- 7. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
