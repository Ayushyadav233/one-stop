-- Wallet + referral migration (Neon SQL console me chalao, phir Render redeploy).
-- Idempotent: dobara chalane pe error nahi dega.

ALTER TABLE osb_users ADD COLUMN IF NOT EXISTS wallet_points integer DEFAULT 0;
ALTER TABLE osb_users ADD COLUMN IF NOT EXISTS referral_code varchar(16);
ALTER TABLE osb_users ADD COLUMN IF NOT EXISTS referred_by varchar(16);

CREATE TABLE IF NOT EXISTS osb_wallet_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES osb_users(id) ON DELETE CASCADE,
  kind varchar(16) DEFAULT 'earn',
  points integer NOT NULL DEFAULT 0,
  order_code varchar(24),
  note varchar(240),
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osb_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES osb_users(id) ON DELETE SET NULL,
  referee_id uuid REFERENCES osb_users(id) ON DELETE SET NULL,
  code varchar(16) NOT NULL,
  reward_points integer DEFAULT 100,
  created_at timestamp DEFAULT now()
);

-- Purane users ko referral code do (phone-based unique-ish):
-- NOTE: sirf unko jinka code null hai.
UPDATE osb_users
SET referral_code = 'OSB' || RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 4) || UPPER(SUBSTRING(MD5(id::text), 1, 3))
WHERE referral_code IS NULL;
