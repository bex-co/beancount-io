ALTER TABLE "plaid_items" ADD COLUMN "ledger_repo_id" bigint;--> statement-breakpoint
CREATE INDEX "plaid_items_ledger_repo_id_idx" ON "plaid_items" USING btree ("ledger_repo_id");