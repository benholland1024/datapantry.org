ALTER TABLE "databases" ADD COLUMN "api_key" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "databases" ADD CONSTRAINT "databases_api_key_unique" UNIQUE("api_key");