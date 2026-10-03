-- Strict stage-gating (Neon SQL console me chalao, phir Render redeploy).
-- Har platform coupon ko delivered-order requirement milti hai:
--   0 (welcome/first-order) → BAZAR50
--   1+ → FRESH20, HOMESERVE
--   3+ → LOYAL3, FREEDEL
--   5+ → LOYAL5, BIGSHOP5
--   10+ → CHAMP10 (phir har cycle repeat 🔁)
-- Idempotent: dobara chalane pe same result.

UPDATE osb_coupons SET first_order_only = true, min_orders = 0 WHERE UPPER(code) = 'BAZAR50';
UPDATE osb_coupons SET min_orders = 1 WHERE UPPER(code) IN ('FRESH20', 'HOMESERVE');
UPDATE osb_coupons SET min_orders = 3 WHERE UPPER(code) IN ('LOYAL3', 'FREEDEL');
UPDATE osb_coupons SET min_orders = 5 WHERE UPPER(code) IN ('LOYAL5', 'BIGSHOP5');
UPDATE osb_coupons SET min_orders = 10 WHERE UPPER(code) = 'CHAMP10';

-- Stage language me details (app reward table + cards yahi padhte hain):
UPDATE osb_coupons SET detail = '3 successful orders • min ₹99' WHERE UPPER(code) = 'FREEDEL';
UPDATE osb_coupons SET detail = '1 successful order • first service booking' WHERE UPPER(code) = 'HOMESERVE';
