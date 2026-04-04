CREATE TABLE IF NOT EXISTS `conversations` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) DEFAULT NULL,
  `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_conversations_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversation_participants` (
  `id` VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'member',
  `joined_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `last_read_at` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_conversation_participants_conversation_id` (`conversation_id`),
  INDEX `idx_conversation_participants_user_id` (`user_id`),
  CONSTRAINT `fk_conversation_participants_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conversation_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `sender_id` VARCHAR(191) NOT NULL,
  `participant_id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `sent_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `status` VARCHAR(50) DEFAULT 'sent',
  `read_at` DATETIME(3) DEFAULT NULL,
  `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_chat_messages_conversation_id` (`conversation_id`),
  INDEX `idx_chat_messages_sender_id` (`sender_id`),
  INDEX `idx_chat_messages_participant_id` (`participant_id`),
  CONSTRAINT `fk_chat_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_messages_participant` FOREIGN KEY (`participant_id`) REFERENCES `conversation_participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
