CREATE TABLE "gitea_relay_keys" (
	"user_id" text PRIMARY KEY NOT NULL,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL,
	"gitea_key_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
