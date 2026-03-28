-- ============================================
-- NOC ACTIVITIES - Complete MySQL Database Schema
-- For WampServer / phpMyAdmin
-- Version: 1.0.0
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS noc_activities CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_activities;

-- ============================================
-- ENUM TYPES (As MySQL doesn't have native enums, we use ENUM in columns)
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    name VARCHAR(191) NOT NULL,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    username VARCHAR(191) UNIQUE,
    password_hash VARCHAR(500),
    role ENUM('SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'USER') DEFAULT 'USER',
    shift_id VARCHAR(191),
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    shift_period_start DATETIME(3),
    shift_period_end DATETIME(3),
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_first_login BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    last_activity DATETIME(3),
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME(3),
    monthly_score FLOAT,
    reliability_index FLOAT,
    performance_badge ENUM('EXEMPLARY', 'RELIABLE', 'IMPROVING', 'NEEDS_ATTENTION'),
    presence_status ENUM('ONLINE', 'OFFLINE', 'AWAY', 'BUSY') DEFAULT 'OFFLINE',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_shift_id (shift_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SHIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) UNIQUE NOT NULL,
    color VARCHAR(50) NOT NULL,
    color_code VARCHAR(20) NOT NULL,
    description VARCHAR(500),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SHIFT CYCLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shift_cycles (
    id VARCHAR(191) PRIMARY KEY,
    shift_id VARCHAR(191) NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3) NOT NULL,
    cycle_number INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_shift_start (shift_id, start_date),
    INDEX idx_shift_cycle (shift_id, cycle_number),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- WORK DAYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS work_days (
    id VARCHAR(191) PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    day_type ENUM('DAY_SHIFT', 'NIGHT_SHIFT', 'REST_DAY') NOT NULL,
    start_hour INT NOT NULL,
    end_hour INT NOT NULL,
    day_number INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_cycle_date (cycle_id, date),
    INDEX idx_cycle (cycle_id),
    INDEX idx_date (date),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DAY ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS day_assignments (
    id VARCHAR(191) PRIMARY KEY,
    work_day_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    is_resting BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_workday_user (work_day_id, user_id),
    INDEX idx_workday (work_day_id),
    INDEX idx_user_da (user_id),
    FOREIGN KEY (work_day_id) REFERENCES work_days(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INDIVIDUAL RESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS individual_rests (
    id VARCHAR(191) PRIMARY KEY,
    cycle_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    rest_day INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_cycle_user (cycle_id, user_id),
    INDEX idx_cycle_ir (cycle_id),
    INDEX idx_user_ir (user_id),
    FOREIGN KEY (cycle_id) REFERENCES shift_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- RESPONSIBILITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS responsibilities (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2') NOT NULL,
    start_date DATETIME(3) NOT NULL,
    end_date DATETIME(3),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_start (user_id, start_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'LATE') DEFAULT 'PENDING',
    category ENUM('INCIDENT', 'MAINTENANCE', 'SURVEILLANCE', 'ADMINISTRATIVE', 'OTHER') DEFAULT 'OTHER',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    responsibility ENUM('CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'),
    shift_name VARCHAR(50),
    start_time DATETIME(3) NOT NULL,
    estimated_end_time DATETIME(3) NOT NULL,
    actual_end_time DATETIME(3),
    estimated_duration INT NOT NULL,
    actual_duration INT,
    tags TEXT,
    is_overdue BOOLEAN DEFAULT FALSE,
    is_notified BOOLEAN DEFAULT FALSE,
    completed_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_user_status (user_id, status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(191) PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3),
    
    INDEX idx_task (task_id),
    INDEX idx_user_tc (user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_alerts (
    id VARCHAR(191) PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    type ENUM('WARNING', 'CRITICAL', 'INFO', 'SUCCESS') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    triggered_by VARCHAR(100) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_task_alert (task_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_history (
    id VARCHAR(191) PRIMARY KEY,
    task_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    action VARCHAR(100) NOT NULL,
    field VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_task_hist (task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(191) PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    objet VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    category ENUM('INCIDENT', 'REQUEST', 'PROBLEM', 'CHANGE', 'OTHER') DEFAULT 'OTHER',
    site VARCHAR(200),
    localite VARCHAR(200),
    technicien VARCHAR(200),
    reporter_id VARCHAR(191) NOT NULL,
    reporter_name VARCHAR(191) NOT NULL,
    assignee_id VARCHAR(191),
    assignee_name VARCHAR(191),
    tags TEXT,
    due_date DATETIME(3),
    resolved_at DATETIME(3),
    closed_at DATETIME(3),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME(3),
    deleted_by VARCHAR(191),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_reporter (reporter_id),
    INDEX idx_assignee (assignee_id),
    INDEX idx_status (status),
    INDEX idx_priority_t (priority),
    INDEX idx_created (created_at),
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TICKET COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_comments (
    id VARCHAR(191) PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3),
    
    INDEX idx_ticket (ticket_id),
    INDEX idx_user_tkc (user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TICKET ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id VARCHAR(191) PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_data LONGTEXT,
    file_path VARCHAR(500),
    uploaded_by VARCHAR(191) NOT NULL,
    uploaded_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_ticket_att (ticket_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TICKET HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_history (
    id VARCHAR(191) PRIMARY KEY,
    ticket_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    action VARCHAR(100) NOT NULL,
    field VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_ticket_hist (ticket_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INTERNAL MESSAGES TABLE (Gmail-like)
-- ============================================
CREATE TABLE IF NOT EXISTS internal_messages (
    id VARCHAR(191) PRIMARY KEY,
    thread_id VARCHAR(191),
    from_id VARCHAR(191) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body LONGTEXT NOT NULL,
    folder ENUM('INBOX', 'SENT', 'DRAFTS', 'SPAM', 'TRASH', 'STARRED') DEFAULT 'INBOX',
    status ENUM('UNREAD', 'READ', 'IMPORTANT', 'ARCHIVED') DEFAULT 'UNREAD',
    priority ENUM('NORMAL', 'IMPORTANT', 'URGENT') DEFAULT 'NORMAL',
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    labels TEXT,
    sent_at DATETIME(3),
    received_at DATETIME(3),
    read_at DATETIME(3),
    scheduled_at DATETIME(3),
    reply_to VARCHAR(191),
    forwarded_from VARCHAR(191),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3),
    
    INDEX idx_from (from_id),
    INDEX idx_folder (folder),
    INDEX idx_thread (thread_id),
    INDEX idx_sent (sent_at),
    FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MESSAGE RECIPIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_recipients (
    id VARCHAR(191) PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    type VARCHAR(20) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_msg_user (message_id, user_id),
    INDEX idx_msg (message_id),
    INDEX idx_user_mr (user_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MESSAGE ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_attachments (
    id VARCHAR(191) PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_data LONGTEXT,
    file_path VARCHAR(500),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_msg_att (message_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- READ RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS read_receipts (
    id VARCHAR(191) PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    reader_id VARCHAR(191) NOT NULL,
    reader_name VARCHAR(191) NOT NULL,
    read_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_msg_reader (message_id, reader_id),
    INDEX idx_msg_rr (message_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MESSAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_tracking (
    id VARCHAR(191) PRIMARY KEY,
    message_id VARCHAR(191) NOT NULL,
    recipient_id VARCHAR(191) NOT NULL,
    recipient_email VARCHAR(191) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_msg_mt (message_id),
    INDEX idx_recip_mt (recipient_id),
    FOREIGN KEY (message_id) REFERENCES internal_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL LABELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_labels (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_user_label (user_id, name),
    INDEX idx_user_el (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL SIGNATURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_signatures (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_es (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body LONGTEXT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_et (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONVERSATIONS TABLE (WhatsApp-style)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(191) PRIMARY KEY,
    type ENUM('INDIVIDUAL', 'GROUP') NOT NULL,
    name VARCHAR(200),
    description TEXT,
    avatar VARCHAR(500),
    last_message_at DATETIME(3),
    unread_count INT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    muted_until DATETIME(3),
    is_archived BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_created_by (created_by),
    INDEX idx_last_msg (last_message_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
    id VARCHAR(191) PRIMARY KEY,
    conversation_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    last_read_at DATETIME(3),
    joined_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_conv_user (conversation_id, user_id),
    INDEX idx_conv (conversation_id),
    INDEX idx_user_cp (user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(191) PRIMARY KEY,
    conversation_id VARCHAR(191) NOT NULL,
    sender_id VARCHAR(191) NOT NULL,
    sender_name VARCHAR(191) NOT NULL,
    type ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'VOICE', 'LOCATION', 'CONTACT') DEFAULT 'TEXT',
    content LONGTEXT NOT NULL,
    media_url VARCHAR(500),
    media_data LONGTEXT,
    file_name VARCHAR(500),
    file_size INT,
    duration INT,
    status ENUM('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') DEFAULT 'SENT',
    reply_to_id VARCHAR(191),
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at DATETIME(3),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for_everyone BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    reactions TEXT,
    read_by TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_conv (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created_cm (created_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CALL HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS call_history (
    id VARCHAR(191) PRIMARY KEY,
    conversation_id VARCHAR(191) NOT NULL,
    caller_id VARCHAR(191) NOT NULL,
    caller_name VARCHAR(191) NOT NULL,
    callee_id VARCHAR(191) NOT NULL,
    callee_name VARCHAR(191) NOT NULL,
    type ENUM('AUDIO', 'VIDEO') NOT NULL,
    status ENUM('MISSED', 'ANSWERED', 'DECLINED', 'ONGOING') NOT NULL,
    duration INT,
    started_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    ended_at DATETIME(3),
    
    INDEX idx_conv_ch (conversation_id),
    INDEX idx_caller (caller_id),
    INDEX idx_callee (callee_id),
    INDEX idx_started (started_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DOCUMENTS TABLE (GED)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(191) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    category VARCHAR(100),
    tags TEXT,
    owner_id VARCHAR(191) NOT NULL,
    folder_id VARCHAR(191),
    is_public BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_owner (owner_id),
    INDEX idx_category_doc (category),
    INDEX idx_folder (folder_id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DOCUMENT VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id VARCHAR(191) PRIMARY KEY,
    document_id VARCHAR(191) NOT NULL,
    version INT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by VARCHAR(191) NOT NULL,
    changes TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_doc_version (document_id, version),
    INDEX idx_doc (document_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DOCUMENT SHARES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_shares (
    id VARCHAR(191) PRIMARY KEY,
    document_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    permission VARCHAR(50) DEFAULT 'read',
    shared_by VARCHAR(191) NOT NULL,
    expires_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_doc_user (document_id, user_id),
    INDEX idx_doc_ds (document_id),
    INDEX idx_user_ds (user_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    type ENUM('CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'EQUIPMENT_ALERT', 
              'OTHER_MONITORING', 'TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 
              'INCIDENT_FOLLOWUP', 'CLIENT_INFO', 'GRAPH_SENT', 'ALERT_PUBLISHED', 
              'HANDOVER_WRITTEN', 'INCIDENT_HISTORY', 'REPORT_GENERATED', 
              'TICKET_UPDATED', 'TICKET_CLOSED', 'RFO_CREATED', 'ARCHIVE_DONE') NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_created_act (user_id, created_at),
    INDEX idx_category_act (category),
    INDEX idx_type_act (type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OVERTIMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS overtimes (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    duration INT DEFAULT 120,
    shift_type VARCHAR(50) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    reason VARCHAR(500) DEFAULT 'Supervision NOC',
    approved_by VARCHAR(191) DEFAULT 'Daddy AZUMY',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_user_date_ot (user_id, date),
    INDEX idx_user_month_year (user_id, month, year),
    INDEX idx_date_ot (date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- HANDOVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS handovers (
    id VARCHAR(191) PRIMARY KEY,
    author_id VARCHAR(191) NOT NULL,
    shift_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    content TEXT,
    incidents TEXT,
    escalations TEXT,
    pending_tasks TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_author_date (author_id, date),
    INDEX idx_shift_date (shift_id, date),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    action VARCHAR(200) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_al (user_id),
    INDEX idx_action_al (action),
    INDEX idx_created_al (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_read (user_id, read),
    INDEX idx_created_notif (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(191) PRIMARY KEY,
    key VARCHAR(191) UNIQUE NOT NULL,
    value TEXT,
    description VARCHAR(500),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_key (key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EXTERNAL LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS external_links (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    description VARCHAR(500),
    `order` INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_category_el (category),
    INDEX idx_order_el (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GRAPH SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS graph_schedules (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    date DATETIME(3) NOT NULL,
    time VARCHAR(20) NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    recipients TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_date_gs (date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INACTIVITY EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inactivity_events (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(191) NOT NULL,
    shift_name VARCHAR(50),
    start_time DATETIME(3) NOT NULL,
    end_time DATETIME(3),
    duration INT DEFAULT 0,
    is_active_shift BOOLEAN DEFAULT TRUE,
    is_alerted BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(191),
    acknowledged_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX idx_user_ie (user_id),
    INDEX idx_start_ie (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADD FOREIGN KEY FOR USERS.SHIFT_ID
-- ============================================
ALTER TABLE users ADD CONSTRAINT fk_user_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;

-- ============================================
-- INITIAL DATA - SHIFTS
-- ============================================
INSERT INTO shifts (id, name, color, color_code, description) VALUES
('shift-a', 'A', 'blue', '#3B82F6', 'Shift A - Blue Team'),
('shift-b', 'B', 'yellow', '#EAB308', 'Shift B - Yellow Team'),
('shift-c', 'C', 'green', '#22C55E', 'Shift C - Green Team')
ON DUPLICATE KEY UPDATE color = VALUES(color);

-- ============================================
-- INITIAL DATA - SUPER ADMIN
-- ============================================
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, is_active, is_blocked, is_first_login, must_change_password) VALUES
('super-admin-1', 'secureadmin@siliconeconnect.com', 'Admin SC', 'Admin', 'SC', 'Admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'SUPER_ADMIN', TRUE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE role = 'SUPER_ADMIN';

-- ============================================
-- INITIAL DATA - RESPONSABLE
-- ============================================
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, is_active, is_blocked, is_first_login, must_change_password) VALUES
('sup-1', 'theresia@siliconeconnect.com', 'Theresia', 'Theresia', '', 'Theresia', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'RESPONSABLE', TRUE, FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE role = 'RESPONSABLE';

-- ============================================
-- INITIAL DATA - SHIFT A MEMBERS (TECHNICIEN_NO)
-- ============================================
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_first_login, must_change_password) VALUES
('agent-a1', 'alaine@siliconeconnect.com', 'Alaine', 'Alaine', '', 'Alaine', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'CALL_CENTER', TRUE, TRUE, TRUE),
('agent-a2', 'casimir@siliconeconnect.com', 'Casimir', 'Casimir', '', 'Casimir', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'MONITORING', TRUE, TRUE, TRUE),
('agent-a3', 'luca@siliconeconnect.com', 'Luca', 'Luca', '', 'Luca', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_1', TRUE, TRUE, TRUE),
('agent-a4', 'jose@siliconeconnect.com', 'José', 'José', '', 'Jose', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-a', 'REPORTING_2', TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), responsibility = VALUES(responsibility);

-- ============================================
-- INITIAL DATA - SHIFT B MEMBERS (TECHNICIEN_NO)
-- ============================================
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_first_login, must_change_password) VALUES
('agent-b1', 'sahra@siliconeconnect.com', 'Sahra', 'Sahra', '', 'Sahra', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'CALL_CENTER', TRUE, TRUE, TRUE),
('agent-b2', 'severin@siliconeconnect.com', 'Severin', 'Severin', '', 'Severin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'MONITORING', TRUE, TRUE, TRUE),
('agent-b3', 'marly@siliconeconnect.com', 'Marly', 'Marly', '', 'Marly', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_1', TRUE, TRUE, TRUE),
('agent-b4', 'furys@siliconeconnect.com', 'Furys', 'Furys', '', 'Furys', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-b', 'REPORTING_2', TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), responsibility = VALUES(responsibility);

-- ============================================
-- INITIAL DATA - SHIFT C MEMBERS (TECHNICIEN_NO)
-- ============================================
INSERT INTO users (id, email, name, first_name, last_name, username, password_hash, role, shift_id, responsibility, is_active, is_first_login, must_change_password) VALUES
('agent-c1', 'audrey@siliconeconnect.com', 'Audrey', 'Audrey', '', 'Audrey', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'CALL_CENTER', TRUE, TRUE, TRUE),
('agent-c2', 'lapreuve@siliconeconnect.com', 'Lapreuve', 'Lapreuve', '', 'Lapreuve', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_2', TRUE, TRUE, TRUE),
('agent-c3', 'lotti@siliconeconnect.com', 'Lotti', 'Lotti', '', 'Lotti', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'REPORTING_1', TRUE, TRUE, TRUE),
('agent-c4', 'kevine@siliconeconnect.com', 'Kevine', 'Kevine', '', 'Kevine', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4Pj5M8rqGzKq', 'TECHNICIEN_NO', 'shift-c', 'MONITORING', TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), responsibility = VALUES(responsibility);

-- ============================================
-- INITIAL DATA - EXTERNAL LINKS
-- ============================================
INSERT INTO external_links (id, name, url, category, icon, description, `order`, is_active) VALUES
('link-1', 'Suivi véhicules', 'https://za.mixtelematics.com/#/login', 'vehicles', 'Truck', 'MixTelematics', 1, TRUE),
('link-2', 'LibreNMS', 'http://192.168.2.25:6672/', 'monitoring', 'Network', 'Monitoring réseau', 2, TRUE),
('link-3', 'Zabbix', 'http://192.168.2.2:6672/', 'monitoring', 'Activity', 'Suivi incidents', 3, TRUE),
('link-4', 'Zoho Desk', 'https://desk.zoho.com/', 'tickets', 'Ticket', 'Gestion tickets', 4, TRUE),
('link-5', 'Tickets Sheets', 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', 'tickets', 'FileSpreadsheet', 'Liste tickets', 5, TRUE),
('link-6', 'WhatsApp', 'https://web.whatsapp.com/', 'communication', 'Phone', 'Messagerie', 6, TRUE),
('link-7', 'Gmail', 'https://mail.google.com/', 'communication', 'Mail', 'Email', 7, TRUE)
ON DUPLICATE KEY UPDATE `order` = VALUES(`order`);

-- ============================================
-- INITIAL DATA - SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (id, key, value, description) VALUES
('setting-1', 'cycleStartDate', '2026-02-01', 'Start date for cycle calculation'),
('setting-2', 'overtimeRate', '120', 'Overtime duration in minutes per worked day'),
('setting-3', 'approverName', 'Daddy AZUMY', 'Default approver for overtime'),
('setting-4', 'shiftA_Start', '2026-02-24', 'Shift A cycle start date'),
('setting-5', 'shiftB_Start', '2026-02-21', 'Shift B cycle start date'),
('setting-6', 'shiftC_Start', '2026-02-18', 'Shift C cycle start date'),
('setting-7', 'inactivityThreshold', '120', 'Inactivity alert threshold in minutes'),
('setting-8', 'taskApproachingThreshold', '30', 'Task approaching alert in minutes'),
('setting-9', 'suspendedTooLongThreshold', '60', 'Suspended task alert threshold in minutes')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- ============================================
-- CREATE TICKET COUNTER TABLE FOR AUTO-NUMBERING
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_counters (
    id VARCHAR(191) PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    current_number INT NOT NULL DEFAULT 0,
    year INT NOT NULL,
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY unique_prefix_year (prefix, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize ticket counter
INSERT INTO ticket_counters (id, prefix, current_number, year) VALUES
('tc-1', 'TKT', 0, YEAR(CURRENT_DATE))
ON DUPLICATE KEY UPDATE year = VALUES(year);

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure to get next ticket number
CREATE PROCEDURE IF NOT EXISTS GetNextTicketNumber(OUT p_numero VARCHAR(50))
BEGIN
    DECLARE v_num INT;
    DECLARE v_year INT;
    
    SET v_year = YEAR(CURRENT_DATE);
    
    UPDATE ticket_counters 
    SET current_number = current_number + 1 
    WHERE prefix = 'TKT' AND year = v_year;
    
    SELECT current_number INTO v_num 
    FROM ticket_counters 
    WHERE prefix = 'TKT' AND year = v_year;
    
    SET p_numero = CONCAT('TKT-', v_year, '-', LPAD(v_num, 5, '0'));
END //

-- Procedure to update user last activity
CREATE PROCEDURE IF NOT EXISTS UpdateUserActivity(IN p_user_id VARCHAR(191))
BEGIN
    UPDATE users 
    SET last_activity = CURRENT_TIMESTAMP(3),
        presence_status = 'ONLINE'
    WHERE id = p_user_id;
END //

-- Procedure to create audit log
CREATE PROCEDURE IF NOT EXISTS CreateAuditLog(
    IN p_user_id VARCHAR(191),
    IN p_user_name VARCHAR(191),
    IN p_action VARCHAR(200),
    IN p_details TEXT,
    IN p_ip_address VARCHAR(50),
    IN p_status VARCHAR(50)
)
BEGIN
    INSERT INTO audit_logs (id, user_id, user_name, action, details, ip_address, status)
    VALUES (
        CONCAT('audit-', UUID()),
        p_user_id,
        p_user_name,
        p_action,
        p_details,
        p_ip_address,
        p_status
    );
END //

DELIMITER ;

-- ============================================
-- VIEWS
-- ============================================

-- View for active users with shift info
CREATE OR REPLACE VIEW v_active_users AS
SELECT 
    u.id, u.email, u.name, u.first_name, u.last_name, u.username, u.role,
    u.responsibility, u.is_active, u.last_activity, u.presence_status,
    s.name as shift_name, s.color as shift_color, s.color_code
FROM users u
LEFT JOIN shifts s ON u.shift_id = s.id
WHERE u.is_active = TRUE AND u.is_blocked = FALSE;

-- View for tasks with user info
CREATE OR REPLACE VIEW v_tasks_full AS
SELECT 
    t.id, t.title, t.description, t.status, t.category, t.priority,
    t.start_time, t.estimated_end_time, t.actual_end_time,
    t.estimated_duration, t.actual_duration, t.is_overdue,
    u.name as user_name, u.email as user_email,
    s.name as shift_name, s.color_code as shift_color,
    t.created_at, t.completed_at
FROM tasks t
JOIN users u ON t.user_id = u.id
LEFT JOIN shifts s ON u.shift_id = s.id;

-- View for tickets with reporter and assignee
CREATE OR REPLACE VIEW v_tickets_full AS
SELECT 
    t.id, t.numero, t.objet, t.description, t.status, t.priority, t.category,
    t.site, t.localite, t.technicien,
    reporter.name as reporter_name, reporter.email as reporter_email,
    assignee.name as assignee_name, assignee.email as assignee_email,
    t.created_at, t.resolved_at, t.closed_at
FROM tickets t
JOIN users reporter ON t.reporter_id = reporter.id
LEFT JOIN users assignee ON t.assignee_id = assignee.id
WHERE t.is_deleted = FALSE;

-- View for shift schedule
CREATE OR REPLACE VIEW v_shift_schedule AS
SELECT 
    wd.date,
    wd.day_type,
    wd.start_hour,
    wd.end_hour,
    s.name as shift_name,
    s.color_code,
    u.name as user_name,
    da.responsibility,
    da.is_resting
FROM work_days wd
JOIN shift_cycles sc ON wd.cycle_id = sc.id
JOIN shifts s ON sc.shift_id = s.id
JOIN day_assignments da ON wd.id = da.work_day_id
JOIN users u ON da.user_id = u.id
ORDER BY wd.date, s.name;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP(3);
END //

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP(3);
END //

CREATE TRIGGER IF NOT EXISTS trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP(3);
END //

DELIMITER ;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_created ON tasks(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON tasks(priority, status);
CREATE INDEX IF NOT EXISTS idx_activities_user_type ON activities(user_id, type);
CREATE INDEX IF NOT EXISTS idx_overtimes_user_month_year ON overtimes(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ============================================
-- END OF SCHEMA
-- ============================================
