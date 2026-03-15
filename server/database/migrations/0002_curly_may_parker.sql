CREATE TABLE `comment_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comment_reactions_comment_id` ON `comment_reactions` (`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reactions_comment_user_emoji` ON `comment_reactions` (`comment_id`,`user_id`,`emoji`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_comments_item_id` ON `comments` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_item_created` ON `comments` (`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_items_completed` ON `items` (`is_completed`);--> statement-breakpoint
CREATE INDEX `idx_items_position` ON `items` (`position`);--> statement-breakpoint
CREATE INDEX `idx_items_completed_position` ON `items` (`is_completed`,`position`);