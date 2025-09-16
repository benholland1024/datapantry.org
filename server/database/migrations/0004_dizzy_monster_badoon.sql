CREATE TABLE "user_columns" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"datatype" varchar(100) NOT NULL,
	"constraint" varchar(100) DEFAULT 'none',
	"is_required" boolean DEFAULT false,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tables" RENAME TO "user_tables";--> statement-breakpoint
ALTER TABLE "rows" DROP CONSTRAINT "rows_table_id_tables_id_fk";
--> statement-breakpoint
ALTER TABLE "user_tables" DROP CONSTRAINT "tables_database_id_databases_id_fk";
--> statement-breakpoint
ALTER TABLE "user_tables" ADD COLUMN "x" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tables" ADD COLUMN "y" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_columns" ADD CONSTRAINT "user_columns_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rows" ADD CONSTRAINT "rows_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tables" ADD CONSTRAINT "user_tables_database_id_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tables" DROP COLUMN "columns";