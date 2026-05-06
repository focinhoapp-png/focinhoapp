-- =====================================================
-- FocinhoApp: Social Upgrade Migration
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================

-- ─────────────────────────────────────────────
-- 1. Garante que conversations e messages existam
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message text,
  last_message_at timestamptz,
  UNIQUE (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  status text NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'read'
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

-- Add missing columns if they don't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

-- ─────────────────────────────────────────────
-- 2. Tabela de comentários em posts (nova)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_photo text,
  content text NOT NULL,
  parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Add missing columns if they already existed from a previous schema
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS user_name text NOT NULL DEFAULT '';
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS user_photo text;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS updated_at timestamptz;


CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- ─────────────────────────────────────────────
-- 3. Tabela de usuários bloqueados
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);

-- ─────────────────────────────────────────────
-- 4. Melhorias na tabela notifications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  from_user_id uuid,
  from_user_name text,
  from_user_photo text,
  from_user_username text,
  message text,
  post_id text,
  comment_id uuid,
  conversation_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add missing columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS post_id text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS comment_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ─────────────────────────────────────────────
-- 5. Índices de performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- ─────────────────────────────────────────────
-- 6. RLS Policies
-- ─────────────────────────────────────────────

-- conversations RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);
DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);
DROP POLICY IF EXISTS "conv_update" ON conversations;
CREATE POLICY "conv_update" ON conversations FOR UPDATE
  USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);

-- messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_select" ON messages;
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user1_id::text = auth.uid()::text OR c.user2_id::text = auth.uid()::text)
  ));
DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid()::text = sender_id::text
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id::text = auth.uid()::text OR c.user2_id::text = auth.uid()::text)
    )
  );
DROP POLICY IF EXISTS "msg_update" ON messages;
CREATE POLICY "msg_update" ON messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user1_id::text = auth.uid()::text OR c.user2_id::text = auth.uid()::text)
  ));

-- post_comments RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON post_comments;
CREATE POLICY "comments_select" ON post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments_insert" ON post_comments;
CREATE POLICY "comments_insert" ON post_comments FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "comments_update" ON post_comments;
CREATE POLICY "comments_update" ON post_comments FOR UPDATE
  USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "comments_delete" ON post_comments;
CREATE POLICY "comments_delete" ON post_comments FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- blocked_users RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocked_select" ON blocked_users;
CREATE POLICY "blocked_select" ON blocked_users FOR SELECT
  USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "blocked_insert" ON blocked_users;
CREATE POLICY "blocked_insert" ON blocked_users FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "blocked_delete" ON blocked_users;
CREATE POLICY "blocked_delete" ON blocked_users FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- friendships: add update policy if missing
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
CREATE POLICY "friendships_update" ON friendships FOR UPDATE
  USING (auth.uid()::text = user_id_1::text OR auth.uid()::text = user_id_2::text);

-- ─────────────────────────────────────────────
-- 7. Habilitar Realtime
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
