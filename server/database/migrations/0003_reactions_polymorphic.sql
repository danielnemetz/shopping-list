CREATE TABLE IF NOT EXISTS `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_reactions_entity` ON `reactions` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `reactions_entity_user_emoji` ON `reactions` (`entity_type`,`entity_id`,`user_id`,`emoji`);
