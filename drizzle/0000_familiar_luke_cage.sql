CREATE TABLE `transcriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`command` text,
	`timestamp` integer DEFAULT 1737360883049 NOT NULL
);
