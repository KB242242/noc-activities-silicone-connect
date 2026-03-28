-- ===========================================
-- NOC_ACTIVITIES - Script SQL MySQL/WampServer
-- ===========================================
-- Application: NOC Activities - Silicone Connect
-- Version: 1.0
-- Date: 2026
-- 
-- INSTRUCTIONS:
-- 1. Ouvrez phpMyAdmin (http://localhost/phpmyadmin)
-- 2. Cliquez sur "Nouvelle base de données"
-- 3. Nom: noc_activities
-- 4. Interclassement: utf8mb4_general_ci
-- 5. Cliquez sur "Créer"
-- 6. Sélectionnez la base "noc_activities"
-- 7. Cliquez sur "Importer" et sélectionnez ce fichier
-- ===========================================

-- Créer la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS noc_activities CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_activities;

-- ===========================================
-- TABLES DE BASE
-- ===========================================

-- Table des shifts (Équipes A, B, C)
DROP TABLE IF EXISTS shifts;
CREATE TABLE shifts (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL UNIQUE,
    color VARCHAR(191) NOT NULL,
    color_code VARCHAR(191) NOT NULL,
    description TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des utilisateurs
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    username VARCHAR(191),
    password_hash VARCHAR(500),
    role ENUM('SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'USER') NOT NULL DEFAULT 'USER',
    shift_id VARCHAR(191),
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    avatar VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    is_first_login BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME(3),
    last_activity DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_shift_id (shift_id),
    INDEX idx_role (role),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des cycles de shift
DROP TABLE IF EXISTS shift_cycles;
CREATE TABLE shift_cycles (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    shift_id VARCHAR(191) NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3) NOT NULL,
    cycle_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_shift_start (shift_id, start_date),
    INDEX idx_shift_cycle (shift_id, cycle_number),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des jours de travail
DROP TABLE IF EXISTS work_days;
CREATE TABLE work_days (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    day_type ENUM('DAY_SHIFT', 'NIGHT_SHIFT', 'REST_DAY') NOT NULL,
    start_hour INT NOT NULL,
    end_hour INT NOT NULL,
    day_number INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_cycle_date (cycle_id, date),
    INDEX idx_cycle_id (cycle_id),
    INDEX idx_date (date),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des assignations de jour
DROP TABLE IF EXISTS day_assignments;
CREATE TABLE day_assignments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    work_day_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    is_resting BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_day_user (work_day_id, user_id),
    INDEX idx_work_day_id (work_day_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (work_day_id) REFERENCES work_days(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des repos individuels
DROP TABLE IF EXISTS individual_rests;
CREATE TABLE individual_rests (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    rest_day INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_cycle_user (cycle_id, user_id),
    INDEX idx_cycle_id (cycle_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES TÂCHES
-- ===========================================

-- Table des tâches NOC
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'on_hold', 'cancelled', 'late') NOT NULL DEFAULT 'pending',
    category VARCHAR(191) NOT NULL DEFAULT 'other',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    shift_name VARCHAR(10),
    start_time DATETIME(3),
    estimated_end_time DATETIME(3),
    estimated_duration INT DEFAULT 60,
    completed_at DATETIME(3),
    actual_duration INT,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    is_notified BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_user_status (user_id, status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des commentaires de tâches
DROP TABLE IF EXISTS task_comments;
CREATE TABLE task_comments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    content TEXT NOT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des alertes de tâches
DROP TABLE IF EXISTS task_alerts;
CREATE TABLE task_alerts (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    type ENUM('warning', 'critical', 'info', 'success') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_by ENUM('time_limit', 'overdue', 'critical_not_started', 'suspended_too_long', 'no_task_created', 'too_many_pending') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de l'historique des tâches
DROP TABLE IF EXISTS task_history;
CREATE TABLE task_history (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    action ENUM('created', 'updated', 'status_changed', 'comment_added', 'deleted') NOT NULL,
    field VARCHAR(191),
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES ACTIVITÉS
-- ===========================================

-- Table des activités
DROP TABLE IF EXISTS activities;
CREATE TABLE activities (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    type ENUM('CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'EQUIPMENT_ALERT', 'OTHER_MONITORING', 'TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP', 'CLIENT_INFO', 'GRAPH_SENT', 'ALERT_PUBLISHED', 'HANDOVER_WRITTEN', 'INCIDENT_HISTORY', 'REPORT_GENERATED', 'TICKET_UPDATED', 'TICKET_CLOSED', 'RFO_CREATED', 'ARCHIVE_DONE') NOT NULL,
    category VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_category (category),
    INDEX idx_type (type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES HEURES SUPPLÉMENTAIRES
-- ===========================================

-- Table des heures supplémentaires
DROP TABLE IF EXISTS overtimes;
CREATE TABLE overtimes (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    duration INT NOT NULL DEFAULT 120,
    shift_type VARCHAR(191) NOT NULL,
    start_time VARCHAR(191) NOT NULL DEFAULT '07:00',
    end_time VARCHAR(191) NOT NULL DEFAULT '08:00',
    reason VARCHAR(500) NOT NULL DEFAULT 'Supervision NOC',
    approved_by VARCHAR(191) NOT NULL DEFAULT 'Daddy AZUMY',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_month_year (user_id, month, year),
    INDEX idx_date (date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES RESPONSABILITÉS ET HANDOVERS
-- ===========================================

-- Table des responsabilités
DROP TABLE IF EXISTS responsibilities;
CREATE TABLE responsibilities (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_start (user_id, start_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des handovers (rapports de passation)
DROP TABLE IF EXISTS handovers;
CREATE TABLE handovers (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    author_id VARCHAR(191) NOT NULL,
    shift_id VARCHAR(191),
    date DATETIME(3) NOT NULL,
    content TEXT,
    incidents TEXT,
    escalations TEXT,
    pending_tasks TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_author_date (author_id, date),
    INDEX idx_shift_date (shift_id, date),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES TICKETS
-- ===========================================

-- Table des tickets
DROP TABLE IF EXISTS tickets;
CREATE TABLE tickets (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    objet VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('open', 'in_progress', 'pending', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    category ENUM('incident', 'request', 'problem', 'change', 'other') NOT NULL DEFAULT 'incident',
    site VARCHAR(191),
    localite VARCHAR(191),
    technicien VARCHAR(191),
    reporter_id VARCHAR(191) NOT NULL,
    assignee_id VARCHAR(191),
    due_date DATETIME(3),
    resolved_at DATETIME(3),
    closed_at DATETIME(3),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(3),
    deleted_by VARCHAR(191),
    tags TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_site (site),
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des commentaires de tickets
DROP TABLE IF EXISTS ticket_comments;
CREATE TABLE ticket_comments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_id (ticket_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des pièces jointes de tickets
DROP TABLE IF EXISTS ticket_attachments;
CREATE TABLE ticket_attachments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(191) NOT NULL,
    file_data LONGBLOB,
    uploaded_by VARCHAR(191) NOT NULL,
    uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_id (ticket_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de l'historique des tickets
DROP TABLE IF EXISTS ticket_history;
CREATE TABLE ticket_history (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    action VARCHAR(191) NOT NULL,
    field VARCHAR(191),
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_id (ticket_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DE MESSAGERIE
-- ===========================================

-- Table des messages internes (style Gmail)
DROP TABLE IF EXISTS internal_messages;
CREATE TABLE internal_messages (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    sender_id VARCHAR(191) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    folder ENUM('inbox', 'sent', 'drafts', 'trash', 'spam') NOT NULL DEFAULT 'inbox',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    priority ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
    parent_id VARCHAR(191),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sender_id (sender_id),
    INDEX idx_folder (folder),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES internal_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des destinataires de messages
DROP TABLE IF EXISTS message_recipients;
CREATE TABLE message_recipients (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    type ENUM('to', 'cc', 'bcc') NOT NULL DEFAULT 'to',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(3),
    
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des pièces jointes de messages
DROP TABLE IF EXISTS message_attachments;
CREATE TABLE message_attachments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(191) NOT NULL,
    file_data LONGBLOB,
    uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_message_id (message_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des conversations (chat style WhatsApp)
DROP TABLE IF EXISTS conversations;
CREATE TABLE conversations (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    type ENUM('individual', 'group') NOT NULL DEFAULT 'individual',
    name VARCHAR(191),
    description TEXT,
    avatar VARCHAR(500),
    created_by VARCHAR(191) NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until DATETIME(3),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des participants aux conversations
DROP TABLE IF EXISTS conversation_participants;
CREATE TABLE conversation_participants (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    conversation_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    last_read_at DATETIME(3),
    joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_conv_user (conversation_id, user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des messages de chat
DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    conversation_id VARCHAR(191) NOT NULL,
    sender_id VARCHAR(191) NOT NULL,
    content TEXT,
    message_type ENUM('text', 'image', 'video', 'audio', 'document', 'voice') NOT NULL DEFAULT 'text',
    file_url VARCHAR(500),
    file_name VARCHAR(500),
    file_size INT,
    reply_to_id VARCHAR(191),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DES DOCUMENTS (GED)
-- ===========================================

-- Table des documents GED
DROP TABLE IF EXISTS ged_documents;
CREATE TABLE ged_documents (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(191),
    file_name VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(191) NOT NULL,
    file_data LONGBLOB,
    uploaded_by VARCHAR(191) NOT NULL,
    status ENUM('en_attente', 'valide', 'rejete', 'archive') NOT NULL DEFAULT 'en_attente',
    version INT NOT NULL DEFAULT 1,
    tags TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_status (status),
    INDEX idx_category (category),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES DE SÉCURITÉ ET AUDIT
-- ===========================================

-- Table des logs d'audit
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191),
    user_name VARCHAR(191),
    action VARCHAR(191) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status ENUM('SUCCESS', 'FAILURE') NOT NULL DEFAULT 'SUCCESS',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des sessions
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at DATETIME(3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- TABLES PARAMÈTRES SYSTÈME
-- ===========================================

-- Table des liens externes
DROP TABLE IF EXISTS external_links;
CREATE TABLE external_links (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(191) NOT NULL,
    icon VARCHAR(191),
    description TEXT,
    `order` INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_order (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des paramètres système
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    `key` VARCHAR(191) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    type VARCHAR(191) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(500),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des horaires de graphes
DROP TABLE IF EXISTS graph_schedules;
CREATE TABLE graph_schedules (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    time VARCHAR(191) NOT NULL,
    shift_type ENUM('day', 'night') NOT NULL DEFAULT 'day',
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME(3),
    sent_by VARCHAR(191),
    date DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date_shift (date, shift_type),
    INDEX idx_time (time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- DONNÉES INITIALES
-- ===========================================

-- Insérer les shifts
INSERT INTO shifts (id, name, color, color_code, description) VALUES
('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Équipe Bleue'),
('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Équipe Jaune'),
('shift-c', 'C', 'green', '#22C55E', 'Shift C - Équipe Verte');

-- Insérer les utilisateurs
-- SUPER ADMIN
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('super-admin-1', 'secureadmin@siliconeconnect.com', 'Admin SC', 'Admin', 'SC', 'Admin', '@adminsc2026', 'SUPER_ADMIN', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- RESPONSABLE
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('sup-1', 'theresia@siliconeconnect.com', 'Theresia', 'Theresia', '', 'Theresia', '#Esia2026RepSC', 'RESPONSABLE', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- Techniciens NOC - Shift A
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('agent-a1', 'alaine@siliconeconnect.com', 'Alaine', 'Alaine', '', 'Alaine', 'Alaine_SC2026!', 'TECHNICIEN_NO', 'shift-a', 'CALL_CENTER', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-a2', 'casimir@siliconeconnect.com', 'Casimir', 'Casimir', '', 'Casimir', 'Casimir@2026SC', 'TECHNICIEN_NO', 'shift-a', 'MONITORING', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-a3', 'luca@siliconeconnect.com', 'Luca', 'Luca', '', 'Luca', 'Luca#2026!SC', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_1', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-a4', 'jose@siliconeconnect.com', 'José', 'José', '', 'Jose', 'Jose_SC@2026', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_2', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- Techniciens NOC - Shift B
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('agent-b1', 'sahra@siliconeconnect.com', 'Sahra', 'Sahra', '', 'Sahra', 'Sahra2026*SC', 'TECHNICIEN_NO', 'shift-b', 'CALL_CENTER', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-b2', 'severin@siliconeconnect.com', 'Severin', 'Severin', '', 'Severin', 'Sev2026_SC@rin', 'TECHNICIEN_NO', 'shift-b', 'MONITORING', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-b3', 'marly@siliconeconnect.com', 'Marly', 'Marly', '', 'Marly', 'Marly_SC2026!', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_1', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-b4', 'furys@siliconeconnect.com', 'Furys', 'Furys', '', 'Furys', 'Furys#2026SC', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_2', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- Techniciens NOC - Shift C
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('agent-c1', 'audrey@siliconeconnect.com', 'Audrey', 'Audrey', '', 'Audrey', 'Audrey@2026SC', 'TECHNICIEN_NO', 'shift-c', 'CALL_CENTER', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-c2', 'lapreuve@siliconeconnect.com', 'Lapreuve', 'Lapreuve', '', 'Lapreuve', 'Lapreuve#SC26', 'TECHNICIEN_NO', 'shift-c', 'MONITORING', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-c3', 'lotti@siliconeconnect.com', 'Lotti', 'Lotti', '', 'Lotti', 'Lotti@2026!SC', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_1', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW()),
('agent-c4', 'kevine@siliconeconnect.com', 'Kevine', 'Kevine', '', 'Kevine', '@Admin2026SC', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_2', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- Autre utilisateur
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, is_active, is_blocked, is_first_login, must_change_password, failed_login_attempts, created_at, updated_at) VALUES
('agent-lyse', 'lyse@siliconeconnect.com', 'Lyse', 'Lyse', '', 'Lyse', 'Lyse_SC!2026', 'TECHNICIEN_NO', TRUE, FALSE, TRUE, TRUE, 0, NOW(), NOW());

-- Insérer les liens externes
INSERT INTO external_links (id, name, url, category, icon, description, `order`, is_active, created_at) VALUES
('link-1', 'Suivi véhicules', 'https://za.mixtelematics.com/#/login', 'vehicles', 'truck', 'MixTelematics - Suivi de flotte', 1, TRUE, NOW()),
('link-2', 'LibreNMS', 'http://192.168.2.25:6672/', 'monitoring', 'network', 'Monitoring réseau', 2, TRUE, NOW()),
('link-3', 'Zabbix', 'http://192.168.2.2:6672/', 'monitoring', 'activity', 'Supervision et incidents', 3, TRUE, NOW()),
('link-4', 'Zoho Desk', 'https://desk.zoho.com/', 'tickets', 'ticket', 'Gestion des tickets', 4, TRUE, NOW()),
('link-5', 'Tickets Sheets', 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', 'tickets', 'file-spreadsheet', 'Google Sheets - Suivi tickets', 5, TRUE, NOW()),
('link-6', 'WhatsApp Web', 'https://web.whatsapp.com/', 'communication', 'message-circle', 'Messagerie WhatsApp', 6, TRUE, NOW()),
('link-7', 'Gmail', 'https://mail.google.com/', 'communication', 'mail', 'Boîte mail Gmail', 7, TRUE, NOW());

-- Insérer les paramètres système
INSERT INTO system_settings (id, `key`, value, description, created_at, updated_at) VALUES
('setting-1', 'shift_a_start', '2026-02-24', 'Date de début du cycle Shift A', NOW(), NOW()),
('setting-2', 'shift_b_start', '2026-02-21', 'Date de début du cycle Shift B', NOW(), NOW()),
('setting-3', 'shift_c_start', '2026-02-18', 'Date de début du cycle Shift C', NOW(), NOW()),
('setting-4', 'overtime_rate', '120', 'Durée des heures sup en minutes par jour', NOW(), NOW()),
('setting-5', 'overtime_approver', 'Daddy AZUMY', 'Approbateur par défaut des heures sup', NOW(), NOW()),
('setting-6', 'company_name', 'Silicone Connect', 'Nom de l''entreprise', NOW(), NOW()),
('setting-7', 'session_timeout', '600000', 'Timeout de session en millisecondes (10 min)', NOW(), NOW()),
('setting-8', 'max_login_attempts', '5', 'Nombre max de tentatives de connexion', NOW(), NOW()),
('setting-9', 'lockout_duration', '900', 'Durée de verrouillage en secondes (15 min)', NOW(), NOW());

-- ===========================================
-- FIN DU SCRIPT
-- ===========================================
