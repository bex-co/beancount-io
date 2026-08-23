CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"op" text NOT NULL,
	"user_id" text,
	"method" text,
	"token_id" text,
	"ledger_id" text,
	"outcome" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_user_at_idx" ON "audit_events" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "audit_events_ledger_at_idx" ON "audit_events" USING btree ("ledger_id","at");--> statement-breakpoint
CREATE INDEX "audit_events_at_idx" ON "audit_events" USING btree ("at");