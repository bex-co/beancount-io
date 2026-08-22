CREATE TABLE "ledger_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" bigint NOT NULL,
	"repository_owner_snapshot" text NOT NULL,
	"repository_name_snapshot" text NOT NULL,
	"recipient_email_normalized" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"permission" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_sent_at" timestamp with time zone,
	"send_attempts" integer DEFAULT 0 NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"delivery_error_code" text,
	"accepted_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_invitations_token_hash_idx" ON "ledger_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_invitations_active_repo_email_idx" ON "ledger_invitations" USING btree ("repository_id","recipient_email_normalized") WHERE "ledger_invitations"."active" = true;--> statement-breakpoint
CREATE INDEX "ledger_invitations_repository_idx" ON "ledger_invitations" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "ledger_invitations_expiry_idx" ON "ledger_invitations" USING btree ("active","expires_at");--> statement-breakpoint
CREATE INDEX "ledger_invitations_inviter_idx" ON "ledger_invitations" USING btree ("inviter_user_id");