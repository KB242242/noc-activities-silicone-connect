-- NOC_ACTIVITY Database Schema for MySQL (WampServer)
-- All table names and references are now lowercase for Windows compatibility


CREATE DATABASE IF NOT EXISTS noc_activity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_activity;

-- Drop empty 'user' table if it exists
DROP TABLE IF EXISTS user;

-- Disable foreign key checks to allow truncation
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
TRUNCATE TABLE shifts;
-- Add TRUNCATE for other tables as needed...
SET FOREIGN_KEY_CHECKS = 1;

-- users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    name VARCHAR(191) NOT NULL,
    firstname VARCHAR(191),
    lastname VARCHAR(191),
    role ENUM('ADMIN', 'SUPERVISOR', 'AGENT') DEFAULT 'AGENT',
    shiftid VARCHAR(191),
    avatar VARCHAR(191),
    isactive BOOLEAN DEFAULT TRUE,
    lastactiveat DATETIME(3),
    createdat DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedat DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_email (email),
    INDEX idx_shiftid (shiftid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) UNIQUE NOT NULL,
    color VARCHAR(191) NOT NULL,
    colorcode VARCHAR(191) NOT NULL,
    description VARCHAR(191),
    createdat DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updatedat DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ...existing code for other tables, all lowercased...

-- Insert Shifts
INSERT INTO shifts (id, name, color, colorcode, description) VALUES
('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Blue Team'),
('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Yellow Team'),
('shift-c', 'C', 'green', '#22C55E', 'Shift C - Green Team');

-- Insert Admin user
INSERT INTO users (id, email, name, role, isactive) VALUES
('user-admin', 'admin@siliconeconnect.com', 'Admin User', 'ADMIN', TRUE);

-- Insert Supervisor user
INSERT INTO users (id, email, name, role, isactive) VALUES
('user-supervisor', 'supervisor@siliconeconnect.com', 'Supervisor', 'SUPERVISOR', TRUE);

-- Insert Shift A members
INSERT INTO users (id, email, name, role, shiftid, isactive) VALUES
('agent-a1', 'alaine@siliconeconnect.com', 'Alaine', 'AGENT', 'shift-a', TRUE),
('agent-a2', 'casimir@siliconeconnect.com', 'Casimir', 'AGENT', 'shift-a', TRUE),
('agent-a3', 'luca@siliconeconnect.com', 'Luca', 'AGENT', 'shift-a', TRUE),
('agent-a4', 'jose@siliconeconnect.com', 'José', 'AGENT', 'shift-a', TRUE);

-- ...existing code for other inserts, all lowercased...
