CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`start_date` text,
	`due_date` text NOT NULL,
	`category` text DEFAULT 'personal' NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`google_calendar_event_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
