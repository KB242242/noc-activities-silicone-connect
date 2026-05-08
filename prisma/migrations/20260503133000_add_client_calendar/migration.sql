CREATE TABLE IF NOT EXISTS noc_client_working_hours (
  id_working_hour INT NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_working_hour),
  KEY idx_noc_client_working_hours_client (client_id),
  CONSTRAINT fk_noc_client_working_hours_client FOREIGN KEY (client_id)
    REFERENCES noc_clients(id_client) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_holidays (
  id_holiday INT NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_holiday),
  KEY idx_noc_client_holidays_client (client_id),
  CONSTRAINT fk_noc_client_holidays_client FOREIGN KEY (client_id)
    REFERENCES noc_clients(id_client) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
