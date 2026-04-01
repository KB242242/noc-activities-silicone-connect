-- NOC_ACTIVITY Database Schema for MySQL (WampServer)
-- Run this script in phpMyAdmin or MySQL command line

-- Create database
CREATE DATABASE IF NOT EXISTS noc_activity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_activity;

-- Users table
CREATE TABLE IF NOT EXISTS User (
    id VARCHAR(191) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    name VARCHAR(191) NOT NULL,
    firstName VARCHAR(191),
    lastName VARCHAR(191),
    role ENUM('ADMIN', 'SUPERVISOR', 'AGENT') DEFAULT 'AGENT',
    shiftId VARCHAR(191),
    avatar VARCHAR(191),
    isActive BOOLEAN DEFAULT TRUE,
    lastActiveAt DATETIME(3),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_email (email),
    INDEX idx_shiftId (shiftId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) UNIQUE NOT NULL,
    color VARCHAR(191) NOT NULL,
    colorCode VARCHAR(191) NOT NULL,
    description VARCHAR(191),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ShiftCycle table
CREATE TABLE IF NOT EXISTS ShiftCycle (
    id VARCHAR(191) PRIMARY KEY,
    shiftId VARCHAR(191) NOT NULL,
    startDate DATETIME(3) NOT NULL,
    endDate DATETIME(3) NOT NULL,
    cycleNumber INT NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_shift_start (shiftId, startDate),
    INDEX idx_shift_cycle (shiftId, cycleNumber),
    FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WorkDay table
CREATE TABLE IF NOT EXISTS WorkDay (
    id VARCHAR(191) PRIMARY KEY,
    cycleId VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    dayType ENUM('DAY_SHIFT', 'NIGHT_SHIFT', 'REST_DAY') NOT NULL,
    startHour INT NOT NULL,
    endHour INT NOT NULL,
    dayNumber INT NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY unique_cycle_date (cycleId, date),
    INDEX idx_cycle (cycleId),
    INDEX idx_date (date),
    FOREIGN KEY (cycleId) REFERENCES ShiftCycle(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DayAssignment table
CREATE TABLE IF NOT EXISTS DayAssignment (
    id VARCHAR(191) PRIMARY KEY,
    workDayId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    isResting BOOLEAN DEFAULT FALSE,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY unique_workday_user (workDayId, userId),
    INDEX idx_workday (workDayId),
    INDEX idx_user (userId),
    FOREIGN KEY (workDayId) REFERENCES WorkDay(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IndividualRest table
CREATE TABLE IF NOT EXISTS IndividualRest (
    id VARCHAR(191) PRIMARY KEY,
    cycleId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL,
    restDay INT NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY unique_cycle_user (cycleId, userId),
    INDEX idx_cycle (cycleId),
    INDEX idx_user (userId),
    FOREIGN KEY (cycleId) REFERENCES ShiftCycle(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task table
CREATE TABLE IF NOT EXISTS Task (
    id VARCHAR(191) PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'on_hold') DEFAULT 'pending',
    category VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    scheduledTime VARCHAR(191),
    completedAt DATETIME(3),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_user_created (userId, createdAt),
    INDEX idx_user_status (userId, status),
    INDEX idx_category (category),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity table
CREATE TABLE IF NOT EXISTS Activity (
    id VARCHAR(191) PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    type ENUM('CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'EQUIPMENT_ALERT', 'OTHER_MONITORING', 'TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP', 'CLIENT_INFO', 'GRAPH_SENT', 'ALERT_PUBLISHED', 'HANDOVER_WRITTEN', 'INCIDENT_HISTORY', 'REPORT_GENERATED', 'TICKET_UPDATED', 'TICKET_CLOSED', 'RFO_CREATED', 'ARCHIVE_DONE') NOT NULL,
    category VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_user_created (userId, createdAt),
    INDEX idx_category (category),
    INDEX idx_type (type),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Overtime table
CREATE TABLE IF NOT EXISTS Overtime (
    id VARCHAR(191) PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    duration INT DEFAULT 120,
    shiftType VARCHAR(191) NOT NULL,
    startTime VARCHAR(191) NOT NULL,
    endTime VARCHAR(191) NOT NULL,
    reason VARCHAR(191) DEFAULT 'Supervision NOC',
    approvedBy VARCHAR(191) DEFAULT 'Daddy AZUMY',
    month INT NOT NULL,
    year INT NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY unique_user_date (userId, date),
    INDEX idx_user_month_year (userId, month, year),
    INDEX idx_date (date),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Responsibility table
CREATE TABLE IF NOT EXISTS Responsibility (
    id VARCHAR(191) PRIMARY KEY,
    userId VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NOT NULL,
    startDate DATETIME(3) NOT NULL,
    endDate DATETIME(3),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_user_start (userId, startDate),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Handover table
CREATE TABLE IF NOT EXISTS Handover (
    id VARCHAR(191) PRIMARY KEY,
    authorId VARCHAR(191) NOT NULL,
    shiftId VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    content TEXT NOT NULL,
    incidents TEXT,
    escalations TEXT,
    pendingTasks TEXT,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_author_date (authorId, date),
    INDEX idx_shift_date (shiftId, date),
    FOREIGN KEY (authorId) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SystemSetting table
CREATE TABLE IF NOT EXISTS SystemSetting (
    id VARCHAR(191) PRIMARY KEY,
    key VARCHAR(191) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description VARCHAR(191),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_key (key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ExternalLink table
CREATE TABLE IF NOT EXISTS ExternalLink (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(191) NOT NULL,
    icon VARCHAR(191),
    description VARCHAR(191),
    `order` INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_category (category),
    INDEX idx_order (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GraphSchedule table
CREATE TABLE IF NOT EXISTS GraphSchedule (
    id VARCHAR(191) PRIMARY KEY,
    time VARCHAR(191) NOT NULL,
    shiftType VARCHAR(191) NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sentAt DATETIME(3),
    sentBy VARCHAR(191),
    date DATETIME(3) NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_date_shift (date, shiftType),
    INDEX idx_time (time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key for User.shiftId
ALTER TABLE User ADD CONSTRAINT fk_user_shift FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE SET NULL;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert Shifts
INSERT INTO shifts (id, name, color, colorCode, description) VALUES
('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Blue Team'),
('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Yellow Team'),
('shift-c', 'C', 'green', '#22C55E', 'Shift C - Green Team');

-- Insert Admin user
INSERT INTO User (id, email, name, role, isActive) VALUES
('user-admin', 'admin@siliconeconnect.com', 'Admin User', 'ADMIN', TRUE);

-- Insert Supervisor user
INSERT INTO User (id, email, name, role, isActive) VALUES
('user-supervisor', 'supervisor@siliconeconnect.com', 'Supervisor', 'SUPERVISOR', TRUE);

-- Insert Shift A members
INSERT INTO User (id, email, name, role, shiftId, isActive) VALUES
('agent-a1', 'alaine@siliconeconnect.com', 'Alaine', 'AGENT', 'shift-a', TRUE),
('agent-a2', 'casimir@siliconeconnect.com', 'Casimir', 'AGENT', 'shift-a', TRUE),
('agent-a3', 'luca@siliconeconnect.com', 'Luca', 'AGENT', 'shift-a', TRUE),
('agent-a4', 'jose@siliconeconnect.com', 'José', 'AGENT', 'shift-a', TRUE);

-- Insert Shift B members
INSERT INTO User (id, email, name, role, shiftId, isActive) VALUES
('agent-b1', 'sahra@siliconeconnect.com', 'Sahra', 'AGENT', 'shift-b', TRUE),
('agent-b2', 'severin@siliconeconnect.com', 'Severin', 'AGENT', 'shift-b', TRUE),
('agent-b3', 'marly@siliconeconnect.com', 'Marly', 'AGENT', 'shift-b', TRUE),
('agent-b4', 'furys@siliconeconnect.com', 'Furys', 'AGENT', 'shift-b', TRUE);

-- Insert Shift C members
INSERT INTO User (id, email, name, role, shiftId, isActive) VALUES
('agent-c1', 'audrey@siliconeconnect.com', 'Audrey', 'AGENT', 'shift-c', TRUE),
('agent-c2', 'lapreuve@siliconeconnect.com', 'Lapreuve', 'AGENT', 'shift-c', TRUE),
('agent-c3', 'lotti@siliconeconnect.com', 'Lotti', 'AGENT', 'shift-c', TRUE),
('agent-c4', 'kevine@siliconeconnect.com', 'Kevine', 'AGENT', 'shift-c', TRUE);

-- Insert External Links
INSERT INTO ExternalLink (id, name, url, category, icon, description, `order`, isActive) VALUES
('link-1', 'Suivi de véhicules (MixTelematics)', 'https://za.mixtelematics.com/#/login', 'tracking', 'Truck', 'Suivi GPS des véhicules', 1, TRUE),
('link-2', 'LibreNMS', 'http://192.168.2.25:6672/device/device=71/tab=port/port=1597/', 'monitoring', 'Network', 'Monitoring réseau', 2, TRUE),
('link-3', 'Zabbix', 'http://192.168.2.2:6672/zabbix.php?action=dashboard.view&dashboardid=1&from=now%2Fd&to=now%2Fd', 'monitoring', 'Activity', 'Suivi des incidents', 3, TRUE),
('link-4', 'Zoho Desk', 'https://desk.zoho.com/agent/siliconeconnect/silicone-connect/tickets/details/785759000007574130', 'tickets', 'Ticket', 'Gestion des tickets', 4, TRUE),
('link-5', 'Liste des tickets (Google Sheets)', 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit?gid=0#gid=0', 'tickets', 'FileSpreadsheet', 'Fichier de suivi des tickets', 5, TRUE),
('link-6', 'WhatsApp Web', 'https://web.whatsapp.com/', 'communication', 'MessageSquare', 'Messagerie WhatsApp', 6, TRUE),
('link-7', 'Gmail', 'https://mail.google.com/mail/u/0/#inbox', 'communication', 'Mail', 'Messagerie email', 7, TRUE);

-- Insert System Settings
INSERT INTO SystemSetting (id, key, value, description) VALUES
('setting-1', 'cycleStartDate', '2026-02-01', 'Start date for cycle calculation'),
('setting-2', 'overtimeRate', '120', 'Overtime duration in minutes per worked day'),
('setting-3', 'approverName', 'Daddy AZUMY', 'Default approver for overtime'),
('setting-4', 'shiftA_Start', '2026-02-24', 'Shift A cycle start date'),
('setting-5', 'shiftB_Start', '2026-02-21', 'Shift B cycle start date'),
('setting-6', 'shiftC_Start', '2026-02-18', 'Shift C cycle start date');
