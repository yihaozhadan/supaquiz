CREATE TABLE IF NOT EXISTS `admin` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `admin_username_unique` ON `admin` (`username`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`participant_key` text NOT NULL,
	`intake_form_data` text NOT NULL,
	`answers` text NOT NULL,
	`score` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`time_taken_seconds` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `question` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`media_url` text,
	`options` text,
	`correct_answer` text NOT NULL,
	`explanation` text,
	`code_snippet` text,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`password` text,
	`time_limit_seconds` integer,
	`shuffle_questions` integer DEFAULT false NOT NULL,
	`max_attempts` integer DEFAULT 1 NOT NULL,
	`max_participants` integer NOT NULL,
	`allow_back_navigation` integer DEFAULT true NOT NULL,
	`question_display_mode` text DEFAULT 'one_at_a_time' NOT NULL,
	`reveal_answers_after` text DEFAULT 'immediate' NOT NULL,
	`intake_form_schema` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`activate_at` integer,
	`expire_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
