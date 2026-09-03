CREATE TABLE `context_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
