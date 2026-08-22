CREATE TABLE "plaid_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_type" text NOT NULL,
	"webhook_code" text NOT NULL,
	"item_id" text NOT NULL,
	"raw_body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_retry_at" timestamp,
	"error_message" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "plaid_webhook_events_status_idx" ON "plaid_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plaid_webhook_events_processing_idx" ON "plaid_webhook_events" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "plaid_webhook_events_item_id_idx" ON "plaid_webhook_events" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "plaid_webhook_events_created_at_idx" ON "plaid_webhook_events" USING btree ("created_at");