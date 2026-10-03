-- Strict stage-gating (Neon SQL console me chalao, phir Render redeploy).
-- User requested stage structure:
--   0 (welcome/first-order) → WELCOME20 (Flat ₹20 OFF)
--   3+ → LOYAL3 (Flat ₹30 OFF)
--   5+ → LOYAL5 (Flat ₹50 OFF)
--   10+ → CHAMP10 (Flat ₹80 OFF)
--   20+ → HERO20 (Flat ₹100 OFF)

INSERT INTO osb_coupons (code, title, detail, off_pct, max_off, min_order, min_orders, first_order_only, funded_by, active)
VALUES ('WELCOME20', 'Flat ₹20 OFF', 'First order reward • no min order', 100, 20, 1, 0, true, 'platform', true)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, off_pct = 100, max_off = 20, min_order = 1, min_orders = 0, first_order_only = true;

INSERT INTO osb_coupons (code, title, detail, off_pct, max_off, min_order, min_orders, funded_by, active)
VALUES ('LOYAL3', 'Flat ₹30 OFF', '3 successful orders • Flat ₹30 OFF', 100, 30, 1, 3, 'platform', true)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, off_pct = 100, max_off = 30, min_order = 1, min_orders = 3;

INSERT INTO osb_coupons (code, title, detail, off_pct, max_off, min_order, min_orders, funded_by, active)
VALUES ('LOYAL5', 'Flat ₹50 OFF', '5 successful orders • Flat ₹50 OFF', 100, 50, 1, 5, 'platform', true)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, off_pct = 100, max_off = 50, min_order = 1, min_orders = 5;

INSERT INTO osb_coupons (code, title, detail, off_pct, max_off, min_order, min_orders, funded_by, active)
VALUES ('CHAMP10', 'Flat ₹80 OFF', '10 successful orders • Flat ₹80 OFF', 100, 80, 1, 10, 'platform', true)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, off_pct = 100, max_off = 80, min_order = 1, min_orders = 10;

INSERT INTO osb_coupons (code, title, detail, off_pct, max_off, min_order, min_orders, funded_by, active)
VALUES ('HERO20', 'Flat ₹100 OFF', '20 successful orders • Flat ₹100 OFF', 100, 100, 1, 20, 'platform', true)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, off_pct = 100, max_off = 100, min_order = 1, min_orders = 20;

UPDATE osb_coupons SET first_order_only = true, min_orders = 0 WHERE UPPER(code) = 'WELCOME20';
UPDATE osb_coupons SET min_orders = 1 WHERE UPPER(code) IN ('FRESH20', 'HOMESERVE');
UPDATE osb_coupons SET min_orders = 3 WHERE UPPER(code) = 'FREEDEL';
