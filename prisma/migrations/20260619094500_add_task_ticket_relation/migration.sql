ALTER TABLE tasks
  ADD COLUMN ticket_id VARCHAR(191) NULL AFTER user_id;

CREATE INDEX idx_tasks_ticket_id ON tasks(ticket_id);

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_ticket
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;