-- Coupon guardrails migration (Neon SQL console me chalao, phir Render redeploy).
-- Idempotent: dobara chalane pe error nahi dega.

ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS funded_by varchar(16) DEFAULT 'platform';
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS store_key varchar(40);
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS starts_at timestamp;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS expires_at timestamp;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS max_uses_total integer;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS uses_total integer DEFAULT 0;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS max_uses_per_user integer DEFAULT 1;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS first_order_only boolean DEFAULT false;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS max_budget integer;
ALTER TABLE osb_coupons ADD COLUMN IF NOT EXISTS budget_used integer DEFAULT 0;

ALTER TABLE osb_orders ADD COLUMN IF NOT EXISTS coupon_code varchar(32);
ALTER TABLE osb_orders ADD COLUMN IF NOT EXISTS wallet_used integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS osb_coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES osb_users(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES osb_coupons(id) ON DELETE SET NULL,
  code varchar(32) NOT NULL,
  order_code varchar(24),
  discount integer DEFAULT 0,
  funded_by varchar(16) DEFAULT 'platform',
  store_key varchar(40),
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_user ON osb_coupon_uses(user_id, coupon_id);

-- Existing coupons ko sensible guardrails:
-- BAZAR50: sirf pehla order, 1000 uses total, ₹50,000 budget, 60 din expiry.
UPDATE osb_coupons SET
  funded_by = 'platform', active = true,
  max_uses_per_user = 1, first_order_only = true,
  max_uses_total = COALESCE(max_uses_total, 1000),
  max_budget = COALESCE(max_budget, 50000),
  expires_at = COALESCE(expires_at, now() + interval '60 days')
WHERE UPPER(code) = 'BAZAR50';

-- Baaki platform coupons: 1 baar per user, 90 din expiry (budget unlimited).
UPDATE osb_coupons SET
  funded_by = COALESCE(funded_by, 'platform'), active = COALESCE(active, true),
  max_uses_per_user = COALESCE(max_uses_per_user, 1),
  expires_at = COALESCE(expires_at, now() + interval '90 days')
WHERE funded_by = 'platform' AND UPPER(code) <> 'BAZAR50';
