CREATE TABLE "ssh_key_index" (
	"fingerprint" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gitea_key_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ssh_key_index_user_id_idx" ON "ssh_key_index" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ssh_key_index_gitea_key_id_idx" ON "ssh_key_index" USING btree ("gitea_key_id");