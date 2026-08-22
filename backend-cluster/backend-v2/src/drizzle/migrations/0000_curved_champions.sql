CREATE TABLE "jwts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expire_at" timestamp NOT NULL,
	"create_at" timestamp DEFAULT now() NOT NULL,
	"update_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"password" text,
	"email" text NOT NULL,
	"ip" text,
	"avatar" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"first_name" text,
	"last_name" text,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"ledger_username" text NOT NULL,
	"ledger_password" text NOT NULL,
	"ledger_api_token" text,
	"create_at" timestamp DEFAULT now() NOT NULL,
	"update_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"email" text,
	"name" text,
	"phone" text,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jwts_user_id_idx" ON "jwts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jwts_expire_at_idx" ON "jwts" USING btree ("expire_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_ledger_username_idx" ON "users" USING btree ("ledger_username");--> statement-breakpoint
CREATE INDEX "users_active_with_username_idx" ON "users" USING btree ("is_blocked","ledger_username");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_customer_id_idx" ON "paid_customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_client_idx" ON "paid_customers" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "paid_customers_stripe_client_idx" ON "paid_customers" USING btree ("stripe_customer_id","client_id");--> statement-breakpoint
CREATE INDEX "paid_customers_user_period_idx" ON "paid_customers" USING btree ("user_id","current_period_end");