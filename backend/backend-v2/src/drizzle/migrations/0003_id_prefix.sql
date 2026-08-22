-- Custom SQL migration file, put your code below! ---- Custom SQL migration file, put your code below! --

DROP TABLE IF EXISTS "plaid_transactions" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "plaid_sync_logs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "plaid_accounts" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "plaid_items" CASCADE;
--> statement-breakpoint


CREATE TABLE "plaid_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"plaid_item_id" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"account_subtype" text,
	"mask" text,
	"ledger_account" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"error_code" text,
	"error_message" text,
	"transactions_cursor" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plaid_item_id" text,
	"sync_type" text NOT NULL,
	"status" text NOT NULL,
	"transactions_fetched" integer DEFAULT 0 NOT NULL,
	"transactions_added" integer DEFAULT 0 NOT NULL,
	"transactions_modified" integer DEFAULT 0 NOT NULL,
	"transactions_removed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"plaid_account_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"pending_transaction_id" text,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"merchant_name" text,
	"name" text NOT NULL,
	"category" text,
	"is_pending" boolean DEFAULT false NOT NULL,
	"synced_to_ledger" boolean DEFAULT false NOT NULL,
	"ledger_entry_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_sync_logs" ADD CONSTRAINT "plaid_sync_logs_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_transactions" ADD CONSTRAINT "plaid_transactions_plaid_account_id_plaid_accounts_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plaid_accounts_item_id_idx" ON "plaid_accounts" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE INDEX "plaid_accounts_enabled_idx" ON "plaid_accounts" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_accounts_account_id_idx" ON "plaid_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "plaid_items_user_id_idx" ON "plaid_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_items_status_idx" ON "plaid_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_items_item_id_idx" ON "plaid_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "plaid_sync_logs_user_id_idx" ON "plaid_sync_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_sync_logs_item_id_idx" ON "plaid_sync_logs" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE INDEX "plaid_sync_logs_created_at_idx" ON "plaid_sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "plaid_transactions_account_id_idx" ON "plaid_transactions" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_transactions_date_idx" ON "plaid_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "plaid_transactions_synced_idx" ON "plaid_transactions" USING btree ("synced_to_ledger");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_transactions_transaction_id_idx" ON "plaid_transactions" USING btree ("transaction_id");