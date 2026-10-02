-- 0013_service_bookings.sql — Neon console me chalao (0011 + 0012 ke baad).
-- Service booking fields on osb_orders. Bina iske backend booking insert
-- fail-soft hoga (app local booking rakhega, server id nahi milega).
ALTER TABLE osb_orders
  ADD COLUMN IF NOT EXISTS kind varchar(16) DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS slot_label varchar(80),
  ADD COLUMN IF NOT EXISTS pay_status varchar(16) DEFAULT 'paid';
