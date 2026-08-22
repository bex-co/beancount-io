CREATE TABLE "oauth_adapter_storage" (
	"model" text NOT NULL,
	"id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"grant_id" text,
	"user_code" text,
	"uid" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_adapter_storage_model_id_pk" PRIMARY KEY("model","id")
);
--> statement-breakpoint
CREATE INDEX "oauth_adapter_storage_grant_id_idx" ON "oauth_adapter_storage" USING btree ("model","grant_id");--> statement-breakpoint
CREATE INDEX "oauth_adapter_storage_user_code_idx" ON "oauth_adapter_storage" USING btree ("model","user_code");--> statement-breakpoint
CREATE INDEX "oauth_adapter_storage_uid_idx" ON "oauth_adapter_storage" USING btree ("model","uid");--> statement-breakpoint
CREATE INDEX "oauth_adapter_storage_expires_at_idx" ON "oauth_adapter_storage" USING btree ("expires_at");