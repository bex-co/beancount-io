CREATE TABLE "billing_identities" (
	"user_id" text PRIMARY KEY NOT NULL,
	"apple_app_account_token" uuid NOT NULL,
	"google_obfuscated_account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"environment" text NOT NULL,
	"external_event_id" text NOT NULL,
	"payload" jsonb,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "store_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"provider" text NOT NULL,
	"environment" text NOT NULL,
	"external_id" text NOT NULL,
	"replaced_by_id" text,
	"product_id" text NOT NULL,
	"base_plan_id" text,
	"tier" text,
	"cycle" text,
	"provider_status" text NOT NULL,
	"status" text NOT NULL,
	"access_ends_at" timestamp,
	"will_renew" boolean DEFAULT false NOT NULL,
	"pending_product_id" text,
	"acknowledged_at" timestamp,
	"revoked_at" timestamp,
	"provider_updated_at" timestamp NOT NULL,
	"last_verified_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_identities_apple_token_idx" ON "billing_identities" USING btree ("apple_app_account_token");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_identities_google_account_idx" ON "billing_identities" USING btree ("google_obfuscated_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_billing_events_external_idx" ON "store_billing_events" USING btree ("provider","environment","external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_subscriptions_external_idx" ON "store_subscriptions" USING btree ("provider","environment","external_id");--> statement-breakpoint
CREATE INDEX "store_subscriptions_user_idx" ON "store_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "store_subscriptions_access_ends_idx" ON "store_subscriptions" USING btree ("access_ends_at");