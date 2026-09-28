CREATE TABLE `agent_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`trainingId` text NOT NULL,
	`userId` text NOT NULL,
	`problemId` text NOT NULL,
	`requestId` text NOT NULL,
	`level` integer NOT NULL,
	`stuckType` text NOT NULL,
	`content` text NOT NULL,
	`lastVerdict` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`trainingId`) REFERENCES `training_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problemId`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_request` ON `agent_sessions` (`userId`,`requestId`);--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`content` text NOT NULL,
	`hints` text NOT NULL,
	`solutionOutline` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_slug_unique` ON `problems` (`slug`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`problemId` text,
	`reason` text NOT NULL,
	`basis` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problemId`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`problemId` text NOT NULL,
	`trainingId` text NOT NULL,
	`requestId` text NOT NULL,
	`codeHash` text NOT NULL,
	`mode` text NOT NULL,
	`verdict` text NOT NULL,
	`result` text,
	`createdAt` integer NOT NULL,
	`finishedAt` integer,
	`source` text DEFAULT 'live' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problemId`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trainingId`) REFERENCES `training_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_request` ON `submissions` (`userId`,`requestId`);--> statement-breakpoint
CREATE INDEX `submission_history` ON `submissions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `submission_pending` ON `submissions` (`verdict`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`teamId` text NOT NULL,
	`userId` text NOT NULL,
	PRIMARY KEY(`teamId`, `userId`),
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problem_test_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problemId` text NOT NULL,
	`ordinal` integer NOT NULL,
	`input` text NOT NULL,
	`output` text NOT NULL,
	FOREIGN KEY (`problemId`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_problem_order` ON `problem_test_cases` (`problemId`,`ordinal`);--> statement-breakpoint
CREATE TABLE `training_records` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`problemId` text NOT NULL,
	`startedAt` integer NOT NULL,
	`endedAt` integer,
	`elapsedSeconds` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`hintLevel` integer DEFAULT 0 NOT NULL,
	`hintCount` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'live' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problemId`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hint_level_range" CHECK("training_records"."hintLevel" between 0 and 4)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_session` ON `training_records` (`userId`,`problemId`) WHERE "training_records"."status" = 'active';--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`goal` text NOT NULL,
	`difficulty` integer DEFAULT 1 NOT NULL,
	`dailyMinutes` integer DEFAULT 30 NOT NULL
);
