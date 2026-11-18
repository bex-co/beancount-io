CREATE TABLE "oidc_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"sub" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "oidc_identities_issuer_sub_idx" ON "oidc_identities" USING btree ("issuer","sub");--> statement-breakpoint
CREATE UNIQUE INDEX "oidc_identities_user_issuer_idx" ON "oidc_identities" USING btree ("user_id","issuer");