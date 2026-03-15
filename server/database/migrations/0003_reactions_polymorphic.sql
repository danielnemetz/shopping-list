CREATE TABLE `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reactions_entity` ON `reactions` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `reactions_entity_user_emoji` ON `reactions` (`entity_type`,`entity_id`,`user_id`,`emoji`);
--> statement-breakpoint
INSERT INTO reactions (entity_type, entity_id, user_id, emoji)
SELECT 'comment', CAST(comment_id AS TEXT), user_id, emoji FROM comment_reactions;
--> statement-breakpoint
DROP TABLE `comment_reactions`;
