PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`password` text,
	`time_limit_seconds` integer,
	`shuffle_questions` integer DEFAULT false NOT NULL,
	`max_attempts` integer DEFAULT 1,
	`max_participants` integer,
	`allow_back_navigation` integer DEFAULT true NOT NULL,
	`question_display_mode` text DEFAULT 'one_at_a_time' NOT NULL,
	`reveal_answers_after` text DEFAULT 'immediate' NOT NULL,
	`intake_form_schema` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`is_visible_after_expiry` integer DEFAULT true NOT NULL,
	`activate_at` integer,
	`expire_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_quiz`("id", "title", "description", "password", "time_limit_seconds", "shuffle_questions", "max_attempts", "max_participants", "allow_back_navigation", "question_display_mode", "reveal_answers_after", "intake_form_schema", "status", "is_public", "is_visible_after_expiry", "activate_at", "expire_at", "created_at", "updated_at") SELECT "id", "title", "description", "password", "time_limit_seconds", "shuffle_questions", "max_attempts", "max_participants", "allow_back_navigation", "question_display_mode", "reveal_answers_after", "intake_form_schema", "status", "is_public", "is_visible_after_expiry", "activate_at", "expire_at", "created_at", "updated_at" FROM `quiz`;--> statement-breakpoint
DROP TABLE `quiz`;--> statement-breakpoint
ALTER TABLE `__new_quiz` RENAME TO `quiz`;--> statement-breakpoint
PRAGMA foreign_keys=ON;