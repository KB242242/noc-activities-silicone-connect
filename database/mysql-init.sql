-- ===========================================
-- NOC_ACTIVITY - Script SQL MySQL/WampServer
-- ===========================================
-- Exécutez ce script dans phpMyAdmin ou MySQL Workbench
-- pour créer la base de données et les tables

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS noc_activity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_activity;

-- ===========================================
-- Tables de base
-- ===========================================

-- Table des shifts
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL UNIQUE,
    color VARCHAR(191) NOT NULL,
    color_code VARCHAR(191) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    role ENUM('ADMIN', 'SUPERVISOR', 'AGENT') NOT NULL DEFAULT 'AGENT',
    shift_id VARCHAR(191),
    avatar VARCHAR(191),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_active_at DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL,
    
    INDEX idx_email (email),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des cycles de shift
CREATE TABLE IF NOT EXISTS shift_cycles (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    shift_id VARCHAR(191) NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3) NOT NULL,
    cycle_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_shift_start (shift_id, start_date),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des jours de travail
CREATE TABLE IF NOT EXISTS work_days (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    day_type ENUM('DAY_SHIFT', 'NIGHT_SHIFT', 'REST_DAY') NOT NULL,
    start_hour INT NOT NULL,
    end_hour INT NOT NULL,
    day_number INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_cycle_date (cycle_id, date),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des assignations de jour
CREATE TABLE IF NOT EXISTS day_assignments (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    work_day_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    is_resting BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_day_user (work_day_id, user_id),
    FOREIGN KEY (work_day_id) REFERENCES work_days(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des repos individuels
CREATE TABLE IF NOT EXISTS individual_rests (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    rest_day INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_cycle_user (cycle_id, user_id),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des activités
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    type ENUM('CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'EQUIPMENT_ALERT', 'OTHER_MONITORING', 'TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP', 'CLIENT_INFO', 'GRAPH_SENT', 'ALERT_PUBLISHED', 'HANDOVER_WRITTEN', 'INCIDENT_HISTORY', 'REPORT_GENERATED', 'TICKET_UPDATED', 'TICKET_CLOSED', 'RFO_CREATED', 'ARCHIVE_DONE') NOT NULL,
    category VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tâches
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD') NOT NULL DEFAULT 'PENDING',
    category VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    scheduled_time VARCHAR(191),
    completed_at DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME(3) NOT NULL,
    
    INDEX idx_user_status (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des horaires de graphes
CREATE TABLE IF NOT EXISTS graph_schedules (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    time VARCHAR(191) NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    recipients TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des handovers
CREATE TABLE IF NOT EXISTS handovers (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    shift_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    content TEXT,
    incidents TEXT,
    escalations TEXT,
    pending_tasks TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des heures supplémentaires
CREATE TABLE IF NOT EXISTS overtimes (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    duration INT NOT NULL DEFAULT 120,
    shift_type VARCHAR(191) NOT NULL,
    reason VARCHAR(191) NOT NULL DEFAULT 'Supervision NOC',
    approved_by VARCHAR(191) NOT NULL DEFAULT 'Daddy AZUMY',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_month_year (user_id, month, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des responsabilités
CREATE TABLE IF NOT EXISTS responsibilities (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des liens externes
CREATE TABLE IF NOT EXISTS external_links (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(191) NOT NULL,
    icon VARCHAR(191),
    description TEXT,
    `order` INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    key VARCHAR(191) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Données initiales
-- ===========================================

-- Insérer les shifts
INSERT INTO shifts (id, name, color, color_code, description) VALUES
('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Blue Team'),
('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Yellow Team'),
('shift-c', 'C', 'green', '#22C55E', 'Shift C - Green Team');

-- Insérer les utilisateurs (agents)
INSERT INTO users (id, email, name, first_name, role, shift_id, is_active, created_at, updated_at) VALUES
-- Shift A
('agent-a1', 'alaine@siliconeconnect.com', 'Alaine', 'Alaine', 'AGENT', 'shift-a', TRUE, NOW(), NOW()),
('agent-a2', 'casimir@siliconeconnect.com', 'Casimir', 'Casimir', 'AGENT', 'shift-a', TRUE, NOW(), NOW()),
('agent-a3', 'luca@siliconeconnect.com', 'Luca', 'Luca', 'AGENT', 'shift-a', TRUE, NOW(), NOW()),
('agent-a4', 'jose@siliconeconnect.com', 'José', 'José', 'AGENT', 'shift-a', TRUE, NOW(), NOW()),
-- Shift B
('agent-b1', 'sahra@siliconeconnect.com', 'Sahra', 'Sahra', 'AGENT', 'shift-b', TRUE, NOW(), NOW()),
('agent-b2', 'severin@siliconeconnect.com', 'Severin', 'Severin', 'AGENT', 'shift-b', TRUE, NOW(), NOW()),
('agent-b3', 'marly@siliconeconnect.com', 'Marly', 'Marly', 'AGENT', 'shift-b', TRUE, NOW(), NOW()),
('agent-b4', 'furys@siliconeconnect.com', 'Furys', 'Furys', 'AGENT', 'shift-b', TRUE, NOW(), NOW()),
-- Shift C
('agent-c1', 'audrey@siliconeconnect.com', 'Audrey', 'Audrey', 'AGENT', 'shift-c', TRUE, NOW(), NOW()),
('agent-c2', 'lapreuve@siliconeconnect.com', 'Lapreuve', 'Lapreuve', 'AGENT', 'shift-c', TRUE, NOW(), NOW()),
('agent-c3', 'lotti@siliconeconnect.com', 'Lotti', 'Lotti', 'AGENT', 'shift-c', TRUE, NOW(), NOW()),
('agent-c4', 'kevine@siliconeconnect.com', 'Kevine', 'Kevine', 'AGENT', 'shift-c', TRUE, NOW(), NOW());

-- Insérer les administrateurs
INSERT INTO users (id, email, name, first_name, role, is_active, created_at, updated_at) VALUES
('admin-1', 'admin@siliconeconnect.com', 'Admin', 'Admin', 'ADMIN', TRUE, NOW(), NOW()),
('sup-1', 'supervisor@siliconeconnect.com', 'Supervisor', 'Super', 'SUPERVISOR', TRUE, NOW(), NOW());

-- Insérer les liens externes
INSERT INTO external_links (id, name, url, category, icon, description, `order`, is_active, created_at) VALUES
('link-1', 'Suivi de véhicules', 'https://za.mixtelematics.com/#/login', 'Vehicles', 'car', 'MixTelematics - Suivi de flotte', 1, TRUE, NOW()),
('link-2', 'LibreNMS', 'http://192.168.2.25:6672/device/device=71/tab=port/port=1597/', 'Monitoring', 'network', 'Monitoring réseau', 2, TRUE, NOW()),
('link-3', 'Zabbix', 'http://192.168.2.2:6672/zabbix.php?action=dashboard.view&dashboardid=1&from=now%2Fd&to=now%2Fd', 'Monitoring', 'activity', 'Supervision et incidents', 3, TRUE, NOW()),
('link-4', 'Zoho Desk', 'https://desk.zoho.com/agent/siliconeconnect/silicone-connect/tickets', 'Tickets', 'ticket', 'Gestion des tickets', 4, TRUE, NOW()),
('link-5', 'Liste des tickets', 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit?gid=0#gid=0', 'Tickets', 'file-spreadsheet', 'Google Sheets - Suivi tickets', 5, TRUE, NOW()),
('link-6', 'WhatsApp Web', 'https://web.whatsapp.com/', 'Communication', 'message-circle', 'Messagerie WhatsApp', 6, TRUE, NOW()),
('link-7', 'Gmail', 'https://mail.google.com/mail/u/0/#inbox', 'Communication', 'mail', 'Boîte mail', 7, TRUE, NOW());

-- Insérer les paramètres système
INSERT INTO system_settings (id, `key`, value, description, updated_at) VALUES
('setting-1', 'shift_a_start', '2026-02-24', 'Date de début du cycle Shift A', NOW()),
('setting-2', 'shift_b_start', '2026-02-21', 'Date de début du cycle Shift B', NOW()),
('setting-3', 'shift_c_start', '2026-02-18', 'Date de début du cycle Shift C', NOW()),
('setting-4', 'overtime_rate', '120', 'Durée des heures sup en minutes par jour', NOW()),
('setting-5', 'overtime_approver', 'Daddy AZUMY', 'Approbateur par défaut des heures sup', NOW()),
('setting-6', 'company_name', 'Silicone Connect', 'Nom de l''entreprise', NOW());

-- ===========================================
-- Fin du script
-- ===========================================
