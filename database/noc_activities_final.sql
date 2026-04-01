-- ============================================
-- NOC ACTIVITIES - SILICONE CONNECT
-- Complete MySQL Database Schema (Final)
-- Version: 2.0.0
-- Date: 2026-02-25
-- ============================================
-- Compatible with phpMyAdmin and MySQL CLI
-- Database: noc_activity
-- Collation: utf8mb4_unicode_ci
-- Engine: InnoDB
-- ============================================

-- ============================================
-- CREATE DATABASE
-- ============================================
CREATE DATABASE IF NOT EXISTS `noc_activity` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `noc_activity`;

-- ============================================
-- DISABLE FOREIGN KEY CHECKS (for clean import)
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- DROP ALL TABLES (Reverse dependency order - children first)
-- ============================================
DROP TABLE IF EXISTS `graph_schedules`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `document_shares`;
DROP TABLE IF EXISTS `document_versions`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `handovers`;
DROP TABLE IF EXISTS `overtimes`;
DROP TABLE IF EXISTS `ticket_history`;
DROP TABLE IF EXISTS `ticket_attachments`;
DROP TABLE IF EXISTS `ticket_comments`;
DROP TABLE IF EXISTS `ticket_counters`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `task_history`;
DROP TABLE IF EXISTS `task_alerts`;
DROP TABLE IF EXISTS `task_comments`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `responsibilities`;
DROP TABLE IF EXISTS `individual_rests`;
DROP TABLE IF EXISTS `day_assignments`;
DROP TABLE IF EXISTS `work_days`;
DROP TABLE IF EXISTS `shift_cycles`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `external_links`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `shifts`;

-- ============================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- ============================================================================
-- CREATE ALL TABLES (Dependency order - parents first)
-- ============================================================================
-- ============================================================================

-- ============================================
-- 1. SHIFTS - Work shifts (A, B, C)
-- ============================================
CREATE TABLE IF NOT EXISTS `shifts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `color_code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_shifts_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Work shifts (A, B, C) for NOC teams';

-- ============================================
-- 2. USERS - Complete user model with authentication
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) DEFAULT NULL,
    `last_name` VARCHAR(191) DEFAULT NULL,
    `username` VARCHAR(191) DEFAULT NULL,
    `password_hash` VARCHAR(500) DEFAULT NULL,
    `role` ENUM('SUPER_ADMIN','ADMIN','RESPONSABLE','TECHNICIEN','TECHNICIEN_NO','USER') DEFAULT 'USER',
    `shift_id` VARCHAR(191) DEFAULT NULL,
    `responsibility` ENUM('CALL_CENTER','MONITORING','REPORTING_1','REPORTING_2') DEFAULT NULL,
    `shift_period_start` DATETIME(3) DEFAULT NULL,
    `shift_period_end` DATETIME(3) DEFAULT NULL,
    `avatar` VARCHAR(500) DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_blocked` BOOLEAN DEFAULT FALSE,
    `is_first_login` BOOLEAN DEFAULT TRUE,
    `must_change_password` BOOLEAN DEFAULT TRUE,
    `last_activity` DATETIME(3) DEFAULT NULL,
    `failed_login_attempts` INT DEFAULT 0,
    `locked_until` DATETIME(3) DEFAULT NULL,
    `monthly_score` FLOAT DEFAULT NULL,
    `reliability_index` FLOAT DEFAULT NULL,
    `performance_badge` ENUM('EXEMPLARY','RELIABLE','IMPROVING','NEEDS_ATTENTION') DEFAULT NULL,
    `presence_status` ENUM('ONLINE','OFFLINE','AWAY','BUSY') DEFAULT 'OFFLINE',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`),
    UNIQUE KEY `uk_users_username` (`username`),
    INDEX `idx_users_shift_id` (`shift_id`),
    INDEX `idx_users_role` (`role`),
    CONSTRAINT `fk_users_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts with roles and authentication';

-- ============================================
-- 3. SESSIONS - User sessions (JWT auth)
-- ============================================
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sessions_token` (`token`),
    INDEX `idx_sessions_user_id` (`user_id`),
    CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User session tokens for JWT authentication';

-- ============================================
-- 4. SHIFT_CYCLES - Shift work cycles (6 work + 3 rest days)
-- ============================================
CREATE TABLE IF NOT EXISTS `shift_cycles` (
    `id` VARCHAR(191) NOT NULL,
    `shift_id` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `cycle_number` INT NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_shift_cycles_shift_start` (`shift_id`, `start_date`),
    INDEX `idx_shift_cycles_shift_number` (`shift_id`, `cycle_number`),
    CONSTRAINT `fk_shift_cycles_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shift work cycles: 6 consecutive work days + 3 rest days';

-- ============================================
-- 5. WORK_DAYS - Individual work days within cycles
-- ============================================
CREATE TABLE IF NOT EXISTS `work_days` (
    `id` VARCHAR(191) NOT NULL,
    `cycle_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `day_type` ENUM('DAY_SHIFT','NIGHT_SHIFT','REST_DAY') NOT NULL,
    `start_hour` INT NOT NULL,
    `end_hour` INT NOT NULL,
    `day_number` INT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_work_days_cycle_date` (`cycle_id`, `date`),
    INDEX `idx_work_days_cycle_id` (`cycle_id`),
    INDEX `idx_work_days_date` (`date`),
    CONSTRAINT `fk_work_days_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `shift_cycles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Individual work/rest days within each shift cycle';

-- ============================================
-- 6. DAY_ASSIGNMENTS - Who works what role each day
-- ============================================
CREATE TABLE IF NOT EXISTS `day_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `work_day_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `responsibility` ENUM('CALL_CENTER','MONITORING','REPORTING_1','REPORTING_2') DEFAULT NULL,
    `is_resting` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_day_assignments_workday_user` (`work_day_id`, `user_id`),
    CONSTRAINT `fk_day_assignments_work_day` FOREIGN KEY (`work_day_id`) REFERENCES `work_days` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_day_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Assigns users to responsibilities for each work day';

-- ============================================
-- 7. INDIVIDUAL_RESTS - Rotating rest days
-- ============================================
CREATE TABLE IF NOT EXISTS `individual_rests` (
    `id` VARCHAR(191) NOT NULL,
    `cycle_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `rest_day` INT NOT NULL COMMENT 'Which day of the cycle (day number)',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_individual_rests_cycle_user` (`cycle_id`, `user_id`),
    CONSTRAINT `fk_individual_rests_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `shift_cycles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_individual_rests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rotating individual rest days within cycles';

-- ============================================
-- 8. RESPONSIBILITIES - Responsibility rotation history
-- ============================================
CREATE TABLE IF NOT EXISTS `responsibilities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `responsibility` ENUM('CALL_CENTER','MONITORING','REPORTING_1','REPORTING_2') NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_responsibilities_user_start` (`user_id`, `start_date`),
    CONSTRAINT `fk_responsibilities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historical record of responsibility assignments';

-- ============================================
-- 9. ACTIVITIES - NOC activity log
-- ============================================
CREATE TABLE IF NOT EXISTS `activities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM(
        'CLIENT_DOWN','INTERFACE_UNSTABLE','RECURRENT_PROBLEM','EQUIPMENT_ALERT',
        'OTHER_MONITORING','TICKET_CREATED','CLIENT_CALL','ESCALATION',
        'INCIDENT_FOLLOWUP','CLIENT_INFO','GRAPH_SENT','ALERT_PUBLISHED',
        'HANDOVER_WRITTEN','INCIDENT_HISTORY','REPORT_GENERATED',
        'TICKET_UPDATED','TICKET_CLOSED','RFO_CREATED','ARCHIVE_DONE'
    ) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` TEXT DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_activities_user_created` (`user_id`, `created_at`),
    INDEX `idx_activities_category` (`category`),
    INDEX `idx_activities_type` (`type`),
    CONSTRAINT `fk_activities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='NOC activity log for monitoring, call center, and reporting';

-- ============================================
-- 10. TASKS - Daily task management
-- ============================================
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `status` ENUM('PENDING','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED','LATE') DEFAULT 'PENDING',
    `category` ENUM('INCIDENT','MAINTENANCE','SURVEILLANCE','ADMINISTRATIVE','OTHER') DEFAULT 'OTHER',
    `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    `responsibility` ENUM('CALL_CENTER','MONITORING','REPORTING_1','REPORTING_2') DEFAULT NULL,
    `shift_name` VARCHAR(50) DEFAULT NULL,
    `start_time` DATETIME(3) DEFAULT NULL,
    `estimated_end_time` DATETIME(3) DEFAULT NULL,
    `estimated_duration` INT DEFAULT NULL COMMENT 'Duration in minutes',
    `actual_end_time` DATETIME(3) DEFAULT NULL,
    `actual_duration` INT DEFAULT NULL COMMENT 'Duration in minutes',
    `tags` TEXT DEFAULT NULL,
    `is_overdue` BOOLEAN DEFAULT FALSE,
    `is_notified` BOOLEAN DEFAULT FALSE,
    `completed_at` DATETIME(3) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_tasks_user_created` (`user_id`, `created_at`),
    INDEX `idx_tasks_user_status` (`user_id`, `status`),
    INDEX `idx_tasks_category` (`category`),
    INDEX `idx_tasks_priority` (`priority`),
    CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily task management with priority and status tracking';

-- ============================================
-- 11. TASK_COMMENTS - Task comments
-- ============================================
CREATE TABLE IF NOT EXISTS `task_comments` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `is_edited` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_task_comments_task_id` (`task_id`),
    CONSTRAINT `fk_task_comments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_task_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comments on tasks for team collaboration';

-- ============================================
-- 12. TASK_ALERTS - Task alerts and notifications
-- ============================================
CREATE TABLE IF NOT EXISTS `task_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `type` ENUM('WARNING','CRITICAL','INFO','SUCCESS') NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `is_dismissed` BOOLEAN DEFAULT FALSE,
    `triggered_by` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_task_alerts_task_id` (`task_id`),
    CONSTRAINT `fk_task_alerts_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alerts triggered by task events (overdue, approaching, etc.)';

-- ============================================
-- 13. TASK_HISTORY - Task audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS `task_history` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) DEFAULT NULL,
    `user_name` VARCHAR(191) DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `field` VARCHAR(100) DEFAULT NULL,
    `old_value` TEXT DEFAULT NULL,
    `new_value` TEXT DEFAULT NULL,
    `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_task_history_task_id` (`task_id`),
    CONSTRAINT `fk_task_history_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for task changes';

-- ============================================
-- 14. TICKETS - Main ticket system
-- ============================================
CREATE TABLE IF NOT EXISTS `tickets` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(50) NOT NULL,
    `objet` VARCHAR(500) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `status` ENUM('OPEN','IN_PROGRESS','PENDING','ESCALATED','SUSPENDED','WAITING_FICHE','RESOLVED','CLOSED') DEFAULT 'OPEN',
    `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    `category` ENUM('INCIDENT','REQUEST','PROBLEM','CHANGE','OTHER') DEFAULT 'OTHER',
    `site` VARCHAR(200) DEFAULT NULL,
    `localite` VARCHAR(200) DEFAULT NULL,
    `technicien` VARCHAR(200) DEFAULT NULL,
    `reporter_id` VARCHAR(191) NOT NULL,
    `reporter_name` VARCHAR(191) NOT NULL,
    `assignee_id` VARCHAR(191) DEFAULT NULL,
    `assignee_name` VARCHAR(191) DEFAULT NULL,
    `tags` TEXT DEFAULT NULL,
    `due_date` DATETIME(3) DEFAULT NULL,
    `resolved_at` DATETIME(3) DEFAULT NULL,
    `closed_at` DATETIME(3) DEFAULT NULL,
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `deleted_at` DATETIME(3) DEFAULT NULL,
    `deleted_by` VARCHAR(191) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tickets_numero` (`numero`),
    INDEX `idx_tickets_reporter_id` (`reporter_id`),
    INDEX `idx_tickets_assignee_id` (`assignee_id`),
    INDEX `idx_tickets_status` (`status`),
    INDEX `idx_tickets_priority` (`priority`),
    INDEX `idx_tickets_created_at` (`created_at`),
    CONSTRAINT `fk_tickets_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tickets_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main ticket system for incident and request management';

-- ============================================
-- 15. TICKET_COUNTERS - Auto-increment for ticket numbers
-- ============================================
CREATE TABLE IF NOT EXISTS `ticket_counters` (
    `id` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(10) NOT NULL,
    `current_number` INT NOT NULL DEFAULT 0,
    `year` INT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ticket_counters_prefix_year` (`prefix`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auto-incrementing counter for ticket numbering (TKT-YYYY-NNNN)';

-- ============================================
-- 16. TICKET_COMMENTS - Ticket comments
-- ============================================
CREATE TABLE IF NOT EXISTS `ticket_comments` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `is_private` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_ticket_comments_ticket_id` (`ticket_id`),
    CONSTRAINT `fk_ticket_comments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ticket_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comments on tickets for communication and resolution tracking';

-- ============================================
-- 17. TICKET_ATTACHMENTS - Ticket file attachments
-- ============================================
CREATE TABLE IF NOT EXISTS `ticket_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_size` INT NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_data` LONGTEXT DEFAULT NULL,
    `uploaded_by` VARCHAR(191) NOT NULL,
    `uploaded_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_ticket_attachments_ticket_id` (`ticket_id`),
    CONSTRAINT `fk_ticket_attachments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ticket_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File attachments for tickets (screenshots, logs, etc.)';

-- ============================================
-- 18. TICKET_HISTORY - Ticket audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS `ticket_history` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) DEFAULT NULL,
    `user_name` VARCHAR(191) DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `field` VARCHAR(100) DEFAULT NULL,
    `old_value` TEXT DEFAULT NULL,
    `new_value` TEXT DEFAULT NULL,
    `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_ticket_history_ticket_id` (`ticket_id`),
    CONSTRAINT `fk_ticket_history_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for all ticket changes';

-- ============================================
-- 19. OVERTIMES - Overtime tracking
-- ============================================
CREATE TABLE IF NOT EXISTS `overtimes` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `duration` INT NOT NULL DEFAULT 120 COMMENT 'Duration in minutes (default 2 hours)',
    `shift_type` VARCHAR(50) NOT NULL,
    `start_time` VARCHAR(20) NOT NULL,
    `end_time` VARCHAR(20) NOT NULL,
    `reason` VARCHAR(500) DEFAULT 'Supervision NOC',
    `approved_by` VARCHAR(191) DEFAULT 'Daddy AZUMY',
    `month` INT NOT NULL,
    `year` INT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_overtimes_user_date` (`user_id`, `date`),
    INDEX `idx_overtimes_user_month_year` (`user_id`, `month`, `year`),
    INDEX `idx_overtimes_date` (`date`),
    CONSTRAINT `fk_overtimes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Overtime tracking with 2 hours per worked day';

-- ============================================
-- 20. HANDOVERS - Shift handover reports
-- ============================================
CREATE TABLE IF NOT EXISTS `handovers` (
    `id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `shift_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `content` TEXT DEFAULT NULL,
    `incidents` TEXT DEFAULT NULL,
    `escalations` TEXT DEFAULT NULL,
    `pending_tasks` TEXT DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_handovers_author_date` (`author_id`, `date`),
    INDEX `idx_handovers_shift_date` (`shift_id`, `date`),
    CONSTRAINT `fk_handovers_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_handovers_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shift handover reports with incidents, escalations, and pending tasks';

-- ============================================
-- 21. DOCUMENTS - Document management (GED)
-- ============================================
CREATE TABLE IF NOT EXISTS `documents` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INT NOT NULL,
    `category` VARCHAR(100) DEFAULT NULL,
    `tags` TEXT DEFAULT NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `folder_id` VARCHAR(191) DEFAULT NULL,
    `is_public` BOOLEAN DEFAULT FALSE,
    `is_archived` BOOLEAN DEFAULT FALSE,
    `version` INT DEFAULT 1,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_documents_owner` (`owner_id`),
    INDEX `idx_documents_category` (`category`),
    INDEX `idx_documents_folder` (`folder_id`),
    CONSTRAINT `fk_documents_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Electronic Document Management (GED) system';

-- ============================================
-- 22. DOCUMENT_VERSIONS - Document versioning
-- ============================================
CREATE TABLE IF NOT EXISTS `document_versions` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `version` INT NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INT NOT NULL,
    `uploaded_by` VARCHAR(191) NOT NULL,
    `changes` TEXT DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_document_versions_doc_version` (`document_id`, `version`),
    INDEX `idx_document_versions_document_id` (`document_id`),
    CONSTRAINT `fk_document_versions_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_document_versions_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Version history for documents with change tracking';

-- ============================================
-- 23. DOCUMENT_SHARES - Document sharing permissions
-- ============================================
CREATE TABLE IF NOT EXISTS `document_shares` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(50) DEFAULT 'read',
    `shared_by` VARCHAR(191) DEFAULT NULL,
    `expires_at` DATETIME(3) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_document_shares_doc_user` (`document_id`, `user_id`),
    INDEX `idx_document_shares_document_id` (`document_id`),
    INDEX `idx_document_shares_user_id` (`user_id`),
    CONSTRAINT `fk_document_shares_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_document_shares_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document sharing with read/write permissions and expiration';

-- ============================================
-- 24. AUDIT_LOGS - System audit logs
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `action` VARCHAR(200) NOT NULL,
    `details` TEXT DEFAULT NULL,
    `ip_address` VARCHAR(50) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'SUCCESS',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_audit_logs_user_id` (`user_id`),
    INDEX `idx_audit_logs_action` (`action`),
    INDEX `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System-wide audit log for security and compliance';

-- ============================================
-- 25. NOTIFICATIONS - User notifications
-- ============================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `link` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_notifications_user_read` (`user_id`, `is_read`),
    INDEX `idx_notifications_created_at` (`created_at`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notifications for tasks, tickets, and system events';

-- ============================================
-- 26. SYSTEM_SETTINGS - System configuration
-- ============================================
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT DEFAULT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_system_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System configuration key-value store';

-- ============================================
-- 27. EXTERNAL_LINKS - External tool links
-- ============================================
CREATE TABLE IF NOT EXISTS `external_links` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `url` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) DEFAULT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='External tool links (monitoring, communication, tickets, etc.)';

-- ============================================
-- 28. GRAPH_SCHEDULES - Graph sending schedule
-- ============================================
CREATE TABLE IF NOT EXISTS `graph_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `time` VARCHAR(20) NOT NULL,
    `sent` BOOLEAN DEFAULT FALSE,
    `recipients` TEXT DEFAULT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_graph_schedules_date` (`date`),
    CONSTRAINT `fk_graph_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Scheduled graph reports for Reporting 1 responsibility';

-- ============================================================================
-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================
-- ============================================================================

-- ============================================
-- SEED: Shifts (3 shifts)
-- ============================================
INSERT INTO `shifts` (`id`, `name`, `color`, `color_code`, `description`) VALUES
    ('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Blue Team (Jour: 07h-19h / Nuit: 19h-07h)'),
    ('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Yellow Team (Jour: 07h-19h / Nuit: 19h-07h)'),
    ('shift-c', 'C', 'green', '#22C55E', 'Shift C - Green Team (Jour: 07h-19h / Nuit: 19h-07h)')
ON DUPLICATE KEY UPDATE `color` = VALUES(`color`), `color_code` = VALUES(`color_code`);

-- ============================================
-- SEED: Super Admin (1 user)
-- Password: SiliconeConnect@2026
-- ============================================
INSERT INTO `users` (
    `id`, `email`, `name`, `first_name`, `last_name`, `username`,
    `password_hash`, `role`, `is_active`, `is_blocked`,
    `is_first_login`, `must_change_password`
) VALUES (
    'super-admin-1',
    'secureadmin@siliconeconnect.com',
    'Admin SC',
    'Admin',
    'SC',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq',
    'SUPER_ADMIN',
    TRUE, FALSE, FALSE, FALSE
) ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);

-- ============================================
-- SEED: Responsable (1 user)
-- Password: SiliconeConnect@2026
-- ============================================
INSERT INTO `users` (
    `id`, `email`, `name`, `first_name`, `last_name`, `username`,
    `password_hash`, `role`, `is_active`, `is_blocked`,
    `is_first_login`, `must_change_password`
) VALUES (
    'resp-1',
    'theresia@siliconeconnect.com',
    'Theresia',
    'Theresia',
    '',
    'theresia',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq',
    'RESPONSABLE',
    TRUE, FALSE, FALSE, FALSE
) ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);

-- ============================================
-- SEED: Shift A Members (4 agents)
-- Password: SiliconeConnect@2026
-- ============================================
INSERT INTO `users` (
    `id`, `email`, `name`, `first_name`, `last_name`, `username`,
    `password_hash`, `role`, `shift_id`, `responsibility`,
    `is_active`, `is_first_login`, `must_change_password`
) VALUES
    ('agent-a1', 'alaine@siliconeconnect.com',    'Alaine',    'Alaine',    '',        'alaine',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'CALL_CENTER',   TRUE, TRUE, TRUE),
    ('agent-a2', 'casimir@siliconeconnect.com',   'Casimir',   'Casimir',   '',        'casimir',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'MONITORING',    TRUE, TRUE, TRUE),
    ('agent-a3', 'luca@siliconeconnect.com',      'Luca',      'Luca',      '',        'luca',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_1',   TRUE, TRUE, TRUE),
    ('agent-a4', 'jose@siliconeconnect.com',      'José',      'José',      '',        'jose',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_2',   TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE `shift_id` = VALUES(`shift_id`), `responsibility` = VALUES(`responsibility`);

-- ============================================
-- SEED: Shift B Members (4 agents)
-- Password: SiliconeConnect@2026
-- ============================================
INSERT INTO `users` (
    `id`, `email`, `name`, `first_name`, `last_name`, `username`,
    `password_hash`, `role`, `shift_id`, `responsibility`,
    `is_active`, `is_first_login`, `must_change_password`
) VALUES
    ('agent-b1', 'sahra@siliconeconnect.com',    'Sahra',     'Sahra',     '',        'sahra',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'CALL_CENTER',   TRUE, TRUE, TRUE),
    ('agent-b2', 'severin@siliconeconnect.com',   'Severin',   'Severin',   '',        'severin',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'MONITORING',    TRUE, TRUE, TRUE),
    ('agent-b3', 'marly@siliconeconnect.com',     'Marly',     'Marly',     '',        'marly',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_1',   TRUE, TRUE, TRUE),
    ('agent-b4', 'furys@siliconeconnect.com',     'Furys',     'Furys',     '',        'furys',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_2',   TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE `shift_id` = VALUES(`shift_id`), `responsibility` = VALUES(`responsibility`);

-- ============================================
-- SEED: Shift C Members (4 agents)
-- Password: SiliconeConnect@2026
-- ============================================
INSERT INTO `users` (
    `id`, `email`, `name`, `first_name`, `last_name`, `username`,
    `password_hash`, `role`, `shift_id`, `responsibility`,
    `is_active`, `is_first_login`, `must_change_password`
) VALUES
    ('agent-c1', 'audrey@siliconeconnect.com',    'Audrey',    'Audrey',    '',        'audrey',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'CALL_CENTER',   TRUE, TRUE, TRUE),
    ('agent-c2', 'lapreuve@siliconeconnect.com',  'Lapreuve',  'Lapreuve',  '',        'lapreuve',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'MONITORING',    TRUE, TRUE, TRUE),
    ('agent-c3', 'lotti@siliconeconnect.com',     'Lotti',     'Lotti',     '',        'lotti',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_1',   TRUE, TRUE, TRUE),
    ('agent-c4', 'kevine@siliconeconnect.com',    'Kevine',    'Kevine',    '',        'kevine',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_2',   TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE `shift_id` = VALUES(`shift_id`), `responsibility` = VALUES(`responsibility`);

-- ============================================
-- SEED: External Links (7 links)
-- ============================================
INSERT INTO `external_links` (`id`, `name`, `url`, `category`, `icon`, `description`, `order`, `is_active`) VALUES
    ('link-1', 'Suivi véhicules (MixTelematics)', 'https://za.mixtelematics.com/#/login',                                   'tracking',      'Truck',             'MixTelematics - Suivi GPS des véhicules de flotte',  1, TRUE),
    ('link-2', 'LibreNMS',                       'http://192.168.2.25:6672/device/device=71/tab=port/port=1597/',       'monitoring',     'Network',           'LibreNMS - Monitoring réseau et équipements',         2, TRUE),
    ('link-3', 'Zabbix',                         'http://192.168.2.2:6672/zabbix.php?action=dashboard.view',            'monitoring',     'Activity',          'Zabbix - Supervision et alertes incidents',           3, TRUE),
    ('link-4', 'Zoho Desk',                      'https://desk.zoho.com/agent/siliconeconnect/silicone-connect/tickets','tickets',       'Ticket',            'Zoho Desk - Gestion des tickets clients',              4, TRUE),
    ('link-5', 'Tickets Sheets',                 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', 'tickets', 'FileSpreadsheet', 'Google Sheets - Liste de suivi des tickets', 5, TRUE),
    ('link-6', 'WhatsApp',                       'https://web.whatsapp.com/',                                             'communication', 'Phone',             'WhatsApp Web - Messagerie instantanée',               6, TRUE),
    ('link-7', 'Gmail',                          'https://mail.google.com/mail/u/0/#inbox',                               'communication', 'Mail',              'Gmail - Messagerie email professionnelle',            7, TRUE)
ON DUPLICATE KEY UPDATE `order` = VALUES(`order`);

-- ============================================
-- SEED: System Settings (9 settings)
-- ============================================
INSERT INTO `system_settings` (`id`, `key`, `value`, `description`) VALUES
    ('setting-1', 'cycleStartDate',                '2026-02-01',   'Start date for shift cycle calculation'),
    ('setting-2', 'overtimeRate',                   '120',         'Overtime duration in minutes per worked day (default: 2 hours)'),
    ('setting-3', 'approverName',                   'Daddy AZUMY', 'Default approver name for overtime requests'),
    ('setting-4', 'shiftA_Start',                   '2026-02-24',  'Shift A cycle start date (Jour 07h)'),
    ('setting-5', 'shiftB_Start',                   '2026-02-21',  'Shift B cycle start date (Jour 07h)'),
    ('setting-6', 'shiftC_Start',                   '2026-02-18',  'Shift C cycle start date (Jour 07h)'),
    ('setting-7', 'inactivityThreshold',            '120',         'Inactivity alert threshold in minutes (default: 2 hours)'),
    ('setting-8', 'taskApproachingThreshold',       '30',          'Task approaching deadline alert in minutes before estimated end'),
    ('setting-9', 'suspendedTooLongThreshold',      '60',          'Suspended task too long alert threshold in minutes')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ============================================
-- SEED: Ticket Counter
-- ============================================
INSERT INTO `ticket_counters` (`id`, `prefix`, `current_number`, `year`) VALUES
    ('counter-1', 'TKT', 0, 2026)
ON DUPLICATE KEY UPDATE `current_number` = VALUES(`current_number`);

-- ============================================
-- END OF DATABASE SCHEMA
-- ============================================
-- Total tables: 28
-- Total seed records:
--   - 3 shifts
--   - 14 users (1 SUPER_ADMIN + 1 RESPONSABLE + 12 TECHNICIEN_NO)
--   - 7 external links
--   - 9 system settings
--   - 1 ticket counter
-- ============================================
