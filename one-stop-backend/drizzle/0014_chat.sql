-- 0014_chat.sql — Neon console me chalao (0013 ke baad).
-- Stores phone + order chat tables. Bina iske chat local-only rahega
-- (backend fail-soft: app thread kholega, sync nahi hoga).
ALTER TABLE osb_stores
  ADD COLUMN IF NOT EXISTS phone varchar(20);

CREATE TABLE IF NOT EXISTS osb_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(64) NOT NULL UNIQUE,
  order_code varchar(24),
  store_key varchar(40),
  customer_phone varchar(40),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osb_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES osb_chat_threads(id) ON DELETE CASCADE,
  sender varchar(16) NOT NULL DEFAULT 'customer',
  text varchar(500) NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_thread ON osb_chat_messages(thread_id, created_at);
