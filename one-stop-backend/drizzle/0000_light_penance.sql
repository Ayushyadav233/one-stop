CREATE TABLE "osb_category_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"kind" varchar(32) DEFAULT 'food',
	"requested_by" varchar(20),
	"status" varchar(24) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(180) NOT NULL,
	"detail" varchar(320),
	"off_pct" integer DEFAULT 20,
	"max_off" integer DEFAULT 120,
	"min_order" integer DEFAULT 149,
	"kind" varchar(32) DEFAULT 'all',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_khata_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid,
	"kind" varchar(16) DEFAULT 'credit',
	"amount" integer NOT NULL,
	"note" varchar(240),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_khata_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"name" varchar(160) NOT NULL,
	"phone" varchar(20),
	"type" varchar(16) DEFAULT 'sale',
	"balance" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(24) NOT NULL,
	"store_id" uuid,
	"store_key" varchar(40),
	"store_name" varchar(160),
	"customer_name" varchar(120),
	"customer_phone" varchar(40),
	"items" jsonb DEFAULT '[]'::jsonb,
	"subtotal" integer DEFAULT 0,
	"delivery_fee" integer DEFAULT 0,
	"discount" integer DEFAULT 0,
	"total" integer DEFAULT 0,
	"status" varchar(32) DEFAULT 'new',
	"payment" varchar(32) DEFAULT 'UPI',
	"address" varchar(320) DEFAULT 'HSR Layout, Bengaluru',
	"eta_mins" integer DEFAULT 28,
	"rider" varchar(80),
	"rider_phone" varchar(40),
	"rider_lat" numeric(10, 6),
	"rider_lng" numeric(10, 6),
	"rider_last_seen" timestamp,
	"otp" varchar(8),
	"proof_photo" text,
	"delivered_by" varchar(24),
	"note" varchar(240),
	"distance_km" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"name" varchar(180) NOT NULL,
	"description" varchar(480),
	"price" integer NOT NULL,
	"mrp" integer,
	"image" text,
	"emoji" varchar(16) DEFAULT '🍔',
	"category" varchar(80),
	"rating" numeric(3, 2) DEFAULT '4.4',
	"is_veg" boolean DEFAULT true,
	"is_bestseller" boolean DEFAULT false,
	"stock" integer DEFAULT 50,
	"unit" varchar(40) DEFAULT '1 pc',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"product_id" uuid,
	"user_id" uuid,
	"rating" integer DEFAULT 5,
	"text" varchar(500),
	"reply" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_seller_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"kind" varchar(32) DEFAULT 'food',
	"tagline" varchar(240),
	"image" text,
	"address" varchar(320),
	"is_open" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"tagline" varchar(240),
	"image" text,
	"rating" numeric(3, 2) DEFAULT '4.5',
	"ratings_count" integer DEFAULT 0,
	"eta_mins" integer DEFAULT 25,
	"delivery_fee" integer DEFAULT 29,
	"distance_km" numeric(4, 2) DEFAULT '1.2',
	"address" varchar(320),
	"is_open" boolean DEFAULT true,
	"is_pure_veg" boolean DEFAULT false,
	"offers" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"open_hours" varchar(80) DEFAULT '9 AM – 11 PM',
	"health_score" integer DEFAULT 88,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "osb_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(120) DEFAULT 'Guest',
	"token" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "osb_users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "osb_khata_entries" ADD CONSTRAINT "osb_khata_entries_party_id_osb_khata_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."osb_khata_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_khata_parties" ADD CONSTRAINT "osb_khata_parties_owner_id_osb_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."osb_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_orders" ADD CONSTRAINT "osb_orders_store_id_osb_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."osb_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_products" ADD CONSTRAINT "osb_products_store_id_osb_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."osb_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_reviews" ADD CONSTRAINT "osb_reviews_store_id_osb_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."osb_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_reviews" ADD CONSTRAINT "osb_reviews_product_id_osb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."osb_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_reviews" ADD CONSTRAINT "osb_reviews_user_id_osb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."osb_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osb_seller_stores" ADD CONSTRAINT "osb_seller_stores_owner_id_osb_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."osb_users"("id") ON DELETE cascade ON UPDATE no action;