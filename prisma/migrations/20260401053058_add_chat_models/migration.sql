-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `password_hash` VARCHAR(500) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'USER') NULL DEFAULT 'USER',
    `shift_id` VARCHAR(191) NULL,
    `responsibility` ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NULL,
    `shift_period_start` DATETIME(3) NULL,
    `shift_period_end` DATETIME(3) NULL,
    `avatar` VARCHAR(500) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `is_blocked` BOOLEAN NULL DEFAULT false,
    `is_first_login` BOOLEAN NULL DEFAULT true,
    `must_change_password` BOOLEAN NULL DEFAULT true,
    `last_activity` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `monthly_score` FLOAT NULL,
    `reliability_index` FLOAT NULL,
    `performance_badge` ENUM('EXEMPLARY', 'RELIABLE', 'IMPROVING', 'NEEDS_ATTENTION') NULL,
    `presence_status` ENUM('ONLINE', 'OFFLINE', 'AWAY', 'BUSY') NULL DEFAULT 'OFFLINE',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_users_email`(`email`),
    UNIQUE INDEX `uk_users_username`(`username`),
    INDEX `idx_users_role`(`role`),
    INDEX `idx_users_shift_id`(`shift_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `color_code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_shifts_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_cycles` (
    `id` VARCHAR(191) NOT NULL,
    `shift_id` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `cycle_number` INTEGER NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_shift_cycles_shift_number`(`shift_id`, `cycle_number`),
    INDEX `idx_shift_cycles_shift_start`(`shift_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_days` (
    `id` VARCHAR(191) NOT NULL,
    `cycle_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `day_type` ENUM('DAY_SHIFT', 'NIGHT_SHIFT', 'REST_DAY') NOT NULL,
    `start_hour` INTEGER NOT NULL,
    `end_hour` INTEGER NOT NULL,
    `day_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_work_days_cycle_id`(`cycle_id`),
    INDEX `idx_work_days_date`(`date`),
    UNIQUE INDEX `uk_work_days_cycle_date`(`cycle_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `day_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `work_day_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `responsibility` ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NULL,
    `is_resting` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_day_assignments_user`(`user_id`),
    UNIQUE INDEX `uk_day_assignments_workday_user`(`work_day_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `individual_rests` (
    `id` VARCHAR(191) NOT NULL,
    `cycle_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `rest_day` INTEGER NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_individual_rests_user`(`user_id`),
    UNIQUE INDEX `uk_individual_rests_cycle_user`(`cycle_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'EQUIPMENT_ALERT', 'OTHER_MONITORING', 'TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP', 'CLIENT_INFO', 'GRAPH_SENT', 'ALERT_PUBLISHED', 'HANDOVER_WRITTEN', 'INCIDENT_HISTORY', 'REPORT_GENERATED', 'TICKET_UPDATED', 'TICKET_CLOSED', 'RFO_CREATED', 'ARCHIVE_DONE') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_activities_category`(`category`),
    INDEX `idx_activities_type`(`type`),
    INDEX `idx_activities_user_created`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'LATE') NULL DEFAULT 'PENDING',
    `category` ENUM('INCIDENT', 'MAINTENANCE', 'SURVEILLANCE', 'ADMINISTRATIVE', 'OTHER') NULL DEFAULT 'OTHER',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NULL DEFAULT 'MEDIUM',
    `responsibility` ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NULL,
    `shift_name` VARCHAR(50) NULL,
    `start_time` DATETIME(3) NULL,
    `estimated_end_time` DATETIME(3) NULL,
    `estimated_duration` INTEGER NULL,
    `actual_end_time` DATETIME(3) NULL,
    `actual_duration` INTEGER NULL,
    `tags` TEXT NULL,
    `is_overdue` BOOLEAN NULL DEFAULT false,
    `is_notified` BOOLEAN NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_tasks_category`(`category`),
    INDEX `idx_tasks_priority`(`priority`),
    INDEX `idx_tasks_user_created`(`user_id`, `created_at`),
    INDEX `idx_tasks_user_status`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `time` VARCHAR(20) NOT NULL,
    `sent` BOOLEAN NULL DEFAULT false,
    `recipients` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_graph_schedules_user`(`user_id`),
    INDEX `idx_graph_schedules_date`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `handovers` (
    `id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `shift_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `content` TEXT NULL,
    `incidents` TEXT NULL,
    `escalations` TEXT NULL,
    `pending_tasks` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_handovers_author_date`(`author_id`, `date`),
    INDEX `idx_handovers_shift_date`(`shift_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtimes` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `duration` INTEGER NOT NULL DEFAULT 120,
    `shift_type` VARCHAR(50) NOT NULL,
    `start_time` VARCHAR(20) NOT NULL,
    `end_time` VARCHAR(20) NOT NULL,
    `reason` VARCHAR(500) NULL DEFAULT 'Supervision NOC',
    `approved_by` VARCHAR(191) NULL DEFAULT 'Daddy AZUMY',
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_overtimes_date`(`date`),
    INDEX `idx_overtimes_user_month_year`(`user_id`, `month`, `year`),
    UNIQUE INDEX `uk_overtimes_user_date`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `responsibilities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `responsibility` ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_responsibilities_user_start`(`user_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_links` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `url` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) NULL,
    `description` VARCHAR(500) NULL,
    `order` INTEGER NULL DEFAULT 0,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,
    `description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_system_settings_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `action` VARCHAR(200) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(50) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'SUCCESS',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_logs_action`(`action`),
    INDEX `idx_audit_logs_created_at`(`created_at`),
    INDEX `idx_audit_logs_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_shares` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(50) NULL DEFAULT 'read',
    `shared_by` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_document_shares_document_id`(`document_id`),
    INDEX `idx_document_shares_user_id`(`user_id`),
    UNIQUE INDEX `uk_document_shares_doc_user`(`document_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_versions` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `uploaded_by` VARCHAR(191) NOT NULL,
    `changes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_document_versions_user`(`uploaded_by`),
    INDEX `idx_document_versions_document_id`(`document_id`),
    UNIQUE INDEX `uk_document_versions_doc_version`(`document_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `category` VARCHAR(100) NULL,
    `tags` TEXT NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `folder_id` VARCHAR(191) NULL,
    `is_public` BOOLEAN NULL DEFAULT false,
    `is_archived` BOOLEAN NULL DEFAULT false,
    `version` INTEGER NULL DEFAULT 1,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_documents_category`(`category`),
    INDEX `idx_documents_folder`(`folder_id`),
    INDEX `idx_documents_owner`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `is_read` BOOLEAN NULL DEFAULT false,
    `link` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_notifications_created_at`(`created_at`),
    INDEX `idx_notifications_user_read`(`user_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_sessions_token`(`token`),
    INDEX `idx_sessions_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `type` ENUM('WARNING', 'CRITICAL', 'INFO', 'SUCCESS') NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NULL DEFAULT false,
    `is_dismissed` BOOLEAN NULL DEFAULT false,
    `triggered_by` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_task_alerts_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_comments` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `is_edited` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `fk_task_comments_user`(`user_id`),
    INDEX `idx_task_comments_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_history` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `user_name` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `field` VARCHAR(100) NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `timestamp` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_task_history_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_data` LONGTEXT NULL,
    `uploaded_by` VARCHAR(191) NOT NULL,
    `uploaded_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_ticket_attachments_user`(`uploaded_by`),
    INDEX `idx_ticket_attachments_ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_comments` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `is_private` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `fk_ticket_comments_user`(`user_id`),
    INDEX `idx_ticket_comments_ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_counters` (
    `id` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(10) NOT NULL,
    `current_number` INTEGER NOT NULL DEFAULT 0,
    `year` INTEGER NOT NULL,

    UNIQUE INDEX `uk_ticket_counters_prefix_year`(`prefix`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_history` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `user_name` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `field` VARCHAR(100) NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `timestamp` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ticket_history_ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(50) NOT NULL,
    `objet` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'PENDING', 'ESCALATED', 'SUSPENDED', 'WAITING_FICHE', 'RESOLVED', 'CLOSED') NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NULL DEFAULT 'MEDIUM',
    `category` ENUM('INCIDENT', 'REQUEST', 'PROBLEM', 'CHANGE', 'OTHER') NULL DEFAULT 'OTHER',
    `site` VARCHAR(200) NULL,
    `localite` VARCHAR(200) NULL,
    `technicien` VARCHAR(200) NULL,
    `reporter_id` VARCHAR(191) NOT NULL,
    `reporter_name` VARCHAR(191) NOT NULL,
    `assignee_id` VARCHAR(191) NULL,
    `assignee_name` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `due_date` DATETIME(3) NULL,
    `resolved_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `is_deleted` BOOLEAN NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_tickets_numero`(`numero`),
    INDEX `idx_tickets_assignee_id`(`assignee_id`),
    INDEX `idx_tickets_created_at`(`created_at`),
    INDEX `idx_tickets_priority`(`priority`),
    INDEX `idx_tickets_reporter_id`(`reporter_id`),
    INDEX `idx_tickets_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversationParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConversationParticipant_conversationId_userId_key`(`conversationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_users_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `shift_cycles` ADD CONSTRAINT `fk_shift_cycles_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `work_days` ADD CONSTRAINT `fk_work_days_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `shift_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `day_assignments` ADD CONSTRAINT `fk_day_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `day_assignments` ADD CONSTRAINT `fk_day_assignments_work_day` FOREIGN KEY (`work_day_id`) REFERENCES `work_days`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `individual_rests` ADD CONSTRAINT `fk_individual_rests_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `shift_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `individual_rests` ADD CONSTRAINT `fk_individual_rests_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `fk_activities_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `graph_schedules` ADD CONSTRAINT `fk_graph_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `handovers` ADD CONSTRAINT `fk_handovers_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `overtimes` ADD CONSTRAINT `fk_overtimes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `responsibilities` ADD CONSTRAINT `fk_responsibilities_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `fk_document_shares_document` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_shares` ADD CONSTRAINT `fk_document_shares_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `fk_document_versions_document` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `fk_document_versions_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `fk_documents_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `task_alerts` ADD CONSTRAINT `fk_task_alerts_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `fk_task_comments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `fk_task_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `task_history` ADD CONSTRAINT `fk_task_history_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `fk_ticket_attachments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `fk_ticket_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_comments` ADD CONSTRAINT `fk_ticket_comments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_comments` ADD CONSTRAINT `fk_ticket_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_history` ADD CONSTRAINT `fk_ticket_history_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `ConversationParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
