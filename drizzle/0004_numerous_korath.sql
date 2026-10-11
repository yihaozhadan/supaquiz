CREATE TABLE `question_group` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`name` text NOT NULL,
	`pick_count` integer,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `question` ADD `group_id` text REFERENCES question_group(id);