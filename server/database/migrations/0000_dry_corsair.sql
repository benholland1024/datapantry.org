CREATE TABLE "databases" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"table_id" varchar(36) NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_columns" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"table_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"datatype" varchar(100) NOT NULL,
	"constraint" varchar(100) DEFAULT 'none',
	"is_required" boolean DEFAULT false,
	"order_index" integer NOT NULL,
	"foreign_key" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_tables" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"database_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"password" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "databases" ADD CONSTRAINT "databases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rows" ADD CONSTRAINT "rows_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_columns" ADD CONSTRAINT "user_columns_table_id_user_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."user_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tables" ADD CONSTRAINT "user_tables_database_id_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON DELETE no action ON UPDATE no action;